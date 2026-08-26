const Document = require('../models/Document');
const Ticket = require('../models/Ticket');
const { departmentFilter } = require('../middleware/departmentScope');

const DEPARTMENTS = ['Finance', 'HR', 'Safety', 'Legal', 'Operations', 'IT'];

/**
 * GET /api/dashboard/stats
 * Returns high-level document statistics and a per-department breakdown.
 */
const getDashboardStats = async (req, res, next) => {
  try {
    // Statistics are calculated in MongoDB using the authenticated user's scope.
    const query = departmentFilter(req.user);

    // Run all aggregations in parallel for efficiency
    const [totalDocuments, routedDocuments, pendingDocuments, totalTickets, deptAggResult] =
      await Promise.all([
        // 1. Total documents in the collection
        Document.countDocuments(query),

        // 2. Documents with status "Routed"
        Document.countDocuments({ ...query, status: 'Routed' }),

        // 3. Documents with status "Pending"
        Document.countDocuments({ ...query, status: 'Pending' }),

        // 4. Tickets in the same authorized department scope
        Ticket.countDocuments(query),

        // 5. Group by department to get per-department counts
        Document.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$department',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    // Build a department breakdown object with all known departments defaulting to 0
    const departmentBreakdown = DEPARTMENTS.reduce((acc, dept) => {
      acc[dept] = 0;
      return acc;
    }, {});

    // Populate counts from aggregation result
    for (const { _id, count } of deptAggResult) {
      if (_id && Object.prototype.hasOwnProperty.call(departmentBreakdown, _id)) {
        departmentBreakdown[_id] = count;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalDocuments,
        routedDocuments,
        pendingDocuments,
        totalTickets,
        departments: departmentBreakdown,   // ← matches DashboardPage stats?.departments
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/analytics
 * Returns system-wide detailed analytics (Admin only).
 */
const getAnalyticsStats = async (req, res, next) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Run all aggregations in parallel
    const [
      documentStats,
      ticketStats,
      avgConfidenceResult,
      confidenceBucketsResult,
      deptDistResult,
      ticketDeptDistResult,
      docTypeDistResult,
      deptWorkloadResult,
      recentActivityDocs,
      recentActivityTickets,
      timeSeriesResult
    ] = await Promise.all([
      // 1. Document stats
      Document.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
            processing: { $sum: { $cond: [{ $eq: ['$status', 'Processing'] }, 1, 0] } },
            routed: { $sum: { $cond: [{ $eq: ['$status', 'Routed'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'Failed'] }, 1, 0] } }
          }
        }
      ]),

      // 2. Ticket stats
      Ticket.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $in: ['$status', ['New', 'Assigned']] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
            closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } }
          }
        }
      ]),

      // 3. Average Confidence
      Document.aggregate([
        { $match: { confidenceScore: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgConfidence: { $avg: '$confidenceScore' } } }
      ]),

      // 4. Confidence Buckets
      Document.aggregate([
        { $match: { confidenceScore: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: null,
            high: { $sum: { $cond: [{ $gte: ['$confidenceScore', 80] }, 1, 0] } },
            medium: { $sum: { $cond: [{ $and: [{ $gte: ['$confidenceScore', 50] }, { $lt: ['$confidenceScore', 80] }] }, 1, 0] } },
            low: { $sum: { $cond: [{ $lt: ['$confidenceScore', 50] }, 1, 0] } }
          }
        }
      ]),

      // 5. Department Distribution (Documents)
      Document.aggregate([
        { $match: { department: { $exists: true, $ne: null } } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]),

      // 6. Department Distribution (Tickets)
      Ticket.aggregate([
        { $match: { department: { $exists: true, $ne: null } } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]),

      // 7. Document Types
      Document.aggregate([
        { $match: { documentType: { $exists: true, $ne: null } } },
        { $group: { _id: '$documentType', count: { $sum: 1 } } }
      ]),

      // 8. Department Workload
      Ticket.aggregate([
        { $match: { department: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$department',
            openTickets: { $sum: { $cond: [{ $in: ['$status', ['New', 'Assigned', 'In Progress']] }, 1, 0] } },
            resolvedTickets: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } }
          }
        }
      ]),

      // 9. Recent Documents
      Document.find().sort({ createdAt: -1 }).limit(6).select('title status department createdAt'),

      // 10. Recent Tickets
      Ticket.find().sort({ createdAt: -1 }).limit(6).select('ticketId status department createdAt'),

      // 11. Time-series (documents created per day over the last 90 days)
      Document.aggregate([
        { $match: { createdAt: { $gte: ninetyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            routed: { $sum: { $cond: [{ $eq: ['$status', 'Routed'] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Build default document stats
    const documents = documentStats[0] || { total: 0, pending: 0, processing: 0, routed: 0, completed: 0, failed: 0 };
    delete documents._id;

    // Build default ticket stats
    const tickets = ticketStats[0] || { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 };
    delete tickets._id;

    const averageConfidence = avgConfidenceResult[0] ? Number(avgConfidenceResult[0].avgConfidence.toFixed(1)) : 0;

    const confidenceBuckets = confidenceBucketsResult[0] || { high: 0, medium: 0, low: 0 };
    delete confidenceBuckets._id;

    const departmentDistribution = deptDistResult.map(d => ({
      department: d._id,
      count: d.count
    }));

    const ticketDepartmentDistribution = ticketDeptDistResult.map(d => ({
      department: d._id,
      count: d.count
    }));

    const documentTypes = docTypeDistResult.map(d => ({
      type: d._id,
      count: d.count
    }));

    // Merge document counts with ticket workload
    const workloadMap = {};
    DEPARTMENTS.forEach(dept => {
      workloadMap[dept] = { department: dept, documents: 0, openTickets: 0, resolvedTickets: 0 };
    });

    deptDistResult.forEach(d => {
      if (workloadMap[d._id]) {
        workloadMap[d._id].documents = d.count;
      }
    });

    deptWorkloadResult.forEach(t => {
      if (workloadMap[t._id]) {
        workloadMap[t._id].openTickets = t.openTickets;
        workloadMap[t._id].resolvedTickets = t.resolvedTickets;
      }
    });

    const departmentWorkload = Object.values(workloadMap);

    // Format recent activity
    const activityList = [];
    recentActivityDocs.forEach(doc => {
      activityList.push({
        id: doc._id,
        type: 'Document',
        message: `Document ${doc.status ? doc.status.toLowerCase() : 'processed'}: ${doc.title}`,
        department: doc.department || 'Unknown',
        date: doc.createdAt
      });
    });

    recentActivityTickets.forEach(ticket => {
      activityList.push({
        id: ticket._id,
        type: 'Ticket',
        message: `Ticket ${ticket.status ? ticket.status.toLowerCase() : 'created'}: ${ticket.ticketId}`,
        department: ticket.department || 'Unknown',
        date: ticket.createdAt
      });
    });

    // Sort combined activity by date descending and limit to top 8
    activityList.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentActivity = activityList.slice(0, 8);

    // Format time series
    const timeSeries = timeSeriesResult.map(item => ({
      date: item._id,
      documents: item.count,
      routed: item.routed
    }));

    return res.status(200).json({
      success: true,
      data: {
        documents,
        tickets,
        averageConfidence,
        confidenceBuckets,
        departmentDistribution,
        ticketDepartmentDistribution,
        documentTypes,
        departmentWorkload,
        recentActivity,
        timeSeries
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAnalyticsStats,
};

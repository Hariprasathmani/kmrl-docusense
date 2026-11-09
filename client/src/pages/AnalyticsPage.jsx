// pages/AnalyticsPage.jsx — KMRL DocuSense · System-wide Analytics (Admin Only) with Lucide icons
import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  RefreshCw,
  Files,
  Zap,
  Hourglass,
  Target,
  Ticket,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import analyticsService from '../services/analyticsService';
import StatCard from '../components/UI/StatCard';
import Spinner from '../components/UI/Spinner';
import styles from './AnalyticsPage.module.css';

// Chart Color Palette — aligned with design system tokens
const COLORS = {
  primary: '#0369a1',
  cyan:    '#0891b2',
  success: '#15803d',
  warning: '#b45309',
  danger:  '#b91c1c',
  purple:  '#7c3aed',
  pink:    '#db2777',
  muted:   '#4a6279',
};

const PIE_COLORS = [
  '#0369a1',
  '#15803d',
  '#b45309',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#4a6279',
];

const STATUS_COLOR_MAP = {
  Pending:    '#b45309',
  Processing: '#0369a1',
  Routed:     '#15803d',
  Completed:  '#0891b2',
  Failed:     '#b91c1c',
};

// Light-mode tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #d1dbe6',
          borderRadius: '6px',
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(13,31,45,0.1)',
          color: '#0f1e2d',
          fontSize: '0.8125rem',
        }}
      >
        {label && (
          <p style={{ fontWeight: 600, marginBottom: '4px', color: '#4a6279', margin: '0 0 4px' }}>
            {label}
          </p>
        )}
        {payload.map((entry, index) => (
          <div
            key={`tooltip-item-${index}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: entry.color || '#0f1e2d' }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: entry.color || '#0369a1', display: 'inline-block' }} />
            <span style={{ color: '#4a6279' }}>{entry.name}:</span>
            <strong style={{ color: '#0f1e2d' }}>{entry.value}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(30); // 7, 30, or 90 days

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getStats();
      setData(res?.data ?? res);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to load analytics.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Loading state
  if (loading) {
    return (
      <section className={`page-enter ${styles.centerState}`} aria-busy="true">
        <Spinner size={44} />
        <p className={styles.stateText}>Loading analytics…</p>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className={`page-enter ${styles.centerState}`} role="alert">
        <span style={{ fontSize: '2.5rem' }} aria-hidden="true">
          ⚠️
        </span>
        <h2 className={styles.pageTitle}>Unable to load analytics.</h2>
        <p className={styles.stateText}>{error}</p>
        <button
          className="btn btn-primary"
          onClick={fetchAnalytics}
          style={{ marginTop: '1rem' }}
        >
          Retry
        </button>
      </section>
    );
  }

  const {
    documents = { total: 0, pending: 0, processing: 0, routed: 0, completed: 0, failed: 0 },
    tickets = { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 },
    averageConfidence = 0,
    confidenceBuckets = { high: 0, medium: 0, low: 0 },
    departmentDistribution = [],
    ticketDepartmentDistribution = [],
    documentTypes = [],
    departmentWorkload = [],
    recentActivity = [],
    timeSeries = [],
  } = data || {};

  const isDatabaseEmpty = documents.total === 0 && tickets.total === 0;

  // Prepare document status pie chart data
  const statusData = [
    { name: 'Pending', value: documents.pending || 0, color: STATUS_COLOR_MAP.Pending },
    { name: 'Processing', value: documents.processing || 0, color: STATUS_COLOR_MAP.Processing },
    { name: 'Routed', value: documents.routed || 0, color: STATUS_COLOR_MAP.Routed },
    { name: 'Completed', value: documents.completed || 0, color: STATUS_COLOR_MAP.Completed },
    { name: 'Failed', value: documents.failed || 0, color: STATUS_COLOR_MAP.Failed },
  ].filter((item) => item.value > 0);

  // Confidence calculations
  const totalBucketDocs =
    (confidenceBuckets.high || 0) +
    (confidenceBuckets.medium || 0) +
    (confidenceBuckets.low || 0);

  const highPct = totalBucketDocs > 0 ? Math.round((confidenceBuckets.high / totalBucketDocs) * 100) : 0;
  const medPct = totalBucketDocs > 0 ? Math.round((confidenceBuckets.medium / totalBucketDocs) * 100) : 0;
  const lowPct = totalBucketDocs > 0 ? Math.round((confidenceBuckets.low / totalBucketDocs) * 100) : 0;

  // Filter time-series by selected range
  const filteredTimeSeries = (() => {
    if (!timeSeries || timeSeries.length === 0) return [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);
    return timeSeries.filter((item) => new Date(item.date) >= cutoffDate);
  })();

  return (
    <div className={`page-enter ${styles.page}`}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Analytics</h1>
          <p className={styles.pageSubtitle}>
            Monitor document processing, department workload, routing performance, and system activity.
          </p>
        </div>
        <button
          className={`btn btn-ghost ${styles.refreshBtn}`}
          onClick={fetchAnalytics}
          title="Refresh analytics data"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      {isDatabaseEmpty ? (
        <div className={`glass-card ${styles.emptyStateCard}`}>
          <span style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</span>
          <h3>No analytics data available yet.</h3>
          <p className={styles.stateText}>
            Upload documents or create tickets to populate real-time metrics.
          </p>
        </div>
      ) : (
        <>
          {/* Top Document Summary Cards (4 cols on desktop, 2 on tablet, 1 on mobile) */}
          <div className={styles.summaryGrid}>
            <StatCard
              label="Total Documents"
              value={documents.total?.toLocaleString() ?? 0}
              Icon={Files}
              accent="var(--color-primary)"
            />
            <StatCard
              label="Processed"
              value={(documents.routed + documents.completed)?.toLocaleString() ?? 0}
              Icon={Zap}
              accent="var(--color-success)"
            />
            <StatCard
              label="Pending"
              value={documents.pending?.toLocaleString() ?? 0}
              Icon={Hourglass}
              accent="var(--color-warning)"
            />
            <StatCard
              label="Avg Confidence"
              value={`${averageConfidence}%`}
              Icon={Target}
              accent="var(--color-accent)"
            />
          </div>

          {/* Ticket Summary Cards */}
          <div className={styles.ticketSummaryGrid}>
            <StatCard
              label="Total Tickets"
              value={tickets.total?.toLocaleString() ?? 0}
              Icon={Ticket}
              accent="var(--color-purple)"
            />
            <StatCard
              label="Open Tickets"
              value={(tickets.open + tickets.inProgress)?.toLocaleString() ?? 0}
              Icon={Bell}
              accent="var(--color-warning)"
            />
            <StatCard
              label="Resolved Tickets"
              value={(tickets.resolved + tickets.closed)?.toLocaleString() ?? 0}
              Icon={CheckCircle2}
              accent="var(--color-success)"
            />
          </div>

          {/* Time-Based Analytics: Documents Processed Over Time */}
          <div className={`glass-card ${styles.chartCard}`}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Documents Processed Over Time
              </h3>
              <div className={styles.timeToggle}>
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    className={`${styles.toggleBtn} ${
                      timeRange === days ? styles.toggleBtnActive : ''
                    }`}
                    onClick={() => setTimeRange(days)}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            {filteredTimeSeries.length === 0 ? (
              <div className={styles.emptyStateCard}>
                <p>No document activity recorded in the last {timeRange} days.</p>
              </div>
            ) : (
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredTimeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4eaf2" />
                    <XAxis
                      dataKey="date"
                      stroke="#8aa3b8"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#8aa3b8"
                      fontSize={12}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="documents"
                      name="Total Ingested"
                      stroke="#0369a1"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#0369a1' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="routed"
                      name="Routed / Processed"
                      stroke="#15803d"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#15803d' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Documents by Department & Document Status */}
          <div className={styles.twoColGrid}>
            {/* Documents by Department */}
            <div className={`glass-card ${styles.chartCard}`}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>🏢 Documents by Department</h3>
              </div>
              {departmentDistribution.length === 0 ? (
                <div className={styles.emptyStateCard}>
                  <p>No department data available.</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4eaf2" horizontal={false} />
                      <XAxis type="number" stroke="#8aa3b8" fontSize={12} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="department"
                        stroke="#8aa3b8"
                        fontSize={12}
                        width={85}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Documents"
                        fill="#3b82f6"
                        radius={[0, 4, 4, 0]}
                      >
                        {departmentDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Document Status */}
            <div className={`glass-card ${styles.chartCard}`}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>🔄 Document Status</h3>
              </div>
              {statusData.length === 0 ? (
                <div className={styles.emptyStateCard}>
                  <p>No document status data available.</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`status-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Document Types & AI Classification Performance */}
          <div className={styles.twoColGrid}>
            {/* Document Type Distribution */}
            <div className={`glass-card ${styles.chartCard}`}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>📄 Document Type Distribution</h3>
              </div>
              {documentTypes.length === 0 ? (
                <div className={styles.emptyStateCard}>
                  <p>No document formats registered.</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={documentTypes}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="count"
                        nameKey="type"
                        label={({ type, percent }) =>
                          `${type} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {documentTypes.map((entry, index) => (
                          <Cell
                            key={`type-cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* AI Classification Performance */}
            <div className={`glass-card ${styles.chartCard}`}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>🤖 AI Classification Performance</h3>
              </div>
              <div className={styles.aiPerfContainer}>
                <div className={styles.avgConfHighlight}>
                  <span className={styles.avgConfNumber}>{averageConfidence}%</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    Average Confidence Score
                  </span>
                </div>

                <div className={styles.confidenceBucketList}>
                  {/* High */}
                  <div className={styles.bucketItem}>
                    <div className={styles.bucketHeader}>
                      <span>High Confidence (80–100%)</span>
                      <strong>
                        {confidenceBuckets.high} docs ({highPct}%)
                      </strong>
                    </div>
                    <div className={styles.bucketBarTrack}>
                      <div
                        className={styles.bucketBarFill}
                        style={{
                          width: `${highPct}%`,
                          backgroundColor: 'var(--color-success)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Medium */}
                  <div className={styles.bucketItem}>
                    <div className={styles.bucketHeader}>
                      <span>Medium Confidence (50–79%)</span>
                      <strong>
                        {confidenceBuckets.medium} docs ({medPct}%)
                      </strong>
                    </div>
                    <div className={styles.bucketBarTrack}>
                      <div
                        className={styles.bucketBarFill}
                        style={{
                          width: `${medPct}%`,
                          backgroundColor: 'var(--color-warning)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Low */}
                  <div className={styles.bucketItem}>
                    <div className={styles.bucketHeader}>
                      <span>Low Confidence (0–49%)</span>
                      <strong>
                        {confidenceBuckets.low} docs ({lowPct}%)
                      </strong>
                    </div>
                    <div className={styles.bucketBarTrack}>
                      <div
                        className={styles.bucketBarFill}
                        style={{
                          width: `${lowPct}%`,
                          backgroundColor: 'var(--color-danger)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Department Workload Table */}
          <div className={`glass-card ${styles.chartCard}`}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>👥 Department Workload</h3>
            </div>
            <div className={styles.tableContainer}>
              <table className={styles.customTable}>
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Documents</th>
                    <th>Open Tickets</th>
                    <th>Resolved Tickets</th>
                    <th>Resolution Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentWorkload.map((row) => {
                    const totalDeptTickets = row.openTickets + row.resolvedTickets;
                    const resRate =
                      totalDeptTickets > 0
                        ? `${Math.round((row.resolvedTickets / totalDeptTickets) * 100)}%`
                        : '—';

                    return (
                      <tr key={row.department}>
                        <td>
                          <strong>{row.department}</strong>
                        </td>
                        <td>{row.documents} docs</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background:
                                row.openTickets > 0
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(255, 255, 255, 0.05)',
                              color: row.openTickets > 0 ? '#fbbf24' : '#94a3b8',
                            }}
                          >
                            {row.openTickets} open
                          </span>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                            }}
                          >
                            {row.resolvedTickets} resolved
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                            {resRate}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={`glass-card ${styles.chartCard}`}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>⏱️ Recent Activity</h3>
            </div>
            {recentActivity.length === 0 ? (
              <div className={styles.emptyStateCard}>
                <p>No recent activity logged.</p>
              </div>
            ) : (
              <ul className={styles.activityList}>
                {recentActivity.map((activity, idx) => (
                  <li key={activity.id || idx} className={styles.activityItem}>
                    <span
                      className={styles.activityDot}
                      style={{
                        backgroundColor:
                          activity.type === 'Document'
                            ? 'var(--color-primary)'
                            : 'var(--color-purple)',
                      }}
                    />
                    <div className={styles.activityContent}>
                      <div className={styles.activityTitle}>{activity.message}</div>
                      <div className={styles.activityMeta}>
                        <span className="badge badge-blue">{activity.department}</span>
                        <span>
                          {activity.date
                            ? new Date(activity.date).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

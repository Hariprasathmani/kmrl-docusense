// components/Dashboard/AdminDashboard.jsx
// Admin system-overview dashboard.
// Shows system-wide metrics — NOT "My Tickets" (Admin is not a dept officer).
// All data sourced from real backend endpoints — no mock values.

import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { documentService }  from '../../services/documentService';
import KpiCard from './KpiCard';
import Spinner from '../UI/Spinner';
import styles from './AdminDashboard.module.css';

// ─── Utility helpers ──────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function extractList(resp, ...keys) {
  const d = resp?.data?.data ?? resp?.data;
  if (Array.isArray(d)) return d;
  for (const k of keys) {
    if (d && Array.isArray(d[k])) return d[k];
  }
  return [];
}

const DEPARTMENTS = ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PanelHeader({ title, subtitle }) {
  return (
    <div className={styles.panelHeader}>
      <h2 className={styles.panelTitle}>{title}</h2>
      {subtitle && <span className={styles.panelSubtitle}>{subtitle}</span>}
    </div>
  );
}

function EmptyState({ message }) {
  return <p className={styles.emptyState}>{message}</p>;
}

/**
 * Department workload table — all 6 departments with docs, open & resolved tickets.
 * Data comes from analytics.departmentWorkload (already merged docs + tickets).
 */
function DeptWorkloadTable({ workload }) {
  if (!workload || workload.length === 0) {
    return <EmptyState message="No department data available." />;
  }

  // Ensure all 6 departments appear, even if they have no data yet
  const byDept = {};
  DEPARTMENTS.forEach(d => { byDept[d] = { department: d, documents: 0, openTickets: 0, resolvedTickets: 0 }; });
  workload.forEach(w => { if (byDept[w.department]) byDept[w.department] = w; });
  const rows = DEPARTMENTS.map(d => byDept[d]);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Department</th>
            <th className={styles.numCol}>Documents</th>
            <th className={styles.numCol}>Open Tickets</th>
            <th className={styles.numCol}>Resolved</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.department}>
              <td className={styles.deptName}>{row.department}</td>
              <td className={styles.numCol}>{row.documents}</td>
              <td className={styles.numCol}>{row.openTickets}</td>
              <td className={`${styles.numCol} ${styles.resolvedNum}`}>{row.resolvedTickets}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Horizontal bar breakdown of ticket status distribution system-wide.
 * Data from analytics.tickets: { total, open, inProgress, resolved, closed }.
 */
function TicketStatusBars({ ticketStats }) {
  if (!ticketStats) return <EmptyState message="No ticket data." />;

  const { total = 0, open = 0, inProgress = 0, resolved = 0, closed = 0 } = ticketStats;
  const safeTotal = Math.max(total, 1);

  const bars = [
    { label: 'Pending / Open', count: open,       color: 'var(--color-warning)' },
    { label: 'In Progress',    count: inProgress,  color: 'var(--color-primary)' },
    { label: 'Resolved',       count: resolved,    color: 'var(--color-success)' },
    { label: 'Closed',         count: closed,      color: 'var(--color-text-dim)' },
  ];

  return (
    <div className={styles.statusBars}>
      {bars.map(({ label, count, color }) => (
        <div key={label} className={styles.barRow}>
          <span className={styles.barLabel}>{label}</span>
          <div
            className={styles.barTrack}
            role="progressbar"
            aria-valuenow={count}
            aria-valuemin={0}
            aria-valuemax={safeTotal}
          >
            <div
              className={styles.barFill}
              style={{
                width: `${Math.max((count / safeTotal) * 100, count > 0 ? 2 : 0)}%`,
                background: color,
              }}
            />
          </div>
          <span className={styles.barCount}>{count}</span>
        </div>
      ))}
      <p className={styles.barTotal}>{total} total system tickets</p>
    </div>
  );
}

/**
 * Recent system activity list from analytics.recentActivity.
 * Each event: { type: 'Document'|'Ticket', message, department, date }.
 */
function SystemActivityFeed({ activity }) {
  if (!activity || activity.length === 0) {
    return <EmptyState message="No recent system activity." />;
  }

  const TYPE_COLOR = {
    Document: 'var(--color-primary)',
    Ticket:   'var(--color-accent)',
  };

  return (
    <ul className={styles.activityList} aria-label="Recent system activity">
      {activity.map((item, i) => (
        <li key={item.id ?? i} className={styles.activityItem}>
          <span
            className={styles.activityDot}
            style={{ background: TYPE_COLOR[item.type] ?? 'var(--color-text-dim)' }}
            aria-hidden="true"
          />
          <div className={styles.activityBody}>
            <span className={styles.activityType}>{item.type}</span>
            <span className={styles.activityMsg}>{item.message}</span>
          </div>
          <div className={styles.activityRight}>
            <span className={styles.activityDept}>{item.department}</span>
            <span className={styles.activityTime}>{timeAgo(item.date)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Recent documents table system-wide.
 * Shows title, source (Email/Manual), department, status, received date.
 */
function RecentDocsTable({ docs }) {
  if (!docs.length) return <EmptyState message="No recent documents." />;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Document</th>
            <th>Source</th>
            <th>Department</th>
            <th>Status</th>
            <th>Received</th>
          </tr>
        </thead>
        <tbody>
          {docs.map(doc => (
            <tr key={doc._id}>
              <td className={styles.docTitle}>{doc.title}</td>
              <td>
                {doc.source === 'email'
                  ? <span className="badge badge-blue">Email</span>
                  : <span className={`badge ${styles.badgeManual}`}>Manual</span>
                }
              </td>
              <td className={styles.docDept}>{doc.department ?? '—'}</td>
              <td>
                <span className={`badge ${
                  doc.status === 'Routed'    ? 'badge-green'
                  : doc.status === 'Pending' ? 'badge-yellow'
                  : 'badge-blue'
                }`}>
                  {doc.status ?? '—'}
                </span>
              </td>
              <td className={styles.docDate}>{fmtDate(doc.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // Stats data
  const [docStats,      setDocStats]      = useState(null);   // from /dashboard/stats
  const [analytics,     setAnalytics]     = useState(null);   // from /dashboard/analytics
  const [recentDocs,    setRecentDocs]    = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResp, analyticsResp, docsResp] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getAnalytics(),
        documentService.getAll({ limit: 8 }),
      ]);

      const stats = statsResp?.data?.data ?? statsResp?.data ?? {};
      const ana   = analyticsResp?.data?.data ?? analyticsResp?.data ?? {};
      const docs  = extractList(docsResp, 'documents', 'docs');

      setDocStats(stats);
      setAnalytics(ana);
      setRecentDocs(docs);
    } catch (err) {
      setError(
        err?.response?.data?.message ??
        err?.message ??
        'Failed to load system overview.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.centerState} aria-busy="true">
        <Spinner size={36} />
        <p>Loading system overview…</p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={styles.centerState} role="alert">
        <p className={styles.errorMsg}>⚠ {error}</p>
        <button className="btn btn-ghost" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  // ── Derived KPI values ───────────────────────────────────────────────────
  const totalDocs  = analytics?.documents?.total  ?? docStats?.totalDocuments ?? 0;
  const ticketData = analytics?.tickets ?? {};
  const activeTickets     = (ticketData.open ?? 0) + (ticketData.inProgress ?? 0);
  const unassignedTickets = ticketData.open ?? 0;   // open = New + Assigned (queue)
  const resolvedTickets   = (ticketData.resolved ?? 0) + (ticketData.closed ?? 0);

  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section className={`page-enter ${styles.page}`}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>System Overview</h1>
          <p className={styles.pageSubtitle}>
            KMRL DocuSense operational summary · {dateStr}
          </p>
        </div>
      </header>

      {/* ── KPI ROW ────────────────────────────────────────────────────── */}
      <div className={styles.kpiGrid} role="list" aria-label="System key performance indicators">
        <div role="listitem">
          <KpiCard
            label="Total Documents"
            value={totalDocs}
            accent="var(--color-primary)"
          />
        </div>
        <div role="listitem">
          <KpiCard
            label="Active Tickets"
            value={activeTickets}
            accent="var(--color-warning)"
            secondary={ticketData.inProgress}
            secondaryLabel="in progress"
          />
        </div>
        <div role="listitem">
          <KpiCard
            label="Open Queue"
            value={unassignedTickets}
            accent="var(--color-danger)"
            secondary={ticketData.total}
            secondaryLabel="total tickets"
          />
        </div>
        <div role="listitem">
          <KpiCard
            label="Resolved Tickets"
            value={resolvedTickets}
            accent="var(--color-success)"
          />
        </div>
      </div>

      {/* ── DEPT WORKLOAD | TICKET STATUS ──────────────────────────────── */}
      <div className={styles.twoCol}>

        {/* LEFT: Department Workload */}
        <section className={styles.panel} aria-labelledby="dept-workload-title">
          <PanelHeader
            title="Department Workload"
            subtitle="Documents & tickets by department"
          />
          <DeptWorkloadTable workload={analytics?.departmentWorkload} />
        </section>

        {/* RIGHT: Ticket Status */}
        <section className={styles.panel} aria-labelledby="ticket-status-title">
          <PanelHeader
            title="Ticket Status"
            subtitle="System-wide distribution"
          />
          <div className={styles.panelBody}>
            <TicketStatusBars ticketStats={analytics?.tickets} />
          </div>
        </section>

      </div>

      {/* ── RECENT SYSTEM ACTIVITY ─────────────────────────────────────── */}
      <section className={styles.panel} aria-labelledby="system-activity-title">
        <PanelHeader title="Recent System Activity" />
        <div className={styles.panelBody}>
          <SystemActivityFeed activity={analytics?.recentActivity} />
        </div>
      </section>

      {/* ── RECENT DOCUMENTS ───────────────────────────────────────────── */}
      <section className={styles.panel} aria-labelledby="docs-title">
        <PanelHeader title="Recent Documents" subtitle="Latest system-wide documents" />
        <RecentDocsTable docs={recentDocs} />
      </section>

    </section>
  );
}

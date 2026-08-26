// components/Dashboard/OfficerDashboard.jsx
// Department Officer work-management dashboard.
// Answers: "What needs my attention today?"
// All data sourced from real backend endpoints — no mock values.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../services/ticketService';
import { documentService } from '../../services/documentService';
import KpiCard from './KpiCard';
import Spinner from '../UI/Spinner';
import styles from './OfficerDashboard.module.css';

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** Convert a date string to a relative "N time ago" label. */
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

/** Format a date to a short readable string (e.g. "25 Aug 2026"). */
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * Defensively extract an array from a paginated or flat API response.
 * Tries resp.data.data[keys[0]], resp.data[keys[0]], or resp.data as array.
 */
function extractList(resp, ...keys) {
  const d = resp?.data?.data ?? resp?.data;
  if (Array.isArray(d)) return d;
  for (const k of keys) {
    if (d && Array.isArray(d[k])) return d[k];
  }
  return [];
}

/** Check whether a ticket is assigned to a given user id (handles populated or unpopulated). */
function isAssignedToMe(ticket, userId) {
  if (!ticket.assignedTo) return false;
  const at = ticket.assignedTo;
  if (typeof at === 'string') return at === String(userId);
  return String(at._id ?? at.id ?? '') === String(userId);
}

const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/** Inline style for priority text colour. */
const PRIORITY_STYLE = {
  Critical: { color: 'var(--color-danger)',      fontWeight: 700 },
  High:     { color: 'var(--color-warning)',     fontWeight: 600 },
  Medium:   { color: 'var(--color-text-muted)',  fontWeight: 500 },
  Low:      { color: 'var(--color-text-dim)',    fontWeight: 400 },
};

/** Map ticket status → CSS badge class string. */
function statusBadgeClass(status) {
  const map = {
    New:           'badge badge-status-new',
    Assigned:      'badge badge-status-assigned',
    'In Progress': 'badge badge-status-inprogress',
    Shared:        'badge badge-status-shared',
    Returned:      'badge badge-status-returned',
    Resolved:      'badge badge-status-resolved',
    Closed:        'badge badge-status-closed',
  };
  return map[status] ?? 'badge badge-blue';
}

/** Time-of-day greeting. */
function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PanelHeader({ title, count }) {
  return (
    <div className={styles.panelHeader}>
      <h2 className={styles.panelTitle}>{title}</h2>
      {count != null && (
        <span className={styles.panelCount}>{count}</span>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return <p className={styles.emptyState}>{message}</p>;
}

/** Single row in the "My Work" panel. */
function WorkItem({ ticket }) {
  const navigate = useNavigate();
  const subject =
    ticket.documentId?.title ??
    ticket.documentId?.emailSubject ??
    '(Untitled)';

  return (
    <div className={styles.workItem}>
      <div className={styles.workItemMain}>
        <div className={styles.workItemTop}>
          <span className={styles.ticketId}>{ticket.ticketId}</span>
          <span
            className={styles.priorityLabel}
            style={PRIORITY_STYLE[ticket.priority] ?? {}}
          >
            {ticket.priority}
          </span>
        </div>

        <p className={styles.workItemSubject}>{subject}</p>

        <div className={styles.workItemMeta}>
          <span className={statusBadgeClass(ticket.status)}>
            {ticket.status}
          </span>
          <span className={styles.metaDot} />
          <span className={styles.metaTime}>{timeAgo(ticket.updatedAt)}</span>
          {ticket.assignedTo?.name && (
            <>
              <span className={styles.metaDot} />
              <span className={styles.metaOfficer}>{ticket.assignedTo.name}</span>
            </>
          )}
        </div>
      </div>

      <button
        className={`btn btn-ghost ${styles.openBtn}`}
        onClick={() => navigate(`/tickets/${ticket._id}`)}
      >
        Open
      </button>
    </div>
  );
}

/** Single row in the "Shared Requests" panel. */
function SharedItem({ ticket, userDept }) {
  const navigate   = useNavigate();
  const sourceDept = ticket.ownerDepartment ?? ticket.department ?? '—';
  const subject    =
    ticket.documentId?.title ??
    ticket.documentId?.emailSubject ??
    '(Untitled)';

  return (
    <div className={styles.sharedItem}>
      <div className={styles.sharedMain}>
        {/* Source dept → this dept */}
        <div className={styles.sharedRoute}>
          <span className={styles.sharedFrom}>{sourceDept}</span>
          <span className={styles.sharedArrow}>→</span>
          <span className={styles.sharedTo}>{userDept}</span>
        </div>

        <span className={styles.ticketId}>{ticket.ticketId}</span>
        <p className={styles.sharedSubject}>{subject}</p>
        <span className={`badge badge-blue ${styles.sharedBadge}`}>Shared</span>
      </div>

      <button
        className={`btn btn-ghost ${styles.openBtn}`}
        onClick={() => navigate(`/tickets/${ticket._id}`)}
      >
        Open
      </button>
    </div>
  );
}

/** Horizontal bar breakdown of ticket statuses for the department. */
function WorkloadBars({ tickets }) {
  const total = Math.max(tickets.length, 1);

  const bars = [
    {
      label: 'Pending',
      count: tickets.filter(t => ['New', 'Assigned'].includes(t.status)).length,
      color: 'var(--color-warning)',
    },
    {
      label: 'In Progress',
      count: tickets.filter(t => t.status === 'In Progress').length,
      color: 'var(--color-primary)',
    },
    {
      label: 'Shared',
      count: tickets.filter(t => t.status === 'Shared').length,
      color: 'var(--color-accent)',
    },
    {
      label: 'Resolved',
      count: tickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length,
      color: 'var(--color-success)',
    },
  ];

  return (
    <div className={styles.workloadBars}>
      {bars.map(({ label, count, color }) => (
        <div key={label} className={styles.barRow}>
          <span className={styles.barLabel}>{label}</span>
          <div className={styles.barTrack} role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={total}>
            <div
              className={styles.barFill}
              style={{
                width: `${Math.max((count / total) * 100, count > 0 ? 2 : 0)}%`,
                background: color,
              }}
            />
          </div>
          <span className={styles.barCount}>{count}</span>
        </div>
      ))}
    </div>
  );
}

/** Timeline-style activity feed derived from recently-updated tickets. */
function ActivityFeed({ tickets }) {
  if (!tickets.length) return <EmptyState message="No recent activity." />;

  const STATUS_DOT_COLOR = {
    New:           'var(--color-primary)',
    Assigned:      'var(--color-primary)',
    'In Progress': 'var(--color-warning)',
    Shared:        'var(--color-accent)',
    Returned:      'var(--color-danger)',
    Resolved:      'var(--color-success)',
    Closed:        'var(--color-success)',
  };

  const items = [...tickets]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 8);

  return (
    <ul className={styles.activityList}>
      {items.map(t => (
        <li key={t._id} className={styles.activityItem}>
          <span
            className={styles.activityDot}
            style={{ background: STATUS_DOT_COLOR[t.status] ?? 'var(--color-text-dim)' }}
            aria-hidden="true"
          />
          <div className={styles.activityBody}>
            <span className={styles.activityTicketId}>{t.ticketId}</span>
            <span className={styles.activityMsg}>Status: {t.status}</span>
          </div>
          <span className={styles.activityTime}>{timeAgo(t.updatedAt)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Compact recent documents table with source badge (Email / Manual). */
function DocsTable({ docs }) {
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

export default function OfficerDashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Derived ticket sets
  const [ownedTickets, setOwnedTickets] = useState([]);   // dept-owned tickets
  const [myAssigned,   setMyAssigned]   = useState([]);   // assigned to me
  const [sharedWithMe, setSharedWithMe] = useState([]);   // shared with my dept from other depts
  const [leaveRequests, setLeaveRequests] = useState([]); // leave requests for HR dept
  const [recentDocs,   setRecentDocs]   = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsResp, docsResp] = await Promise.all([
        // Fetch enough tickets to cover the full dept view
        ticketService.getAll({ limit: 200 }),
        documentService.getAll({ limit: 8 }),
      ]);

      const allTickets = extractList(ticketsResp, 'tickets');
      const allDocs    = extractList(docsResp,    'documents', 'docs');

      const myId   = String(user.id ?? user._id ?? '');
      const myDept = user.department;

      // Tickets owned by this department
      const owned = allTickets.filter(
        t => (t.ownerDepartment ?? t.department) === myDept
      );

      // My personally-assigned tickets (subset of owned)
      const assigned = owned.filter(t => isAssignedToMe(t, myId));

      // Tickets shared WITH this dept FROM another dept
      const sharedIn = allTickets.filter(t => {
        const ownerDept = t.ownerDepartment ?? t.department;
        if (ownerDept === myDept) return false;
        return t.sharedWith?.some(s => s.department === myDept);
      });

      // Leave requests (for HR only)
      const leaves = myDept === 'HR'
        ? allTickets.filter(t => t.requestType === 'leave' && t.status !== 'Closed')
        : [];

      setOwnedTickets(owned);
      setMyAssigned(assigned);
      setSharedWithMe(sharedIn);
      setLeaveRequests(leaves);
      setRecentDocs(allDocs);
    } catch (err) {
      setError(
        err?.response?.data?.message ??
        err?.message ??
        'Failed to load dashboard data.'
      );
    } finally {
      setLoading(false);
    }
  }, [user.id, user._id, user.department]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.centerState} aria-busy="true">
        <Spinner size={36} />
        <p>Loading dashboard…</p>
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

  // ── Computed values ──────────────────────────────────────────────────────
  const firstName = user.name?.split(' ')[0] ?? 'Officer';
  const dept      = user.department ?? 'Department';
  const dateStr   = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // KPI: "Need Action" = pending/in-progress from my assigned set
  const needAction   = myAssigned.filter(t =>
    ['New', 'Assigned', 'In Progress'].includes(t.status)
  );
  const highPriority = needAction.filter(t =>
    ['High', 'Critical'].includes(t.priority)
  );
  const resolved     = ownedTickets.filter(t =>
    ['Resolved', 'Closed'].includes(t.status)
  );

  // My Work list: priority-first, then recency, capped at 6
  const myWorkList = [...myAssigned]
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    })
    .slice(0, 6);

  // Shared requests: most recent first, capped at 6
  const sharedList = [...sharedWithMe]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section className={`page-enter ${styles.page}`}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>{dept} Department · {dateStr}</p>
        </div>
      </header>

      {/* ── WELCOME ────────────────────────────────────────────────────── */}
      <div className={styles.welcome}>
        <p className={styles.greetingText}>{greetingWord()}, {firstName}</p>
        <p className={styles.greetingSub}>Here's what needs your attention today.</p>
      </div>

      {/* ── KPI ROW ────────────────────────────────────────────────────── */}
      <div className={styles.kpiGrid} role="list" aria-label="Key performance indicators">
        <div role="listitem">
          <KpiCard
            label="My Tickets"
            value={myAssigned.length}
            accent="var(--color-primary)"
          />
        </div>
        <div role="listitem">
          <KpiCard
            label="Need Action"
            value={needAction.length}
            accent="var(--color-warning)"
            secondary={highPriority.length > 0 ? highPriority.length : undefined}
            secondaryLabel="high priority"
          />
        </div>
        <div role="listitem">
          <KpiCard
            label="Shared With Dept"
            value={sharedWithMe.length}
            accent="var(--color-accent)"
          />
        </div>
        <div role="listitem">
          <KpiCard
            label="Resolved"
            value={resolved.length}
            accent="var(--color-success)"
          />
        </div>
      </div>

      {/* ── MAIN WORK AREA (My Work | Shared Requests) ─────────────────── */}
      <div className={styles.twoCol}>

        {/* MY WORK */}
        <section className={styles.panel} aria-labelledby="my-work-title">
          <PanelHeader title="My Work" count={myAssigned.length} />
          <div className={styles.workList}>
            {myWorkList.length === 0
              ? <EmptyState message="No tickets currently assigned to you." />
              : myWorkList.map(t => <WorkItem key={t._id} ticket={t} />)
            }
          </div>
        </section>

        {/* SHARED REQUESTS or LEAVE REQUESTS (for HR) */}
        <section className={styles.panel} aria-labelledby="requests-title">
          <PanelHeader title={user.department === 'HR' ? "Leave Requests" : "Shared Requests"} count={user.department === 'HR' ? leaveRequests.length : sharedWithMe.length} />
          <div className={styles.workList}>
            {user.department === 'HR' ? (
              // Leave Requests for HR
              leaveRequests.length === 0
                ? <EmptyState message="No pending leave requests." />
                : leaveRequests.map(t => (
                    <div key={t._id} className={styles.workItem}>
                      <div className={styles.workItemMain}>
                        <div className={styles.workItemTop}>
                          <span className={styles.ticketId}>{t.ticketId}</span>
                          <span className={`badge ${statusBadgeClass(t.status)}`}>{t.status}</span>
                        </div>
                        <p className={styles.sharedSubject}>
                          {t.leaveRequestData?.leaveType} Leave • {t.requester?.name || 'Unknown'}
                        </p>
                        <p className={styles.sharedMeta}>
                          {new Date(t.leaveRequestData?.startDate).toLocaleDateString()} → {new Date(t.leaveRequestData?.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
            ) : (
              // Shared Requests for other departments
              sharedList.length === 0
                ? <EmptyState message="No shared requests at this time." />
                : sharedList.map(t => (
                    <SharedItem key={t._id} ticket={t} userDept={dept} />
                  ))
            )}
          </div>
        </section>

      </div>

      {/* ── SECOND ROW (Workload | Activity) ───────────────────────────── */}
      <div className={styles.twoColNarrow}>

        {/* TICKET WORKLOAD */}
        <section className={styles.panel} aria-labelledby="workload-title">
          <PanelHeader title="Ticket Workload" />
          <div className={styles.panelBody}>
            <WorkloadBars tickets={ownedTickets} />
            <p className={styles.workloadTotal}>
              {ownedTickets.length} total tickets in {dept} Department
            </p>
          </div>
        </section>

        {/* RECENT ACTIVITY */}
        <section className={styles.panel} aria-labelledby="activity-title">
          <PanelHeader title="Recent Activity" />
          <div className={styles.panelBody}>
            <ActivityFeed tickets={ownedTickets} />
          </div>
        </section>

      </div>

      {/* ── RECENT DOCUMENTS ───────────────────────────────────────────── */}
      <section className={styles.panel} aria-labelledby="docs-title">
        <PanelHeader title="Recent Documents" />
        <DocsTable docs={recentDocs} />
      </section>

    </section>
  );
}

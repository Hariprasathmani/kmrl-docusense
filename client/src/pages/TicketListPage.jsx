// pages/TicketListPage.jsx — KMRL Ticket Management · Ticket list
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../services/ticketService';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/UI/DataTable';
import Spinner from '../components/UI/Spinner';
import styles from './TicketListPage.module.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** Map priority → CSS module class */
const PRIORITY_CLASS = {
  Critical: styles.priorityCritical,
  High:     styles.priorityHigh,
  Medium:   styles.priorityMedium,
  Low:      styles.priorityLow,
};

/** Map status → CSS module class */
const STATUS_CLASS = {
  'New':         styles.statusNew,
  'Assigned':    styles.statusAssigned,
  'In Progress': styles.statusInProgress,
  'Shared':      styles.statusShared,
  'Returned':    styles.statusReturned,
  'Resolved':    styles.statusResolved,
  'Closed':      styles.statusClosed,
};

function PriorityBadge({ priority }) {
  return (
    <span className={`badge ${PRIORITY_CLASS[priority] ?? ''}`}>
      {priority ?? '—'}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_CLASS[status] ?? ''}`}>
      {status ?? '—'}
    </span>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const COLUMNS = [
  {
    key: 'ticketId',
    label: 'Ticket ID',
    render: (row) => (
      <span className={styles.ticketIdCell}>{row.ticketId}</span>
    ),
  },
  {
    key: 'title',
    label: 'Title',
    render: (row) => (
      <span className={styles.titleCell}>
        <span aria-hidden="true">🎫</span>
        <span className={styles.titleText}>
          {row.documentId?.title ?? 'Untitled'}
        </span>
      </span>
    ),
  },
  {
    key: 'department',
    label: 'Department',
    render: (row) => (
      <span className={styles.deptPill}>{row.department ?? '—'}</span>
    ),
  },
  {
    key: 'priority',
    label: 'Priority',
    render: (row) => <PriorityBadge priority={row.priority} />,
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: 'assignedTo',
    label: 'Assigned Officer',
    render: (row) =>
      row.assignedTo ? (
        <div className={styles.officerCell}>
          <span className={styles.officerName}>{row.assignedTo.name}</span>
          <span className={styles.officerEmail}>{row.assignedTo.email}</span>
        </div>
      ) : (
        <span style={{ color: 'var(--color-text-dim)', fontSize: '0.82rem' }}>Unassigned</span>
      ),
  },
  {
    key: 'createdAt',
    label: 'Created Date',
    render: (row) => (
      <time dateTime={row.createdAt} className={styles.dateCell}>
        {fmtDate(row.createdAt)}
      </time>
    ),
  },
];

const STATUSES  = ['New', 'Assigned', 'In Progress', 'Shared', 'Returned', 'Resolved', 'Closed'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const DEPARTMENTS = ['Finance', 'HR', 'Safety', 'Legal', 'Operations', 'IT'];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TicketListPage() {
  const navigate        = useNavigate();
  const { user }        = useAuth();

  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [statusF,  setStatusF]  = useState('');
  const [priorityF,setPriorityF]= useState('');
  const [deptF,    setDeptF]    = useState('');
  // Admin: filter by assignment state ('' | 'true' | 'false')
  const [assignedF, setAssignedF] = useState('');
  // Officer: toggle "My Assigned Tickets" view
  const [mineOnly,  setMineOnly]  = useState(false);
  const [deleting,  setDeleting]  = useState(null);

  // Handle delete ticket
  const handleDeleteTicket = async (ticketId, ticketIdLabel) => {
    if (!window.confirm(`Delete ticket ${ticketIdLabel}? This action cannot be undone and will also delete all associated data.`)) return;
    if (!window.confirm('Are you absolutely sure? This ticket will be permanently deleted.')) return;
    
    setDeleting(ticketId);
    try {
      await ticketService.delete(ticketId);
      setTickets(tickets.filter(t => t._id !== ticketId));
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Failed to delete ticket.');
    } finally {
      setDeleting(null);
    }
  };

  // Fetch on mount (and whenever filters change on server-filterable fields)
  useEffect(() => {
    let cancelled = false;

    const fetchTickets = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (statusF)   params.status   = statusF;
        if (priorityF) params.priority = priorityF;
        if (deptF && user?.role === 'Admin') params.department = deptF;
        // Admin: assignment filter
        if (user?.role === 'Admin' && assignedF) params.assigned = assignedF;
        // Officer: my tickets only
        if (user?.role === 'Department Officer' && mineOnly) params.mine = 'true';

        const { data } = await ticketService.getAll(params);
        if (!cancelled) {
          const list = Array.isArray(data?.data) ? data.data : [];
          setTickets(list);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ?? err?.message ?? 'Failed to load tickets.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTickets();
    return () => { cancelled = true; };
  }, [statusF, priorityF, deptF, assignedF, mineOnly, user]);

  // Client-side text search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) =>
      [t.ticketId, t.documentId?.title, t.department, t.status, t.assignedTo?.name]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q))
    );
  }, [tickets, search]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className={`page-enter ${styles.centerState}`} aria-busy="true">
        <Spinner size={44} />
        <p className={styles.stateText}>Loading tickets…</p>
      </section>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <section className={`page-enter ${styles.centerState}`} role="alert">
        <span className={styles.stateIcon} aria-hidden="true">⚠️</span>
        <h2 className={styles.stateTitle}>Could not load tickets</h2>
        <p className={styles.stateText}>{error}</p>
        <button
          className="btn btn-ghost"
          onClick={() => window.location.reload()}
          style={{ marginTop: '1rem' }}
        >
          Retry
        </button>
      </section>
    );
  }

  // ── Page ──────────────────────────────────────────────────────────────────
  return (
    <section className={`page-enter ${styles.page}`}>

      {/* Header */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Tickets</h1>
          <p className={styles.pageSubtitle}>
            {mineOnly
              ? `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} assigned to you`
              : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} in the system`}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/upload')}
          aria-label="Upload document to create a new ticket"
        >
          <span aria-hidden="true">＋</span> New Ticket
        </button>
      </header>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Text search */}
        <div className={styles.searchWrap}>
          <input
            id="ticket-search"
            type="search"
            className={`input ${styles.searchInput}`}
            placeholder="Search ticket ID, title, officer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tickets"
          />
        </div>

        {/* Status filter */}
        <select
          id="ticket-status-filter"
          className={styles.filterSelect}
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Priority filter */}
        <select
          id="ticket-priority-filter"
          className={styles.filterSelect}
          value={priorityF}
          onChange={(e) => setPriorityF(e.target.value)}
          aria-label="Filter by priority"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Dept filter — Admin only */}
        {user?.role === 'Admin' && (
          <select
            id="ticket-dept-filter"
            className={styles.filterSelect}
            value={deptF}
            onChange={(e) => setDeptF(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}

        {/* Assignment filter — Admin only */}
        {user?.role === 'Admin' && (
          <select
            id="ticket-assigned-filter"
            className={styles.filterSelect}
            value={assignedF}
            onChange={(e) => setAssignedF(e.target.value)}
            aria-label="Filter by assignment"
          >
            <option value="">All (Assigned &amp; Unassigned)</option>
            <option value="false">Unassigned only</option>
            <option value="true">Assigned only</option>
          </select>
        )}

        {/* My Assigned Tickets toggle — Department Officer only */}
        {user?.role === 'Department Officer' && (
          <button
            className={mineOnly ? styles.activeFilterBtn : styles.filterToggleBtn}
            onClick={() => setMineOnly((v) => !v)}
            aria-pressed={mineOnly}
          >
            {mineOnly ? '✓ My Assigned Tickets' : 'My Assigned Tickets'}
          </button>
        )}

        <span className={styles.resultCount} aria-live="polite" aria-atomic="true">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <div className={`glass-card ${styles.emptyState}`} role="status">
          <span className={styles.stateIcon} aria-hidden="true">
            {search || statusF || priorityF || deptF || assignedF || mineOnly ? '🔎' : '🎫'}
          </span>
          <h2 className={styles.stateTitle}>
            {mineOnly
              ? 'No tickets assigned to you'
              : search || statusF || priorityF || deptF || assignedF
                ? 'No tickets match your filters'
                : 'No tickets yet'}
          </h2>
          <p className={styles.stateText}>
            {mineOnly
              ? 'Tickets assigned to you by Admin will appear here.'
              : search || statusF || priorityF || deptF || assignedF
                ? 'Try adjusting your search or filters.'
                : 'Upload a document to automatically generate your first ticket.'}
          </p>
          {!search && !statusF && !priorityF && !deptF && !assignedF && !mineOnly && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/upload')}
              style={{ marginTop: '1.25rem' }}
            >
              Upload Document
            </button>
          )}
        </div>
      ) : (
        <div className={`glass-card ${styles.tableCard}`}>
          <DataTable
            columns={user?.role === 'Admin' ? [
              ...COLUMNS,
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <button
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTicket(row._id, row.ticketId);
                    }}
                    disabled={deleting === row._id}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    title="Delete this ticket"
                  >
                    {deleting === row._id ? 'Deleting…' : 'Delete'}
                  </button>
                ),
              },
            ] : COLUMNS}
            rows={filtered}
            rowKey="_id"
            onRowClick={(row) => navigate(`/tickets/${row._id}`)}
            ariaLabel="Tickets list"
          />
        </div>
      )}

    </section>
  );
}

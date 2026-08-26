// pages/MySubmissionsPage.jsx — Employee's "My Submissions" page (cross-department)
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../services/ticketService';
import DataTable from '../components/UI/DataTable';
import Badge from '../components/UI/Badge';
import Spinner from '../components/UI/Spinner';
import styles from './MySubmissionsPage.module.css';

// Map ticket status to badge variant
const STATUS_VARIANT = {
  'New': 'pending',
  'Assigned': 'pending',
  'In Progress': 'processing',
  'Shared': 'processing',
  'Resolved': 'completed',
  'Closed': 'completed',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Column definitions
const COLUMNS = [
  {
    key: 'ticketId',
    label: 'Request ID',
    render: (row) => (
      <span className={styles.ticketIdCell} style={{ fontFamily: 'monospace', color: 'var(--color-accent)' }}>
        {row.ticketId}
      </span>
    ),
  },
  {
    key: 'title',
    label: 'Request',
    render: (row) => {
      const title = row.requestType === 'leave'
        ? `${row.leaveRequestData?.leaveType} Leave`
        : row.documentId?.title || 'Untitled Request';
      const icon = row.requestType === 'leave' ? '📅' : '📄';
      return (
        <span className={styles.titleCell}>
          <span className={styles.docIcon} aria-hidden="true">{icon}</span>
          <span className={styles.titleText}>{title}</span>
        </span>
      );
    },
  },
  {
    key: 'department',
    label: 'Sent To',
    render: (row) => (
      <span className={styles.deptPill}>{row.department || '—'}</span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => (
      <Badge
        label={(row.status || '—').replace(/^\w/, (c) => c.toUpperCase())}
        variant={STATUS_VARIANT[row.status] || 'pending'}
      />
    ),
  },
  {
    key: 'createdAt',
    label: 'Submitted',
    render: (row) => (
      <time dateTime={row.createdAt} className={styles.dateCell}>
        {fmtDate(row.createdAt)}
      </time>
    ),
  },
  {
    key: 'updatedAt',
    label: 'Last Updated',
    render: (row) => (
      <time dateTime={row.updatedAt} className={styles.dateCell}>
        {fmtDate(row.updatedAt)}
      </time>
    ),
  },
];

export default function MySubmissionsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Fetch tickets — memoized to prevent constant re-renders
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await ticketService.getMyTickets();
      const list = Array.isArray(data?.data) ? data.data : [];
      setTickets(list);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load your submissions.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch tickets on mount
  useEffect(() => {
    console.log('[MySubmissionsPage] Initial fetch');
    fetchTickets();
  }, [fetchTickets]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    console.log('[MySubmissionsPage] Setting up auto-refresh');
    const interval = setInterval(() => {
      console.log('[MySubmissionsPage] Auto-refresh triggered');
      fetchTickets();
    }, 5000);

    return () => {
      console.log('[MySubmissionsPage] Clearing auto-refresh');
      clearInterval(interval);
    };
  }, [fetchTickets]);

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = tickets;

    // Status filter
    if (statusFilter) {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Type filter
    if (typeFilter) {
      if (typeFilter === 'leave') {
        result = result.filter((t) => t.requestType === 'leave');
      } else if (typeFilter === 'document') {
        result = result.filter((t) => !t.requestType || t.requestType !== 'leave');
      }
    }

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((t) =>
        [
          t.ticketId,
          t.documentId?.title,
          t.leaveRequestData?.leaveType,
          t.department,
          t.status,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      );
    }

    return result;
  }, [tickets, search, statusFilter, typeFilter]);

  // Row click → navigate to detail
  const handleRowClick = (row) => {
    navigate(`/my-tickets/${row._id}`);
  };

  if (loading) {
    return (
      <section className={`page-enter ${styles.centerState}`} aria-busy="true">
        <Spinner size={44} />
        <p className={styles.stateText}>Loading your submissions…</p>
      </section>
    );
  }

  return (
    <section className={`page-enter ${styles.page}`}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Submissions</h1>
          <p className={styles.pageSubtitle}>
            {tickets.length} submission{tickets.length !== 1 ? 's' : ''} tracked (across all departments)
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/upload')}
            aria-label="Submit new document request"
          >
            <span aria-hidden="true">📄</span> New Document
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/leave-request')}
            aria-label="Submit new leave request"
          >
            <span aria-hidden="true">📅</span> Leave Request
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.errorBox} role="alert">
          <span aria-hidden="true">⚠️</span>
          <p>{error}</p>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <input
            id="submissions-search"
            type="search"
            className={`input ${styles.searchInput}`}
            placeholder="Search by ID, title, or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search submissions"
          />
        </div>

        <div className={styles.filterWrap}>
          <select
            className={`input ${styles.filterSelect}`}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by request type"
          >
            <option value="">All Types</option>
            <option value="document">Documents</option>
            <option value="leave">Leave Requests</option>
          </select>
        </div>

        <div className={styles.filterWrap}>
          <select
            className={`input ${styles.filterSelect}`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Shared">Shared</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <span className={styles.resultCount} aria-live="polite" aria-atomic="true">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <div className={`glass-card ${styles.emptyState}`} role="status">
          <span className={styles.stateIcon} aria-hidden="true">
            {search || statusFilter || typeFilter ? '🔎' : '📭'}
          </span>
          <h2 className={styles.stateTitle}>
            {search || statusFilter || typeFilter ? 'No submissions match your search' : 'No submissions yet'}
          </h2>
          <p className={styles.stateText}>
            {search || statusFilter || typeFilter
              ? 'Try a different search term or clear the filter.'
              : 'Submit your first request to get started.'}
          </p>
          {!search && !statusFilter && !typeFilter && (
            <div className={styles.ctaButtons}>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/upload')}
              >
                Submit Document
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/leave-request')}
              >
                Request Leave
              </button>
            </div>
          )}
          {(search || statusFilter || typeFilter) && (
            <button
              className="btn btn-ghost"
              onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }}
              style={{ marginTop: '1.25rem' }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className={`glass-card ${styles.tableCard}`}>
          <DataTable
            columns={COLUMNS}
            rows={filtered}
            rowKey="_id"
            onRowClick={handleRowClick}
            ariaLabel="Your submissions list"
          />
        </div>
      )}
    </section>
  );
}

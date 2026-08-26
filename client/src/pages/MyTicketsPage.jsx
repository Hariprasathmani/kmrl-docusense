// pages/MyTicketsPage.jsx — Employee's "My Tickets" page
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../services/ticketService';
import DataTable from '../components/UI/DataTable';
import Badge from '../components/UI/Badge';
import Spinner from '../components/UI/Spinner';
import styles from './MyTicketsPage.module.css';

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
    label: 'Ticket ID',
    render: (row) => (
      <span className={styles.ticketIdCell} style={{ fontFamily: 'monospace', color: 'var(--color-accent)' }}>
        {row.ticketId}
      </span>
    ),
  },
  {
    key: 'title',
    label: 'Request',
    render: (row) => (
      <span className={styles.titleCell}>
        <span className={styles.docIcon} aria-hidden="true">📄</span>
        <span className={styles.titleText}>{row.documentId?.title || 'Untitled Request'}</span>
      </span>
    ),
  },
  {
    key: 'department',
    label: 'Department',
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

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
        'Failed to load your tickets.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch tickets on mount
  useEffect(() => {
    console.log('[MyTicketsPage] Initial fetch');
    fetchTickets();
  }, [fetchTickets]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    console.log('[MyTicketsPage] Setting up auto-refresh');
    const interval = setInterval(() => {
      console.log('[MyTicketsPage] Auto-refresh triggered');
      fetchTickets();
    }, 5000);

    return () => {
      console.log('[MyTicketsPage] Clearing auto-refresh');
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

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((t) =>
        [t.ticketId, t.documentId?.title, t.department, t.status]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      );
    }

    return result;
  }, [tickets, search, statusFilter]);

  // Row click → navigate to detail
  const handleRowClick = (row) => {
    navigate(`/my-tickets/${row._id}`);
  };

  if (loading) {
    return (
      <section className={`page-enter ${styles.centerState}`} aria-busy="true">
        <Spinner size={44} />
        <p className={styles.stateText}>Loading your tickets…</p>
      </section>
    );
  }

  return (
    <section className={`page-enter ${styles.page}`}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Tickets</h1>
          <p className={styles.pageSubtitle}>
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} submitted by you
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate('/upload')}
          aria-label="Submit new request"
        >
          <span aria-hidden="true">＋</span> New Request
        </button>
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
            id="tickets-search"
            type="search"
            className={`input ${styles.searchInput}`}
            placeholder="Search by ticket ID, title, or status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tickets"
          />
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
            {search || statusFilter ? '🔎' : '📭'}
          </span>
          <h2 className={styles.stateTitle}>
            {search || statusFilter ? 'No tickets match your search' : 'No tickets yet'}
          </h2>
          <p className={styles.stateText}>
            {search || statusFilter
              ? 'Try a different search term or clear the filter.'
              : 'Submit your first request to get started.'}
          </p>
          {!search && !statusFilter && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/upload')}
              style={{ marginTop: '1.25rem' }}
            >
              Create New Request
            </button>
          )}
          {(search || statusFilter) && (
            <button
              className="btn btn-ghost"
              onClick={() => { setSearch(''); setStatusFilter(''); }}
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
            ariaLabel="Your tickets list"
          />
        </div>
      )}
    </section>
  );
}

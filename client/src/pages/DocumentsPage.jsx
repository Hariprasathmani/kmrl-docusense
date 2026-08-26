// pages/DocumentsPage.jsx — KMRL DocuSense · Document list
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService } from '../services/documentService';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/UI/DataTable';
import Badge from '../components/UI/Badge';
import Spinner from '../components/UI/Spinner';
import styles from './DocumentsPage.module.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map document status → Badge variant key */
const STATUS_VARIANT = {
  pending: 'pending',
  processing: 'processing',
  routed: 'completed',
  completed: 'completed',
  failed: 'failed',
};

/** Format ISO date string to readable locale date */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Render a confidence bar + numeric score */
function ConfidenceCell({ score }) {
  if (score == null) return <span style={{ color: 'var(--color-text-dim)' }}>—</span>;

  const pct = Math.max(0, Math.min(100, Number(score)));

  const color =
    pct >= 80
      ? 'var(--color-success)'
      : pct >= 50
        ? 'var(--color-warning)'
        : 'var(--color-danger)';

  return (
    <div className={styles.confCell}>
      <div className={styles.confBarWrap}>
        <div className={styles.confBar} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.confScore} style={{ color }}>{pct}%</span>
    </div>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────
const COLUMNS = [
  {
    key: 'title',
    label: 'Title',
    render: (row) => (
      <span className={styles.titleCell}>
        <span className={styles.docIcon} aria-hidden="true">📄</span>
        <span className={styles.titleText}>{row.title ?? row.filename ?? '—'}</span>
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
    key: 'source',
    label: 'Source',
    render: (row) => (
      <span title={row.source === 'email' ? `${row.emailSender || 'Unknown sender'} — ${row.emailSubject || 'No subject'}` : 'Manual upload'}>
        {row.source === 'email' ? 'Email' : 'Manual Upload'}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => (
      <Badge
        label={(row.status ?? '—').replace(/^\w/, (c) => c.toUpperCase())}
        variant={STATUS_VARIANT[row.status] ?? 'processing'}
      />
    ),
  },
  {
    key: 'confidenceScore',
    label: 'Confidence',
    render: (row) => <ConfidenceCell score={row.confidenceScore ?? row.confidence_score} />,
  },
  {
    key: 'createdAt',
    label: 'Created',
    render: (row) => (
      <time dateTime={row.createdAt} className={styles.dateCell}>
        {fmtDate(row.createdAt ?? row.created_at)}
      </time>
    ),
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  // Handle delete action
  const handleDelete = async (docId, docTitle) => {
    if (!window.confirm(`Delete "${docTitle}"? This action cannot be undone and will also delete all associated files and tickets.`)) return;
    if (!window.confirm('Are you absolutely sure? This document will be permanently deleted.')) return;
    
    setDeleting(docId);
    try {
      await documentService.remove(docId);
      setDocuments(documents.filter(d => d._id !== docId));
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Failed to delete document.');
    } finally {
      setDeleting(null);
    }
  };

  // Fetch on mount
  useEffect(() => {
    let cancelled = false;

    const fetchDocs = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await documentService.getAll();
        if (!cancelled) {
          // Support { data: [...] }, { data: { data: [...] } }, or plain array
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : [];
          setDocuments(list);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message
            ?? err?.message
            ?? 'Failed to load documents.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDocs();
    return () => { cancelled = true; };
  }, []);

  // Client-side search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((doc) =>
      [doc.title, doc.filename, doc.department, doc.status, doc.source, doc.emailSender, doc.emailSubject]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [documents, search]);

  // Row click → navigate to detail
  const handleRowClick = (row) => {
    navigate(`/documents/${row._id ?? row.id}`);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className={`page-enter ${styles.centerState}`} aria-busy="true">
        <Spinner size={44} />
        <p className={styles.stateText}>Loading documents…</p>
      </section>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <section className={`page-enter ${styles.centerState}`} role="alert">
        <span className={styles.stateIcon} aria-hidden="true">⚠️</span>
        <h2 className={styles.stateTitle}>Could not load documents</h2>
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

      {/* Header row */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Documents</h1>
          <p className={styles.pageSubtitle}>
            {documents.length} document{documents.length !== 1 ? 's' : ''} in the system
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate('/upload')}
          aria-label="Upload new document"
        >
          <span aria-hidden="true">＋</span> Upload
        </button>
      </header>

      {/* Search bar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <input
            id="documents-search"
            type="search"
            className={`input ${styles.searchInput}`}
            placeholder="Search by title, department, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search documents"
          />
        </div>

        <span className={styles.resultCount} aria-live="polite" aria-atomic="true">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <div className={`glass-card ${styles.emptyState}`} role="status">
          <span className={styles.stateIcon} aria-hidden="true">
            {search ? '🔎' : '📭'}
          </span>
          <h2 className={styles.stateTitle}>
            {search ? 'No documents match your search' : 'No documents yet'}
          </h2>
          <p className={styles.stateText}>
            {search
              ? 'Try a different search term or clear the filter.'
              : 'Upload your first document to get started.'}
          </p>
          {!search && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/upload')}
              style={{ marginTop: '1.25rem' }}
            >
              Upload Document
            </button>
          )}
          {search && (
            <button
              className="btn btn-ghost"
              onClick={() => setSearch('')}
              style={{ marginTop: '1.25rem' }}
            >
              Clear Search
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
                      handleDelete(row._id, row.title ?? row.filename ?? 'Document');
                    }}
                    disabled={deleting === row._id}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    title="Delete this document"
                  >
                    {deleting === row._id ? 'Deleting…' : 'Delete'}
                  </button>
                ),
              },
            ] : COLUMNS}
            rows={filtered}
            rowKey="_id"
            onRowClick={handleRowClick}
            ariaLabel="Documents list"
          />
        </div>
      )}

    </section>
  );
}

// pages/DocumentsPage.jsx — KMRL DocuSense · Document list with Lucide icons
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, AlertTriangle, Inbox, Trash2 } from 'lucide-react';
import { documentService } from '../services/documentService';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/UI/DataTable';
import Badge from '../components/UI/Badge';
import DepartmentBadge from '../components/UI/DepartmentBadge';
import StatusBadge from '../components/UI/StatusBadge';
import Spinner from '../components/UI/Spinner';
import EmptyState from '../components/UI/EmptyState';
import PageHeader from '../components/UI/PageHeader';
import styles from './DocumentsPage.module.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
        <FileText size={16} className={styles.docIcon} aria-hidden="true" />
        <span className={styles.titleText}>{row.title ?? row.filename ?? '—'}</span>
      </span>
    ),
  },
  {
    key: 'department',
    label: 'Department',
    render: (row) => (
      row.department ? <DepartmentBadge department={row.department} /> : <span>—</span>
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
      <StatusBadge status={row.status ?? 'pending'} />
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
        <AlertTriangle size={32} className={styles.stateIcon} />
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
      <PageHeader
        title="Documents"
        subtitle={`${documents.length} document${documents.length !== 1 ? 's' : ''} in the system`}
        actions={
          <button
            className="btn btn-primary"
            onClick={() => navigate('/upload')}
            aria-label="Upload new document"
          >
            <Plus size={16} aria-hidden="true" />
            Upload
          </button>
        }
      />

      {/* Search bar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} aria-hidden="true" />
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
        <EmptyState
          title={search ? 'No documents match your search' : 'No documents yet'}
          description={search
            ? 'Try a different search term or clear the filter.'
            : 'Upload your first document to get started.'}
          Icon={search ? Search : Inbox}
          action={
            !search && (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/upload')}
              >
                <Plus size={16} aria-hidden="true" />
                Upload Document
              </button>
            )
          }
        />
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
                    <Trash2 size={14} aria-hidden="true" />
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

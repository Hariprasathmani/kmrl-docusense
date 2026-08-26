// pages/DocumentDetailPage.jsx — Single document detail view
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { documentService } from '../services/documentService';
import Badge from '../components/UI/Badge';
import Spinner from '../components/UI/Spinner';
import Collapsible from '../components/UI/Collapsible';
import styles from './DocumentDetailPage.module.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_VARIANT = {
  pending: 'pending',
  processing: 'processing',
  routed: 'completed',
  completed: 'completed',
  failed: 'failed',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ConfidenceIndicator({ score }) {
  if (score == null) return <span className={styles.mutedText}>—</span>;

  const pct = Math.max(0, Math.min(100, Number(score)));
  let color = 'var(--color-danger)';
  if (pct >= 80) color = 'var(--color-success)';
  else if (pct >= 50) color = 'var(--color-warning)';

  return (
    <div className={styles.confWrap}>
      <span className={styles.confScore} style={{ color }}>{pct}%</span>
      <div className={styles.confBarBg}>
        <div className={styles.confBarFill} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sharing State
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareDept, setShareDept] = useState('');
  const [shareReason, setShareReason] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchDoc = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await documentService.getById(id);
        if (!cancelled) {
          setDoc(data?.data ?? data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.status === 404
              ? 'Document not found'
              : err?.response?.data?.message ?? err?.message ?? 'Failed to load document'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDoc();
    return () => { cancelled = true; };
  }, [id]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleShare = async (e) => {
    e.preventDefault();
    if (!shareDept) return;
    
    setShareLoading(true);
    setShareError('');
    setShareSuccess('');
    
    try {
      const { data } = await documentService.share(id, { department: shareDept, reason: shareReason });
      setDoc(data?.data ?? data);
      setShowShareForm(false);
      setShareDept('');
      setShareReason('');
      setShareSuccess(`Document shared successfully with ${shareDept}.`);
      setTimeout(() => setShareSuccess(''), 4000);
    } catch (err) {
      setShareError(err?.response?.data?.message ?? 'Failed to share document.');
    } finally {
      setShareLoading(false);
    }
  };

  const handleUnshare = async (dept) => {
    if (!window.confirm(`Revoke access for ${dept}?`)) return;
    
    try {
      const { data } = await documentService.unshare(id, dept);
      setDoc(data?.data ?? data);
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Failed to revoke share.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this document permanently? This action cannot be undone and will also delete all associated files and tickets.')) return;
    if (!window.confirm('Are you absolutely sure? This document will be permanently deleted.')) return;
    
    try {
      await documentService.remove(id);
      alert('Document deleted successfully. Redirecting to documents list...');
      setTimeout(() => navigate('/documents'), 1500);
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Failed to delete document.');
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className={`page-enter ${styles.centerState}`}>
        <Spinner size={44} />
        <p className={styles.stateText}>Loading document details…</p>
      </section>
    );
  }

  // ── Error / Not Found ─────────────────────────────────────────────────────
  if (error) {
    return (
      <section className={`page-enter ${styles.centerState}`} role="alert">
        <span className={styles.stateIcon} aria-hidden="true">
          {error === 'Document not found' ? '🔍' : '⚠️'}
        </span>
        <h2 className={styles.stateTitle}>{error}</h2>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/documents')}
          style={{ marginTop: '1rem' }}
        >
          Back to Documents
        </button>
      </section>
    );
  }

  if (!doc) return null;

  // ── Page ──────────────────────────────────────────────────────────────────
  return (
    <section className={`page-enter ${styles.page}`}>

      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/documents')} aria-label="Back to documents">
          ← Back
        </button>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>{doc.title ?? doc.filename ?? 'Untitled Document'}</h1>
          <div className={styles.badges}>
            <span className={styles.deptPill}>{doc.department ?? 'Unassigned'}</span>
            <Badge
              label={(doc.status ?? 'unknown').replace(/^\w/, c => c.toUpperCase())}
              variant={STATUS_VARIANT[doc.status] ?? 'processing'}
            />
          </div>
        </div>
      </header>

      <div className={styles.grid}>

        {/* Main Column */}
        <div className={styles.mainCol}>

          <div className={`glass-card ${styles.card}`}>
            <h3 className={styles.cardTitle}>AI Analysis</h3>
            <div className={styles.cardSection}>
              <h4 className={styles.subTitle}>Summary</h4>
              <p className={styles.summaryText}>{doc.summary ?? 'No summary available.'}</p>
            </div>
            <div className={styles.cardSection}>
              <h4 className={styles.subTitle}>Confidence Score</h4>
              <ConfidenceIndicator score={doc.confidenceScore ?? doc.confidence_score} />
            </div>
          </div>

          <div className={`glass-card ${styles.card}`}>
            <h3 className={styles.cardTitle}>Routing History</h3>
            {doc.routingHistory?.length > 0 ? (
              <ul className={styles.historyList}>
                {doc.routingHistory.map((event, idx) => (
                  <li key={idx} className={styles.historyItem}>
                    <div className={styles.historyDot} />
                    <div className={styles.historyContent}>
                      <div className={styles.historyHeader}>
                        <span className={styles.historyDept}>{event.department ?? event.action ?? 'Unknown Dept'}</span>
                        <Badge
                          label={(event.status ?? 'unknown').replace(/^\w/, c => c.toUpperCase())}
                          variant={STATUS_VARIANT[event.status] ?? 'processing'}
                        />
                      </div>
                      <div className={styles.historyMeta}>
                        <span className={styles.historyBy}>Routed by: {event.routedBy?.name ?? event.routedBy ?? 'System'}</span>
                        <span className={styles.historyDate}>{fmtDate(event.timestamp ?? event.routedAt)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.mutedText}>No routing history available.</p>
            )}
          </div>

          <Collapsible title="Extracted Text">
            <div className={styles.extractedTextWrap}>
              <pre className={styles.extractedText}>
                {doc.extractedText ?? 'No text extracted.'}
              </pre>
            </div>
          </Collapsible>

        </div>

        {/* Sidebar Column */}
        <aside className={styles.sideCol}>
          <div className={`glass-card ${styles.card}`}>
            <h3 className={styles.cardTitle}>Metadata</h3>

            <dl className={styles.metaList}>
              <div className={styles.metaRow}>
                <dt>Uploaded By</dt>
                <dd>{doc.uploadedBy?.name ?? doc.uploadedBy ?? 'System'}</dd>
              </div>

              <div className={styles.metaRow}>
                <dt>Upload Date</dt>
                <dd>{fmtDate(doc.createdAt ?? doc.created_at)}</dd>
              </div>

              <div className={styles.metaRow}>
                <dt>Document Type</dt>
                <dd>{doc.documentType ?? doc.document_type ?? 'Unknown Type'}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Source</dt>
                <dd>{doc.source === 'email' ? 'Email' : 'Manual Upload'}</dd>
              </div>
              {doc.source === 'email' && (
                <>
                  <div className={styles.metaRow}>
                    <dt>Sender</dt>
                    <dd>{doc.emailSender || 'Unknown sender'}</dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt>Email Subject</dt>
                    <dd>{doc.emailSubject || 'No subject'}</dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt>Received</dt>
                    <dd>{fmtDate(doc.emailReceivedAt)}</dd>
                  </div>
                </>
              )}
              {doc.ticketId && (
                <div className={styles.metaRow}>
                  <dt>Ticket</dt>
                  <dd>
                    <button
                      className="btn btn-link"
                      onClick={() => navigate(`/tickets/${doc.ticketId}`)}
                      style={{ color: 'var(--color-accent)', textDecoration: 'underline', cursor: 'pointer', padding: 0, border: 'none', background: 'none', font: 'inherit' }}
                    >
                      {doc.ticketId}
                    </button>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className={`glass-card ${styles.card}`}>
            <h3 className={styles.cardTitle}>Shared With</h3>
            {doc.sharedWith?.length > 0 ? (
              <ul className={styles.historyList} style={{ marginTop: '0.5rem' }}>
                {doc.sharedWith.map((share, idx) => (
                  <li key={idx} className={styles.historyItem} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div className={styles.historyContent}>
                      <div className={styles.historyHeader} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{share.department}</strong>
                        <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--color-danger)' }} onClick={() => handleUnshare(share.department)}>Unshare</button>
                      </div>
                      <div className={styles.historyMeta} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                        <span className={styles.historyBy}>Shared by: {share.sharedBy?.name ?? share.sharedBy ?? 'System'}</span>
                        <span className={styles.historyDate}>Date: {fmtDate(share.sharedAt)}</span>
                        {share.reason && <span className={styles.historyBy}>Reason: {share.reason}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.mutedText} style={{ marginTop: '0.5rem' }}>Not shared with any other departments.</p>
            )}

            {shareSuccess && (
              <div style={{ color: 'var(--color-success)', marginTop: '1rem', fontSize: '0.9rem' }}>{shareSuccess}</div>
            )}
            {shareError && (
              <div style={{ color: 'var(--color-danger)', marginTop: '1rem', fontSize: '0.9rem' }}>{shareError}</div>
            )}

            {showShareForm ? (
              <form onSubmit={handleShare} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 className={styles.subTitle}>Share Document</h4>
                <div>
                  <label className={styles.label} style={{ fontSize: '0.85rem' }}>Share with Department</label>
                  <select 
                    className="input" 
                    value={shareDept} 
                    onChange={e => setShareDept(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.5rem' }}
                  >
                    <option value="">Select Department ▼</option>
                    {['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT']
                      .filter(d => d !== doc.department)
                      .map(d => <option key={d} value={d}>{d}</option>)
                    }
                  </select>
                </div>
                <div>
                  <label className={styles.label} style={{ fontSize: '0.85rem' }}>Reason</label>
                  <input 
                    type="text" 
                    className="input"
                    value={shareReason}
                    onChange={e => setShareReason(e.target.value)}
                    placeholder="Optional reason..."
                    style={{ width: '100%', padding: '0.5rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowShareForm(false)} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={!shareDept || shareLoading} style={{ flex: 1 }}>{shareLoading ? 'Sharing...' : 'Share'}</button>
                </div>
              </form>
            ) : (
              <button 
                className={`btn btn-primary ${styles.fullWidthBtn}`} 
                onClick={() => setShowShareForm(true)}
                style={{ marginTop: '1.5rem' }}
              >
                Share Document
              </button>
            )}
          </div>

          {(doc.id || doc._id) && (
            <button
              className={`btn btn-ghost ${styles.fullWidthBtn}`}
              onClick={() => documentService.download(doc._id ?? doc.id)}
            >
              Download Original
            </button>
          )}

          {user?.role === 'Admin' && (
            <button
              className={`btn btn-danger ${styles.fullWidthBtn}`}
              onClick={handleDelete}
              style={{ marginTop: 'var(--space-2)', opacity: 0.7 }}
              title="Permanently delete this document and all associated files"
            >
              Delete Document
            </button>
          )}
        </aside>

      </div>
    </section>
  );
}

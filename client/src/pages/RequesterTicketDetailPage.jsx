// pages/RequesterTicketDetailPage.jsx — Requester's view of their ticket
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketService } from '../services/ticketService';
import Badge from '../components/UI/Badge';
import Spinner from '../components/UI/Spinner';
import Collapsible from '../components/UI/Collapsible';
import styles from './RequesterTicketDetailPage.module.css';

// Helper: format ISO date to readable format
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Status explanation helper
function getStatusExplanation(status) {
  const explanations = {
    'New': 'Your request has been received and is awaiting review.',
    'Assigned': 'Your request has been assigned to a department officer.',
    'In Progress': 'Your request is currently being processed.',
    'Shared': 'Your request is being reviewed with another department for additional expertise.',
    'Resolved': 'Your request has been resolved. See the response below.',
    'Closed': 'This request has been closed.',
  };
  return explanations[status] || 'Your request is being processed.';
}

// Status variant for badge
const STATUS_VARIANT = {
  'New': 'pending',
  'Assigned': 'pending',
  'In Progress': 'processing',
  'Shared': 'processing',
  'Resolved': 'completed',
  'Closed': 'completed',
};

export default function RequesterTicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch ticket data — memoized so it doesn't change every render
  const fetchTicket = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const { data } = await ticketService.getById(id);
      const ticketData = data?.data ?? data;
      console.log('[RequesterTicketDetailPage] Fetched ticket:', {
        ticketId: ticketData?.ticketId,
        status: ticketData?.status,
        resolutionMessage: ticketData?.resolutionMessage,
        resolvedAt: ticketData?.resolvedAt,
        isRefresh,
      });
      setTicket(ticketData);
    } catch (err) {
      console.error('[RequesterTicketDetailPage] Error fetching ticket:', err);
      setError(
        err?.response?.status === 404
          ? 'Ticket not found'
          : err?.response?.data?.message ?? err?.message ?? 'Failed to load ticket'
      );
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!cancelled) {
        await fetchTicket();
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  // Auto-refresh every 5 seconds to show updates
  useEffect(() => {
    console.log('[RequesterTicketDetailPage] Setting up auto-refresh for ticket:', id);
    const interval = setInterval(() => {
      console.log('[RequesterTicketDetailPage] Auto-refresh triggered for ticket:', id);
      fetchTicket(true);
    }, 5000);

    return () => {
      console.log('[RequesterTicketDetailPage] Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [fetchTicket]);

  if (loading) {
    return (
      <section className={`page-enter ${styles.centerState}`}>
        <Spinner size={44} />
        <p className={styles.stateText}>Loading ticket details…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`page-enter ${styles.centerState}`} role="alert">
        <span className={styles.stateIcon} aria-hidden="true">
          {error === 'Ticket not found' ? '🎫' : '⚠️'}
        </span>
        <h2 className={styles.stateTitle}>{error}</h2>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/my-tickets')}
          style={{ marginTop: '1rem' }}
        >
          Back to My Tickets
        </button>
      </section>
    );
  }

  if (!ticket) return null;

  const doc = ticket.documentId;
  const isResolved = ticket.status === 'Resolved';

  return (
    <section className={`page-enter ${styles.page}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/my-tickets')} aria-label="Back to my tickets">
          ← Back
        </button>
        <button 
          className={`${styles.backBtn} ${refreshing ? styles.rotating : ''}`}
          onClick={() => fetchTicket(true)}
          disabled={refreshing}
          title="Refresh ticket info"
          aria-label="Refresh ticket information"
        >
          {refreshing ? '⟳ Refreshing…' : '⟳ Refresh'}
        </button>

        <div className={styles.headerTop}>
          <div className={styles.titleGroup}>
            <span className={styles.ticketIdLabel}>{ticket.ticketId}</span>
            <h1 className={styles.title}>
              {ticket.requestType === 'leave'
                ? `${ticket.leaveRequestData?.leaveType} Leave Request`
                : doc?.title ?? 'Untitled Request'}
            </h1>
          </div>

          <div className={styles.badges}>
            <span className={styles.deptPill}>{ticket.department || 'Unknown'}</span>
            <Badge
              label={(ticket.status ?? 'unknown').replace(/^\w/, c => c.toUpperCase())}
              variant={STATUS_VARIANT[ticket.status] ?? 'processing'}
            />
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Status Overview */}
          <div className={`glass-card ${styles.card}`}>
            <h3 className={styles.cardTitle}>Status</h3>
            <div className={styles.statusOverview}>
              <p className={styles.statusExplanation}>
                {getStatusExplanation(ticket.status)}
              </p>
              <div className={styles.statusTimeline}>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot} aria-hidden="true" />
                  <div className={styles.timelineLabel}>
                    <strong>Submitted:</strong> {fmtDate(ticket.createdAt)}
                  </div>
                </div>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot} aria-hidden="true" />
                  <div className={styles.timelineLabel}>
                    <strong>Current Status:</strong> {ticket.status} — {fmtDate(ticket.updatedAt)}
                  </div>
                </div>
                {isResolved && (
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineDot} style={{ background: 'var(--color-success)' }} aria-hidden="true" />
                    <div className={styles.timelineLabel}>
                      <strong>Resolved:</strong> {fmtDate(ticket.resolvedAt)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resolution Response (only if resolved) */}
          {isResolved && ticket.resolutionMessage && (
            <div className={`glass-card ${styles.card}`}>
              <h3 className={styles.cardTitle}>✓ Final Response</h3>
              <div className={styles.resolutionBox}>
                <p className={styles.resolutionMessage}>{ticket.resolutionMessage}</p>
                <div className={styles.resolutionMeta}>
                  <span><strong>Resolved by:</strong> {ticket.department}</span>
                  <span><strong>Date:</strong> {fmtDate(ticket.resolvedAt)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Summary & Details */}
          {ticket.requestType === 'leave' ? (
            <>
              {/* Leave Request Details */}
              <div className={`glass-card ${styles.card}`}>
                <h3 className={styles.cardTitle}>Leave Request Details</h3>
                <div className={styles.summarySection}>
                  <div className={styles.leaveGrid}>
                    <div>
                      <h4 className={styles.subTitle}>Leave Type</h4>
                      <p className={styles.detailValue}>{ticket.leaveRequestData?.leaveType}</p>
                    </div>
                    <div>
                      <h4 className={styles.subTitle}>From</h4>
                      <p className={styles.detailValue}>{fmtDate(ticket.leaveRequestData?.startDate)}</p>
                    </div>
                    <div>
                      <h4 className={styles.subTitle}>To</h4>
                      <p className={styles.detailValue}>{fmtDate(ticket.leaveRequestData?.endDate)}</p>
                    </div>
                    <div>
                      <h4 className={styles.subTitle}>Duration</h4>
                      <p className={styles.detailValue}>
                        {(() => {
                          const start = new Date(ticket.leaveRequestData?.startDate);
                          const end = new Date(ticket.leaveRequestData?.endDate);
                          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                          return `${days} day${days !== 1 ? 's' : ''}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {ticket.leaveRequestData?.reason && (
                <div className={`glass-card ${styles.card}`}>
                  <h3 className={styles.cardTitle}>Reason</h3>
                  <p className={styles.summaryText}>{ticket.leaveRequestData.reason}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className={`glass-card ${styles.card}`}>
                <h3 className={styles.cardTitle}>Request Summary</h3>
                <div className={styles.summarySection}>
                  <h4 className={styles.subTitle}>Summary</h4>
                  <p className={styles.summaryText}>{doc.summary ?? 'No summary available.'}</p>
                </div>
              </div>

              <Collapsible title="Full Request Text">
                <div className={styles.extractedTextWrap}>
                  <pre className={styles.extractedText}>
                    {doc.extractedText ?? 'No text extracted.'}
                  </pre>
                </div>
              </Collapsible>
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Request Information */}
          <div className={`glass-card ${styles.card}`}>
            <h3 className={styles.cardTitle}>Request Information</h3>
            <dl className={styles.metaList}>
              <div className={styles.metaRow}>
                <dt>Request ID</dt>
                <dd style={{ fontFamily: 'monospace', color: 'var(--color-accent)' }}>
                  {ticket.ticketId}
                </dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Responsible Department</dt>
                <dd>{ticket.department ?? 'Unknown'}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Priority</dt>
                <dd>
                  <Badge
                    label={ticket.priority ?? 'Medium'}
                    variant={
                      ticket.priority === 'Critical' ? 'danger'
                        : ticket.priority === 'High' ? 'warning'
                          : ticket.priority === 'Low' ? 'info'
                            : 'default'
                    }
                  />
                </dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Status</dt>
                <dd>
                  <Badge
                    label={ticket.status ?? 'Unknown'}
                    variant={STATUS_VARIANT[ticket.status] ?? 'default'}
                  />
                </dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Submitted</dt>
                <dd>{fmtDate(ticket.createdAt)}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Last Updated</dt>
                <dd>{fmtDate(ticket.updatedAt)}</dd>
              </div>
              {isResolved && (
                <div className={styles.metaRow}>
                  <dt>Resolved</dt>
                  <dd>{fmtDate(ticket.resolvedAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Document Information */}
          {doc && (
            <div className={`glass-card ${styles.card}`}>
              <h3 className={styles.cardTitle}>Request Details</h3>
              <dl className={styles.metaList}>
                <div className={styles.metaRow}>
                  <dt>File Name</dt>
                  <dd className={styles.truncate}>{doc.originalFileName ?? '—'}</dd>
                </div>
                <div className={styles.metaRow}>
                  <dt>Type</dt>
                  <dd>{doc.documentType ?? '—'}</dd>
                </div>
                <div className={styles.metaRow}>
                  <dt>Submitted</dt>
                  <dd>{fmtDate(doc.createdAt)}</dd>
                </div>
                {doc.source === 'email' && (
                  <>
                    <div className={styles.metaRow}>
                      <dt>From Email</dt>
                      <dd className={styles.truncate}>{doc.emailSender ?? '—'}</dd>
                    </div>
                    <div className={styles.metaRow}>
                      <dt>Subject</dt>
                      <dd>{doc.emailSubject ?? '—'}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* Help / Info Box */}
          <div className={`glass-card ${styles.infoBox}`}>
            <h4 className={styles.infoTitle}>ℹ️ About Your Request</h4>
            <ul className={styles.infoList}>
              <li>Your request is being handled by the <strong>{ticket.department}</strong> department</li>
              <li>You'll see updates here as your request progresses</li>
              {isResolved && <li>Your request has been completed. See the response above.</li>}
              {!isResolved && <li>We'll notify you when your request is resolved</li>}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

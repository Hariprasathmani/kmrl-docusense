// pages/TicketDetailPage.jsx — KMRL Ticket Management · Single ticket detail
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketService, getOfficersByDepartment } from '../services/ticketService';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/UI/Spinner';
import Collapsible from '../components/UI/Collapsible';
import styles from './TicketDetailPage.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'];
const STATUSES    = ['New', 'Assigned', 'In Progress', 'Shared', 'Returned', 'Resolved', 'Closed'];
const PRIORITIES  = ['Critical', 'High', 'Medium', 'Low'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const PRIORITY_CLASS = {
  Critical: styles.priorityCritical,
  High:     styles.priorityHigh,
  Medium:   styles.priorityMedium,
  Low:      styles.priorityLow,
};

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
  return <span className={`badge ${PRIORITY_CLASS[priority] ?? ''}`}>{priority ?? '—'}</span>;
}

function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_CLASS[status] ?? ''}`}>{status ?? '—'}</span>;
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

export default function TicketDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket,  setTicket]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Admin controls
  const [newStatus,   setNewStatus]   = useState('');
  const [newPriority, setNewPriority] = useState('');

  // Resolution (owner dept)
  const [resolutionMsg, setResolutionMsg] = useState('');

  // Leave request approval
  const [leaveAction, setLeaveAction] = useState('approve'); // 'approve' or 'reject'
  const [leaveReason, setLeaveReason] = useState('');

  // Share panel
  const [showSharePanel,  setShowSharePanel]  = useState(false);
  const [shareDept,       setShareDept]       = useState('');
  const [shareReason,     setShareReason]     = useState('');
  const [sharingMsg,      setSharingMsg]      = useState('');

  // Internal notes
  const [noteContent,  setNoteContent]  = useState('');
  const [noteMsg,      setNoteMsg]      = useState('');
  const [addingNote,   setAddingNote]   = useState(false);
  const notesEndRef = useRef(null);

  // Officer assignment (Admin only)
  const [officers,       setOfficers]       = useState([]);
  const [officersLoading,setOfficersLoading]= useState(false);
  const [selectedOfficer,setSelectedOfficer]= useState('');
  const [assignMsg,      setAssignMsg]      = useState('');

  const isAdmin = user?.role === 'Admin';

  // ── Derived role on this ticket ────────────────────────────────────────────
  // _isShared is set by the backend: true → user is a collaborator, not owner
  const isCollaborator = !isAdmin && ticket?._isShared === true;
  const isOwner        = !isAdmin && ticket?._isShared === false;
  const isAssignedOfficer = Boolean(
    !isAdmin && ticket?.assignedTo?._id && String(ticket.assignedTo._id) === String(user?.id)
  );
  const isUnassignedOwner = !isAdmin && !ticket?.assignedTo && isOwner;
  const canAct         = isAdmin || isAssignedOfficer || isUnassignedOwner;
  const canAddNote     = isAdmin || isAssignedOfficer || isUnassignedOwner || isCollaborator;
  const canResolve     = canAct;

  // ── Fetch ticket ────────────────────────────────────────────────────────────
  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await ticketService.getById(id);
      const t = data?.data ?? data;
      setTicket(t);
      setNewStatus(t.status ?? '');
      setNewPriority(t.priority ?? '');
    } catch (err) {
      setError(
        err?.response?.status === 404
          ? 'Ticket not found'
          : err?.response?.data?.message ?? err?.message ?? 'Failed to load ticket'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  // Fetch eligible officers whenever ticket dept is known (Admin only)
  useEffect(() => {
    if (!isAdmin || !ticket?.department) return;
    const dept = ticket.ownerDepartment || ticket.department;
    setOfficersLoading(true);
    getOfficersByDepartment(dept)
      .then(({ data }) => {
        setOfficers(Array.isArray(data?.data) ? data.data : []);
        // Pre-select current assignee so the dropdown shows the right person
        setSelectedOfficer(ticket.assignedTo?._id ?? '');
      })
      .catch(() => setOfficers([]))
      .finally(() => setOfficersLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, ticket?._id, ticket?.department, ticket?.ownerDepartment]);

  // Auto-scroll notes list when new note added
  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.internalNotes?.length]);

  // ── Feedback helper ─────────────────────────────────────────────────────────
  function flashMsg(setter, msg, delay = 4000) {
    setter(msg);
    setTimeout(() => setter(''), delay);
  }

  // ── Admin: status & priority ────────────────────────────────────────────────
  const handleStatusChange = async () => {
    if (!newStatus || newStatus === ticket.status) return;
    setSaving(true);
    try {
      await ticketService.updateStatus(id, newStatus);
      flashMsg(setSaveMsg, 'Status updated.');
      await fetchTicket();
    } catch (err) {
      flashMsg(setSaveMsg, err?.response?.data?.message ?? 'Failed to update status.');
    } finally { setSaving(false); }
  };

  const handlePriorityChange = async () => {
    if (!newPriority || newPriority === ticket.priority) return;
    setSaving(true);
    try {
      await ticketService.updatePriority(id, newPriority);
      flashMsg(setSaveMsg, 'Priority updated.');
      await fetchTicket();
    } catch (err) {
      flashMsg(setSaveMsg, err?.response?.data?.message ?? 'Failed to update priority.');
    } finally { setSaving(false); }
  };

  const handleClose = async () => {
    if (!window.confirm('Close this ticket? This action cannot be undone.')) return;
    setSaving(true);
    try {
      await ticketService.close(id);
      flashMsg(setSaveMsg, 'Ticket closed.');
      await fetchTicket();
    } catch (err) {
      flashMsg(setSaveMsg, err?.response?.data?.message ?? 'Failed to close ticket.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this ticket permanently? This action cannot be undone and will also delete all associated data.')) return;
    if (!window.confirm('Are you absolutely sure? This ticket will be permanently deleted.')) return;
    setSaving(true);
    try {
      await ticketService.delete(id);
      flashMsg(setSaveMsg, 'Ticket deleted successfully. Redirecting...');
      setTimeout(() => navigate('/tickets'), 2000);
    } catch (err) {
      flashMsg(setSaveMsg, err?.response?.data?.message ?? 'Failed to delete ticket.');
    } finally { setSaving(false); }
  };

  // ── Resolve (owner dept / Admin only) ───────────────────────────────────────
  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolutionMsg.trim()) return;
    setSaving(true);
    try {
      const { data } = await ticketService.resolve(id, resolutionMsg.trim());
      const emailStatus = data?.resolutionEmail?.status;
      flashMsg(setSaveMsg,
        emailStatus === 'sent'   ? 'Ticket resolved. Resolution email sent.'
        : emailStatus === 'failed' ? 'Ticket resolved. Resolution email failed to send.'
        :                            'Ticket resolved successfully.'
      );
      setResolutionMsg('');
      await fetchTicket();
    } catch (err) {
      flashMsg(setSaveMsg, err?.response?.data?.message ?? 'Failed to resolve ticket.');
    } finally { setSaving(false); }
  };

  // ── Resolve Leave Request (HR only) ──────────────────────────────────────────
  const handleResolveLeaveRequest = async (e) => {
    e.preventDefault();
    if (!leaveReason.trim()) return;
    setSaving(true);
    try {
      const { data } = await ticketService.resolveLeaveRequest(id, leaveAction, leaveReason.trim());
      flashMsg(setSaveMsg, `Leave request ${leaveAction === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setLeaveReason('');
      await fetchTicket();
    } catch (err) {
      flashMsg(setSaveMsg, err?.response?.data?.message ?? 'Failed to process leave request.');
    } finally { setSaving(false); }
  };

  const handleRetryEmail = async () => {
    setSaving(true);
    try {
      const { data } = await ticketService.retryResolutionEmail(id);
      flashMsg(setSaveMsg,
        data?.resolutionEmail?.status === 'sent'
          ? 'Resolution email sent successfully.'
          : 'Resolution email could not be sent.'
      );
      await fetchTicket();
    } catch (err) {
      flashMsg(setSaveMsg, err?.response?.data?.message ?? 'Failed to retry email.');
    } finally { setSaving(false); }
  };

  // ── Share ticket (owner dept / Admin) ───────────────────────────────────────
  const handleShare = async (e) => {
    e.preventDefault();
    if (!shareDept || !shareReason.trim()) return;
    setSaving(true);
    try {
      await ticketService.share(id, shareDept, shareReason.trim());
      flashMsg(setSharingMsg, `Ticket shared with ${shareDept} successfully.`);
      setShareDept('');
      setShareReason('');
      setShowSharePanel(false);
      await fetchTicket();
    } catch (err) {
      flashMsg(setSharingMsg, err?.response?.data?.message ?? 'Failed to share ticket.');
    } finally { setSaving(false); }
  };

  const handleUnshare = async (dept) => {
    if (!window.confirm(`Remove ${dept}'s access to this ticket?`)) return;
    setSaving(true);
    try {
      await ticketService.unshare(id, dept);
      flashMsg(setSharingMsg, `${dept} removed from shared list.`);
      await fetchTicket();
    } catch (err) {
      flashMsg(setSharingMsg, err?.response?.data?.message ?? 'Failed to unshare.');
    } finally { setSaving(false); }
  };

  // ── Internal note ────────────────────────────────────────────────────────────
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setAddingNote(true);
    try {
      await ticketService.addNote(id, noteContent.trim());
      flashMsg(setNoteMsg, 'Note added successfully.');
      setNoteContent('');
      await fetchTicket();
    } catch (err) {
      flashMsg(setNoteMsg, err?.response?.data?.message ?? 'Failed to add note.');
    } finally { setAddingNote(false); }
  };

  // ── Officer assignment (Admin only) ──────────────────────────────────────────
  const handleAssign = async () => {
    // selectedOfficer === '' means unassign
    setSaving(true);
    try {
      await ticketService.assign(id, selectedOfficer || null);
      const msg = selectedOfficer
        ? `Officer assigned successfully.`
        : 'Officer unassigned.';
      flashMsg(setAssignMsg, msg);
      await fetchTicket();
    } catch (err) {
      flashMsg(setAssignMsg, err?.response?.data?.message ?? 'Assignment failed.');
    } finally { setSaving(false); }
  };

  // ── Loading / Error ──────────────────────────────────────────────────────────
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
        <button className="btn btn-ghost" onClick={() => navigate('/tickets')} style={{ marginTop: '1rem' }}>
          Back to Tickets
        </button>
      </section>
    );
  }

  if (!ticket) return null;

  const doc       = ticket.documentId;
  const ownerDept = ticket.ownerDepartment || ticket.department;

  // Departments available to share with (exclude owner + already shared)
  const alreadySharedDepts = (ticket.sharedWith || []).map((s) => s.department);
  const sharableDepts = DEPARTMENTS.filter(
    (d) => d !== ownerDept && !alreadySharedDepts.includes(d)
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className={`page-enter ${styles.page}`}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/tickets')} aria-label="Back to tickets">
          ← Back to Tickets
        </button>

        <div className={styles.headerTop}>
          <div className={styles.titleGroup}>
            <span className={styles.ticketIdLabel}>{ticket.ticketId}</span>
            <h1 className={styles.title}>
              {doc?.title ?? doc?.originalFileName ?? 'Untitled Document'}
            </h1>
            {/* Collaborator banner */}
            {isCollaborator && (
              <div className={styles.collaboratorBanner} role="note">
                <span aria-hidden="true">🤝</span>
                <span>
                  You are viewing this ticket as a <strong>collaborating department</strong>.
                  Owner: <strong>{ownerDept}</strong>.
                  You can add internal notes but cannot resolve this ticket.
                </span>
              </div>
            )}
          </div>

          <div className={styles.badges}>
            <span className={styles.deptPill}>{ownerDept}</span>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge   status={ticket.status} />
            {isCollaborator && (
              <span className={styles.sharedBadge}>Shared with {user?.department}</span>
            )}
          </div>
        </div>
      </header>

      {/* ── Two-column grid ─────────────────────────────────────────────────── */}
      <div className={styles.grid}>

        {/* ── Main Column ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* AI Analysis */}
          <div className={`glass-card ${styles.card}`}>
            <h3 className={styles.cardTitle}>AI Analysis</h3>
            <div className={styles.cardSection}>
              <h4 className={styles.subTitle}>Summary</h4>
              <p className={styles.summaryText}>{doc?.summary ?? 'No summary available.'}</p>
            </div>
            <div className={styles.cardSection}>
              <h4 className={styles.subTitle}>AI Confidence Score</h4>
              <ConfidenceIndicator score={doc?.confidenceScore} />
            </div>
          </div>

          {/* ── Internal Notes ─────────────────────────────────────────────── */}
          <div className={`glass-card ${styles.card}`}>
            <h3 className={styles.cardTitle}>
              Internal Notes
              <span className={styles.notesCount}>
                {ticket.internalNotes?.length ?? 0}
              </span>
            </h3>

            {/* Note: never shown to external users — internal only */}
            <p className={styles.notesDisclaimer}>
              🔒 Internal only — not visible to the original sender.
            </p>

            {/* Notes list */}
            {ticket.internalNotes?.length > 0 ? (
              <ul className={styles.notesList} aria-label="Internal notes">
                {ticket.internalNotes.map((note) => (
                  <li key={note._id} className={styles.noteItem}>
                    <div className={styles.noteHeader}>
                      <span className={styles.noteAuthor}>{note.authorName}</span>
                      <span className={styles.noteDept}>{note.authorDepartment}</span>
                      <time className={styles.noteDate} dateTime={note.createdAt}>
                        {fmtDate(note.createdAt)}
                      </time>
                    </div>
                    <p className={styles.noteContent}>{note.content}</p>
                  </li>
                ))}
                <li ref={notesEndRef} aria-hidden="true" />
              </ul>
            ) : (
              <p className={styles.mutedText} style={{ marginBottom: 'var(--space-4)' }}>
                No internal notes yet.
              </p>
            )}

            {/* Add note form — available to owner, collaborators, and Admin */}
            {canAddNote && ticket.status !== 'Closed' && (
              <form onSubmit={handleAddNote} className={styles.noteForm}>
                <label htmlFor="note-content" className={styles.actionLabel}>
                  {isCollaborator
                    ? `Add your recommendation (as ${user?.department} Department)`
                    : 'Add Internal Note'}
                </label>
                <textarea
                  id="note-content"
                  className={styles.noteInput}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder={
                    isCollaborator
                      ? `Enter your ${user?.department} department's recommendation or findings…`
                      : 'Enter an internal note, observation, or update…'
                  }
                  maxLength={10000}
                  rows={4}
                  required
                />
                <div className={styles.noteFooter}>
                  <span className={styles.noteCharCount}>
                    {noteContent.length}/10000
                  </span>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={addingNote || !noteContent.trim()}
                  >
                    {addingNote ? 'Saving…' : 'Add Note'}
                  </button>
                </div>
                {noteMsg && (
                  <p className={noteMsg.includes('Failed') ? styles.msgError : styles.msgSuccess}>
                    {noteMsg}
                  </p>
                )}
              </form>
            )}
          </div>

          {/* Timeline */}
          <div className={`glass-card ${styles.card}`}>
            <h3 className={styles.cardTitle}>Timeline</h3>
            {ticket.timeline?.length > 0 ? (
              <ul className={styles.timelineList} aria-label="Ticket timeline">
                {ticket.timeline.map((event, idx) => {
                  const isFirst  = idx === 0;
                  const isSystem = ['System', 'AI Engine', 'AI Classifier'].includes(event.performedBy);
                  const dotClass = isFirst
                    ? styles.dotFirst
                    : isSystem
                      ? styles.dotSystem
                      : styles.dotOfficer;
                  return (
                    <li key={idx} className={styles.timelineItem}>
                      <div className={styles.timelineDotWrap}>
                        <div className={`${styles.timelineDot} ${dotClass}`} aria-hidden="true" />
                      </div>
                      <div className={styles.timelineContent}>
                        <span className={styles.timelineAction}>{event.action}</span>
                        <div className={styles.timelineMeta}>
                          <span>{event.performedBy ?? 'System'}</span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={event.timestamp}>{fmtDate(event.timestamp)}</time>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.mutedText}>No timeline events yet.</p>
            )}
          </div>

          {/* Routing History */}
          <div className={`glass-card ${styles.card}`}>
            <h3 className={styles.cardTitle}>Routing History</h3>
            {ticket.routingHistory?.length > 0 ? (
              <ul className={styles.historyList}>
                {ticket.routingHistory.map((event, idx) => (
                  <li key={idx} className={styles.historyItem}>
                    <div className={styles.historyDot} />
                    <div className={styles.historyContent}>
                      <div className={styles.historyHeader}>
                        <span className={styles.historyDept}>{event.department ?? 'Unknown Dept'}</span>
                        <span className="badge badge-blue">{event.status ?? 'Routed'}</span>
                      </div>
                      <div className={styles.historyMeta}>
                        <span className={styles.historyBy}>Routed by: {event.routedBy ?? 'System'}</span>
                        <span className={styles.historyDate}>{fmtDate(event.routedAt)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.mutedText}>No routing history available.</p>
            )}
          </div>

          {/* Extracted Text */}
          <Collapsible title="Extracted Text">
            <div className={styles.extractedTextWrap}>
              <pre className={styles.extractedText}>{doc?.extractedText ?? 'No text extracted.'}</pre>
            </div>
          </Collapsible>

        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Ticket Info */}
          <div className={`glass-card ${styles.card}`}>
            <h3 className={styles.cardTitle}>Ticket Information</h3>
            <dl className={styles.metaList}>
              <div className={styles.metaRow}>
                <dt>Ticket ID</dt>
                <dd style={{ fontFamily: 'monospace', color: 'var(--color-accent)' }}>{ticket.ticketId}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Owner Department</dt>
                <dd>{ownerDept}</dd>
              </div>
              {alreadySharedDepts.length > 0 && (
                <div className={styles.metaRow}>
                  <dt>Shared With</dt>
                  <dd>{alreadySharedDepts.join(', ')}</dd>
                </div>
              )}
              <div className={styles.metaRow}>
                <dt>Priority</dt>
                <dd><PriorityBadge priority={ticket.priority} /></dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Status</dt>
                <dd><StatusBadge status={ticket.status} /></dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Assigned Officer</dt>
                <dd>
                  {ticket.assignedTo
                    ? `${ticket.assignedTo.name} (${ticket.assignedTo.email})`
                    : <span style={{ color: 'var(--color-text-dim)' }}>Unassigned</span>
                  }
                </dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Created</dt>
                <dd>{fmtDate(ticket.createdAt)}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Last Updated</dt>
                <dd>{fmtDate(ticket.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* ── Officer Assignment (Admin only) ──────────────────────────── */}
          {isAdmin && ticket.status !== 'Closed' && (
            <div className={`glass-card ${styles.card}`}>
              <h3 className={styles.cardTitle}>Assign Officer</h3>

              {officersLoading ? (
                <p className={styles.mutedText}>Loading officers…</p>
              ) : officers.length === 0 ? (
                <p className={styles.mutedText}>
                  No active officers found for {ownerDept}.
                </p>
              ) : (
                <>
                  {ticket.assignedTo && (
                    <p className={styles.currentOfficer}>
                      Currently: <strong>{ticket.assignedTo.name}</strong>
                      <span className={styles.currentOfficerDept}> · {ticket.assignedTo.department}</span>
                    </p>
                  )}
                  <div className={styles.actionRow}>
                    <label htmlFor="officer-select" className={styles.actionLabel}>
                      {ticket.assignedTo ? 'Reassign to' : 'Assign to'}
                    </label>
                    <select
                      id="officer-select"
                      className={styles.actionSelect}
                      value={selectedOfficer}
                      onChange={(e) => setSelectedOfficer(e.target.value)}
                    >
                      <option value="">— Unassigned —</option>
                      {officers.map((o) => (
                        <option key={o._id} value={o._id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className={`btn btn-primary ${styles.fullWidthBtn}`}
                    onClick={handleAssign}
                    disabled={saving || selectedOfficer === (ticket.assignedTo?._id ?? '')}
                  >
                    {saving ? 'Saving…' : ticket.assignedTo ? 'Reassign Officer' : 'Assign Officer'}
                  </button>
                  {ticket.assignedTo && (
                    <button
                      className={`btn btn-ghost ${styles.fullWidthBtn}`}
                      style={{ marginTop: 'var(--space-2)' }}
                      onClick={() => { setSelectedOfficer(''); }}
                      disabled={selectedOfficer === ''}
                    >
                      Clear selection (Unassign)
                    </button>
                  )}
                  {assignMsg && (
                    <p className={assignMsg.includes('failed') || assignMsg.includes('Failed')
                      ? styles.msgError : styles.msgSuccess}
                      style={{ marginTop: 'var(--space-3)' }}
                    >
                      {assignMsg}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Shared With details */}          {(ticket.sharedWith?.length > 0) && (
            <div className={`glass-card ${styles.card}`}>
              <h3 className={styles.cardTitle}>Collaboration</h3>
              <ul className={styles.shareList}>
                {ticket.sharedWith.map((s) => (
                  <li key={s.department} className={styles.shareItem}>
                    <div className={styles.shareItemHeader}>
                      <span className={styles.shareDeptPill}>{s.department}</span>
                      {canAct && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                        <button
                          className={styles.unshareBtnSmall}
                          onClick={() => handleUnshare(s.department)}
                          disabled={saving}
                          aria-label={`Remove ${s.department} from shared list`}
                          title="Remove access"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {s.reason && (
                      <p className={styles.shareReason}>"{s.reason}"</p>
                    )}
                    <span className={styles.shareDate}>
                      Shared {fmtDate(s.sharedAt)}
                    </span>
                  </li>
                ))}
              </ul>
              {sharingMsg && (
                <p className={sharingMsg.includes('Failed') ? styles.msgError : styles.msgSuccess}>
                  {sharingMsg}
                </p>
              )}
            </div>
          )}

          {/* Document Info */}
          {doc && (
            <div className={`glass-card ${styles.card}`}>
              <h3 className={styles.cardTitle}>Original Document</h3>
              <dl className={styles.metaList}>
                <div className={styles.metaRow}>
                  <dt>File Name</dt>
                  <dd>{doc.originalFileName ?? '—'}</dd>
                </div>
                <div className={styles.metaRow}>
                  <dt>Type</dt>
                  <dd>{doc.documentType ?? '—'}</dd>
                </div>
                <div className={styles.metaRow}>
                  <dt>Uploaded</dt>
                  <dd>{fmtDate(doc.createdAt)}</dd>
                </div>
                {doc.source === 'email' && (
                  <>
                    <div className={styles.metaRow}>
                      <dt>Original Sender</dt>
                      <dd style={{ wordBreak: 'break-all' }}>{doc.emailSender ?? '—'}</dd>
                    </div>
                    <div className={styles.metaRow}>
                      <dt>Email Subject</dt>
                      <dd>{doc.emailSubject ?? '—'}</dd>
                    </div>
                  </>
                )}
              </dl>
              {doc._id && (
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-4)' }}
                  onClick={() => navigate(`/documents/${doc._id}`)}
                >
                  View Document Detail
                </button>
              )}
            </div>
          )}

          {/* ── Share Ticket panel (owner / Admin) ──────────────────────────── */}
          {canAct &&
            ticket.status !== 'Resolved' &&
            ticket.status !== 'Closed' && (
            <div className={`glass-card ${styles.card}`}>
              <h3 className={styles.cardTitle}>Request Assistance</h3>

              {/* Active shares summary */}
              {alreadySharedDepts.length > 0 && !showSharePanel && (
                <p className={styles.shareActive}>
                  Currently shared with: <strong>{alreadySharedDepts.join(', ')}</strong>
                </p>
              )}

              {!showSharePanel ? (
                <button
                  className={`btn btn-primary ${styles.fullWidthBtn}`}
                  onClick={() => setShowSharePanel(true)}
                  disabled={sharableDepts.length === 0}
                  title={sharableDepts.length === 0 ? 'All departments are already collaborating' : undefined}
                >
                  Share with Department
                </button>
              ) : (
                <form onSubmit={handleShare} className={styles.shareForm}>
                  <div className={styles.actionRow}>
                    <label htmlFor="share-dept" className={styles.actionLabel}>
                      Select Department
                    </label>
                    <select
                      id="share-dept"
                      className={styles.actionSelect}
                      value={shareDept}
                      onChange={(e) => setShareDept(e.target.value)}
                      required
                    >
                      <option value="">— Choose department —</option>
                      {sharableDepts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.actionRow}>
                    <label htmlFor="share-reason" className={styles.actionLabel}>
                      Reason for sharing <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <textarea
                      id="share-reason"
                      className={styles.noteInput}
                      value={shareReason}
                      onChange={(e) => setShareReason(e.target.value)}
                      placeholder="Describe why you need assistance from this department…"
                      rows={3}
                      maxLength={500}
                      required
                    />
                  </div>
                  <div className={styles.shareBtnRow}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => { setShowSharePanel(false); setShareDept(''); setShareReason(''); }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving || !shareDept || !shareReason.trim()}
                    >
                      {saving ? 'Sharing…' : 'Share Ticket'}
                    </button>
                  </div>
                  {sharingMsg && (
                    <p className={sharingMsg.includes('Failed') ? styles.msgError : styles.msgSuccess}>
                      {sharingMsg}
                    </p>
                  )}
                </form>
              )}
            </div>
          )}

          {/* ── Resolution ──────────────────────────────────────────────────── */}
          <div className={`glass-card ${styles.card}`}>
            <h3 className={styles.cardTitle}>Resolution</h3>

            {/* Collaborator: cannot resolve */}
            {!canResolve ? (
              <div className={styles.collaboratorNote}>
                <span aria-hidden="true">ℹ️</span>
                <p>
                  Only the <strong>{ownerDept} Department</strong> can resolve this ticket.
                  Use the Internal Notes section above to submit your recommendation.
                </p>
              </div>
            ) : ticket.status === 'Resolved' ? (
              /* Resolved state */
              <>
                <p className={styles.resolutionText}>
                  {ticket.resolutionMessage || 'No resolution message recorded.'}
                </p>
                {ticket.resolvedBy && (
                  <p className={styles.resolvedBy}>
                    Resolved by {ticket.resolvedBy.name} ({ticket.resolvedBy.department}) · {fmtDate(ticket.resolvedAt)}
                  </p>
                )}
                {doc?.source === 'email' && (
                  <p className={ticket.resolutionEmailStatus === 'sent' ? styles.emailSent : styles.emailFailed}>
                    Resolution email: {ticket.resolutionEmailStatus === 'sent' ? '✓ Sent to original sender' : '✗ Failed to send'}
                  </p>
                )}
                {isAdmin && ticket.resolutionEmailStatus === 'failed' && (
                  <button className={`btn btn-primary ${styles.fullWidthBtn}`} onClick={handleRetryEmail} disabled={saving}>
                    {saving ? 'Retrying…' : 'Retry Resolution Email'}
                  </button>
                )}
              </>
            ) : ticket.status === 'Closed' ? (
              <p className={styles.mutedText}>Closed tickets cannot be resolved.</p>
            ) : canResolve ? (
              /* Resolve form — owner or Admin */
              <>
                {ticket.requestType === 'leave' ? (
                  // Leave Request Approval/Rejection Form
                  <form onSubmit={handleResolveLeaveRequest}>
                    <div className={styles.actionRow}>
                      <label htmlFor="leave-action" className={styles.actionLabel}>
                        Decision
                      </label>
                      <select
                        id="leave-action"
                        className={styles.actionSelect}
                        value={leaveAction}
                        onChange={(e) => setLeaveAction(e.target.value)}
                      >
                        <option value="approve">Approve Leave Request</option>
                        <option value="reject">Reject Leave Request</option>
                      </select>
                    </div>
                    <label htmlFor="leave-reason" className={styles.actionLabel}>
                      {leaveAction === 'approve' ? 'Approval Message' : 'Rejection Reason'}
                    </label>
                    <textarea
                      id="leave-reason"
                      className={styles.resolutionInput}
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      maxLength={1000}
                      required
                      placeholder={leaveAction === 'approve'
                        ? 'E.g., Leave approved as requested.'
                        : 'Explain why the leave request is being rejected.'
                      }
                      rows={4}
                    />
                    <button
                      type="submit"
                      className={`btn btn-primary ${styles.fullWidthBtn}`}
                      disabled={saving || !leaveReason.trim()}
                    >
                      {saving ? 'Processing…' : leaveAction === 'approve' ? 'Approve Leave' : 'Reject Leave'}
                    </button>
                  </form>
                ) : (
                  // Document Resolution Form
                  <>
                    {doc?.source === 'email' && (
                      <div className={styles.emailContext}>
                        <strong>Original Sender:</strong> {doc.emailSender ?? 'N/A'}<br />
                        <strong>Subject:</strong> {doc.emailSubject ?? 'N/A'}
                        <p className={styles.emailNote}>
                          A resolution email will be sent to the original sender automatically.
                        </p>
                      </div>
                    )}
                    {ticket.sharedWith?.length > 0 && (
                      <div className={styles.sharedNoteInfo}>
                        <span aria-hidden="true">💡</span>
                        <p>
                          Internal notes from <strong>{alreadySharedDepts.join(', ')}</strong> are
                          available above. Review them before resolving.
                        </p>
                      </div>
                    )}
                    <form onSubmit={handleResolve}>
                      <label htmlFor="resolution-msg" className={styles.actionLabel}>
                        Resolution / Action Taken
                      </label>
                      <textarea
                        id="resolution-msg"
                        className={styles.resolutionInput}
                        value={resolutionMsg}
                        onChange={(e) => setResolutionMsg(e.target.value)}
                        maxLength={5000}
                    required
                    placeholder="Describe the action taken to resolve this ticket…"
                    rows={5}
                  />
                  <button
                    type="submit"
                    className={`btn btn-primary ${styles.fullWidthBtn}`}
                    disabled={saving || !resolutionMsg.trim()}
                  >
                    {saving ? 'Resolving…' : 'Resolve Ticket'}
                  </button>
                    </form>
                  </>
                )}
              </>
            ) : null}

            {saveMsg && (
              <p className={saveMsg.includes('Failed') || saveMsg.includes('failed')
                ? styles.msgError : styles.msgSuccess}
                style={{ marginTop: 'var(--space-3)' }}
              >
                {saveMsg}
              </p>
            )}
          </div>

          {/* Admin Actions */}
          {canAct && ticket.status !== 'Closed' && ticket.status !== 'Resolved' && (
            <div className={`glass-card ${styles.actionsCard}`}>
              <h3 className={styles.cardTitle}>{isAdmin ? 'Admin Actions' : 'Ticket Actions'}</h3>

              <div className={styles.actionRow}>
                <label htmlFor="ticket-status-select" className={styles.actionLabel}>Change Status</label>
                <select
                  id="ticket-status-select"
                  className={styles.actionSelect}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  className={`btn btn-primary ${styles.actionBtn}`}
                  onClick={handleStatusChange}
                  disabled={saving || newStatus === ticket.status}
                >
                  {saving ? 'Saving…' : 'Update Status'}
                </button>
              </div>

              {isAdmin && <>
              <hr className={styles.divider} />

              <div className={styles.actionRow}>
                <label htmlFor="ticket-priority-select" className={styles.actionLabel}>Change Priority</label>
                <select
                  id="ticket-priority-select"
                  className={styles.actionSelect}
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <button
                  className={`btn btn-primary ${styles.actionBtn}`}
                  onClick={handlePriorityChange}
                  disabled={saving || newPriority === ticket.priority}
                >
                  {saving ? 'Saving…' : 'Update Priority'}
                </button>
              </div>

              <hr className={styles.divider} />

              <button
                className={`btn btn-danger ${styles.fullWidthBtn}`}
                onClick={handleClose}
                disabled={saving}
              >
                Close Ticket
              </button>

              <button
                className={`btn btn-danger ${styles.fullWidthBtn}`}
                onClick={handleDelete}
                disabled={saving}
                style={{ marginTop: 'var(--space-2)', opacity: 0.7 }}
                title="Permanently delete this ticket and all associated data"
              >
                Delete Ticket
              </button>
              </>}

              {saveMsg && (
                <p className={saveMsg.includes('Failed') ? styles.msgError : styles.msgSuccess}
                  style={{ marginTop: 'var(--space-3)', fontSize: '0.8rem', textAlign: 'center' }}
                >
                  {saveMsg}
                </p>
              )}
            </div>
          )}

        </aside>
      </div>
    </section>
  );
}

// components/Dashboard/EmployeeDashboard.jsx — Employee/Requester dashboard
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import KpiCard from './KpiCard';
import Spinner from '../UI/Spinner';
import styles from './EmployeeDashboard.module.css';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }) {
  const statusClass = {
    'New': 'status-new',
    'Assigned': 'status-assigned',
    'In Progress': 'status-in-progress',
    'Shared': 'status-shared',
    'Resolved': 'status-resolved',
    'Closed': 'status-closed',
  };
  return <span className={`badge ${statusClass[status] || 'status-new'}`}>{status}</span>;
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    open: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all tickets for this user
        const { data } = await ticketService.getMyTickets();
        const tickets = Array.isArray(data?.data) ? data.data : [];

        // Calculate stats
        const open = tickets.filter(t => ['New', 'Assigned'].includes(t.status)).length;
        const inProgress = tickets.filter(t => ['In Progress', 'Shared'].includes(t.status)).length;
        const resolved = tickets.filter(t => t.status === 'Resolved').length;

        setStats({ open, inProgress, resolved });

        // Get most recent tickets (limit to 5)
        const recent = tickets.slice(0, 5);
        setRecentTickets(recent);
      } catch (err) {
        console.error('[EmployeeDashboard] Failed to fetch data:', err);
        setError(err?.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <section className={`page-enter ${styles.centerState}`} aria-busy="true">
        <Spinner size={44} />
        <p className={styles.stateText}>Loading your dashboard…</p>
      </section>
    );
  }

  return (
    <section className={`page-enter ${styles.page}`}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>My Requests</h1>
          <p className={styles.subtitle}>Track your submitted requests and responses</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/upload')}
            title="Submit a document request"
          >
            <span aria-hidden="true">📄</span> Submit Document
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/leave-request')}
            title="Submit a leave request"
          >
            <span aria-hidden="true">📅</span> Leave Request
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.errorBox} role="alert">
          <span aria-hidden="true">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <KpiCard
          label="Open Requests"
          value={stats.open}
          trend={null}
          icon="📋"
        />
        <KpiCard
          label="In Progress"
          value={stats.inProgress}
          trend={null}
          icon="⏳"
        />
        <KpiCard
          label="Resolved"
          value={stats.resolved}
          trend={null}
          icon="✓"
        />
      </div>

      {/* Recent Requests Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Requests</h2>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/my-tickets')}
            style={{ fontSize: '0.9rem' }}
          >
            View All →
          </button>
        </div>

        {recentTickets.length === 0 ? (
          <div className={styles.emptyState}>
            <span aria-hidden="true">📭</span>
            <p>No requests yet</p>
            <button className="btn btn-primary" onClick={() => navigate('/upload')}>
              Create Your First Request
            </button>
          </div>
        ) : (
          <div className={styles.ticketsList}>
            {recentTickets.map((ticket) => (
              <div
                key={ticket._id}
                className={styles.ticketCard}
                onClick={() => navigate(`/my-tickets/${ticket._id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/my-tickets/${ticket._id}`)}
              >
                <div className={styles.ticketHeader}>
                  <span className={styles.ticketId}>{ticket.ticketId}</span>
                  <StatusBadge status={ticket.status} />
                </div>
                <h3 className={styles.ticketTitle}>
                  {ticket.documentId?.title || 'Untitled Request'}
                </h3>
                <div className={styles.ticketMeta}>
                  <span className={styles.metaDept}>
                    🏢 {ticket.department}
                  </span>
                  <span className={styles.metaDate}>
                    {fmtDate(ticket.updatedAt || ticket.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call to Action */}
      {recentTickets.length === 0 && (
        <div className={styles.ctaSection}>
          <div className={styles.ctaCard}>
            <h3>📄 Submit a Request</h3>
            <p>Upload a document or submit a request to get assistance from our departments.</p>
            <button className="btn btn-primary" onClick={() => navigate('/upload')}>
              Get Started
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

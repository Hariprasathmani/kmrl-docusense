// pages/NotFoundPage.jsx — 404 page
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="page-enter" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '5rem', color: 'var(--color-primary)' }}>404</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>Page not found.</p>
      <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
    </main>
  );
}

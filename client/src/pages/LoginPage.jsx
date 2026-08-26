// pages/LoginPage.jsx — KMRL DocuSense Authentication
// Split-panel: 40% metro visual | 60% clean login form
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

const DEPARTMENTS = ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'];

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', department: 'Finance',
  });
  const [status,   setStatus]   = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      if (isRegister) {
        const res  = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');
        await login(formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
      }

      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    }
  };

  return (
    <main className={`page-enter ${styles.layout}`}>

      {/* ── LEFT: Metro visual panel ─────────────────────── */}
      <div className={styles.visual} aria-hidden="true">
        <div className={styles.visualContent}>
          <div className={styles.visualBrand}>KMRL DocuSense</div>
          <p className={styles.visualTagline}>
            Intelligent document and workflow management for structured departmental operations.
          </p>
          {/* Decorative route-line motif */}
          <div className={styles.visualRoute}>
            <div className={`${styles.visualRouteDot} ${styles.visualRouteDotActive}`} />
            <div className={styles.visualRouteSegment} />
            <div className={styles.visualRouteDot} />
            <div className={styles.visualRouteSegment} />
            <div className={`${styles.visualRouteDot} ${styles.visualRouteDotActive}`} />
            <div className={styles.visualRouteSegment} />
            <div className={styles.visualRouteDot} />
          </div>
        </div>
      </div>

      {/* ── RIGHT: Form panel ────────────────────────────── */}
      <div className={styles.formPanel}>
        <div className={styles.card}>

          {/* Header */}
          <header className={styles.header}>
            <h1 className={styles.title}>
              {isRegister ? 'Create Account' : 'Sign In'}
            </h1>
            <p className={styles.subtitle}>
              {isRegister
                ? 'Register a new department officer account'
                : 'Sign in to your KMRL DocuSense workspace'}
            </p>
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form} noValidate>

            {isRegister && (
              <>
                <div className={styles.fieldGroup}>
                  <label htmlFor="name" className={styles.label}>Full Name</label>
                  <input
                    id="name" name="name" type="text" required
                    className="input"
                    placeholder="e.g. Arun Kumar"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={status === 'loading'}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor="department" className={styles.label}>Department</label>
                  <select
                    id="department" name="department"
                    className="input"
                    value={formData.department}
                    onChange={handleChange}
                    disabled={status === 'loading'}
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className={styles.fieldGroup}>
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <input
                id="email" name="email" type="email" required
                className="input"
                placeholder="you@kmrl.local"
                value={formData.email}
                onChange={handleChange}
                disabled={status === 'loading'}
                autoComplete="email"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password" name="password" type="password" required
                className="input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={status === 'loading'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
            </div>

            {status === 'error' && (
              <div className={styles.errorAlert} role="alert">
                <span aria-hidden="true">⚠</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={status === 'loading'}
            >
              {status === 'loading'
                ? 'Please wait…'
                : isRegister ? 'Create Account' : 'Sign In'}
            </button>

          </form>

          {/* Toggle login/register */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => {
                setIsRegister(v => !v);
                setErrorMsg('');
                setStatus('idle');
              }}
            >
              {isRegister
                ? 'Already have an account? Sign In'
                : "Don't have an account? Register"}
            </button>
          </div>

        </div>
      </div>

    </main>
  );
}

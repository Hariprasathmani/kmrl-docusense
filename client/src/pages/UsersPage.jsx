// pages/UsersPage.jsx — Admin User Management (Admin only)
import { useState, useEffect, useCallback, useRef } from 'react';
import { userService } from '../services/userService';
import DataTable from '../components/UI/DataTable';
import Badge from '../components/UI/Badge';
import Spinner from '../components/UI/Spinner';
import Modal from '../components/UI/Modal';
import Button from '../components/UI/Button';
import styles from './UsersPage.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const FIXED_ADMIN_EMAIL = 'hariprasathmani102@gmail.com';
const DEPARTMENTS = ['Finance', 'HR', 'Safety', 'Legal', 'Operations', 'IT'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** First two initials from a name string */
function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

/** Map status → Badge variant */
const STATUS_VARIANT = { Active: 'completed', Inactive: 'failed' };

/** Resolve axios error message */
function apiError(err) {
  return err?.response?.data?.message ?? err?.message ?? 'An unexpected error occurred.';
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={`${styles.toast} ${type === 'success' ? styles.toastSuccess : styles.toastError}`}
         role="status" aria-live="polite">
      {type === 'success' ? '✓ ' : '✕ '}{message}
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', email: '', password: '', department: '', status: 'Active' };

function AddUserModal({ isOpen, onClose, onCreated }) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const firstRef              = useRef(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) { setForm(EMPTY_FORM); setError(''); setSaving(false); }
  }, [isOpen]);

  // Focus first field
  useEffect(() => {
    if (isOpen) setTimeout(() => firstRef.current?.focus(), 50);
  }, [isOpen]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!form.name.trim())      return setError('Name is required.');
    if (!form.email.trim())     return setError('Email is required.');
    if (!form.password)         return setError('Password is required.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (!form.department)       return setError('Please select a department.');

    setSaving(true);
    try {
      const { data } = await userService.create({
        name:       form.name.trim(),
        email:      form.email.trim().toLowerCase(),
        password:   form.password,
        department: form.department,
        status:     form.status,
      });
      onCreated(data.data ?? data);
      onClose();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Department Officer">
      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formGrid}>
          {error && <div className={styles.errorBanner} role="alert">{error}</div>}

          <div className={styles.fieldGroup}>
            <label htmlFor="add-name" className={styles.fieldLabel}>Full Name *</label>
            <input id="add-name" ref={firstRef} className="input" type="text"
                   placeholder="e.g. Arun Kumar" value={form.name} onChange={set('name')} required />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="add-email" className={styles.fieldLabel}>Email *</label>
            <input id="add-email" className="input" type="email"
                   placeholder="e.g. arun@kmrl.local" value={form.email} onChange={set('email')} required />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="add-password" className={styles.fieldLabel}>Password *</label>
            <input id="add-password" className="input" type="password"
                   placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="add-dept" className={styles.fieldLabel}>Department *</label>
            <select id="add-dept" className={styles.filterSelect} value={form.department} onChange={set('department')} required>
              <option value="">— Select department —</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="add-status" className={styles.fieldLabel}>Status</label>
            <select id="add-status" className={styles.filterSelect} value={form.status} onChange={set('status')}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Role</label>
            <div className={styles.fieldReadonly}>Department Officer (fixed)</div>
          </div>
        </div>

        <div className={styles.formActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ isOpen, user, onClose, onUpdated }) {
  const [form, setForm]     = useState({ name: '', email: '', department: '', status: 'Active' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const firstRef            = useRef(null);

  // Populate form when user changes
  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', email: user.email || '', department: user.department || '', status: user.status || 'Active' });
      setError('');
      setSaving(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) setTimeout(() => firstRef.current?.focus(), 50);
  }, [isOpen]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Name is required.');
    if (!form.email.trim()) return setError('Email is required.');
    if (!form.department) return setError('Please select a department.');

    setSaving(true);
    try {
      const { data } = await userService.update(user._id, {
        name:       form.name.trim(),
        email:      form.email.trim().toLowerCase(),
        department: form.department,
        status:     form.status,
      });
      onUpdated(data.data ?? data);
      onClose();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit — ${user.name}`}>
      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formGrid}>
          {error && <div className={styles.errorBanner} role="alert">{error}</div>}

          <div className={styles.fieldGroup}>
            <label htmlFor="edit-name" className={styles.fieldLabel}>Full Name *</label>
            <input id="edit-name" ref={firstRef} className="input" type="text"
                   value={form.name} onChange={set('name')} required />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="edit-email" className={styles.fieldLabel}>Email *</label>
            <input id="edit-email" className="input" type="email"
                   value={form.email} onChange={set('email')} required />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="edit-dept" className={styles.fieldLabel}>Department *</label>
            <select id="edit-dept" className={styles.filterSelect} value={form.department} onChange={set('department')} required>
              <option value="">— Select department —</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="edit-status" className={styles.fieldLabel}>Status</label>
            <select id="edit-status" className={styles.filterSelect} value={form.status} onChange={set('status')}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Role</label>
            <div className={styles.fieldReadonly}>{user.role} (read-only)</div>
          </div>
        </div>

        <div className={styles.formActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ isOpen, onClose, onConfirm, title, children, confirmLabel = 'Confirm', danger = false, loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className={styles.confirmText}>{children}</p>
      <div className={styles.formActions}>
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button type="button" variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={loading}>
          {loading ? 'Please wait…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  // ── Data state ────────────────────────────────────────────
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [pageError, setPageError] = useState('');

  // ── Filters ───────────────────────────────────────────────
  const [search, setSearch]         = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ── Modal state ───────────────────────────────────────────
  const [showAdd, setShowAdd]             = useState(false);
  const [editTarget, setEditTarget]       = useState(null);
  const [toggleTarget, setToggleTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Toast ─────────────────────────────────────────────────
  const [toast, setToast] = useState(null); // { message, type }

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // ── Debounce search ───────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch users ───────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const params = { limit: 100 };
      if (debouncedSearch) params.search     = debouncedSearch;
      if (deptFilter)      params.department = deptFilter;
      if (statusFilter)    params.status     = statusFilter;

      const { data } = await userService.getAll(params);
      const list = Array.isArray(data?.data) ? data.data : [];
      setUsers(list);
      setTotal(data?.pagination?.total ?? list.length);
    } catch (err) {
      setPageError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, deptFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Handlers ──────────────────────────────────────────────
  const handleCreated = useCallback((newUser) => {
    setUsers((prev) => [newUser, ...prev]);
    setTotal((t) => t + 1);
    showToast(`${newUser.name} created successfully.`);
  }, [showToast]);

  const handleUpdated = useCallback((updated) => {
    setUsers((prev) => prev.map((u) => u._id === updated._id ? { ...u, ...updated } : u));
    showToast(`${updated.name} updated successfully.`);
  }, [showToast]);

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    const newStatus = toggleTarget.status === 'Active' ? 'Inactive' : 'Active';
    setActionLoading(true);
    try {
      await userService.toggleStatus(toggleTarget._id, newStatus);
      setUsers((prev) => prev.map((u) =>
        u._id === toggleTarget._id ? { ...u, status: newStatus } : u
      ));
      showToast(`${toggleTarget.name} ${newStatus === 'Active' ? 'activated' : 'deactivated'}.`);
      setToggleTarget(null);
    } catch (err) {
      showToast(apiError(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await userService.remove(deleteTarget._id);
      // Soft delete → update status in list
      setUsers((prev) => prev.map((u) =>
        u._id === deleteTarget._id ? { ...u, status: 'Inactive' } : u
      ));
      showToast(`${deleteTarget.name} has been deactivated.`);
      setDeleteTarget(null);
    } catch (err) {
      showToast(apiError(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Column definitions ────────────────────────────────────
  const COLUMNS = [
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <div className={styles.nameCell}>
          <div className={styles.avatar} aria-hidden="true">{initials(row.name)}</div>
          <div>
            <div className={styles.nameText}>{row.name}</div>
            <div className={styles.emailText}>{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <Badge
          label={row.role}
          variant={row.role === 'Admin' ? 'processing' : 'pending'}
        />
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (row) => row.department
        ? <span className={styles.deptPill}>{row.department}</span>
        : <span style={{ color: 'var(--color-text-dim)' }}>—</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge label={row.status} variant={STATUS_VARIANT[row.status] ?? 'pending'} />
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) => (
        <time dateTime={row.createdAt} className={styles.dateCell}>{fmtDate(row.createdAt)}</time>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        const isAdmin = row.email?.toLowerCase() === FIXED_ADMIN_EMAIL.toLowerCase();
        if (isAdmin) {
          return (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
              System Admin
            </span>
          );
        }
        return (
          <div className={styles.actions}>
            {/* Edit */}
            <button
              className={`${styles.actionBtn} ${styles.actionEdit}`}
              onClick={(e) => { e.stopPropagation(); setEditTarget(row); }}
              aria-label={`Edit ${row.name}`}
              title="Edit user"
            >
              ✎ Edit
            </button>

            {/* Activate / Deactivate */}
            {row.status === 'Active' ? (
              <button
                className={`${styles.actionBtn} ${styles.actionDeactivate}`}
                onClick={(e) => { e.stopPropagation(); setToggleTarget(row); }}
                aria-label={`Deactivate ${row.name}`}
                title="Deactivate user"
              >
                ⏸ Deactivate
              </button>
            ) : (
              <button
                className={`${styles.actionBtn} ${styles.actionActivate}`}
                onClick={(e) => { e.stopPropagation(); setToggleTarget(row); }}
                aria-label={`Activate ${row.name}`}
                title="Activate user"
              >
                ▶ Activate
              </button>
            )}

            {/* Delete */}
            <button
              className={`${styles.actionBtn} ${styles.actionDelete}`}
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
              aria-label={`Delete ${row.name}`}
              title="Delete user"
            >
              🗑 Delete
            </button>
          </div>
        );
      },
    },
  ];

  // ── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <section className={`page-enter ${styles.centerState}`} aria-busy="true">
        <Spinner size={44} />
        <p className={styles.stateText}>Loading users…</p>
      </section>
    );
  }

  if (pageError) {
    return (
      <section className={`page-enter ${styles.centerState}`} role="alert">
        <span className={styles.stateIcon} aria-hidden="true">⚠️</span>
        <h2 className={styles.stateTitle}>Could not load users</h2>
        <p className={styles.stateText}>{pageError}</p>
        <button className="btn btn-ghost" onClick={fetchUsers} style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className={`page-enter ${styles.page}`}>

      {/* ── Header ── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>User Management</h1>
          <p className={styles.pageSubtitle}>
            Manage KMRL department users and access. {total} user{total !== 1 ? 's' : ''} total.
          </p>
        </div>
        <Button
          id="add-user-btn"
          variant="primary"
          onClick={() => setShowAdd(true)}
          aria-label="Add new user"
        >
          ＋ Add User
        </Button>
      </header>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        {/* Search */}
        <div className={styles.searchWrap}>
          
          <input
            id="users-search"
            type="search"
            className={`input ${styles.searchInput}`}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users"
          />
        </div>

        {/* Department filter */}
        <select
          id="users-dept-filter"
          className={styles.filterSelect}
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Status filter */}
        <select
          id="users-status-filter"
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <span className={styles.resultCount} aria-live="polite" aria-atomic="true">
          {users.length} result{users.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      {users.length === 0 ? (
        <div className={`glass-card ${styles.emptyState}`} role="status">
          <span className={styles.stateIcon} aria-hidden="true">
            {search || deptFilter || statusFilter ? '🔎' : '👤'}
          </span>
          <h2 className={styles.stateTitle}>
            {search || deptFilter || statusFilter ? 'No users match your filters' : 'No users found'}
          </h2>
          <p className={styles.stateText}>
            {search || deptFilter || statusFilter
              ? 'Try adjusting the search or filters.'
              : 'Add a Department Officer to get started.'}
          </p>
          {(search || deptFilter || statusFilter) && (
            <button className="btn btn-ghost" style={{ marginTop: '1rem' }}
              onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter(''); }}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className={`glass-card ${styles.tableCard}`}>
          <DataTable
            columns={COLUMNS}
            rows={users}
            rowKey="_id"
            ariaLabel="Users list"
          />
        </div>
      )}

      {/* ── Modals ── */}
      <AddUserModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />

      <EditUserModal
        isOpen={!!editTarget}
        user={editTarget}
        onClose={() => setEditTarget(null)}
        onUpdated={handleUpdated}
      />

      {/* Toggle status confirm */}
      <ConfirmModal
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleConfirm}
        title={toggleTarget?.status === 'Active' ? 'Deactivate User' : 'Activate User'}
        confirmLabel={toggleTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
        danger={toggleTarget?.status === 'Active'}
        loading={actionLoading}
      >
        {toggleTarget?.status === 'Active' ? (
          <>
            Are you sure you want to deactivate{' '}
            <span className={styles.confirmName}>{toggleTarget?.name}</span>?{' '}
            They will immediately lose access to the system.
          </>
        ) : (
          <>
            Reactivate <span className={styles.confirmName}>{toggleTarget?.name}</span>?{' '}
            They will regain full access to their department.
          </>
        )}
      </ConfirmModal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Deactivate User"
        confirmLabel="Deactivate"
        danger
        loading={actionLoading}
      >
        Are you sure you want to deactivate{' '}
        <span className={styles.confirmName}>{deleteTarget?.name}</span>?{' '}
        Their documents and tickets will be preserved. This can be reversed by reactivating the account.
      </ConfirmModal>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

    </section>
  );
}

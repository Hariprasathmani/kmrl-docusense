// pages/LeaveRequestPage.jsx — Employee Leave Request Submission
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../services/ticketService';
import styles from './LeaveRequestPage.module.css';

export default function LeaveRequestPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    leaveType: 'Annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.startDate || !formData.endDate) {
      setError('Both start and end dates are required.');
      return false;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (end < start) {
      setError('End date cannot be before start date.');
      return false;
    }

    if (start < new Date()) {
      setError('Start date cannot be in the past.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data } = await ticketService.createLeaveRequest(
        formData.leaveType,
        formData.startDate,
        formData.endDate,
        formData.reason,
        null // No attachment for now
      );

      setSuccess('Leave request submitted successfully!');
      setTimeout(() => {
        navigate(`/my-tickets/${data.data._id}`);
      }, 1500);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to submit leave request.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`page-enter ${styles.page}`}>
      {/* Header */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ← Back
        </button>
        <h1 className={styles.title}>Submit Leave Request</h1>
        <p className={styles.subtitle}>
          Submit your leave request to HR for approval
        </p>
      </header>

      <div className={styles.container}>
        {/* Form Card */}
        <div className={`glass-card ${styles.card}`}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.alert} role="alert">
                <span aria-hidden="true">⚠️</span>
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className={styles.successAlert} role="status">
                <span aria-hidden="true">✓</span>
                <p>{success}</p>
              </div>
            )}

            {/* Leave Type */}
            <div className={styles.formGroup}>
              <label htmlFor="leaveType" className={styles.label}>
                Leave Type <span className={styles.required}>*</span>
              </label>
              <select
                id="leaveType"
                name="leaveType"
                className={`input ${styles.input}`}
                value={formData.leaveType}
                onChange={handleChange}
                required
              >
                <option value="Annual">Annual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Personal">Personal Leave</option>
                <option value="Unpaid">Unpaid Leave</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Start Date */}
            <div className={styles.formGroup}>
              <label htmlFor="startDate" className={styles.label}>
                Start Date <span className={styles.required}>*</span>
              </label>
              <input
                id="startDate"
                type="date"
                name="startDate"
                className={`input ${styles.input}`}
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            {/* End Date */}
            <div className={styles.formGroup}>
              <label htmlFor="endDate" className={styles.label}>
                End Date <span className={styles.required}>*</span>
              </label>
              <input
                id="endDate"
                type="date"
                name="endDate"
                className={`input ${styles.input}`}
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>

            {/* Reason */}
            <div className={styles.formGroup}>
              <label htmlFor="reason" className={styles.label}>
                Reason (Optional)
              </label>
              <textarea
                id="reason"
                name="reason"
                className={`input ${styles.textarea}`}
                value={formData.reason}
                onChange={handleChange}
                placeholder="Enter the reason for your leave request..."
                rows="4"
              />
            </div>

            {/* Duration Display */}
            {formData.startDate && formData.endDate && (
              <div className={styles.durationInfo}>
                <span className={styles.durationLabel}>Duration:</span>
                <span className={styles.durationValue}>
                  {(() => {
                    const start = new Date(formData.startDate);
                    const end = new Date(formData.endDate);
                    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                    return `${days} day${days !== 1 ? 's' : ''}`;
                  })()}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Panel */}
        <aside className={`glass-card ${styles.infoCard}`}>
          <h3 className={styles.infoTitle}>Leave Request Info</h3>
          <ul className={styles.infoList}>
            <li>
              <strong>Destination:</strong> HR Department
            </li>
            <li>
              <strong>Processing Time:</strong> 1-2 business days
            </li>
            <li>
              <strong>Status:</strong> Track your request in "My Tickets"
            </li>
            <li>
              <strong>Notification:</strong> You'll receive an email when approved/rejected
            </li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

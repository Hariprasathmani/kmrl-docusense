// pages/UploadPage.jsx — KMRL DocuSense Document Upload Form
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService } from '../services/documentService';
import styles from './UploadPage.module.css';

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // idle | uploading | success | error
  const [status, setStatus] = useState('idle'); 
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Drag & Drop Handlers ──────────────────────────────────────────────────
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === 'uploading' || status === 'success') return;
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (status === 'uploading' || status === 'success') return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (newFile) => {
    // Validate extension
    const ext = newFile.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      setStatus('error');
      setErrorMsg('Unsupported file type. Please upload a .pdf, .docx, or .txt file.');
      setFile(null);
      return;
    }
    
    // Auto-fill title if empty
    if (!title) {
      const nameWithoutExt = newFile.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
    
    setFile(newFile);
    setStatus('idle');
    setErrorMsg('');
    setIsDuplicate(false);
  };

  // ── Form Submit ────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !file) return;

    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');
    setIsDuplicate(false);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('file', file);

    try {
      const res = await documentService.upload(formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        }
      });
      
      setStatus('success');
      setProgress(100);
      
      // Allow user to see "100% Success" before navigating
      setTimeout(() => {
        const docId = res.data?.data?._id ?? res.data?.data?.id ?? res.data?._id ?? res.data?.id;
        navigate(`/documents/${docId}`);
      }, 750);

    } catch (err) {
      setStatus('error');
      
      if (err?.response?.status === 409 && err?.response?.data?.duplicate) {
        setIsDuplicate(true);
      } else {
        setIsDuplicate(false);
        setErrorMsg(err?.response?.data?.message ?? err?.message ?? 'Upload failed. Please try again.');
      }
      setProgress(0);
    }
  };

  return (
    <section className={`page-enter ${styles.page}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>Upload Document</h1>
        <p className={styles.subtitle}>Upload a new file for AI processing and routing.</p>
      </header>

      <div className={`glass-card ${styles.card}`}>
        <form onSubmit={handleSubmit} className={styles.form}>
          
          <div className={styles.fieldGroup}>
            <label htmlFor="title" className={styles.label}>
              Document Title <span className={styles.required}>*</span>
            </label>
            <input
              id="title"
              type="text"
              className={`input ${styles.input}`}
              placeholder="e.g., Q3 Financial Report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={status === 'uploading' || status === 'success'}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              File Upload <span className={styles.required}>*</span>
            </label>
            
            <div 
              className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''} ${file ? styles.hasFile : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => {
                if (status !== 'uploading' && status !== 'success') {
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={status === 'uploading' || status === 'success' ? -1 : 0}
              aria-label="File upload dropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleChange}
                className={styles.fileInput}
                disabled={status === 'uploading' || status === 'success'}
              />
              
              <div className={styles.dropZoneContent}>
                <span className={styles.uploadIcon} aria-hidden="true">
                  {file ? '📄' : '☁️'}
                </span>
                {file ? (
                  <>
                    <span className={styles.dropMainText}>{file.name}</span>
                    <span className={styles.dropSubText}>Click or drag to replace</span>
                  </>
                ) : (
                  <>
                    <span className={styles.dropMainText}>Click to browse or drag file here</span>
                    <span className={styles.dropSubText}>Supports .pdf, .docx, .txt</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress / Status Area */}
          {(status === 'uploading' || status === 'success') && (
            <div className={styles.progressArea}>
              <div className={styles.progressHeader}>
                <span className={styles.progressText}>
                  {status === 'success' ? 'Upload complete!' : 'Uploading...'}
                </span>
                <span className={styles.progressPct}>{progress}%</span>
              </div>
              <div className={styles.progressBarBg}>
                <div 
                  className={`${styles.progressBarFill} ${status === 'success' ? styles.successFill : ''}`} 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          )}

          {status === 'error' && isDuplicate && (
            <div className={styles.errorAlert} role="alert">
              <strong>Document already exists</strong><br />
              This file has already been uploaded to KMRL DocuSense.
            </div>
          )}

          {status === 'error' && !isDuplicate && (
            <div className={styles.errorAlert} role="alert">
              <span aria-hidden="true">⚠️</span> {errorMsg}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/documents')}
              disabled={status === 'uploading' || status === 'success'}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={!title.trim() || !file || status === 'uploading' || status === 'success'}
            >
              {status === 'uploading' ? 'Uploading...' : status === 'success' ? 'Redirecting...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

// pages/LandingPage.jsx — KMRL DocuSense Public Landing Page
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LandingPage.module.css';

const WORKFLOW_STEPS = [
  { num: '01', label: 'Document Received',      active: true },
  { num: '02', label: 'Content Extracted' },
  { num: '03', label: 'Department Classified' },
  { num: '04', label: 'Ticket Created',          active: true },
  { num: '05', label: 'Officer Resolves' },
  { num: '06', label: 'Response Delivered',      active: true },
];

const FEATURES = [
  { num: '01', title: 'Intelligent Document Processing',   desc: 'Extract information from incoming documents and prepare them for department-level processing.' },
  { num: '02', title: 'Department Routing',                desc: 'Route documents to the appropriate department based on AI classification.' },
  { num: '03', title: 'Ticket Management',                 desc: 'Convert routed requests into trackable tickets with assignment, priority, status, and timeline.' },
  { num: '04', title: 'Inter-Department Collaboration',    desc: 'Allow departments to request assistance while preserving original ticket ownership.' },
  { num: '05', title: 'Internal Notes',                    desc: 'Enable collaborating departments to provide recommendations without exposing internal communication to the original requester.' },
  { num: '06', title: 'Email Automation',                  desc: 'Process incoming email attachments and send final resolution responses automatically.' },
  { num: '07', title: 'Analytics & Reporting',             desc: 'Provide operational visibility through document volume, department workload, and ticket analytics.' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className={styles.page}>

      {/* ── HEADER ──────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>KMRL DocuSense</div>
          <nav className={styles.nav} aria-label="Landing navigation">
            <a href="#workflow" className={styles.navLink}>Workflow</a>
            <a href="#features" className={styles.navLink}>Features</a>
            <Link to="/login" className="btn btn-primary btn-sm">Sign In</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>

        {/* ── HERO ────────────────────────────────────────────── */}
        <section className={styles.hero} aria-label="Hero">
          <div className={styles.heroInner}>

            {/* Left: content */}
            <div className={styles.heroContent}>
              <span className={styles.heroEyebrow}>Kochi Metro Rail Limited</span>

              <h1 className={styles.heroTitle}>
                KMRL DOCUSENSE
                <span className={styles.heroHighlight}>DOCUMENTS. ROUTED INTELLIGENTLY.</span>
              </h1>

              <p className={styles.heroDesc}>
                AI-powered document and workflow management for structured departmental operations.
              </p>

              <div className={styles.heroActions}>
                <Link to="/login" className="btn btn-primary">Sign In</Link>
                <a href="#workflow" className={styles.heroBtnGhost}>Explore Workflow</a>
              </div>
            </div>

            {/* Right: mock ticket card */}
            <div className={styles.heroVisual} aria-hidden="true">
              <div className={styles.mockCard}>
                <div className={styles.mockHeader}>
                  <span className={styles.mockHeaderTitle}>Document Processing</span>
                  <span className={styles.mockHeaderDot} />
                </div>
                <div className={styles.mockBody}>
                  <div className={styles.mockTitle}>Vendor Agreement — Legal Dept</div>
                  <div className={styles.mockDivider} />
                  <div className={styles.mockRow}>
                    <span className={styles.mockLabel}>Department</span>
                    <span className={styles.mockValue}>Legal</span>
                  </div>
                  <div className={styles.mockRow}>
                    <span className={styles.mockLabel}>Source</span>
                    <span className={styles.mockBadgeBlue}>Email</span>
                  </div>
                  <div className={styles.mockRow}>
                    <span className={styles.mockLabel}>AI Confidence</span>
                    <div className={styles.mockConf}>
                      <div className={styles.mockConfBar}>
                        <div className={styles.mockConfFill} />
                      </div>
                      <span className={styles.mockConfScore}>94%</span>
                    </div>
                  </div>
                  <div className={styles.mockRow}>
                    <span className={styles.mockLabel}>Status</span>
                    <span className={styles.mockBadgeGreen}>Routed</span>
                  </div>
                  <div className={styles.mockDivider} />
                  <div className={styles.mockRow}>
                    <span className={styles.mockLabel}>Ticket #KMRL-2026-001045</span>
                    <span className={styles.mockBadgeWarning}>In Progress</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── VALUE STRIP ─────────────────────────────────────── */}
        <section className={styles.valueStrip} aria-label="Key capabilities">
          <div className={styles.valueItem}>Document Ingestion</div>
          <div className={styles.valueDot} />
          <div className={styles.valueItem}>AI Routing</div>
          <div className={styles.valueDot} />
          <div className={styles.valueItem}>Ticket Workflow</div>
          <div className={styles.valueDot} />
          <div className={styles.valueItem}>Department Collaboration</div>
          <div className={styles.valueDot} />
          <div className={styles.valueItem}>Email Automation</div>
        </section>

        {/* ── WORKFLOW ────────────────────────────────────────── */}
        <section id="workflow" className={styles.workflowSection} aria-labelledby="workflow-title">
          <h2 className={styles.sectionTitle} id="workflow-title">FROM DOCUMENTS TO ACTION.</h2>

          {/* Metro route-line workflow */}
          <div className={styles.routeFlow} role="list" aria-label="Document workflow steps">
            {WORKFLOW_STEPS.map((step, idx) => (
              <div key={step.num} className={styles.routeStep} role="listitem">
                <div className={styles.routeStepMarker}>
                  <div className={`${styles.routeStepDot} ${step.active ? styles.routeStepDotActive : ''}`} />
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div className={styles.routeStepConnector} />
                  )}
                </div>
                <div className={styles.routeStepContent}>
                  <span className={styles.routeStepNum}>{step.num}</span>
                  <span className={styles.routeStepTitle}>{step.label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────── */}
        <section id="features" className={styles.featuresSection} aria-labelledby="features-title">
          <h2 className={styles.sectionTitle} id="features-title">BUILT FOR OPERATIONAL WORKFLOW</h2>
          <div className={styles.featureList}>
            {FEATURES.map(f => (
              <div key={f.num} className={styles.featureItem}>
                <span className={styles.featureNum}>{f.num}</span>
                <div className={styles.featureContent}>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureDesc}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── COLLABORATION BLOCKS ────────────────────────────── */}
        <section className={styles.visualBlocks} aria-label="System capabilities">

          <div className={styles.visualBlock}>
            <h3 className={styles.visualTitle}>ONE TICKET.<br />MULTIPLE EXPERTS.<br />ONE ACCOUNTABLE OWNER.</h3>
            <p className={styles.visualDesc}>
              A department can request assistance from another through shared tickets and internal notes, while retaining ownership of the final resolution.
            </p>
            <div className={styles.flowDiag} aria-hidden="true">
              <div className={styles.flowBoxPrimary}>LEGAL<span>Owner</span></div>
              <div className={styles.flowLine}>↓ Shares with</div>
              <div className={styles.flowBoxSecondary}>FINANCE<span>Internal Note</span></div>
              <div className={styles.flowLine}>↓ Resolution by</div>
              <div className={styles.flowBoxPrimary}>LEGAL<span>Final Resolution</span></div>
            </div>
          </div>

          <div className={styles.visualBlock}>
            <h3 className={styles.visualTitle}>SEAMLESS<br />EMAIL AUTOMATION.</h3>
            <p className={styles.visualDesc}>
              The system only sends a reply upon final resolution. Internal department sharing remains completely confidential to the original sender.
            </p>
            <div className={styles.flowDiag} aria-hidden="true">
              <div className={styles.flowBoxText}>INCOMING EMAIL<span>Sender · Subject · Attachment</span></div>
              <div className={styles.flowLine}>↓</div>
              <div className={styles.flowBoxSecondary}>DOCUSENSE AI<span>Extraction · Classification · Routing</span></div>
              <div className={styles.flowLine}>↓</div>
              <div className={styles.flowBoxPrimary}>DEPARTMENT<span>Ticket · Assignment · Resolution</span></div>
            </div>
          </div>

        </section>

        {/* ── TRUST STRIP ─────────────────────────────────────── */}
        <section className={styles.trustSection} aria-label="Security features">
          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>Role-Based Access</div>
            <div className={styles.trustItem}>Department-Level Access</div>
            <div className={styles.trustItem}>Controlled Document Access</div>
            <div className={styles.trustItem}>Ticket Ownership</div>
            <div className={styles.trustItem}>Complete Audit Timeline</div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <section className={styles.cta} aria-label="Call to action">
          <h2 className={styles.ctaTitle}>READY TO TURN DOCUMENTS INTO ACTION?</h2>
          <p className={styles.ctaDesc}>
            Access KMRL DocuSense and manage documents, departmental requests, and resolution workflows from one place.
          </p>
          <Link to="/login" className="btn btn-primary btn-lg">Sign In</Link>
        </section>

      </main>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.brand}>KMRL DocuSense</div>
            <p className={styles.footerText}>AI-powered document and workflow management.</p>
          </div>
          <div className={styles.footerLinks}>
            <a href="#workflow">Workflow</a>
            <a href="#features">Features</a>
            <Link to="/login">Sign In</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          © {new Date().getFullYear()} KMRL DocuSense
        </div>
      </footer>

    </div>
  );
}

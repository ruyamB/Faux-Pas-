'use client';

import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="landing-page">
      {/* ── Nav ── */}
      <nav className="landing-nav">
        <span className="landing-nav-brand">Faux Pas</span>
        <div className="landing-nav-right">
          <ThemeToggle />
          <button
            className="landing-nav-link"
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Features
          </button>
          <button
            className="landing-nav-link"
            onClick={() => document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Roadmap
          </button>
          <button
            className="landing-nav-cta"
            onClick={() => router.push('/auth')}
            id="nav-login-btn"
          >
            Start Writing
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <h1 className="landing-hero-title">
          Faux Pas<br />
          <span className="landing-hero-title-accent">Away From Chaos.</span>
        </h1>
        <p className="landing-hero-sub">
          Faux Pas stands par to Final Draft, Fade In and Highland 2.
          No in-app transactions. Free for writers.
        </p>
        <div className="landing-hero-actions">
          <button
            className="landing-btn-primary"
            onClick={() => router.push('/auth')}
            id="hero-cta-btn"
          >
            Start Writing.
          </button>
        </div>
        <p className="landing-hero-note"> press CTRL thrice on login page to enable Guest mode.</p>
      </section>

      {/* ── Differentiators ── */}
      <section className="landing-section" id="differentiators">
        <div className="landing-diff-grid">

          <div className="landing-diff-card">
            <div className="landing-diff-number">01</div>
            <h3 className="landing-diff-title">Enabling B-Scene</h3>
            <p className="landing-diff-desc">
              Link or unlink any episode from the Main Branch with a single click.
              Unlinked episodes stay in your project but disappear from every export.
              Alternate drafts, deleted scenes, experimental storylines —
              all in one place, never in the final PDF.
            </p>
            <span className="landing-diff-badge">No other tool does this</span>
          </div>

          <div className="landing-diff-card">
            <div className="landing-diff-number">02</div>
            <h3 className="landing-diff-title">Structured from get go.</h3>
            <p className="landing-diff-desc">
              Other tools were built for feature films. One document, one script.
              Faux Pas was built for series. Episodes and acts are structural
              elements, not separate files. One project, entire season.
            </p>
            <span className="landing-diff-badge">Architecture matters</span>
          </div>

          <div className="landing-diff-card">
            <div className="landing-diff-number">03</div>
            <h3 className="landing-diff-title">Automated  formatting.</h3>
            <p className="landing-diff-desc">
              Leave the software and focus on the script. Faux Pas handles formatting automatically,
              ensuring your screenplay meets industry standards without any manual intervention.
            </p>
            <span className="landing-diff-badge">See it, then ship it</span>
          </div>

        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-section" id="features">
        <p className="landing-section-eyebrow">Features</p>
        <h2 className="landing-section-heading">
          Everything you need.<br />Nothing you don't.
        </h2>
        <div className="landing-features-grid">
          {[
            { title: 'Smart Editor', desc: 'Tab cycles element types. Enter auto-selects the next logical format. Pure keyboard flow.' },
            { title: 'Page View', desc: 'Toggle paginated 8.5×11" view while writing. See your pages take shape in real time.' },
            { title: 'Cover Page', desc: 'Title, author, contact, date, comments. Customizable. Formatted to industry standard.' },
            { title: 'Drag & Drop', desc: 'Reorder episodes and acts by dragging in the sidebar. Sort order persists instantly.' },
            { title: 'Cloud Save', desc: 'Auto-saves every 3 seconds. Manual save with Ctrl+S. Your script is always safe.' },
            { title: 'Guest Mode', desc: 'No account needed. Open the editor and write. Everything saved locally in your browser.' },
            { title: 'Dark & Light', desc: 'Two themes. Switch with a click. Designed for long writing sessions.' },
            { title: 'Inline Rename', desc: 'Double-click any episode or act title in the sidebar to edit it in place.' },
            { title: '50-Level Undo', desc: 'Deep undo stack. Ctrl+Z steps back through structural and content changes.' },
          ].map((f, i) => (
            <div key={i} className="landing-feature-card">
              <h4 className="landing-feature-name">{f.title}</h4>
              <p className="landing-feature-text">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Roadmap ── */}
      <section className="landing-section" id="roadmap">
        <p className="landing-section-eyebrow">Roadmap</p>
        <h2 className="landing-section-heading">
          What's next.
        </h2>
        <div className="landing-roadmap-list">
          {[
            { title: 'Revision Tracking', desc: 'Colored revision pages. See exactly what changed between drafts.' },
            { title: 'Fountain Format', desc: 'Import and export industry-standard Fountain plain text.' },
            { title: 'Index Cards', desc: 'Visual scene planning board for outlining and rearranging.' },
            { title: 'Character Reports', desc: 'Automated breakdowns — who speaks, how much, where.' },
            { title: 'Dual Dialogue', desc: 'Side-by-side character dialogue for overlapping conversations.' },
          ].map((f, i) => (
            <div key={i} className="landing-roadmap-row">
              <span className="landing-roadmap-marker" />
              <div>
                <h4 className="landing-roadmap-name">{f.title}</h4>
                <p className="landing-roadmap-text">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-bottom-cta">
        <h2 className="landing-bottom-cta-title">Start writing today.</h2>
        <p className="landing-bottom-cta-sub">Free. No credit card. No strings.</p>
        <button
          className="landing-btn-primary"
          onClick={() => router.push('/auth')}
          id="final-cta-btn"
        >
          Open the Editor
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>Faux Pas © {new Date().getFullYear()}</span>
        <span className="landing-footer-sep">·</span>
        <span>Built for writers who think in episodes</span>
      </footer>
    </main>
  );
}

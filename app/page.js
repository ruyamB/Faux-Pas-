'use client';

import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="landing">
      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
        <ThemeToggle />
      </div>
      <h1 className="landing-title">Faux Pas</h1>
      <p className="landing-subtitle">screenwriting studio</p>
      <div className="landing-divider" />
      <p className="landing-tagline">
        Write screenplays in proper Hollywood format.
        Organized by episodes and acts.
        Saved in the cloud. Always.
      </p>
      <div className="landing-cta">
        <button
          className="btn btn-primary"
          onClick={() => router.push('/auth')}
          id="get-started-btn"
        >
          Get Started
        </button>
      </div>
    </main>
  );
}

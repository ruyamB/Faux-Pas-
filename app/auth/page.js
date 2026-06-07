'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ThemeToggle from '@/components/ThemeToggle';

export default function AuthPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ctrlPressCount = 0;
    let lastCtrlTime = 0;

    const handleKeyDown = (e) => {
      if (e.key === 'Control') {
        const now = Date.now();
        // Allow up to 800ms gap between consecutive Control key presses
        if (now - lastCtrlTime < 800) {
          ctrlPressCount++;
        } else {
          ctrlPressCount = 1;
        }
        lastCtrlTime = now;

        if (ctrlPressCount === 3) {
          localStorage.setItem('fauxpas_guest_mode', 'true');
          localStorage.removeItem('fauxpas_guest_store'); // Reset guest workspace
          router.push('/dashboard');
        }
      } else {
        // Reset counter if other keys are pressed in between
        ctrlPressCount = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });
        if (signupError) throw signupError;
        router.push('/dashboard');
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw loginError;
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-container">
      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
        <ThemeToggle />
      </div>
      <div className="auth-box">
        <h1 className="auth-title">Faux Pas</h1>
        <p className="auth-mode-label">
          {isSignup ? 'Create Account' : 'Welcome Back'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <input
              id="auth-username"
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          )}
          <input
            id="auth-email"
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            id="auth-password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />
          <p className="auth-error">{error}</p>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            id="auth-submit-btn"
          >
            {loading ? '...' : isSignup ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <p className="auth-toggle">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={() => { setIsSignup(!isSignup); setError(''); }}>
            {isSignup ? 'Log in' : 'Sign up'}
          </span>
        </p>
      </div>
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, deriveCredentials } from '@/lib/supabase';
import ThemeToggle from '@/components/ThemeToggle';

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('unlock'); // 'unlock' | 'create'
  const [privateKey, setPrivateKey] = useState('');
  const [username, setUsername] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);
  
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Hidden/backup Guest Mode activation (CTRL x3)
  useEffect(() => {
    let ctrlPressCount = 0;
    let lastCtrlTime = 0;

    const handleKeyDown = (e) => {
      if (e.key === 'Control') {
        const now = Date.now();
        if (now - lastCtrlTime < 800) {
          ctrlPressCount++;
        } else {
          ctrlPressCount = 1;
        }
        lastCtrlTime = now;

        if (ctrlPressCount === 3) {
          localStorage.setItem('fauxpas_guest_mode', 'true');
          localStorage.removeItem('fauxpas_guest_store');
          router.push('/dashboard');
        }
      } else {
        ctrlPressCount = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Key Generator helper
  const generatePrivateKey = () => {
    const words = [
      'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 
      'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango', 
      'uniform', 'victor', 'whiskey', 'xray', 'yankee', 'zulu', 'beacon', 'canyon', 'dusk', 'emerald', 
      'forest', 'glacier', 'horizon', 'island', 'jungle', 'lagoon', 'mountain', 'nexus', 'ocean', 
      'pathway', 'quartz', 'river', 'summit', 'tundra', 'valley', 'wildwood', 'zephyr', 'fable', 'monument'
    ];
    
    const chosen = [];
    for (let i = 0; i < 6; i++) {
      const idx = Math.floor(Math.random() * words.length);
      chosen.push(words[idx]);
    }
    return chosen.join('-');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!privateKey.trim()) {
      setError('Please enter your private key');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { writerId, email, password } = await deriveCredentials(privateKey);

      if (offlineMode) {
        localStorage.setItem('fauxpas_guest_mode', 'true');
        localStorage.setItem('fauxpas_private_key', privateKey.trim());
        localStorage.setItem('fauxpas_guest_id', writerId);
        localStorage.setItem('fauxpas_username', 'Offline Writer');
        router.push('/dashboard');
      } else {
        // Attempt to log in first
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (loginError) {
          // If user is missing, auto-register them seamlessly with the derived credentials
          if (loginError.message?.includes('Invalid login credentials') || loginError.status === 400) {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { username: 'Writer' }
              }
            });
            if (signUpError) throw signUpError;
          } else {
            throw loginError;
          }
        }
        
        localStorage.setItem('fauxpas_private_key', privateKey.trim());
        localStorage.setItem('fauxpas_guest_id', writerId);
        localStorage.setItem('fauxpas_username', 'Writer');
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to unlock workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!username.trim() && !generatedKey) {
      setError('Please enter a username');
      return;
    }
    setError('');

    // Step 1: Generate Key first so user can copy it
    if (!generatedKey) {
      const key = generatePrivateKey();
      setGeneratedKey(key);
      return;
    }

    // Step 2: Proceed to finalize creation once user clicks "I have saved my key"
    setLoading(true);
    try {
      const { writerId, email, password } = await deriveCredentials(generatedKey);

      if (offlineMode) {
        localStorage.setItem('fauxpas_guest_mode', 'true');
        localStorage.setItem('fauxpas_private_key', generatedKey);
        localStorage.setItem('fauxpas_guest_id', writerId);
        localStorage.setItem('fauxpas_username', username.trim());
        
        // Initialize workspace inside local storage if not already there
        const storeKey = `fauxpas_guest_store_${writerId}`;
        if (!localStorage.getItem(storeKey)) {
          localStorage.setItem(storeKey, JSON.stringify({
            projects: [],
            episodes: [],
            acts: [],
            elements: [],
            writers: []
          }));
        }

        // Upsert to offline writers table
        await supabase.from('writers').upsert({
          id: writerId,
          username: username.trim(),
          email: email,
          password_hash: password
        });

        router.push('/dashboard');
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username.trim() }
          }
        });
        if (signUpError) throw signUpError;

        // Upsert to online writers table
        const { error: writerError } = await supabase.from('writers').upsert({
          id: writerId,
          username: username.trim(),
          email: email,
          password_hash: password
        });
        if (writerError) {
          console.warn('Writers upsert warning:', writerError);
        }

        localStorage.setItem('fauxpas_private_key', generatedKey);
        localStorage.setItem('fauxpas_guest_id', writerId);
        localStorage.setItem('fauxpas_username', username.trim());
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to create workspace');
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

        <div className="auth-tabs">
          <button 
            className={`auth-tab-btn ${activeTab === 'unlock' ? 'active' : ''}`}
            onClick={() => { setActiveTab('unlock'); setError(''); setGeneratedKey(''); }}
          >
            Unlock Workspace
          </button>
          <button 
            className={`auth-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => { setActiveTab('create'); setError(''); }}
          >
            Create Workspace
          </button>
        </div>

        {activeTab === 'unlock' ? (
          <form className="auth-form" onSubmit={handleUnlock}>
            <p className="auth-instruction">Enter your private key to access your projects.</p>
            <input
              id="auth-private-key"
              type="text"
              placeholder="e.g. glacier-nexus-echo-lagoon-river-horizon"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              required
              autoComplete="off"
            />
            
            <div className="auth-checkbox-container">
              <label htmlFor="auth-offline-unlock">
                <input
                  id="auth-offline-unlock"
                  type="checkbox"
                  checked={offlineMode}
                  onChange={(e) => setOfflineMode(e.target.checked)}
                />
                Use Offline Mode (Local browser save only)
              </label>
            </div>

            <p className="auth-error">{error}</p>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="auth-submit-btn"
            >
              {loading ? '...' : 'Unlock Workspace'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleCreate}>
            {!generatedKey ? (
              <>
                <p className="auth-instruction">Choose a username to prepare your workspace.</p>
                <input
                  id="auth-username"
                  type="text"
                  placeholder="e.g. Margaret Atwood"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />

                <div className="auth-checkbox-container">
                  <label htmlFor="auth-offline-create">
                    <input
                      id="auth-offline-create"
                      type="checkbox"
                      checked={offlineMode}
                      onChange={(e) => setOfflineMode(e.target.checked)}
                    />
                    Use Offline Mode (Local browser save only)
                  </label>
                </div>

                <p className="auth-error">{error}</p>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="auth-generate-btn"
                >
                  Generate Private Key
                </button>
              </>
            ) : (
              <div className="generated-key-container">
                <p className="key-warning">
                  ⚠️ Write down or copy your private key. We never store it. If you lose this key, your projects cannot be recovered.
                </p>
                
                <div className="key-box">
                  <code>{generatedKey}</code>
                  <button 
                    type="button" 
                    className="copy-btn" 
                    onClick={handleCopy}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleCreate}
                  disabled={loading}
                  id="auth-finalize-btn"
                >
                  {loading ? '...' : 'I have saved my key, open my workspace'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

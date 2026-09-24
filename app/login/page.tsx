'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ALLOWED_EMAIL = 'investment@pitchourway.com';

export default function LoginPage() {
  const [email, setEmail] = useState(ALLOWED_EMAIL);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      // The database itself rejects any signup email other than
      // investment@pitchourway.com, so this also catches that case.
      setError(error.message);
      return;
    }

    if (mode === 'signup') {
      setError(null);
      alert('Account created. You can now sign in.');
      setMode('signin');
      return;
    }

    router.push('/deals');
  }

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Pitch Our Way</h1>
        <p style={styles.subtitle}>Investor Matching Platform</p>

        <label style={styles.label}>Email</label>
        <input
          style={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          style={styles.linkButton}
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin'
            ? "First time here? Create the account"
            : 'Already have an account? Sign in'}
        </button>

        {mode === 'signup' && (
          <p style={styles.note}>
            Only {ALLOWED_EMAIL} can create an account on this platform —
            any other email will be rejected automatically.
          </p>
        )}
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    width: 360,
    background: '#fff',
    borderRadius: 12,
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 24px', color: '#64748b', fontSize: 14 },
  label: { fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 },
  input: {
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 16,
    fontSize: 14,
  },
  button: {
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: 13,
    marginTop: 14,
    cursor: 'pointer',
  },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  note: { fontSize: 12, color: '#94a3b8', marginTop: 14, lineHeight: 1.5 },
};

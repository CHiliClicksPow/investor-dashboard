'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ALLOWED_EMAIL = 'investment@pitchourway.com';

type Mode = 'otp-request' | 'otp-verify' | 'password-signin' | 'password-signup';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('otp-request');
  const [email, setEmail] = useState(ALLOWED_EMAIL);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo(`A 6-digit code was sent to ${email}. Enter it below.`);
    setMode('otp-verify');
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/home');
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } =
      mode === 'password-signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (mode === 'password-signup') {
      alert('Account created. You can now sign in.');
      setMode('otp-request');
      return;
    }
    router.push('/home');
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img src="/logo.png" alt="Pitch Our Way" style={{ height: 40, width: 'auto', marginBottom: 8 }} />
        <p style={styles.subtitle}>Investor Matching Platform</p>

        {(mode === 'otp-request' || mode === 'otp-verify') && (
          <form onSubmit={mode === 'otp-request' ? sendCode : verifyCode}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={mode === 'otp-verify'}
              required
            />

            {mode === 'otp-verify' && (
              <>
                <label style={styles.label}>6-digit code</label>
                <input
                  style={{ ...styles.input, letterSpacing: 4, fontSize: 20, textAlign: 'center' }}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  inputMode="numeric"
                  required
                />
              </>
            )}

            {info && <p style={styles.info}>{info}</p>}
            {error && <p style={styles.error}>{error}</p>}

            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'otp-request' ? 'Send code' : 'Verify & sign in'}
            </button>

            {mode === 'otp-verify' && (
              <button type="button" style={styles.linkButton} onClick={() => { setMode('otp-request'); setError(null); setInfo(null); }}>
                Use a different email / resend
              </button>
            )}
          </form>
        )}

        {(mode === 'password-signin' || mode === 'password-signup') && (
          <form onSubmit={handlePasswordSubmit}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'password-signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {mode !== 'otp-request' && mode !== 'otp-verify' ? (
            <button type="button" style={styles.linkButton} onClick={() => { setMode('otp-request'); setError(null); }}>
              ← Sign in with email code instead
            </button>
          ) : (
            <button type="button" style={styles.linkButton} onClick={() => { setMode('password-signin'); setError(null); }}>
              Use password instead
            </button>
          )}
          {(mode === 'password-signin' || mode === 'otp-request' || mode === 'otp-verify') && (
            <button type="button" style={styles.linkButton} onClick={() => { setMode('password-signup'); setError(null); }}>
              First time here? Set a password (one-time)
            </button>
          )}
        </div>

        <p style={styles.note}>
          Only {ALLOWED_EMAIL} can sign in here — enforced by the database itself.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: 'system-ui, sans-serif' },
  card: { width: 380, background: '#fff', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 24px', color: '#64748b', fontSize: 14 },
  label: { fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block' },
  input: { width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 14, boxSizing: 'border-box' },
  button: { width: '100%', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  linkButton: { background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', textAlign: 'left', padding: 0 },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  info: { color: '#16a34a', fontSize: 13, marginBottom: 12 },
  note: { fontSize: 12, color: '#94a3b8', marginTop: 18, lineHeight: 1.5 },
};

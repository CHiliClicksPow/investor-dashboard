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
    setInfo(`A sign-in email was sent to ${email}. Open it and click the "Sign in" link — that logs you in directly. (If you ever see a 6-digit code instead of a link, you can type it below.)`);
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

  async function sendResetEmail() {
    setError(null);
    setInfo(null);
    if (!email) {
      setError('Enter your email above first.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo(`Password reset steps sent to ${email}. Check the inbox.`);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } =
      mode === 'password-signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { password_updated_at: new Date().toISOString() } },
          });
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
        <img src="/logo.png" alt="Pitch Our Way" style={{ height: 56, width: 'auto', maxWidth: 200, alignSelf: 'center', marginBottom: 24, objectFit: 'contain' }} />
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to Investor Matching</p>

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
                <label style={styles.label}>6-digit code (only if the email showed one instead of a link)</label>
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
              {loading ? 'Please wait…' : mode === 'otp-request' ? 'Send sign-in email' : 'Verify code / Refresh after clicking link'}
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
            {info && <p style={styles.info}>{info}</p>}
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'password-signin' ? 'Sign in' : 'Create account'}
            </button>
            {mode === 'password-signin' && (
              <button type="button" style={{ ...styles.linkButton, marginTop: 10 }} onClick={sendResetEmail} disabled={loading}>
                Forgot password? Email me the steps
              </button>
            )}
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
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg, #241454 0%, #4F3FE0 100%)', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 16, boxSizing: 'border-box' },
  card: { width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, padding: 40, display: 'flex', flexDirection: 'column', boxShadow: '0 30px 70px rgba(20,10,60,0.35)', boxSizing: 'border-box' },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#23223A', fontFamily: "'Sora', sans-serif" },
  subtitle: { margin: '4px 0 28px', color: '#6B6980', fontSize: 14 },
  label: { fontSize: 12, fontWeight: 600, color: '#6B6980', marginBottom: 8, display: 'block', fontFamily: "'Sora', sans-serif", letterSpacing: '0.02em' },
  input: { width: '100%', border: '1px solid #E4E2F2', borderRadius: 10, padding: '13px 16px', marginBottom: 20, fontSize: 14, boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", color: '#23223A' },
  button: { width: '100%', background: '#4F3FE0', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif" },
  linkButton: { background: 'none', border: 'none', color: '#4F3FE0', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0 },
  error: { color: '#C0392B', fontSize: 13, marginBottom: 12 },
  info: { color: '#1E8A4C', fontSize: 13, marginBottom: 12 },
  note: { fontSize: 12, color: '#9997AC', marginTop: 20, lineHeight: 1.5 },
};

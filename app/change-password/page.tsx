'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NavBar from '@/components/NavBar';

const ALLOWED_EMAIL = 'investment@pitchourway.com';

function ChangePasswordInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get('expired') === '1';

  const [step, setStep] = useState<'verify-request' | 'verify-code' | 'set-password'>('verify-request');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendVerificationCode() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: ALLOWED_EMAIL,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo(`A verification code (or sign-in link) was sent to ${ALLOWED_EMAIL}. This confirms it's really you before allowing a password change.`);
    setStep('verify-code');
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: ALLOWED_EMAIL, token: code, type: 'email' });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep('set-password');
    setInfo(null);
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { password_updated_at: new Date().toISOString() },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
    if (expired) {
      setTimeout(() => router.push('/home'), 1200);
    }
  }

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 420, margin: '60px auto', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Change Password</h1>

        {expired && (
          <p style={{ background: '#fef3c7', color: '#92400e', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 20 }}>
            Your password is 30 days old — for security, please set a new one to continue.
          </p>
        )}

        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
          For security, changing the password requires proving access to {ALLOWED_EMAIL} first —
          just being logged in isn't enough.
        </p>

        {step === 'verify-request' && (
          <button
            onClick={sendVerificationCode}
            disabled={loading}
            style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            {loading ? 'Sending…' : `Send verification code to ${ALLOWED_EMAIL}`}
          </button>
        )}

        {step === 'verify-code' && (
          <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {info && <p style={{ color: '#16a34a', fontSize: 13 }}>{info}</p>}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                6-digit code (if the email showed a link instead, click that, then come back and refresh this page)
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 20, textAlign: 'center', letterSpacing: 4, boxSizing: 'border-box' }}
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {loading ? 'Verifying…' : 'Verify code'}
            </button>
          </form>
        )}

        {step === 'set-password' && (
          <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: '#16a34a', fontSize: 13 }}>Email verified. Now set your new password.</p>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}
                minLength={8}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>Confirm new password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}
                minLength={8}
                required
              />
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
            {success && <p style={{ color: '#16a34a', fontSize: 13 }}>Password updated successfully.</p>}
            <button
              type="submit"
              disabled={loading}
              style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {loading ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={null}>
      <ChangePasswordInner />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NavBar from '@/components/NavBar';

export default function ChangePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get('expired') === '1';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { password_updated_at: new Date().toISOString() },
    });
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
    setPassword('');
    setConfirm('');
    if (expired) {
      setTimeout(() => router.push('/home'), 1200);
    }
  }

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 420, margin: '60px auto', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Change Password</h1>

        {expired ? (
          <p style={{ background: '#fef3c7', color: '#92400e', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 20 }}>
            Your password is 30 days old — for security, please set a new one to continue.
          </p>
        ) : (
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
            Set a new password for investment@pitchourway.com. You can use this instead of
            the email code next time you sign in. Passwords must be renewed every 30 days.
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              New password
            </label>
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
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              Confirm new password
            </label>
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
            disabled={saving}
            style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

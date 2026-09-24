'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSaving(true);
    // Supabase automatically turns the emailed link's token into a
    // temporary session when this page loads, so updateUser works here
    // without the user needing to already be signed in.
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
    setTimeout(() => router.push('/home'), 1200);
  }

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Set a new password</h1>
        <p style={styles.subtitle}>For investment@pitchourway.com</p>

        <label style={styles.label}>New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          minLength={8}
          required
        />

        <label style={styles.label}>Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={styles.input}
          minLength={8}
          required
        />

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>Password set — redirecting…</p>}

        <button type="submit" disabled={saving} style={styles.button}>
          {saving ? 'Saving…' : 'Set password'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: 'system-ui, sans-serif', padding: 16, boxSizing: 'border-box' },
  card: { width: '100%', maxWidth: 380, background: '#fff', borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', boxSizing: 'border-box' },
  title: { margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 24px', color: '#64748b', fontSize: 14 },
  label: { fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 },
  input: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 14 },
  button: { background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  success: { color: '#16a34a', fontSize: 13, marginBottom: 12 },
};

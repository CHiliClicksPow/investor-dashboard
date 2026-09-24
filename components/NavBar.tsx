'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NavBar() {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <img src="/logo.png" alt="Pitch Our Way" style={styles.logo} />
        <Link href="/home" style={styles.link}>Home</Link>
        <Link href="/deals" style={styles.link}>Deals</Link>
        <Link href="/deals/new" style={styles.link}>New Deal</Link>
        <Link href="/import-investors" style={styles.link}>Import Investors</Link>
      </div>
      <button onClick={signOut} style={styles.signOut}>Sign out</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px',
    background: '#0f172a',
    fontFamily: 'system-ui, sans-serif',
  },
  left: { display: 'flex', alignItems: 'center', gap: 20 },
  brand: { color: '#fff', fontWeight: 700, fontSize: 15, marginRight: 8 },
  logo: { height: 36, width: 'auto', marginRight: 8 },
  link: { color: '#cbd5e1', textDecoration: 'none', fontSize: 14 },
  signOut: {
    background: 'transparent',
    border: '1px solid #475569',
    color: '#cbd5e1',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 13,
    cursor: 'pointer',
  },
};

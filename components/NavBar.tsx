'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const links = [
    { href: '/home', label: 'Home' },
    { href: '/deals', label: 'Deals' },
    { href: '/deals/new', label: 'New Deal' },
    { href: '/import-investors', label: 'Import Investors' },
    { href: '/investors/new', label: 'Add Investor' },
  ];

  return (
    <div style={styles.bar} className="pow-nav-bar">
      <div style={styles.left} className="pow-nav-links">
        <img src="/logo.png" alt="Pitch Our Way" style={styles.logo} />
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              ...styles.link,
              color: pathname === l.href ? '#4F3FE0' : '#6B6980',
              fontWeight: pathname === l.href ? 700 : 600,
            }}
          >
            {l.label.toUpperCase()}
          </Link>
        ))}
      </div>
      <button onClick={signOut} style={styles.signOut}>Sign out</button>
      <style>{`
        @media (max-width: 768px) {
          .pow-nav-links { gap: 12px !important; }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    rowGap: 10,
    padding: '18px 32px',
    background: '#FFFFFF',
    borderBottom: '1px solid #ECEBF5',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  left: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 28, rowGap: 10 },
  logo: { height: 26, width: 'auto', marginRight: 6 },
  link: {
    textDecoration: 'none',
    fontSize: 12.5,
    whiteSpace: 'nowrap',
    fontFamily: "'Sora', system-ui, sans-serif",
    letterSpacing: '0.03em',
  },
  signOut: {
    background: '#23223A',
    border: 'none',
    color: '#fff',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: "'Sora', system-ui, sans-serif",
    cursor: 'pointer',
    flexShrink: 0,
  },
};

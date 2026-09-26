'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NavBar from '@/components/NavBar';
import PortfolioMarquee from '@/components/PortfolioMarquee';

export default function HomePage() {
  const supabase = createClient();
  const router = useRouter();
  const [investorCount, setInvestorCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('investors')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setInvestorCount(count ?? 0));
  }, []);

  return (
    <div>
      <NavBar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px 40px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <img src="/logo.png" alt="Pitch Our Way" style={{ height: 64, width: 'auto', marginBottom: 40 }} />

        <div style={{
          fontSize: 76, fontWeight: 700, lineHeight: 1, fontFamily: "'Sora', sans-serif",
          background: 'linear-gradient(120deg, #241454 0%, #4F3FE0 100%)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
          {investorCount === null ? '…' : investorCount.toLocaleString()}
        </div>
        <div style={{ fontSize: 18, color: '#6B6980', marginTop: 12, marginBottom: 32 }}>
          Investors onboarded
        </div>

        <button
          onClick={() => router.push('/deals')}
          style={{
            background: '#4F3FE0', color: '#fff', border: 'none', borderRadius: 12,
            padding: '16px 40px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Sora', sans-serif",
          }}
        >
          Get Started
        </button>

        <div style={{ width: '100%', maxWidth: 1100, marginTop: 40 }}>
          <PortfolioMarquee />
        </div>
      </div>
    </div>
  );
}

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', fontFamily: 'system-ui, sans-serif' }}>
        <img src="/logo.png" alt="Pitch Our Way" style={{ height: 64, width: 'auto', marginBottom: 32 }} />

        <div style={{ fontSize: 56, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
          {investorCount === null ? '…' : investorCount.toLocaleString()}
        </div>
        <div style={{ fontSize: 16, color: '#64748b', marginTop: 8, marginBottom: 48 }}>
          Investors in your database
        </div>

        <button
          onClick={() => router.push('/deals')}
          style={{
            background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10,
            padding: '16px 40px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 40,
          }}
        >
          Get Started
        </button>

        <div style={{ width: '100%', maxWidth: 1100 }}>
          <PortfolioMarquee />
        </div>
      </div>
    </div>
  );
}

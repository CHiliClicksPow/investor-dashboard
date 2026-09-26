'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import NavBar from '@/components/NavBar';
import PortfolioMarquee from '@/components/PortfolioMarquee';

export default function DealsPage() {
  const supabase = createClient();
  const [deals, setDeals] = useState<any[]>([]);
  const [investorCount, setInvestorCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDeals(data || []);
        setLoading(false);
      });

    supabase
      .from('investors')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setInvestorCount(count ?? 0));
  }, []);

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24 }}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {investorCount === null ? '…' : investorCount.toLocaleString()}
          </div>
          <div style={styles.statLabel}>Investors onboarded</div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, margin: 0, fontFamily: "'Sora', sans-serif", color: '#23223A' }}>Deals</h1>
          <Link href="/deals/new" style={{ background: '#4F3FE0', color: '#fff', padding: '12px 22px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
            + New Deal
          </Link>
        </div>

        {loading && <p style={{ color: '#6B6980' }}>Loading…</p>}
        {!loading && deals.length === 0 && (
          <p style={{ color: '#6B6980' }}>No deals yet — create your first one.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {deals.map((d) => (
            <Link
              key={d.id}
              href={`/deals/${d.id}`}
              style={{
                display: 'block',
                background: '#FFFFFF',
                border: '1px solid #ECEBF5',
                borderRadius: 16,
                padding: '22px 26px',
                textDecoration: 'none',
                color: '#23223A',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18, fontFamily: "'Sora', sans-serif" }}>{d.company_name}</div>
              <div style={{ color: '#6B6980', fontSize: 13, marginTop: 4 }}>
                {[d.sector, d.stage, d.geography].filter(Boolean).join(' · ') || 'No details yet'}
                {d.funding_ask ? ` · Asking $${Number(d.funding_ask).toLocaleString()}` : ''}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <PortfolioMarquee />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statCard: {
    background: 'linear-gradient(120deg, #241454 0%, #4F3FE0 100%)',
    color: '#fff',
    borderRadius: 18,
    padding: '28px 32px',
    marginBottom: 32,
    display: 'flex',
    alignItems: 'baseline',
    gap: 14,
  },
  statNumber: { fontSize: 40, fontWeight: 700, fontFamily: "'Sora', sans-serif" },
  statLabel: { fontSize: 15, color: '#D8D3F8' },
};

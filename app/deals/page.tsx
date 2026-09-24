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
      <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {investorCount === null ? '…' : investorCount.toLocaleString()}
          </div>
          <div style={styles.statLabel}>Investors onboarded</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Deals</h1>
          <Link href="/deals/new" style={{ background: '#0f172a', color: '#fff', padding: '10px 16px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            + New Deal
          </Link>
        </div>

        {loading && <p style={{ color: '#64748b' }}>Loading…</p>}
        {!loading && deals.length === 0 && (
          <p style={{ color: '#64748b' }}>No deals yet — create your first one.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {deals.map((d) => (
            <Link
              key={d.id}
              href={`/deals/${d.id}`}
              style={{
                display: 'block',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 16,
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 15 }}>{d.company_name}</div>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
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
    background: '#0f172a',
    color: '#fff',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 24,
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
  },
  statNumber: { fontSize: 32, fontWeight: 700 },
  statLabel: { fontSize: 14, color: '#94a3b8' },
};

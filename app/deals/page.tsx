'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import NavBar from '@/components/NavBar';

export default function DealsPage() {
  const supabase = createClient();
  const [deals, setDeals] = useState<any[]>([]);
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
  }, []);

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
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
    </div>
  );
}

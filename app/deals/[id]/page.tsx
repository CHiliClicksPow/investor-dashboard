'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NavBar from '@/components/NavBar';

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [deal, setDeal] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [matching, setMatching] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadDeal() {
    const { data } = await supabase.from('deals').select('*').eq('id', id).single();
    setDeal(data);
  }

  async function loadMatches() {
    const { data } = await supabase
      .from('deal_matches')
      .select('*, investors(*)')
      .eq('deal_id', id)
      .order('match_score', { ascending: false });
    setMatches(data || []);
  }

  useEffect(() => {
    Promise.all([loadDeal(), loadMatches()]).then(() => setLoading(false));
  }, [id]);

  async function runMatching() {
    setMatching(true);
    const { error } = await supabase.rpc('match_investors_for_deal', { p_deal_id: id });
    if (!error) await loadMatches();
    setMatching(false);
  }

  function downloadCsv() {
    const cols = ['category', 'match_score', 'investor_name', 'type', 'contact_name', 'email', 'phone', 'website', 'linkedin', 'country', 'industry_focus', 'stages', 'min_investment', 'max_investment', 'rationale'];
    const header = cols.join(',');
    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = matches.map((m) =>
      [m.category, m.match_score, m.investors.investor_name, m.investors.type, m.investors.contact_name,
       m.investors.email, m.investors.phone, m.investors.website, m.investors.linkedin, m.investors.country,
       m.investors.industry_focus, m.investors.stages, m.investors.min_investment, m.investors.max_investment,
       m.rationale].map(escape).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deal.company_name.replace(/[^a-z0-9]/gi, '_')}_matched_investors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div><NavBar /><p style={{ padding: 24 }}>Loading…</p></div>;
  if (!deal) return <div><NavBar /><p style={{ padding: 24 }}>Deal not found.</p></div>;

  const groups = ['Strong Match', 'Good Match', 'Possible Match'].map((cat) => ({
    cat,
    items: matches.filter((m) => m.category === cat),
  }));

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>{deal.company_name}</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>{deal.one_liner}</p>
        <p style={{ color: '#334155', fontSize: 13, marginBottom: 20 }}>
          {[deal.sector, deal.stage, deal.geography].filter(Boolean).join(' · ')}
          {deal.funding_ask ? ` · Asking $${Number(deal.funding_ask).toLocaleString()}` : ''}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <button
            onClick={runMatching}
            disabled={matching}
            style={{
              background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {matching ? 'Matching…' : matches.length ? 'Re-run matching' : 'Find matching investors'}
          </button>
          {matches.length > 0 && (
            <button
              onClick={downloadCsv}
              style={{
                background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8,
                padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Download {matches.length} matches (CSV)
            </button>
          )}
        </div>

        {matches.length === 0 && !matching && (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            No matches yet — click the button above. This checks sector, stage, geography and
            ticket size against your investor database.
          </p>
        )}

        {groups.map(({ cat, items }) =>
          items.length ? (
            <div key={cat} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 16, marginBottom: 10 }}>
                {cat} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({items.length})</span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((m) => (
                  <div key={m.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.investors.investor_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {[m.investors.type, m.investors.country].filter(Boolean).join(' · ')}
                      {m.investors.email ? ` · ${m.investors.email}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#0f172a', marginTop: 6 }}>{m.rationale}</div>
                    {m.investors.description && (
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
                        {m.investors.description.slice(0, 220)}
                        {m.investors.description.length > 220 ? '…' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

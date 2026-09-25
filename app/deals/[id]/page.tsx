'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NavBar from '@/components/NavBar';
import LoadingLogo from '@/components/LoadingLogo';

function classifyInvestorType(type: string | null | undefined): 'VC' | 'Angels' | 'HNI' | 'Others' {
  const t = (type || '').toLowerCase();
  if (t.includes('angel')) return 'Angels';
  if (t.includes('vc') || t.includes('venture')) return 'VC';
  if (t.includes('hni') || t.includes('high net worth') || t.includes('family office')) return 'HNI';
  return 'Others';
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [deal, setDeal] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [matching, setMatching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeSummary, setAnalyzeSummary] = useState<string | null>(null);
  const [lastMatchedAt, setLastMatchedAt] = useState<Date | null>(null);
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
    if (!error) {
      await loadMatches();
      setLastMatchedAt(new Date());
    }
    setMatching(false);
  }

  async function analyzeWithAI() {
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeSummary(null);
    try {
      const res = await fetch('/api/analyze-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed.');
      setAnalyzeSummary(
        `AI (${data.provider}) read the deck/model and wrote the brief below. ${data.matchCount} investors matched using sector/stage/geography/ticket size.`
      );
      await Promise.all([loadDeal(), loadMatches()]);
      setLastMatchedAt(new Date());
    } catch {
      // Keep this user-facing message simple — the underlying AI providers
      // can be flaky (rate limits, temporary overload), and a raw error
      // isn't useful to a non-technical user.
      setAnalyzeError('AI brief — coming soon. This part is still being fine-tuned; the investor matches below still work normally.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function deleteDeal() {
    if (!confirm(`Delete "${deal.company_name}"? This can't be undone.`)) return;
    setDeleting(true);
    if (deal.pitch_deck_path) await supabase.storage.from('pitch-decks').remove([deal.pitch_deck_path]);
    if (deal.financial_model_path) await supabase.storage.from('financial-models').remove([deal.financial_model_path]);
    const { error } = await supabase.from('deals').delete().eq('id', id);
    if (error) {
      alert('Could not delete: ' + error.message);
      setDeleting(false);
      return;
    }
    router.push('/deals');
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

  if (loading) return <div><NavBar /><LoadingLogo label="Loading…" /></div>;
  if (!deal) return <div><NavBar /><p style={{ padding: 24 }}>Deal not found.</p></div>;

  const groups = ['Strong Match', 'Good Match', 'Possible Match'].map((cat) => ({
    cat,
    items: matches.filter((m) => m.category === cat),
  }));

  const typeCounts = matches.reduce((acc: Record<string, number>, m) => {
    const bucket = classifyInvestorType(m.investors.type);
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, marginBottom: 4 }}>{deal.company_name}</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>{deal.one_liner}</p>
            <p style={{ color: '#334155', fontSize: 13, marginBottom: 20 }}>
              {[deal.sector, deal.stage, deal.geography].filter(Boolean).join(' · ')}
              {deal.funding_ask ? ` · Asking $${Number(deal.funding_ask).toLocaleString()}` : ''}
            </p>
          </div>
          <button
            onClick={deleteDeal}
            disabled={deleting}
            style={{ background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {deleting ? 'Deleting…' : 'Delete deal'}
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
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
          {(deal.pitch_deck_path || deal.financial_model_path || matches.length > 0) && (
            <button
              onClick={analyzeWithAI}
              disabled={analyzing}
              style={{
                background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {analyzing ? 'AI is reading…' : 'Analyze with AI'}
            </button>
          )}
        </div>

        {lastMatchedAt && (
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>
            Matches last updated {lastMatchedAt.toLocaleTimeString()}
          </p>
        )}

        {analyzing && <LoadingLogo label="Reading pitch deck & financial model…" />}
        {analyzeSummary && <p style={{ color: '#16a34a', fontSize: 13, marginBottom: 16 }}>{analyzeSummary}</p>}
        {analyzeError && <p style={{ color: '#b45309', background: '#fffbeb', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{analyzeError}</p>}

        {deal.extracted_data && (
          <div style={{ border: '1px solid #dbeafe', background: '#eff6ff', borderRadius: 10, padding: 18, marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, marginBottom: 10, color: '#1e3a8a' }}>AI Company Brief</h2>
            {deal.extracted_data.one_liner && (
              <p style={{ fontSize: 14, color: '#0f172a', marginBottom: 10 }}>{deal.extracted_data.one_liner}</p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 13, color: '#334155', marginBottom: 10 }}>
              {deal.extracted_data.sector && <span><strong>Sector:</strong> {deal.extracted_data.sector}</span>}
              {deal.extracted_data.stage && <span><strong>Stage:</strong> {deal.extracted_data.stage}</span>}
              {deal.extracted_data.geography && <span><strong>Geography:</strong> {deal.extracted_data.geography}</span>}
              {deal.extracted_data.funding_ask && (
                <span><strong>Ask:</strong> ${Number(deal.extracted_data.funding_ask).toLocaleString()}</span>
              )}
            </div>
            {Array.isArray(deal.extracted_data.key_highlights) && deal.extracted_data.key_highlights.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <strong style={{ fontSize: 13, color: '#1e3a8a' }}>Traction / highlights:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: '#334155' }}>
                  {deal.extracted_data.key_highlights.map((h: string, i: number) => (
                    <li key={i} style={{ marginBottom: 3 }}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
            {deal.extracted_data.thesis_summary && (
              <p style={{ fontSize: 13, color: '#475569', fontStyle: 'italic', marginTop: 8 }}>
                {deal.extracted_data.thesis_summary}
              </p>
            )}
          </div>
        )}

        {matches.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 13, color: '#475569', marginBottom: 28 }}>
            <strong style={{ color: '#0f172a' }}>Matched investors by type:</strong>
            {['VC', 'Angels', 'HNI', 'Others'].map((k) =>
              typeCounts[k] ? <span key={k}>{k}: {typeCounts[k]}</span> : null
            )}
          </div>
        )}

        {matches.length === 0 && !matching && (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            No matches yet — click the button above. This checks sector (most important),
            geography, ticket size, then stage against your investor database.
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

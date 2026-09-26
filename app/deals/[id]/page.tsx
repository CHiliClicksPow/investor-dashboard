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

  const badgeColor: Record<string, { bg: string; fg: string }> = {
    'Strong Match': { bg: '#EDEBFC', fg: '#4F3FE0' },
    'Good Match': { bg: '#FDF0E4', fg: '#B4650F' },
    'Possible Match': { bg: '#F1F0F5', fg: '#6B6980' },
  };

  const typeCounts = matches.reduce((acc: Record<string, number>, m) => {
    const bucket = classifyInvestorType(m.investors.type);
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});

  const sora = "'Sora', system-ui, sans-serif";
  const dmSans = "'DM Sans', system-ui, sans-serif";

  return (
    <div>
      <NavBar />

      {/* Gradient hero */}
      <div style={{ background: 'linear-gradient(120deg, #241454 0%, #4F3FE0 100%)', padding: '40px 24px 48px', color: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: sora, fontSize: 36, fontWeight: 700 }}>{deal.company_name}</div>
              {deal.one_liner && <p style={{ color: '#D8D3F8', fontSize: 15, marginTop: 8, maxWidth: 520 }}>{deal.one_liner}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                {[deal.sector, deal.stage, deal.geography].filter(Boolean).map((t, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.14)', padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{t}</span>
                ))}
                {deal.funding_ask && (
                  <span style={{ background: 'rgba(255,255,255,0.14)', padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    Asking ${Number(deal.funding_ask).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={deleteDeal}
              disabled={deleting}
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: dmSans }}
            >
              {deleting ? 'Deleting…' : 'Delete deal'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: dmSans, padding: '32px 24px', color: '#23223A' }}>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <button
            onClick={runMatching}
            disabled={matching}
            style={{ background: '#4F3FE0', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: sora }}
          >
            {matching ? 'Matching…' : matches.length ? 'Re-run matching' : 'Find matching investors'}
          </button>
          {matches.length > 0 && (
            <button
              onClick={downloadCsv}
              style={{ background: '#fff', color: '#4F3FE0', border: '1px solid #E4E2F2', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: sora }}
            >
              Download {matches.length} matches (CSV)
            </button>
          )}
          {(deal.pitch_deck_path || deal.financial_model_path || matches.length > 0) && (
            <button
              onClick={analyzeWithAI}
              disabled={analyzing}
              style={{ background: '#23223A', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: sora }}
            >
              {analyzing ? 'AI is reading…' : 'Analyze with AI'}
            </button>
          )}
        </div>

        {lastMatchedAt && (
          <p style={{ fontSize: 12, color: '#9997AC', marginBottom: 20 }}>
            Matches last updated {lastMatchedAt.toLocaleTimeString()}
          </p>
        )}

        {analyzing && <LoadingLogo label="Reading pitch deck & financial model…" />}
        {analyzeSummary && <p style={{ color: '#1E8A4C', fontSize: 13, marginBottom: 16 }}>{analyzeSummary}</p>}
        {analyzeError && <p style={{ color: '#B4650F', background: '#FDF0E4', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{analyzeError}</p>}

        {deal.extracted_data && (
          <div style={{ border: '1px solid #ECEBF5', background: '#FAF9FE', borderRadius: 16, padding: 22, marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, marginBottom: 10, color: '#4F3FE0', fontFamily: sora }}>AI Company Brief</h2>
            {deal.extracted_data.one_liner && (
              <p style={{ fontSize: 14, color: '#23223A', marginBottom: 10 }}>{deal.extracted_data.one_liner}</p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 13, color: '#4B4860', marginBottom: 10 }}>
              {deal.extracted_data.sector && <span><strong>Sector:</strong> {deal.extracted_data.sector}</span>}
              {deal.extracted_data.stage && <span><strong>Stage:</strong> {deal.extracted_data.stage}</span>}
              {deal.extracted_data.geography && <span><strong>Geography:</strong> {deal.extracted_data.geography}</span>}
              {deal.extracted_data.funding_ask && (
                <span><strong>Ask:</strong> ${Number(deal.extracted_data.funding_ask).toLocaleString()}</span>
              )}
            </div>
            {Array.isArray(deal.extracted_data.key_highlights) && deal.extracted_data.key_highlights.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <strong style={{ fontSize: 13, color: '#4F3FE0', fontFamily: sora }}>Traction / highlights:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: '#4B4860' }}>
                  {deal.extracted_data.key_highlights.map((h: string, i: number) => (
                    <li key={i} style={{ marginBottom: 3 }}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
            {deal.extracted_data.thesis_summary && (
              <p style={{ fontSize: 13, color: '#6B6980', fontStyle: 'italic', marginTop: 8 }}>
                {deal.extracted_data.thesis_summary}
              </p>
            )}
          </div>
        )}

        {matches.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', marginBottom: 28, alignItems: 'center' }}>
            <strong style={{ color: '#23223A', fontSize: 13, fontFamily: sora, marginRight: 4 }}>By type:</strong>
            {['VC', 'Angels', 'HNI', 'Others'].map((k) =>
              typeCounts[k] ? (
                <span key={k} style={{ background: '#F1F0F5', color: '#4B4860', padding: '5px 12px', borderRadius: 14, fontSize: 12, fontWeight: 600 }}>
                  {k}: {typeCounts[k]}
                </span>
              ) : null
            )}
          </div>
        )}

        {matches.length === 0 && !matching && (
          <p style={{ color: '#9997AC', fontSize: 14 }}>
            No matches yet — click the button above. This checks sector (most important),
            geography, ticket size, then stage against your investor database.
          </p>
        )}

        {groups.map(({ cat, items }) =>
          items.length ? (
            <div key={cat} style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ background: badgeColor[cat].bg, color: badgeColor[cat].fg, padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, fontFamily: sora }}>
                  {cat}
                </span>
                <span style={{ color: '#9997AC', fontSize: 13 }}>{items.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {items.map((m) => (
                  <div key={m.id} style={{ background: '#fff', border: '1px solid #ECEBF5', borderRadius: 16, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#EDEBFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#4F3FE0" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, fontFamily: sora }}>{m.investors.investor_name}</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B6980', marginBottom: 8 }}>
                      {[m.investors.type, m.investors.country].filter(Boolean).join(' · ')}
                      {m.investors.email ? ` · ${m.investors.email}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#4F3FE0', marginBottom: 8, fontWeight: 600 }}>{m.rationale}</div>
                    {m.investors.description && (
                      <div style={{ fontSize: 12, color: '#6B6980', lineHeight: 1.5 }}>
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

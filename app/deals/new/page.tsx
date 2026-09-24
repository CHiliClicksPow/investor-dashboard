'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NavBar from '@/components/NavBar';

export default function NewDealPage() {
  const router = useRouter();
  const supabase = createClient();

  const [companyName, setCompanyName] = useState('');
  const [oneLiner, setOneLiner] = useState('');
  const [sector, setSector] = useState('');
  const [stage, setStage] = useState('');
  const [geography, setGeography] = useState('');
  const [fundingAsk, setFundingAsk] = useState('');
  const [notes, setNotes] = useState('');
  const [deckFile, setDeckFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data: deal, error: insertError } = await supabase
        .from('deals')
        .insert({
          company_name: companyName,
          one_liner: oneLiner || null,
          sector: sector || null,
          stage: stage || null,
          geography: geography || null,
          funding_ask: fundingAsk ? parseFloat(fundingAsk) : null,
          info_notes: notes || null,
          status: 'active',
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload files if provided (optional — kept for reference, not yet
      // auto-analyzed; that comes with the AI matching step later).
      if (deckFile) {
        const path = `${deal.id}/${deckFile.name}`;
        const { error: upErr } = await supabase.storage.from('pitch-decks').upload(path, deckFile);
        if (!upErr) await supabase.from('deals').update({ pitch_deck_path: path }).eq('id', deal.id);
      }
      if (modelFile) {
        const path = `${deal.id}/${modelFile.name}`;
        const { error: upErr } = await supabase.storage.from('financial-models').upload(path, modelFile);
        if (!upErr) await supabase.from('deals').update({ financial_model_path: path }).eq('id', deal.id);
      }

      router.push(`/deals/${deal.id}`);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>New Deal</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
          Fill in what you know — sector, stage, geography and the funding ask are what
          drive the investor match. Files are optional for now and just get stored
          alongside the deal.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Company name" required>
            <input style={inputStyle} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </Field>

          <Field label="One-liner">
            <input style={inputStyle} value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="What the company does, in one sentence" />
          </Field>

          <div style={{ display: 'flex', gap: 16 }}>
            <Field label="Sector" style={{ flex: 1 }}>
              <input style={inputStyle} value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g. Fintech" />
            </Field>
            <Field label="Stage" style={{ flex: 1 }}>
              <input style={inputStyle} value={stage} onChange={(e) => setStage(e.target.value)} placeholder="e.g. Seed, Series A" />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Field label="Geography" style={{ flex: 1 }}>
              <input style={inputStyle} value={geography} onChange={(e) => setGeography(e.target.value)} placeholder="e.g. India, UAE" />
            </Field>
            <Field label="Funding ask (USD)" style={{ flex: 1 }}>
              <input style={inputStyle} type="number" value={fundingAsk} onChange={(e) => setFundingAsk(e.target.value)} placeholder="e.g. 500000" />
            </Field>
          </div>

          <Field label="Notes">
            <textarea style={{ ...inputStyle, minHeight: 90 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <Field label="Pitch deck (optional)">
            <input type="file" accept=".pdf,.ppt,.pptx" onChange={(e) => setDeckFile(e.target.files?.[0] || null)} />
          </Field>

          <Field label="Financial model (optional)">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setModelFile(e.target.files?.[0] || null)} />
          </Field>

          {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

          <button type="submit" disabled={saving} style={buttonStyle}>
            {saving ? 'Saving…' : 'Create deal & find matches'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children, style }: any) {
  return (
    <div style={style}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  background: '#0f172a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

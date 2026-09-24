'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseWorkbook, dedupeRecords, InvestorRecord } from '@/lib/investorImport';
import NavBar from '@/components/NavBar';

const BATCH_SIZE = 500;

export default function ImportInvestorsPage() {
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setSummary(null);
    setStatus('Reading file…');

    try {
      const buffer = await file.arrayBuffer();

      setStatus('Parsing sheets…');
      const raw = parseWorkbook(buffer);

      setStatus('Deduplicating…');
      const unique = dedupeRecords(raw);

      setStatus(`Uploading ${unique.length.toLocaleString()} investors…`);
      setProgress({ done: 0, total: unique.length });

      let inserted = 0;
      let failed = 0;

      for (let i = 0; i < unique.length; i += BATCH_SIZE) {
        const batch = unique.slice(i, i + BATCH_SIZE).map((r) => ({
          investor_name: r.investor_name,
          contact_name: r.contact_name || null,
          title: r.title || null,
          type: r.type || null,
          email: r.email || null,
          phone: r.phone || null,
          website: r.website || null,
          linkedin: r.linkedin || null,
          address: r.address || null,
          city: r.city || null,
          country: r.country || null,
          year_founded: r.year_founded || null,
          min_investment: r.min_investment ?? null,
          max_investment: r.max_investment ?? null,
          stages: r.stages || null,
          asset_class: r.asset_class || null,
          industry_focus: r.industry_focus || null,
          geographic_focus: r.geographic_focus || null,
          requirements: r.requirements || null,
          description: r.description || null,
          portfolio_companies: r.portfolio_companies || null,
          source_sheets: r.source_sheets,
        }));

        const { error } = await supabase.from('investors').insert(batch);
        if (error) {
          failed += batch.length;
          console.error('Batch failed:', error.message);
        } else {
          inserted += batch.length;
        }
        setProgress({ done: Math.min(i + BATCH_SIZE, unique.length), total: unique.length });
      }

      setSummary(
        `Done. ${inserted.toLocaleString()} investors imported` +
          (failed ? `, ${failed.toLocaleString()} failed (see browser console).` : '.')
      );
      setStatus('');
    } catch (err: any) {
      setStatus('');
      setSummary(`Import failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 640, margin: '60px auto', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Import Investors</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
        Upload your investor list (the same Excel workbook, any number of sheets, or a
        simple new sheet with columns like Investor, Sector, City, Country, Website,
        LinkedIn, Contact Email). Everything is read and matched in your browser, then
        saved to the shared investor database — nothing is sent anywhere except your own
        Supabase project.
      </p>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        disabled={busy}
        style={{ marginBottom: 20 }}
      />

      {status && <p style={{ fontSize: 14, color: '#334155' }}>{status}</p>}

      {progress && (
        <div style={{ background: '#e2e8f0', borderRadius: 8, height: 10, overflow: 'hidden', marginTop: 8 }}>
          <div
            style={{
              width: `${(progress.done / progress.total) * 100}%`,
              background: '#0f172a',
              height: '100%',
              transition: 'width 0.2s',
            }}
          />
        </div>
      )}
      {progress && (
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
          {progress.done.toLocaleString()} / {progress.total.toLocaleString()}
        </p>
      )}

      {summary && (
        <p style={{ marginTop: 20, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{summary}</p>
      )}
      </div>
    </div>
  );
}

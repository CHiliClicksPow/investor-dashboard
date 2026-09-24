'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NavBar from '@/components/NavBar';

export default function NewInvestorPage() {
  const router = useRouter();
  const supabase = createClient();

  const [investorName, setInvestorName] = useState('');
  const [contactName, setContactName] = useState('');
  const [type, setType] = useState('');
  const [sector, setSector] = useState('');
  const [stages, setStages] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [minInvestment, setMinInvestment] = useState('');
  const [maxInvestment, setMaxInvestment] = useState('');
  const [description, setDescription] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!investorName.trim()) {
      setError('Investor name is required.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('investors').insert({
      investor_name: investorName.trim(),
      contact_name: contactName || null,
      type: type || null,
      industry_focus: sector || null,
      stages: stages || null,
      city: city || null,
      country: country || null,
      website: website || null,
      linkedin: linkedin || null,
      email: email || null,
      phone: phone || null,
      min_investment: minInvestment ? parseFloat(minInvestment) : null,
      max_investment: maxInvestment ? parseFloat(maxInvestment) : null,
      description: description || null,
      source_sheets: ['Manually Added'],
    });
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push('/deals'), 900);
  }

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 560, margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Add Investor</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
          Add one investor directly to the database. Only the investor name is required —
          fill in whatever else you know.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Investor / Fund name" required>
            <input style={inputStyle} value={investorName} onChange={(e) => setInvestorName(e.target.value)} required />
          </Field>

          <Row>
            <Field label="Contact name">
              <input style={inputStyle} value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </Field>
            <Field label="Type">
              <input style={inputStyle} value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. VC, Angel, Family Office" />
            </Field>
          </Row>

          <Row>
            <Field label="Sector / Industry focus">
              <input style={inputStyle} value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g. Fintech, D2C" />
            </Field>
            <Field label="Stages">
              <input style={inputStyle} value={stages} onChange={(e) => setStages(e.target.value)} placeholder="e.g. Seed, Series A" />
            </Field>
          </Row>

          <Row>
            <Field label="City">
              <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label="Country">
              <input style={inputStyle} value={country} onChange={(e) => setCountry(e.target.value)} />
            </Field>
          </Row>

          <Field label="Website">
            <input style={inputStyle} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </Field>

          <Field label="LinkedIn">
            <input style={inputStyle} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/..." />
          </Field>

          <Row>
            <Field label="Contact email">
              <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Phone">
              <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
          </Row>

          <Row>
            <Field label="Min investment (USD)">
              <input style={inputStyle} type="number" value={minInvestment} onChange={(e) => setMinInvestment(e.target.value)} />
            </Field>
            <Field label="Max investment (USD)">
              <input style={inputStyle} type="number" value={maxInvestment} onChange={(e) => setMaxInvestment(e.target.value)} />
            </Field>
          </Row>

          <Field label="Notes / thesis">
            <textarea style={{ ...inputStyle, minHeight: 80 }} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
          {success && <p style={{ color: '#16a34a', fontSize: 13 }}>Investor added — redirecting…</p>}

          <button type="submit" disabled={saving} style={buttonStyle}>
            {saving ? 'Saving…' : 'Add Investor'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: any) {
  return (
    <div style={{ flex: '1 1 200px' }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{children}</div>;
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px',
  fontSize: 14, boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8,
  padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};

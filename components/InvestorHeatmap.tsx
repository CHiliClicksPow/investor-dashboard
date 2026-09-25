'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ISO-3166 2-letter code -> [Display Name, lat, lng]. This is the primary
// lookup since the database mostly stores country as a 2-letter code
// (e.g. "IN", "US", "GB") rather than a full name.
const ISO2: Record<string, [string, number, number]> = {
  US: ['United States', 39.8, -98.6], GB: ['United Kingdom', 54.0, -2.5], IN: ['India', 22.0, 79.0],
  AE: ['United Arab Emirates', 24.0, 54.0], CA: ['Canada', 56.1, -106.3], SG: ['Singapore', 1.35, 103.8],
  AU: ['Australia', -25.3, 133.8], DE: ['Germany', 51.2, 10.5], FR: ['France', 46.6, 2.2],
  CN: ['China', 35.9, 104.2], JP: ['Japan', 36.2, 138.3], HK: ['Hong Kong', 22.3, 114.2],
  CH: ['Switzerland', 46.8, 8.2], NL: ['Netherlands', 52.1, 5.3], IL: ['Israel', 31.0, 34.8],
  ZA: ['South Africa', -30.6, 22.9], BR: ['Brazil', -14.2, -51.9], NG: ['Nigeria', 9.1, 8.7],
  KE: ['Kenya', -0.02, 37.9], BS: ['Bahamas', 25.0, -77.4], MX: ['Mexico', 23.6, -102.5],
  ID: ['Indonesia', -0.8, 113.9], MY: ['Malaysia', 4.2, 101.9], VN: ['Vietnam', 14.1, 108.3],
  PH: ['Philippines', 12.9, 121.8], KR: ['South Korea', 35.9, 127.8], IT: ['Italy', 41.9, 12.6],
  ES: ['Spain', 40.5, -3.7], SE: ['Sweden', 60.1, 18.6], NO: ['Norway', 60.5, 8.5],
  DK: ['Denmark', 56.3, 9.5], IE: ['Ireland', 53.4, -8.2], SA: ['Saudi Arabia', 23.9, 45.1],
  QA: ['Qatar', 25.4, 51.2], BH: ['Bahrain', 26.0, 50.6], EG: ['Egypt', 26.8, 30.8],
  TR: ['Turkey', 38.9, 35.2], RU: ['Russia', 61.5, 105.3], PK: ['Pakistan', 30.4, 69.3],
  BD: ['Bangladesh', 23.7, 90.4], LK: ['Sri Lanka', 7.9, 80.8], NP: ['Nepal', 28.4, 84.1],
  NZ: ['New Zealand', -40.9, 174.9], TH: ['Thailand', 15.9, 100.9], KW: ['Kuwait', 29.3, 47.5],
  OM: ['Oman', 21.5, 55.9], JO: ['Jordan', 30.6, 36.2], LU: ['Luxembourg', 49.8, 6.1],
  BE: ['Belgium', 50.5, 4.5], AT: ['Austria', 47.5, 14.6], PT: ['Portugal', 39.4, -8.2],
  PL: ['Poland', 51.9, 19.1], FI: ['Finland', 61.9, 25.7], GH: ['Ghana', 7.9, -1.0],
  RW: ['Rwanda', -1.9, 29.9], UG: ['Uganda', 1.4, 32.3], TZ: ['Tanzania', -6.4, 34.9],
  ET: ['Ethiopia', 9.1, 40.5], CO: ['Colombia', 4.6, -74.3], AR: ['Argentina', -38.4, -63.6],
  CL: ['Chile', -35.7, -71.5], PE: ['Peru', -9.2, -75.0], KY: ['Cayman Islands', 19.5, -80.6],
  VG: ['British Virgin Islands', 18.4, -64.6], EE: ['Estonia', 58.6, 25.0], LT: ['Lithuania', 55.2, 23.9],
  MA: ['Morocco', 31.8, -7.1], TN: ['Tunisia', 33.9, 9.5], DZ: ['Algeria', 28.0, 1.7],
  KZ: ['Kazakhstan', 48.0, 66.9], UA: ['Ukraine', 48.4, 31.2], CZ: ['Czech Republic', 49.8, 15.5],
  HU: ['Hungary', 47.2, 19.5], RO: ['Romania', 45.9, 24.9], BG: ['Bulgaria', 42.7, 25.5],
  HR: ['Croatia', 45.1, 15.2], SI: ['Slovenia', 46.2, 14.9], SK: ['Slovakia', 48.7, 19.7],
  IS: ['Iceland', 64.9, -19.0], CY: ['Cyprus', 35.1, 33.4], MT: ['Malta', 35.9, 14.4],
  LV: ['Latvia', 56.9, 24.6], GR: ['Greece', 39.1, 21.8], IQ: ['Iraq', 33.2, 43.7],
  LB: ['Lebanon', 33.9, 35.9], MM: ['Myanmar', 21.9, 95.9], KH: ['Cambodia', 12.6, 104.9],
  MN: ['Mongolia', 46.9, 103.8], TW: ['Taiwan', 23.7, 121.0], MO: ['Macau', 22.2, 113.5],
  BN: ['Brunei', 4.5, 114.7], FJ: ['Fiji', -17.7, 178.1], CR: ['Costa Rica', 9.7, -83.8],
  PA: ['Panama', 8.5, -80.8], GT: ['Guatemala', 15.8, -90.2], UY: ['Uruguay', -32.5, -55.8],
  PY: ['Paraguay', -23.4, -58.4], BO: ['Bolivia', -16.3, -63.6], EC: ['Ecuador', -1.8, -78.2],
  VE: ['Venezuela', 6.4, -66.6], DO: ['Dominican Republic', 18.7, -70.2], JM: ['Jamaica', 18.1, -77.3],
  TT: ['Trinidad and Tobago', 10.7, -61.2], GE: ['Georgia', 42.3, 43.4], AZ: ['Azerbaijan', 40.1, 47.6],
  AM: ['Armenia', 40.1, 45.0], CM: ['Cameroon', 7.4, 12.4], CI: ['Ivory Coast', 7.5, -5.5],
  SN: ['Senegal', 14.5, -14.5], ZM: ['Zambia', -13.1, 27.8], ZW: ['Zimbabwe', -19.0, 29.2],
  MU: ['Mauritius', -20.3, 57.6], BW: ['Botswana', -22.3, 24.7], AL: ['Albania', 41.2, 20.2],
  RS: ['Serbia', 44.0, 21.0], MD: ['Moldova', 47.4, 28.4], BY: ['Belarus', 53.7, 27.9],
};

// A regex fallback for messy free-text country fields (e.g. "New York, USA").
const PATTERNS: [RegExp, string][] = [
  [/\b(united states|usa|u s a|america)\b/i, 'US'],
  [/\b(united kingdom|england|britain|scotland|wales)\b/i, 'GB'],
  [/\b(united arab emirates|u a e|dubai|abu dhabi|sharjah)\b/i, 'AE'],
  [/\bindia\b/i, 'IN'], [/\bcanada\b/i, 'CA'], [/\bsingapore\b/i, 'SG'],
  [/\baustralia\b/i, 'AU'], [/\bgermany\b/i, 'DE'], [/\bfrance\b/i, 'FR'],
  [/\bchina\b/i, 'CN'], [/\bjapan\b/i, 'JP'], [/\bhong kong\b/i, 'HK'],
  [/\bswitzerland\b/i, 'CH'], [/\bnetherlands\b/i, 'NL'], [/\bisrael\b/i, 'IL'],
  [/\bsouth africa\b/i, 'ZA'], [/\bbrazil\b/i, 'BR'], [/\bnigeria\b/i, 'NG'],
  [/\bkenya\b/i, 'KE'], [/\bbahamas\b/i, 'BS'], [/\bmexico\b/i, 'MX'],
  [/\bindonesia\b/i, 'ID'], [/\bmalaysia\b/i, 'MY'], [/\bvietnam\b/i, 'VN'],
  [/\bphilippines\b/i, 'PH'], [/\b(south korea|korea)\b/i, 'KR'], [/\bitaly\b/i, 'IT'],
  [/\bspain\b/i, 'ES'], [/\bsweden\b/i, 'SE'], [/\bnorway\b/i, 'NO'],
  [/\bdenmark\b/i, 'DK'], [/\bireland\b/i, 'IE'], [/\b(saudi arabia|ksa)\b/i, 'SA'],
  [/\bqatar\b/i, 'QA'], [/\bbahrain\b/i, 'BH'], [/\begypt\b/i, 'EG'],
  [/\bturkey\b/i, 'TR'], [/\brussia\b/i, 'RU'], [/\bpakistan\b/i, 'PK'],
  [/\bbangladesh\b/i, 'BD'], [/\bsri lanka\b/i, 'LK'], [/\bnepal\b/i, 'NP'],
  [/\bnew zealand\b/i, 'NZ'], [/\bthailand\b/i, 'TH'], [/\bkuwait\b/i, 'KW'],
  [/\bfinland\b/i, 'FI'], [/\btaiwan\b/i, 'TW'],
];

function normalize(raw: string): [string, number, number] | null {
  const cleaned = raw.replace(/[.,]/g, '').trim();
  if (!cleaned) return null;

  // Primary path: a 2-letter ISO code, which is how most rows store this.
  const upper2 = cleaned.toUpperCase();
  if (upper2.length === 2 && ISO2[upper2]) return ISO2[upper2];

  // Secondary: an exact full country name match.
  const byName = Object.values(ISO2).find(([name]) => name.toLowerCase() === cleaned.toLowerCase());
  if (byName) return byName;

  // Fallback: messy free text — try pattern matching.
  for (const [pattern, code] of PATTERNS) {
    if (pattern.test(cleaned) && ISO2[code]) return ISO2[code];
  }
  return null;
}

// Simple equirectangular projection onto a 960x480 box.
function project(lat: number, lng: number) {
  const x = ((lng + 180) / 360) * 960;
  const y = ((90 - lat) / 180) * 480;
  return { x, y };
}

export default function InvestorHeatmap() {
  const supabase = createClient();
  const [counts, setCounts] = useState<Record<string, { name: string; lat: number; lng: number; count: number }> | null>(null);

  useEffect(() => {
    supabase
      .from('investors')
      .select('country')
      .range(0, 30000)
      .then(({ data }) => {
        const tally: Record<string, { name: string; lat: number; lng: number; count: number }> = {};
        (data || []).forEach((row: any) => {
          if (!row.country) return;
          const hit = normalize(row.country);
          if (!hit) return;
          const [name, lat, lng] = hit;
          if (!tally[name]) tally[name] = { name, lat, lng, count: 0 };
          tally[name].count++;
        });
        setCounts(tally);
      });
  }, []);

  if (!counts) return null;

  const entries = Object.values(counts).sort((a, b) => b.count - a.count);
  if (entries.length === 0) return null;
  const max = Math.max(1, ...entries.map((e) => e.count));

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto 40px', padding: '0 24px' }}>
      <h2 style={{ textAlign: 'center', fontSize: 16, color: '#0f172a', marginBottom: 16, fontFamily: 'system-ui, sans-serif' }}>
        Where your investors are
      </h2>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '50%', background: '#f1f5f9', borderRadius: 12, overflow: 'hidden' }}>
        <svg viewBox="0 0 960 480" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`v${i}`} x1={(i * 960) / 12} y1={0} x2={(i * 960) / 12} y2={480} stroke="#e2e8f0" strokeWidth={1} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={(i * 480) / 6} x2={960} y2={(i * 480) / 6} stroke="#e2e8f0" strokeWidth={1} />
          ))}
          {entries.map((e) => {
            const { x, y } = project(e.lat, e.lng);
            const intensity = e.count / max;
            const radius = 8 + intensity * 26;
            const opacity = 0.35 + intensity * 0.55;
            return (
              <g key={e.name} className="pow-heat-pulse">
                <circle cx={x} cy={y} r={radius} fill="#1d4ed8" opacity={opacity * 0.35} />
                <circle cx={x} cy={y} r={radius * 0.55} fill="#1d4ed8" opacity={opacity} />
                <title>{`${e.name}: ${e.count} investor${e.count === 1 ? '' : 's'}`}</title>
              </g>
            );
          })}
        </svg>
        <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 11, color: '#94a3b8', fontFamily: 'system-ui, sans-serif' }}>
          Darker / bigger = more investors
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', justifyContent: 'center', marginTop: 12, fontSize: 12, color: '#475569', fontFamily: 'system-ui, sans-serif' }}>
        {entries.slice(0, 10).map((e) => (
          <span key={e.name}><strong>{e.name}:</strong> {e.count}</span>
        ))}
      </div>
      <style>{`
        .pow-heat-pulse { animation: pow-pulse 3s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        @keyframes pow-pulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}

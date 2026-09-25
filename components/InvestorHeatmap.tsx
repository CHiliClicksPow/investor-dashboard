'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// [lat, lng] centroids for common countries appearing in the investor list.
const COUNTRY_COORDS: Record<string, [number, number]> = {
  'United States': [39.8, -98.6], 'United Kingdom': [54.0, -2.5], 'India': [22.0, 79.0],
  'United Arab Emirates': [24.0, 54.0], 'Canada': [56.1, -106.3], 'Singapore': [1.35, 103.8],
  'Australia': [-25.3, 133.8], 'Germany': [51.2, 10.5], 'France': [46.6, 2.2],
  'China': [35.9, 104.2], 'Japan': [36.2, 138.3], 'Hong Kong': [22.3, 114.2],
  'Switzerland': [46.8, 8.2], 'Netherlands': [52.1, 5.3], 'Israel': [31.0, 34.8],
  'South Africa': [-30.6, 22.9], 'Brazil': [-14.2, -51.9], 'Nigeria': [9.1, 8.7],
  'Kenya': [-0.02, 37.9], 'Bahamas': [25.0, -77.4], 'Mexico': [23.6, -102.5],
  'Indonesia': [-0.8, 113.9], 'Malaysia': [4.2, 101.9], 'Vietnam': [14.1, 108.3],
  'Philippines': [12.9, 121.8], 'South Korea': [35.9, 127.8], 'Italy': [41.9, 12.6],
  'Spain': [40.5, -3.7], 'Sweden': [60.1, 18.6], 'Norway': [60.5, 8.5],
  'Denmark': [56.3, 9.5], 'Ireland': [53.4, -8.2], 'Saudi Arabia': [23.9, 45.1],
  'Qatar': [25.4, 51.2], 'Bahrain': [26.0, 50.6], 'Egypt': [26.8, 30.8],
  'Turkey': [38.9, 35.2], 'Russia': [61.5, 105.3], 'Pakistan': [30.4, 69.3],
  'Bangladesh': [23.7, 90.4], 'Sri Lanka': [7.9, 80.8], 'Nepal': [28.4, 84.1],
  'New Zealand': [-40.9, 174.9], 'Thailand': [15.9, 100.9], 'Kuwait': [29.3, 47.5],
  'Oman': [21.5, 55.9], 'Jordan': [30.6, 36.2], 'Luxembourg': [49.8, 6.1],
  'Belgium': [50.5, 4.5], 'Austria': [47.5, 14.6], 'Portugal': [39.4, -8.2],
  'Poland': [51.9, 19.1], 'Finland': [61.9, 25.7], 'Ghana': [7.9, -1.0],
  'Rwanda': [-1.9, 29.9], 'Uganda': [1.4, 32.3], 'Tanzania': [-6.4, 34.9],
  'Ethiopia': [9.1, 40.5], 'Colombia': [4.6, -74.3], 'Argentina': [-38.4, -63.6],
  'Chile': [-35.7, -71.5], 'Peru': [-9.2, -75.0], 'Cayman Islands': [19.5, -80.6],
  'British Virgin Islands': [18.4, -64.6], 'Estonia': [58.6, 25.0], 'Lithuania': [55.2, 23.9],
};

// Common raw strings in the data mapped to a canonical country name above.
const ALIASES: Record<string, string> = {
  us: 'United States', usa: 'United States', 'u.s.': 'United States', 'u.s.a.': 'United States',
  america: 'United States', uk: 'United Kingdom', 'u.k.': 'United Kingdom', england: 'United Kingdom',
  britain: 'United Kingdom', uae: 'United Arab Emirates', ae: 'United Arab Emirates',
  dubai: 'United Arab Emirates', bs: 'Bahamas', ind: 'India', hk: 'Hong Kong',
  sg: 'Singapore', ca: 'Canada', au: 'Australia', de: 'Germany', fr: 'France',
  cn: 'China', jp: 'Japan', ch: 'Switzerland', nl: 'Netherlands', il: 'Israel',
  za: 'South Africa', br: 'Brazil', ng: 'Nigeria', ke: 'Kenya', mx: 'Mexico',
  id: 'Indonesia', my: 'Malaysia', vn: 'Vietnam', ph: 'Philippines', kr: 'South Korea',
  it: 'Italy', es: 'Spain', se: 'Sweden', no: 'Norway', dk: 'Denmark', ie: 'Ireland',
  sa: 'Saudi Arabia', qa: 'Qatar', bh: 'Bahrain', eg: 'Egypt', tr: 'Turkey',
  ru: 'Russia', pk: 'Pakistan', bd: 'Bangladesh', lk: 'Sri Lanka', np: 'Nepal',
  nz: 'New Zealand', th: 'Thailand', kw: 'Kuwait', om: 'Oman', jo: 'Jordan',
};

function normalize(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (COUNTRY_COORDS[t]) return t;
  const lower = t.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];
  const titleMatch = Object.keys(COUNTRY_COORDS).find((c) => c.toLowerCase() === lower);
  return titleMatch || null;
}

// Simple equirectangular projection onto a 960x480 box.
function project(lat: number, lng: number) {
  const x = ((lng + 180) / 360) * 960;
  const y = ((90 - lat) / 180) * 480;
  return { x, y };
}

export default function InvestorHeatmap() {
  const supabase = createClient();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    supabase
      .from('investors')
      .select('country')
      .range(0, 30000)
      .then(({ data }) => {
        const tally: Record<string, number> = {};
        (data || []).forEach((row: any) => {
          const canon = row.country ? normalize(row.country) : null;
          if (canon) tally[canon] = (tally[canon] || 0) + 1;
        });
        setCounts(tally);
      });
  }, []);

  if (!counts) return null;

  const max = Math.max(1, ...Object.values(counts));
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto 40px', padding: '0 24px' }}>
      <h2 style={{ textAlign: 'center', fontSize: 16, color: '#0f172a', marginBottom: 16, fontFamily: 'system-ui, sans-serif' }}>
        Where your investors are
      </h2>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '50%', background: '#f1f5f9', borderRadius: 12, overflow: 'hidden' }}>
        <svg viewBox="0 0 960 480" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {/* faint graticule to suggest a map grid */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`v${i}`} x1={(i * 960) / 12} y1={0} x2={(i * 960) / 12} y2={480} stroke="#e2e8f0" strokeWidth={1} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={(i * 480) / 6} x2={960} y2={(i * 480) / 6} stroke="#e2e8f0" strokeWidth={1} />
          ))}
          {entries.map(([country, count]) => {
            const [lat, lng] = COUNTRY_COORDS[country];
            const { x, y } = project(lat, lng);
            const intensity = count / max;
            const radius = 8 + intensity * 26;
            const opacity = 0.35 + intensity * 0.55;
            return (
              <g key={country} className="pow-heat-pulse">
                <circle cx={x} cy={y} r={radius} fill="#1d4ed8" opacity={opacity * 0.35} />
                <circle cx={x} cy={y} r={radius * 0.55} fill="#1d4ed8" opacity={opacity} />
                <title>{`${country}: ${count} investor${count === 1 ? '' : 's'}`}</title>
              </g>
            );
          })}
        </svg>
        <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 11, color: '#94a3b8', fontFamily: 'system-ui, sans-serif' }}>
          Darker / bigger = more investors
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', justifyContent: 'center', marginTop: 12, fontSize: 12, color: '#475569', fontFamily: 'system-ui, sans-serif' }}>
        {entries.slice(0, 8).map(([country, count]) => (
          <span key={country}><strong>{country}:</strong> {count}</span>
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

'use client';

const COMPANIES = [
  'CMT Group USA', 'Yalph', 'LivWell', 'CzarWorkspace', 'Sushi Nations', 'Toy Souk',
  'Welspun Group', 'Celebfie', 'Impact Leaders', 'Tribe', 'British Indian Curry Hut',
  'StudentQR', 'Manha Medical Center', 'Finmall', 'Timber Wolf', 'Dual Amplified Sound',
  'Monsoon Salon', 'Accorto', 'Delta International', 'Starshine', 'Roopya', 'Pikndel',
  'Kyte Energy', 'Ezyschooling', 'CareXpro', 'Aticx', 'PhleboIndia', 'GreenJams',
  'Powerbot', 'Stylox', 'Sneakinn', 'ReFit', 'Banana Club', 'Klassroom', 'Mitra', 'DocHome',
];

export default function PortfolioMarquee({ heading = true }: { heading?: boolean }) {
  const items = [...COMPANIES, ...COMPANIES]; // duplicated for seamless loop

  return (
    <div style={{ padding: '32px 0', overflow: 'hidden' }}>
      {heading && (
        <h2 style={{ textAlign: 'center', fontSize: 18, color: '#0f172a', marginBottom: 20, fontFamily: 'system-ui, sans-serif' }}>
          Latest funding rounds and success of our portfolio companies
        </h2>
      )}
      <div style={{ maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' }}>
        <div className="pow-marquee-track">
          {items.map((name, i) => (
            <span key={i} className="pow-marquee-pill">{name}</span>
          ))}
        </div>
      </div>
      <style>{`
        .pow-marquee-track {
          display: flex;
          gap: 12px;
          width: max-content;
          animation: pow-scroll 40s linear infinite;
        }
        .pow-marquee-track:hover { animation-play-state: paused; }
        .pow-marquee-pill {
          flex-shrink: 0;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          font-family: system-ui, sans-serif;
          padding: 8px 18px;
          border-radius: 999px;
          white-space: nowrap;
        }
        @keyframes pow-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

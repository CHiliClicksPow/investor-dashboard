'use client';

const LOGOS = [
  'cmt', 'yalph', 'livwell', 'welspun', 'czarworkspace', 'sushinations', 'toysouk',
  'celebfie', 'impactleaders', 'tribe', 'britishcurryhut', 'studentqr', 'finmall',
  'timberwolf', 'dualamplifiedsound', 'monsoonsalon', 'accorto', 'delta', 'fineestates',
  'starshine',
];

export default function PortfolioMarquee({ heading = true }: { heading?: boolean }) {
  const items = [...LOGOS, ...LOGOS]; // duplicated for seamless loop

  return (
    <div style={{ padding: '32px 0', overflow: 'hidden' }}>
      {heading && (
        <h2 style={{ textAlign: 'center', fontSize: 18, color: '#0f172a', marginBottom: 24, fontFamily: 'system-ui, sans-serif' }}>
          Latest funding rounds and success of our portfolio companies
        </h2>
      )}
      <div style={{ maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' }}>
        <div className="pow-marquee-track">
          {items.map((name, i) => (
            <img key={i} src={`/portfolio-logos/${name}.png`} alt={name} className="pow-marquee-logo" />
          ))}
        </div>
      </div>
      <style>{`
        .pow-marquee-track {
          display: flex;
          align-items: center;
          gap: 36px;
          width: max-content;
          animation: pow-scroll 45s linear infinite;
        }
        .pow-marquee-track:hover { animation-play-state: paused; }
        .pow-marquee-logo {
          flex-shrink: 0;
          height: 40px;
          width: auto;
          object-fit: contain;
        }
        @keyframes pow-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

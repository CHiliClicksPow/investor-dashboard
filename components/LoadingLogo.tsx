'use client';

export default function LoadingLogo({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24 }}>
      <img src="/logo.png" alt="Loading" className="pow-heartbeat" style={{ height: 48, width: 'auto' }} />
      {label && <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{label}</p>}
      <style>{`
        @keyframes pow-heartbeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.18); }
          30% { transform: scale(1); }
          45% { transform: scale(1.12); }
          60% { transform: scale(1); }
        }
        .pow-heartbeat {
          animation: pow-heartbeat 1.1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

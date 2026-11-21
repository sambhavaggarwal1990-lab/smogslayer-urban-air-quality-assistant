// Katana drawn tip-up in a 120 × 1000 space, flipped so it stands tip-down.
// The viewBox crops the last 180 units: that part of the blade is buried in the cracked ground.
const BLADE =
  "M55.5,640 C54.5,440 54.8,230 58.5,70 Q60,36 64.5,14 Q69.5,40 69.6,74 C69.8,250 69.4,450 68.5,640 Z";

function hamonPath() {
  const pts: string[] = [];
  for (let y = 82; y <= 636; y += 6) {
    const x = 65.4 + Math.sin(y * 0.09) * 1.1 + Math.sin(y * 0.031) * 0.7;
    pts.push(`${pts.length ? "L" : "M"}${x.toFixed(2)},${y}`);
  }
  return pts.join(" ");
}
const HAMON = hamonPath();
const WRAPS = Array.from({ length: 10 }, (_, i) => 688 + i * 26);

export function Katana({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 820" preserveAspectRatio="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="kt-blade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{ stopColor: "var(--steel-dark)" }} />
          <stop offset="0.35" style={{ stopColor: "var(--steel)" }} />
          <stop offset="0.62" style={{ stopColor: "var(--steel-light)" }} />
          <stop offset="1" style={{ stopColor: "var(--mist)" }} />
        </linearGradient>
        <linearGradient id="kt-sheen" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--hamon)", stopOpacity: 0 }} />
          <stop offset="0.5" style={{ stopColor: "var(--hamon)", stopOpacity: 0.9 }} />
          <stop offset="1" style={{ stopColor: "var(--hamon)", stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient id="kt-brass" x1="0" x2="1">
          <stop offset="0" style={{ stopColor: "var(--brass-dark)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--thunder)" }} />
          <stop offset="1" style={{ stopColor: "var(--brass-dark)" }} />
        </linearGradient>
        <linearGradient id="kt-tsuba" x1="0" x2="1">
          <stop offset="0" style={{ stopColor: "var(--tsuka)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--tsuba)" }} />
          <stop offset="1" style={{ stopColor: "var(--tsuka)" }} />
        </linearGradient>
        <linearGradient id="kt-ember" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--ember-hot)", stopOpacity: 0.95 }} />
          <stop offset="0.18" style={{ stopColor: "var(--ember)", stopOpacity: 0.7 }} />
          <stop offset="1" style={{ stopColor: "var(--ember)", stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient id="kt-soot" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--void)", stopOpacity: 0.85 }} />
          <stop offset="1" style={{ stopColor: "var(--void)", stopOpacity: 0 }} />
        </linearGradient>
        <clipPath id="kt-blade-clip">
          <path d={BLADE} />
        </clipPath>
        <clipPath id="kt-tsuka-clip">
          <rect x="50" y="680" width="20" height="270" rx="5" />
        </clipPath>
      </defs>

      <g transform="rotate(180 60 500)">
      {/* Blade */}
      <path d={BLADE} fill="url(#kt-blade)" />
      <g clipPath="url(#kt-blade-clip)">
        <path d="M59.5,640 C59,450 59.2,240 61.5,70" fill="none" style={{ stroke: "var(--steel-dark)" }} strokeWidth="0.8" opacity="0.7" />
        <path d={HAMON} fill="none" style={{ stroke: "var(--hamon)" }} strokeWidth="1.6" opacity="0.9" />
        <rect className="katana-sheen" x="40" y="0" width="40" height="260" fill="url(#kt-sheen)" opacity="0.75" />
        {/* soot and crack-glow where the blade enters the ground */}
        <rect x="40" y="180" width="40" height="70" fill="url(#kt-soot)" />
        <rect className="katana-ember" x="40" y="180" width="40" height="300" fill="url(#kt-ember)" />
      </g>

      {/* Habaki & seppa */}
      <rect x="53.5" y="638" width="17" height="24" rx="2" fill="url(#kt-brass)" />
      <rect x="44" y="660" width="32" height="3.5" rx="1" fill="url(#kt-brass)" />
      {/* Tsuba */}
      <rect x="20" y="663" width="80" height="14" rx="6" fill="url(#kt-tsuba)" style={{ stroke: "var(--brass)" }} strokeWidth="1.4" />
      <rect x="44" y="677" width="32" height="3.5" rx="1" fill="url(#kt-brass)" />

      {/* Tsuka with criss-cross wrap */}
      <rect x="50" y="680" width="20" height="270" rx="5" style={{ fill: "var(--samegawa)" }} />
      <g clipPath="url(#kt-tsuka-clip)" style={{ stroke: "var(--tsuka-wrap)" }} strokeWidth="6.5" strokeLinecap="square">
        {WRAPS.map((y) => (
          <g key={y}>
            <line x1="48" y1={y - 4} x2="72" y2={y + 22} />
            <line x1="72" y1={y - 4} x2="48" y2={y + 22} />
          </g>
        ))}
      </g>
      <rect x="50" y="680" width="20" height="270" rx="5" fill="none" style={{ stroke: "var(--tsuka)" }} strokeWidth="1.5" />

      {/* Kashira */}
      <rect x="48.5" y="946" width="23" height="20" rx="5" fill="url(#kt-brass)" />
      </g>
    </svg>
  );
}

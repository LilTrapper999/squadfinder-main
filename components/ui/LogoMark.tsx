/** The SquadFinder mark (same artwork as app/icon.svg), inline so it needs no request and no <img>. */
export default function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="SquadFinder" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="sf-accent" gradientUnits="userSpaceOnUse" x1="40" y1="40" x2="472" y2="472">
          <stop offset="0" stopColor="#ff5a6e" />
          <stop offset="1" stopColor="#ff9a3c" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="104" fill="#12141c" />
      <circle cx="256" cy="256" r="170" fill="none" stroke="url(#sf-accent)" strokeWidth="18" />
      <g stroke="url(#sf-accent)" strokeWidth="18" strokeLinecap="round">
        <line x1="256" y1="40" x2="256" y2="112" />
        <line x1="256" y1="400" x2="256" y2="472" />
        <line x1="40" y1="256" x2="112" y2="256" />
        <line x1="400" y1="256" x2="472" y2="256" />
      </g>
      <text x="256" y="306" textAnchor="middle" fontFamily="'Arial Black', 'Segoe UI', Arial, sans-serif" fontWeight="900" fontSize="150" letterSpacing="-4" fill="#ffffff">SF</text>
      <circle cx="256" cy="352" r="9" fill="url(#sf-accent)" />
    </svg>
  )
}

/**
 * Decorative illustrated garden scene (pure SVG, no image files).
 * Used on the welcome screen and as the garden preview until the real
 * interactive garden is built in Phase 6.
 */
export function GardenBackdrop({ className = "", fill = false }: { className?: string; fill?: boolean }) {
  return (
    <svg viewBox="0 0 390 420" preserveAspectRatio={fill ? "xMidYMax slice" : "xMidYMid meet"} className={className} role="img" aria-label="A sunny garden with a cottage and a tree">
      <defs>
        <linearGradient id="vv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A8D5E5" />
          <stop offset="1" stopColor="#FFF8EA" />
        </linearGradient>
        <linearGradient id="vv-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8BBF84" />
          <stop offset="1" stopColor="#5D9868" />
        </linearGradient>
        <radialGradient id="vv-sun">
          <stop offset="0" stopColor="#FFE7A6" />
          <stop offset="1" stopColor="#E8B85B" />
        </radialGradient>
      </defs>
      <rect width="390" height="420" fill="url(#vv-sky)" />
      <circle cx="310" cy="70" r="34" fill="url(#vv-sun)" opacity="0.95" />
      <g className="animate-drift" opacity="0.9">
        <ellipse cx="60" cy="60" rx="34" ry="12" fill="#fff" />
        <ellipse cx="82" cy="52" rx="22" ry="12" fill="#fff" />
      </g>
      <path d="M0 230 Q100 170 200 215 T390 200 V420 H0Z" fill="#B9D9AE" />
      <path d="M0 270 Q120 220 230 260 T390 250 V420 H0Z" fill="url(#vv-hill)" />
      {/* path */}
      <path d="M170 420 Q190 340 215 300 L235 300 Q225 350 250 420Z" fill="#F3E2BF" />
      {/* cottage */}
      <g transform="translate(220 205)">
        <rect x="0" y="40" width="96" height="62" rx="8" fill="#FFF8EA" />
        <path d="M-10 46 L48 0 L106 46Z" fill="#C9725A" />
        <path d="M-10 46 L48 0 L106 46" fill="none" stroke="#A55A45" strokeWidth="4" strokeLinejoin="round" />
        <rect x="38" y="62" width="22" height="40" rx="10" fill="#8B5E3C" />
        <rect x="10" y="56" width="18" height="16" rx="4" fill="#A8D5E5" stroke="#315A3D" strokeWidth="2" />
        <rect x="70" y="56" width="18" height="16" rx="4" fill="#A8D5E5" stroke="#315A3D" strokeWidth="2" />
      </g>
      {/* scripture tree */}
      <g transform="translate(70 170)" className="animate-sway">
        <rect x="34" y="70" width="14" height="70" rx="6" fill="#8B5E3C" />
        <circle cx="41" cy="56" r="44" fill="#5D9868" />
        <circle cx="16" cy="70" r="26" fill="#6FA878" />
        <circle cx="66" cy="68" r="28" fill="#4E8A5A" />
        <circle cx="26" cy="40" r="5" fill="#E8B85B" />
        <circle cx="58" cy="34" r="5" fill="#E8B85B" />
        <circle cx="44" cy="74" r="5" fill="#E8B85B" />
      </g>
      {/* flower beds */}
      {[
        [40, 352],
        [110, 372],
        [290, 352],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <ellipse cx="22" cy="14" rx="30" ry="10" fill="#7A5A3D" />
          {[0, 14, 28, 42].map((dx, j) => (
            <g key={j} transform={`translate(${dx - 2} 0)`}>
              <rect x="2" y="2" width="2" height="10" fill="#315A3D" />
              <circle cx="3" cy="2" r="5" fill={j % 2 ? '#F3C4A8' : '#E8B85B'} />
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}

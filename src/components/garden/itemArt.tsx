/**
 * Illustrations for garden items, drawn in SVG so there are no image files to load.
 * Each drawing fills a box of (width × 100) by (height × 100) units.
 */
import type { ReactElement } from 'react'

const shadow = (cx: number, cy: number, rx: number, ry = rx * 0.28) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#315A3D" opacity="0.18" />
)

const ART: Record<string, () => ReactElement> = {
  cottage: () => (
    <>
      {shadow(100, 182, 82)}
      <rect x="30" y="80" width="140" height="100" rx="12" fill="#FFF8EA" stroke="#D9CBB0" strokeWidth="3" />
      <path d="M14 92 L100 22 L186 92 Z" fill="#C9725A" />
      <path d="M14 92 L100 22 L186 92" fill="none" stroke="#A55A45" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="135" y="36" width="18" height="36" fill="#A55A45" />
      <rect x="84" y="118" width="32" height="62" rx="16" fill="#8B5E3C" />
      <circle cx="109" cy="150" r="3" fill="#E8B85B" />
      <rect x="44" y="108" width="28" height="26" rx="5" fill="#A8D5E5" stroke="#315A3D" strokeWidth="3" />
      <rect x="128" y="108" width="28" height="26" rx="5" fill="#A8D5E5" stroke="#315A3D" strokeWidth="3" />
      <rect x="40" y="136" width="36" height="8" rx="4" fill="#F3C4A8" />
      <rect x="124" y="136" width="36" height="8" rx="4" fill="#F3C4A8" />
    </>
  ),
  scriptureTree: () => (
    <>
      {shadow(100, 184, 70)}
      <rect x="88" y="110" width="24" height="74" rx="9" fill="#8B5E3C" />
      <circle cx="100" cy="78" r="62" fill="#5D9868" />
      <circle cx="56" cy="102" r="36" fill="#6FA878" />
      <circle cx="146" cy="100" r="38" fill="#4E8A5A" />
      <circle cx="98" cy="46" r="34" fill="#6FA878" />
      {[
        [70, 70],
        [122, 56],
        [104, 104],
        [54, 104],
        [148, 96],
        [90, 36],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="9" fill="#E8B85B" />
          <circle cx={x - 3} cy={y - 3} r="3" fill="#FFF3CF" />
        </g>
      ))}
      <rect x="66" y="150" width="68" height="22" rx="6" fill="#FFF8EA" stroke="#8B5E3C" strokeWidth="3" />
      <path d="M78 161 h44" stroke="#8B5E3C" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  well: () => (
    <>
      {shadow(50, 90, 36)}
      <rect x="22" y="22" width="6" height="50" fill="#8B5E3C" />
      <rect x="72" y="22" width="6" height="50" fill="#8B5E3C" />
      <path d="M14 26 L50 8 L86 26 Z" fill="#C9725A" />
      <ellipse cx="50" cy="66" rx="32" ry="10" fill="#7A8C99" />
      <rect x="18" y="66" width="64" height="22" fill="#9AAAB5" />
      <ellipse cx="50" cy="88" rx="32" ry="9" fill="#7A8C99" />
      <ellipse cx="50" cy="66" rx="24" ry="6" fill="#A8D5E5" />
      <rect x="44" y="30" width="12" height="14" rx="2" fill="#8B5E3C" />
    </>
  ),
  barn: () => (
    <>
      {shadow(100, 182, 84)}
      <rect x="24" y="76" width="152" height="104" rx="6" fill="#B64B3C" />
      <path d="M12 84 L56 30 H144 L188 84 Z" fill="#7E3328" />
      <rect x="70" y="110" width="60" height="70" fill="#FFF8EA" />
      <path d="M70 110 L130 180 M130 110 L70 180" stroke="#B64B3C" strokeWidth="6" />
      <rect x="86" y="52" width="28" height="22" rx="3" fill="#FFF8EA" />
    </>
  ),
  chapel: () => (
    <>
      {shadow(100, 184, 74)}
      <rect x="40" y="90" width="120" height="92" rx="6" fill="#FFF8EA" stroke="#D9CBB0" strokeWidth="3" />
      <path d="M28 98 L100 48 L172 98 Z" fill="#5D9868" />
      <rect x="86" y="14" width="28" height="52" fill="#FFF8EA" stroke="#D9CBB0" strokeWidth="3" />
      <path d="M80 18 L100 2 L120 18 Z" fill="#5D9868" />
      <path d="M100 24 v22 M91 32 h18" stroke="#E8B85B" strokeWidth="5" strokeLinecap="round" />
      <path d="M84 182 V138 a16 16 0 0 1 32 0 V182 Z" fill="#8B5E3C" />
      <circle cx="62" cy="126" r="10" fill="#A8D5E5" stroke="#315A3D" strokeWidth="3" />
      <circle cx="138" cy="126" r="10" fill="#A8D5E5" stroke="#315A3D" strokeWidth="3" />
    </>
  ),
  bakery: () => (
    <>
      {shadow(100, 182, 82)}
      <rect x="26" y="78" width="148" height="102" rx="10" fill="#F3C4A8" />
      <path d="M18 84 h164 l-12 -40 H30 Z" fill="#FFF8EA" />
      {[30, 62, 94, 126, 158].map((x) => (
        <path key={x} d={`M${x} 84 h24 l-2 -40 h-20 Z`} fill="#C9725A" opacity="0.85" />
      ))}
      <rect x="40" y="110" width="56" height="40" rx="6" fill="#A8D5E5" stroke="#8B5E3C" strokeWidth="3" />
      <rect x="112" y="108" width="40" height="72" rx="6" fill="#8B5E3C" />
      <ellipse cx="68" cy="140" rx="18" ry="7" fill="#E8B85B" />
      <rect x="142" y="20" width="16" height="30" fill="#8B5E3C" />
    </>
  ),
  windmill: () => (
    <>
      {shadow(100, 184, 60)}
      <path d="M70 182 L82 70 H118 L130 182 Z" fill="#FFF8EA" stroke="#D9CBB0" strokeWidth="3" />
      <path d="M76 74 L100 44 L124 74 Z" fill="#C9725A" />
      <rect x="90" y="146" width="20" height="36" rx="10" fill="#8B5E3C" />
      <g className="animate-[spin_12s_linear_infinite]" style={{ transformOrigin: '100px 72px' }}>
        {[0, 90, 180, 270].map((a) => (
          <rect key={a} x="96" y="10" width="8" height="62" fill="#D9CBB0" transform={`rotate(${a} 100 72)`} />
        ))}
        {[0, 90, 180, 270].map((a) => (
          <rect key={`s${a}`} x="104" y="14" width="18" height="50" fill="#FFF8EA" opacity="0.9" transform={`rotate(${a} 100 72)`} />
        ))}
      </g>
      <circle cx="100" cy="72" r="8" fill="#8B5E3C" />
    </>
  ),
  greenhouse: () => (
    <>
      {shadow(100, 182, 84)}
      <path d="M22 180 V96 Q100 20 178 96 V180 Z" fill="#DDEBD8" stroke="#FFFFFF" strokeWidth="5" opacity="0.95" />
      <path d="M60 180 V70 M100 180 V54 M140 180 V70 M22 130 H178" stroke="#FFFFFF" strokeWidth="5" />
      {[40, 80, 120, 160].map((x) => (
        <circle key={x} cx={x} cy="160" r="12" fill="#5D9868" />
      ))}
      <circle cx="80" cy="152" r="5" fill="#F3C4A8" />
      <circle cx="160" cy="152" r="5" fill="#E8B85B" />
    </>
  ),
  flowerBed: () => (
    <>
      <ellipse cx="50" cy="66" rx="42" ry="24" fill="#7A5A3D" />
      <ellipse cx="50" cy="62" rx="36" ry="18" fill="#8E6B4A" />
      {[
        [28, 54, '#E8B85B'],
        [50, 46, '#F3C4A8'],
        [72, 54, '#E8B85B'],
        [38, 68, '#F3C4A8'],
        [62, 68, '#C9725A'],
      ].map(([x, y, c], i) => (
        <g key={i}>
          <path d={`M${x} ${Number(y) + 4} v10`} stroke="#315A3D" strokeWidth="3" />
          <circle cx={x} cy={y} r="8" fill={c as string} />
          <circle cx={x} cy={y} r="3" fill="#FFF8EA" />
        </g>
      ))}
    </>
  ),
  bench: () => (
    <>
      {shadow(50, 82, 38)}
      <rect x="14" y="30" width="72" height="12" rx="4" fill="#A9774E" />
      <rect x="14" y="46" width="72" height="12" rx="4" fill="#A9774E" />
      <rect x="10" y="60" width="80" height="12" rx="4" fill="#8B5E3C" />
      <rect x="18" y="70" width="8" height="16" fill="#5B3E27" />
      <rect x="74" y="70" width="8" height="16" fill="#5B3E27" />
    </>
  ),
  lantern: () => (
    <>
      {shadow(50, 90, 18)}
      <rect x="46" y="40" width="8" height="50" fill="#315A3D" />
      <circle cx="50" cy="30" r="20" fill="#E8B85B" opacity="0.35" />
      <rect x="38" y="14" width="24" height="30" rx="5" fill="#FFE7A6" stroke="#315A3D" strokeWidth="4" />
      <path d="M34 14 h32 l-16 -10 Z" fill="#315A3D" />
    </>
  ),
  birdbath: () => (
    <>
      {shadow(50, 88, 26)}
      <rect x="42" y="46" width="16" height="40" fill="#C8C2B4" />
      <rect x="30" y="80" width="40" height="10" rx="4" fill="#B5AE9E" />
      <ellipse cx="50" cy="42" rx="36" ry="12" fill="#C8C2B4" />
      <ellipse cx="50" cy="40" rx="28" ry="7" fill="#A8D5E5" />
      <circle cx="66" cy="28" r="7" fill="#C9725A" />
      <path d="M72 28 l7 2 l-7 2 Z" fill="#E8B85B" />
    </>
  ),
  signpost: () => (
    <>
      {shadow(50, 90, 20)}
      <rect x="45" y="20" width="10" height="70" fill="#8B5E3C" />
      <path d="M16 22 H76 L88 34 L76 46 H16 Z" fill="#A9774E" />
      <path d="M26 34 H70" stroke="#FFF8EA" strokeWidth="4" strokeLinecap="round" />
      <path d="M84 52 H24 L12 62 L24 72 H84 Z" fill="#A9774E" />
    </>
  ),
  beehive: () => (
    <>
      {shadow(50, 88, 30)}
      <rect x="44" y="64" width="12" height="24" fill="#8B5E3C" />
      <ellipse cx="50" cy="56" rx="26" ry="10" fill="#E8B85B" />
      <ellipse cx="50" cy="44" rx="23" ry="10" fill="#F0C873" />
      <ellipse cx="50" cy="32" rx="18" ry="9" fill="#E8B85B" />
      <ellipse cx="50" cy="22" rx="11" ry="7" fill="#F0C873" />
      <circle cx="50" cy="52" r="4" fill="#5B3E27" />
      <circle cx="78" cy="24" r="4" fill="#2F3A32" />
      <ellipse cx="78" cy="18" rx="4" ry="3" fill="#FFFFFF" opacity="0.8" />
    </>
  ),
  fountain: () => (
    <>
      <ellipse cx="50" cy="70" rx="44" ry="20" fill="#B5AE9E" />
      <ellipse cx="50" cy="66" rx="38" ry="15" fill="#A8D5E5" />
      <rect x="44" y="36" width="12" height="30" fill="#C8C2B4" />
      <ellipse cx="50" cy="36" rx="18" ry="6" fill="#C8C2B4" />
      <path d="M50 30 Q40 14 30 34 M50 30 Q60 14 70 34 M50 30 V10" stroke="#A8D5E5" strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),
  sunflower: () => (
    <>
      {shadow(50, 90, 18)}
      <path d="M50 50 V88" stroke="#315A3D" strokeWidth="5" />
      <ellipse cx="38" cy="70" rx="10" ry="5" fill="#5D9868" transform="rotate(-30 38 70)" />
      {Array.from({ length: 10 }, (_, i) => (
        <ellipse key={i} cx="50" cy="20" rx="6" ry="13" fill="#E8B85B" transform={`rotate(${i * 36} 50 34)`} />
      ))}
      <circle cx="50" cy="34" r="11" fill="#7A5A3D" />
    </>
  ),
  lavender: () => (
    <>
      {shadow(50, 88, 26)}
      {[28, 40, 50, 60, 72].map((x, i) => (
        <g key={x}>
          <path d={`M50 88 L${x} ${30 + (i % 2) * 10}`} stroke="#5D9868" strokeWidth="3" />
          {[0, 8, 16].map((d) => (
            <ellipse key={d} cx={x + (50 - x) * (d / 60)} cy={26 + (i % 2) * 10 + d} rx="5" ry="6" fill="#9B86C9" />
          ))}
        </g>
      ))}
    </>
  ),
  roseBush: () => (
    <>
      {shadow(50, 88, 34)}
      <circle cx="50" cy="54" r="32" fill="#4E8A5A" />
      <circle cx="30" cy="64" r="20" fill="#5D9868" />
      <circle cx="70" cy="64" r="20" fill="#5D9868" />
      {[
        [36, 44],
        [62, 40],
        [50, 62],
        [28, 66],
        [72, 64],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="8" fill="#D9566B" />
          <circle cx={x} cy={y} r="3.5" fill="#B23A50" />
        </g>
      ))}
    </>
  ),
  vegetables: () => (
    <>
      <rect x="8" y="24" width="84" height="64" rx="10" fill="#7A5A3D" />
      {[22, 50, 78].map((x) =>
        [40, 70].map((y) => (
          <g key={`${x}-${y}`}>
            <path d={`M${x} ${y} l-8 -12 M${x} ${y} l0 -14 M${x} ${y} l8 -12`} stroke="#5D9868" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx={x} cy={y + 5} rx="7" ry="5" fill={y === 40 ? '#E8873A' : '#C9725A'} />
          </g>
        )),
      )}
    </>
  ),
  oliveTree: () => (
    <>
      {shadow(50, 90, 26)}
      <path d="M50 90 C46 70 56 64 50 46" stroke="#8B7355" strokeWidth="9" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="34" rx="36" ry="24" fill="#8FA876" />
      <ellipse cx="34" cy="40" rx="18" ry="12" fill="#7E9866" />
      <ellipse cx="66" cy="28" rx="18" ry="12" fill="#A1B98A" />
      {[
        [38, 30],
        [60, 38],
        [52, 22],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="3" ry="4" fill="#4A4F2E" />
      ))}
    </>
  ),
  figTree: () => (
    <>
      {shadow(50, 90, 30)}
      <rect x="45" y="50" width="10" height="40" rx="4" fill="#8B5E3C" />
      <circle cx="50" cy="36" r="30" fill="#4E8A5A" />
      <circle cx="30" cy="44" r="16" fill="#5D9868" />
      <circle cx="70" cy="44" r="16" fill="#5D9868" />
      {[
        [40, 30],
        [62, 34],
        [50, 48],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="#7B4A7A" />
      ))}
    </>
  ),
  stonePath: () => (
    <>
      <rect x="0" y="0" width="100" height="100" fill="#E9DCC0" />
      {[
        [8, 8, 40, 36],
        [52, 8, 40, 36],
        [8, 52, 36, 40],
        [48, 52, 44, 40],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="10" fill="#CFC5B0" stroke="#B5AE9E" strokeWidth="2" />
      ))}
    </>
  ),
  steppingStones: () => (
    <>
      <ellipse cx="30" cy="28" rx="20" ry="14" fill="#C8C2B4" stroke="#B5AE9E" strokeWidth="2" />
      <ellipse cx="66" cy="52" rx="20" ry="14" fill="#C8C2B4" stroke="#B5AE9E" strokeWidth="2" />
      <ellipse cx="34" cy="80" rx="20" ry="14" fill="#C8C2B4" stroke="#B5AE9E" strokeWidth="2" />
    </>
  ),
  brickPath: () => (
    <>
      <rect x="0" y="0" width="100" height="100" fill="#B5543F" />
      {[0, 25, 50, 75].map((y, row) =>
        (row % 2 === 0
          ? [
              [2, 46],
              [52, 46],
            ]
          : [
              [2, 21],
              [27, 46],
              [77, 21],
            ]
        ).map(([x, w]) => <rect key={`${y}-${x}`} x={x} y={y + 2} width={w} height="21" rx="3" fill="#C9725A" />),
      )}
    </>
  ),
}

export function ItemArt({ art, width, height, className = '' }: { art: string; width: number; height: number; className?: string }) {
  const Draw = ART[art]
  return (
    <svg viewBox={`0 0 ${width * 100} ${height * 100}`} className={className} aria-hidden="true" overflow="visible">
      {Draw ? <Draw /> : <rect width={width * 100} height={height * 100} rx="12" fill="#DDEBD8" />}
    </svg>
  )
}

/** For tests: every catalogue item should have a drawing. */
export const ART_KEYS = Object.keys(ART)

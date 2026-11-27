/**
 * Isometric "Bible-lands village" drawings for garden items.
 * Light comes from the upper left: left faces are sunlit, right faces shaded,
 * shadows fall to the lower right. Everything is plain SVG — no image files.
 */
import type { ReactElement } from 'react'
import { corners, lerp, pts, up, type Origin, type Pt } from './isoMath'

export interface ArtContext {
  gx: number
  gy: number
  w: number
  d: number
  o: Origin
  animate: boolean
}

const STONE = { top: '#F2E6C9', left: '#EBD9B2', right: '#D3BC90', edge: '#B89D70' }

/** A lit box standing on a footprint (inset in tiles). */
function Box({ ctx, inset = 0, z = 0, h, colors = STONE }: { ctx: ArtContext; inset?: number; z?: number; h: number; colors?: typeof STONE }) {
  const c = corners(ctx.gx + inset, ctx.gy + inset, ctx.w - inset * 2, ctx.d - inset * 2, z, ctx.o)
  return (
    <g strokeLinejoin="round">
      <polygon points={pts([c.left, c.bottom, up(c.bottom, h), up(c.left, h)])} fill={colors.left} stroke={colors.edge} strokeWidth="0.8" />
      <polygon points={pts([c.bottom, c.right, up(c.right, h), up(c.bottom, h)])} fill={colors.right} stroke={colors.edge} strokeWidth="0.8" />
      <polygon points={pts([up(c.top, h), up(c.right, h), up(c.bottom, h), up(c.left, h)])} fill={colors.top} stroke={colors.edge} strokeWidth="0.8" />
    </g>
  )
}

/** A point on the front-left (u along the face, v height) or front-right face of a footprint. */
function facePoint(ctx: ArtContext, inset: number, face: 'left' | 'right', u: number, v: number): Pt {
  const c = corners(ctx.gx + inset, ctx.gy + inset, ctx.w - inset * 2, ctx.d - inset * 2, 0, ctx.o)
  const p = face === 'left' ? lerp(c.left, c.bottom, u) : lerp(c.bottom, c.right, u)
  return up(p, v)
}

function quad(ctx: ArtContext, inset: number, face: 'left' | 'right', u0: number, u1: number, v0: number, v1: number) {
  return pts([facePoint(ctx, inset, face, u0, v0), facePoint(ctx, inset, face, u1, v0), facePoint(ctx, inset, face, u1, v1), facePoint(ctx, inset, face, u0, v1)])
}

/** An arched opening on a face (doors and windows). */
function Arch({ ctx, inset, face, u0, u1, v0, v1, fill }: { ctx: ArtContext; inset: number; face: 'left' | 'right'; u0: number; u1: number; v0: number; v1: number; fill: string }) {
  const a = facePoint(ctx, inset, face, u0, v0)
  const b = facePoint(ctx, inset, face, u1, v0)
  const bt = facePoint(ctx, inset, face, u1, v1)
  const at = facePoint(ctx, inset, face, u0, v1)
  const peak = facePoint(ctx, inset, face, (u0 + u1) / 2, v1 + (v1 - v0) * 0.28)
  return <path d={`M${a.x},${a.y} L${b.x},${b.y} L${bt.x},${bt.y} Q${peak.x},${peak.y} ${at.x},${at.y} Z`} fill={fill} />
}

/** Soft shadow falling to the lower right. */
function Shadow({ ctx, spread = 1, height = 30, inset = 0 }: { ctx: ArtContext; spread?: number; height?: number; inset?: number }) {
  const c = corners(ctx.gx + inset, ctx.gy + inset, ctx.w - inset * 2, ctx.d - inset * 2, 0, ctx.o)
  const off = { x: height * 0.55 * spread, y: height * 0.12 * spread }
  const shift = (p: Pt) => ({ x: p.x + off.x, y: p.y + off.y })
  return <polygon points={pts([c.left, c.bottom, shift(c.bottom), shift(c.right), c.right, c.top, shift(c.top)])} fill="#4A3B22" opacity="0.18" />
}

function Ellipse({ at, rx, ry, fill, opacity }: { at: Pt; rx: number; ry: number; fill: string; opacity?: number }) {
  return <ellipse cx={at.x} cy={at.y} rx={rx} ry={ry} fill={fill} opacity={opacity} />
}

/** A clay pot. */
function Pot({ at, s = 1, plant = false }: { at: Pt; s?: number; plant?: boolean }) {
  return (
    <g transform={`translate(${at.x} ${at.y}) scale(${s})`}>
      {plant && (
        <>
          <circle cx="-3" cy="-13" r="4" fill="#6E9B55" />
          <circle cx="3" cy="-14" r="4.5" fill="#5D8A4A" />
          <circle cx="0" cy="-17" r="3.5" fill="#86AE66" />
        </>
      )}
      <path d="M-5,-9 Q-7,-2 -3.5,0 L3.5,0 Q7,-2 5,-9 Z" fill="#C46A45" />
      <ellipse cx="0" cy="-9" rx="5.2" ry="1.8" fill="#A9553A" />
      <path d="M-4,-6 Q-5,-3 -3,-1" stroke="#E08A64" strokeWidth="1" fill="none" />
    </g>
  )
}

// ---------- Buildings ---------------------------------------------------------

function LimestoneHouse({ ctx, h = 44, dome = false, oven = false }: { ctx: ArtContext; h?: number; dome?: boolean; oven?: boolean }) {
  const inset = 0.16
  const c = corners(ctx.gx + inset, ctx.gy + inset, ctx.w - inset * 2, ctx.d - inset * 2, 0, ctx.o)
  const roofInner = corners(ctx.gx + inset + 0.14, ctx.gy + inset + 0.14, ctx.w - (inset + 0.14) * 2, ctx.d - (inset + 0.14) * 2, h + 1, ctx.o)
  const roofCentre = lerp(up(c.top, h), up(c.bottom, h), 0.5)
  return (
    <g>
      <Shadow ctx={ctx} inset={inset} height={h} />
      <Box ctx={ctx} inset={inset} h={h} />
      {/* parapet: a lower roof surface inside a low wall */}
      <polygon points={pts([roofInner.top, roofInner.right, roofInner.bottom, roofInner.left])} fill="#E1CFA6" />
      <Box ctx={ctx} inset={inset} z={h} h={4} colors={{ top: '#F6ECD3', left: '#EEDFBC', right: '#DBC59B', edge: '#C2A87A' }} />
      <polygon points={pts([up(roofInner.top, 4), up(roofInner.right, 4), up(roofInner.bottom, 4), up(roofInner.left, 4)])} fill="#DCC89D" />
      {/* wooden beam ends (vigas) */}
      {[0.12, 0.3, 0.48, 0.66, 0.84].map((u) => (
        <polygon key={`vl${u}`} points={quad(ctx, inset, 'left', u, u + 0.05, h - 8, h - 4)} fill="#7A5233" />
      ))}
      {[0.2, 0.45, 0.7].map((u) => (
        <polygon key={`vr${u}`} points={quad(ctx, inset, 'right', u, u + 0.05, h - 8, h - 4)} fill="#5E3E26" />
      ))}
      {/* door with steps and a striped awning */}
      <polygon points={quad(ctx, inset, 'left', 0.52, 0.8, 0, 3)} fill="#CDB68B" />
      <Arch ctx={ctx} inset={inset} face="left" u0={0.57} u1={0.75} v0={2} v1={20} fill="#6B4528" />
      <Arch ctx={ctx} inset={inset} face="left" u0={0.6} u1={0.72} v0={2} v1={18} fill="#8A5C36" />
      {(() => {
        const a = facePoint(ctx, inset, 'left', 0.53, 27)
        const b = facePoint(ctx, inset, 'left', 0.79, 27)
        const out = { x: -9, y: 7 }
        const a2 = { x: a.x + out.x, y: a.y + out.y }
        const b2 = { x: b.x + out.x, y: b.y + out.y }
        const stripes = [0, 0.25, 0.5, 0.75]
        return (
          <g>
            <polygon points={pts([a, b, b2, a2])} fill="#F3EBDD" />
            {stripes.map((t) => (
              <polygon key={t} points={pts([lerp(a, b, t), lerp(a, b, t + 0.125), lerp(a2, b2, t + 0.125), lerp(a2, b2, t)])} fill="#3F7FA6" />
            ))}
            <line x1={a2.x} y1={a2.y} x2={b2.x} y2={b2.y} stroke="#2E6386" strokeWidth="1.2" />
          </g>
        )
      })()}
      {/* windows */}
      <Arch ctx={ctx} inset={inset} face="left" u0={0.16} u1={0.3} v0={20} v1={30} fill="#4B3A2C" />
      <polygon points={quad(ctx, inset, 'left', 0.14, 0.32, 18.5, 20)} fill="#C9B184" />
      <Arch ctx={ctx} inset={inset} face="right" u0={0.22} u1={0.36} v0={20} v1={30} fill="#3E3024" />
      <Arch ctx={ctx} inset={inset} face="right" u0={0.6} u1={0.74} v0={20} v1={30} fill="#3E3024" />
      {/* blue shutters, a common touch in hill villages */}
      <polygon points={quad(ctx, inset, 'right', 0.17, 0.22, 20, 31)} fill="#4F86A8" />
      <polygon points={quad(ctx, inset, 'right', 0.36, 0.41, 20, 31)} fill="#4F86A8" />
      {/* ladder to the roof */}
      {(() => {
        const foot = facePoint(ctx, inset, 'right', 0.86, 0)
        const top = facePoint(ctx, inset, 'right', 0.86, h + 10)
        const f1 = { x: foot.x + 4, y: foot.y + 5 }
        const f2 = { x: foot.x + 10, y: foot.y + 2 }
        const t1 = { x: top.x - 1, y: top.y }
        const t2 = { x: top.x + 5, y: top.y - 3 }
        return (
          <g stroke="#7A5233" strokeWidth="1.6" strokeLinecap="round">
            <line x1={f1.x} y1={f1.y} x2={t1.x} y2={t1.y} />
            <line x1={f2.x} y1={f2.y} x2={t2.x} y2={t2.y} />
            {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((t) => {
              const p = lerp(f1, t1, t)
              const q = lerp(f2, t2, t)
              return <line key={t} x1={p.x} y1={p.y} x2={q.x} y2={q.y} strokeWidth="1.1" />
            })}
          </g>
        )
      })()}
      {/* roof life: pots, drying cloth */}
      <Pot at={lerp(up(c.top, h + 1), roofCentre, 0.55)} plant />
      <Pot at={lerp(up(c.right, h + 1), roofCentre, 0.5)} s={0.8} />
      {dome && (
        <g>
          <ellipse cx={roofCentre.x} cy={roofCentre.y - 4} rx="20" ry="9" fill="#E7D7B4" />
          <path d={`M${roofCentre.x - 20},${roofCentre.y - 4} Q${roofCentre.x - 18},${roofCentre.y - 32} ${roofCentre.x},${roofCentre.y - 34} Q${roofCentre.x + 18},${roofCentre.y - 32} ${roofCentre.x + 20},${roofCentre.y - 4} Z`} fill="#F4EAD2" />
          <path d={`M${roofCentre.x + 4},${roofCentre.y - 33} Q${roofCentre.x + 18},${roofCentre.y - 30} ${roofCentre.x + 20},${roofCentre.y - 4} L${roofCentre.x + 6},${roofCentre.y - 2} Z`} fill="#DCC9A2" />
        </g>
      )}
      {!dome && (
        <g>
          <line x1={roofCentre.x - 16} y1={roofCentre.y - 2} x2={roofCentre.x + 6} y2={roofCentre.y - 13} stroke="#8B7355" strokeWidth="0.8" />
          <polygon points={`${roofCentre.x - 9},${roofCentre.y - 5} ${roofCentre.x - 3},${roofCentre.y - 8} ${roofCentre.x - 2},${roofCentre.y - 1} ${roofCentre.x - 8},${roofCentre.y + 2}`} fill="#E36F4E" />
          <polygon points={`${roofCentre.x - 1},${roofCentre.y - 9} ${roofCentre.x + 4},${roofCentre.y - 12} ${roofCentre.x + 5},${roofCentre.y - 5} ${roofCentre.x},${roofCentre.y - 2}`} fill="#F1E3B8" />
        </g>
      )}
      <Pot at={facePoint(ctx, inset, 'left', 0.43, 0)} s={1.1} plant />
      {oven && <TabunOven at={{ x: c.right.x + 4, y: c.right.y + 10 }} animate={ctx.animate} />}
    </g>
  )
}

/** A clay bread oven (taboon) with gentle smoke. */
function TabunOven({ at, animate }: { at: Pt; animate: boolean }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <ellipse cx="2" cy="2" rx="14" ry="5" fill="#4A3B22" opacity="0.18" />
      <path d="M-11,0 Q-11,-17 0,-19 Q11,-17 11,0 Z" fill="#C98B5A" />
      <path d="M2,-19 Q11,-17 11,0 L4,1 Z" fill="#B07448" />
      <path d="M-4,0 Q-4,-7 0,-7 Q4,-7 4,0 Z" fill="#3B2618" />
      <circle cx="0" cy="-3" r="1.6" fill="#F0A23B" />
      <Smoke x={0} y={-20} animate={animate} />
    </g>
  )
}

export function Smoke({ x, y, animate }: { x: number; y: number; animate: boolean }) {
  if (!animate) return <circle cx={x} cy={y - 6} r="4" fill="#FFFFFF" opacity="0.5" />
  return (
    <g>
      {[0, 1.3, 2.6].map((delay) => (
        <circle key={delay} cx={x} cy={y} r="3" fill="#FFFFFF" opacity="0">
          <animate attributeName="cy" from={y} to={y - 34} dur="3.9s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="cx" values={`${x};${x + 4};${x - 2};${x + 6}`} dur="3.9s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="r" from="2.5" to="8" dur="3.9s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.7;0.4;0" dur="3.9s" begin={`${delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

function Stable({ ctx }: { ctx: ArtContext }) {
  const inset = 0.18
  const h = 30
  const wood = { top: '#B68A5C', left: '#A47A4E', right: '#8A6440', edge: '#6E4E31' }
  const c = corners(ctx.gx + inset, ctx.gy + inset, ctx.w - inset * 2, ctx.d - inset * 2, 0, ctx.o)
  // gable roof along x: ridge from midpoint of top-left edge to midpoint of right-bottom edge
  const ridgeA = up(lerp(c.top, c.left, 0.5), h + 22)
  const ridgeB = up(lerp(c.right, c.bottom, 0.5), h + 22)
  return (
    <g>
      <Shadow ctx={ctx} inset={inset} height={h + 15} />
      <Box ctx={ctx} inset={inset} h={h} colors={wood} />
      {[0.2, 0.4, 0.6, 0.8].map((u) => (
        <polygon key={u} points={quad(ctx, inset, 'left', u, u + 0.012, 0, h)} fill="#7E5A38" />
      ))}
      <polygon points={quad(ctx, inset, 'left', 0.35, 0.65, 0, 22)} fill="#4A3220" />
      <polygon points={pts([up(c.left, h), up(c.bottom, h), ridgeB, ridgeA])} fill="#D9B56A" stroke="#B8924A" strokeWidth="0.8" />
      <polygon points={pts([up(c.bottom, h), up(c.right, h), ridgeB])} fill="#9C7550" />
      <polygon points={pts([up(c.top, h), up(c.right, h), ridgeB, ridgeA])} fill="#C49C55" />
      {[0.2, 0.4, 0.6, 0.8].map((t) => {
        const a = lerp(up(c.left, h), up(c.bottom, h), t)
        const b = lerp(ridgeA, ridgeB, t)
        return <line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#C29B52" strokeWidth="0.8" />
      })}
      {/* hay bales */}
      <g transform={`translate(${c.bottom.x - 8} ${c.bottom.y + 6})`}>
        <rect x="-8" y="-8" width="16" height="9" rx="2" fill="#E3C46E" />
        <rect x="-8" y="-8" width="16" height="3" rx="1.5" fill="#F0D888" />
      </g>
    </g>
  )
}

function Pergola({ ctx }: { ctx: ArtContext }) {
  const inset = 0.15
  const h = 34
  const c = corners(ctx.gx + inset, ctx.gy + inset, ctx.w - inset * 2, ctx.d - inset * 2, 0, ctx.o)
  const posts = [c.top, c.right, c.bottom, c.left]
  return (
    <g>
      <Shadow ctx={ctx} inset={inset} height={20} />
      <polygon points={pts([c.top, c.right, c.bottom, c.left])} fill="#B9A274" opacity="0.5" />
      {posts.map((p, i) => (
        <rect key={i} x={p.x - 1.8} y={p.y - h} width="3.6" height={h} fill="#7A5233" />
      ))}
      <polygon points={pts(posts.map((p) => up(p, h)))} fill="#6F9A4E" opacity="0.92" />
      {Array.from({ length: 14 }, (_, i) => {
        const t = (i * 0.37) % 1
        const s = (i * 0.61) % 1
        const p = lerp(lerp(up(c.top, h), up(c.right, h), t), lerp(up(c.left, h), up(c.bottom, h), t), s)
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="6" fill={i % 2 ? '#5D8A42' : '#7FA95A'} />
            {i % 3 === 0 && (
              <g>
                <circle cx={p.x + 2} cy={p.y + 6} r="1.8" fill="#6B3F7A" />
                <circle cx={p.x} cy={p.y + 8} r="1.8" fill="#7B4B8C" />
                <circle cx={p.x + 3} cy={p.y + 9} r="1.6" fill="#5E3570" />
              </g>
            )}
          </g>
        )
      })}
    </g>
  )
}

function StoneTower({ ctx }: { ctx: ArtContext }) {
  const base = lerp(corners(ctx.gx, ctx.gy, ctx.w, ctx.d, 0, ctx.o).top, corners(ctx.gx, ctx.gy, ctx.w, ctx.d, 0, ctx.o).bottom, 0.55)
  const hub = { x: base.x, y: base.y - 74 }
  return (
    <g>
      <ellipse cx={base.x + 26} cy={base.y + 4} rx="34" ry="10" fill="#4A3B22" opacity="0.18" />
      <path d={`M${base.x - 20},${base.y} L${base.x - 13},${base.y - 68} L${base.x + 13},${base.y - 68} L${base.x + 20},${base.y} Z`} fill="#EBD9B2" />
      <path d={`M${base.x + 2},${base.y - 68} L${base.x + 13},${base.y - 68} L${base.x + 20},${base.y} L${base.x + 4},${base.y + 2} Z`} fill="#D3BC90" />
      <ellipse cx={base.x} cy={base.y - 68} rx="14" ry="5" fill="#C9725A" />
      <path d={`M${base.x - 14},${base.y - 68} L${base.x},${base.y - 86} L${base.x + 14},${base.y - 68} Z`} fill="#B8604A" />
      <path d={`M${base.x - 5},${base.y} L${base.x - 5},${base.y - 14} Q${base.x},${base.y - 19} ${base.x + 5},${base.y - 14} L${base.x + 5},${base.y} Z`} fill="#6B4528" />
      <g>
        {ctx.animate && <animateTransform attributeName="transform" type="rotate" from={`0 ${hub.x} ${hub.y}`} to={`360 ${hub.x} ${hub.y}`} dur="14s" repeatCount="indefinite" />}
        {[0, 90, 180, 270].map((a) => (
          <g key={a} transform={`rotate(${a} ${hub.x} ${hub.y})`}>
            <rect x={hub.x - 1.5} y={hub.y - 40} width="3" height="40" fill="#8B6A45" />
            <rect x={hub.x + 1.5} y={hub.y - 38} width="10" height="30" fill="#F7F0E0" stroke="#D9CBB0" strokeWidth="0.8" />
          </g>
        ))}
      </g>
      <circle cx={hub.x} cy={hub.y} r="3.5" fill="#5E3E26" />
    </g>
  )
}

// ---------- Trees & plants -------------------------------------------------------

/** An olive tree: twisted grey trunk and a silvery canopy. */
export function OliveTree({ at, s = 1, fruit = '#4A4F2E', sway = false }: { at: Pt; s?: number; fruit?: string; sway?: boolean }) {
  return (
    <g transform={`translate(${at.x} ${at.y}) scale(${s})`}>
      <ellipse cx="20" cy="3" rx="30" ry="8" fill="#4A3B22" opacity="0.18" />
      <path d="M-5,0 C-9,-12 2,-16 -3,-28 C-6,-36 3,-38 4,-30 C6,-22 0,-16 6,-8 C8,-4 6,0 6,0 Z" fill="#8E8268" />
      <path d="M1,0 C3,-8 -2,-14 3,-22 L6,-20 C2,-14 7,-8 6,0 Z" fill="#776C54" />
      <g className={sway ? 'sway-gently' : undefined} style={{ transformOrigin: '0px -20px' }}>
        <ellipse cx="-12" cy="-38" rx="16" ry="11" fill="#8DA374" />
        <ellipse cx="12" cy="-40" rx="17" ry="12" fill="#7E9666" />
        <ellipse cx="0" cy="-50" rx="18" ry="12" fill="#9DB384" />
        <ellipse cx="-6" cy="-54" rx="10" ry="6" fill="#B4C89D" />
        <ellipse cx="14" cy="-48" rx="8" ry="5" fill="#A9BE90" />
        {[
          [-14, -36],
          [8, -44],
          [2, -34],
          [16, -38],
          [-4, -46],
        ].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="1.8" ry="2.4" fill={fruit} />
        ))}
      </g>
    </g>
  )
}

export function FigTree({ at }: { at: Pt }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <ellipse cx="18" cy="3" rx="26" ry="7" fill="#4A3B22" opacity="0.18" />
      <path d="M-3,0 L-2,-20 L2,-20 L4,0 Z" fill="#8B6A45" />
      <g className="sway-gently" style={{ transformOrigin: '0px -20px' }}>
        <circle cx="-11" cy="-28" r="12" fill="#4E8A5A" />
        <circle cx="11" cy="-29" r="13" fill="#437C4E" />
        <circle cx="0" cy="-39" r="14" fill="#5D9868" />
        {[
          [-8, -26],
          [6, -34],
          [12, -24],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.6" fill="#7B4B8C" />
        ))}
      </g>
    </g>
  )
}

export function Cypress({ at, s = 1 }: { at: Pt; s?: number }) {
  return (
    <g transform={`translate(${at.x} ${at.y}) scale(${s})`}>
      <ellipse cx="14" cy="2" rx="16" ry="5" fill="#4A3B22" opacity="0.18" />
      <path d="M0,-70 C10,-50 11,-20 6,0 L-6,0 C-11,-20 -10,-50 0,-70 Z" fill="#3E6B45" />
      <path d="M0,-70 C10,-50 11,-20 6,0 L1,0 C4,-25 4,-50 0,-70 Z" fill="#2F5636" />
      <path d="M-3,-55 C-5,-40 -6,-25 -4,-10" stroke="#55855C" strokeWidth="1.4" fill="none" />
    </g>
  )
}

export function Palm({ at, s = 1 }: { at: Pt; s?: number }) {
  const fronds = [-150, -115, -80, -45, -10, 25]
  return (
    <g transform={`translate(${at.x} ${at.y}) scale(${s})`}>
      <ellipse cx="22" cy="2" rx="22" ry="6" fill="#4A3B22" opacity="0.16" />
      <path d="M-3,0 C-1,-25 4,-45 8,-66 L12,-65 C8,-45 4,-25 3,0 Z" fill="#A98756" />
      {[8, 18, 28, 38, 48, 58].map((y) => (
        <path key={y} d={`M${-2 + y * 0.15},${-y} l6,-2`} stroke="#8A6A3E" strokeWidth="1.2" />
      ))}
      <g transform="translate(10 -66)">
        {fronds.map((a) => (
          <path key={a} d="M0,0 Q14,-6 30,4 Q16,-1 0,3 Z" fill={a % 2 ? '#5E8F4A' : '#4C7C3C'} transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="3" r="3" fill="#B5763A" />
        <circle cx="4" cy="4" r="2.5" fill="#9C5F2C" />
      </g>
    </g>
  )
}

function Flowers({ at, colours, spread = 14, seed = 1 }: { at: Pt; colours: string[]; spread?: number; seed?: number }) {
  return (
    <g>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i * 2.4 + seed) % (Math.PI * 2)
        const r = ((i * 7 + seed * 3) % 10) / 10
        const x = at.x + Math.cos(a) * spread * r
        const y = at.y + Math.sin(a) * spread * 0.5 * r
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={x} y2={y - 6} stroke="#4E7A3C" strokeWidth="1.1" />
            <circle cx={x} cy={y - 7} r="2.6" fill={colours[i % colours.length]} />
            <circle cx={x} cy={y - 7} r="0.9" fill="#2F2A1E" />
          </g>
        )
      })}
    </g>
  )
}

// ---------- Item registry ---------------------------------------------------------

type Renderer = (ctx: ArtContext) => ReactElement

const ITEM_ART: Record<string, Renderer> = {
  small_cottage: (ctx) => <LimestoneHouse ctx={ctx} />,
  chapel: (ctx) => <LimestoneHouse ctx={ctx} h={48} dome />,
  bakery: (ctx) => <LimestoneHouse ctx={ctx} h={40} oven />,
  barn: (ctx) => <Stable ctx={ctx} />,
  greenhouse: (ctx) => <Pergola ctx={ctx} />,
  windmill: (ctx) => <StoneTower ctx={ctx} />,

  scripture_tree: (ctx) => {
    const c = corners(ctx.gx, ctx.gy, ctx.w, ctx.d, 0, ctx.o)
    const base = lerp(c.top, c.bottom, 0.58)
    return (
      <g>
        {/* ring of field stones */}
        <ellipse cx={base.x} cy={base.y} rx="30" ry="13" fill="#CBB993" />
        <ellipse cx={base.x} cy={base.y - 1} rx="25" ry="10" fill="#9C8A5E" />
        <g transform={`translate(${base.x} ${base.y}) scale(1.75) translate(${-base.x} ${-base.y})`}>
          <OliveTree at={base} fruit="#E8B85B" sway={ctx.animate} />
        </g>
        {/* golden scrolls hanging in the branches */}
        {[
          [-22, -70],
          [18, -84],
          [2, -60],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${base.x + x} ${base.y + y})`}>
            <line x1="0" y1="-8" x2="0" y2="-2" stroke="#8B6A45" strokeWidth="0.8" />
            <rect x="-5" y="-2" width="10" height="6" rx="2" fill="#FFF3CF" />
            <rect x="-6" y="-2.5" width="2" height="7" rx="1" fill="#E8B85B" />
            <rect x="4" y="-2.5" width="2" height="7" rx="1" fill="#E8B85B" />
          </g>
        ))}
        <circle cx={base.x} cy={base.y - 75} r="44" fill="url(#vv-tree-glow)" opacity="0.55">
          {ctx.animate && <animate attributeName="opacity" values="0.35;0.65;0.35" dur="4s" repeatCount="indefinite" />}
        </circle>
      </g>
    )
  },
  olive_tree: (ctx) => <OliveTree at={lerp(corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).top, corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).bottom, 0.6)} s={0.85} sway={ctx.animate} />,
  fig_tree: (ctx) => <FigTree at={lerp(corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).top, corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).bottom, 0.6)} />,

  flower_bed: (ctx) => {
    const c = corners(ctx.gx + 0.12, ctx.gy + 0.12, 0.76, 0.76, 0, ctx.o)
    return (
      <g>
        <Box ctx={ctx} inset={0.12} h={7} colors={{ top: '#7A5A3D', left: '#D9C8A2', right: '#BFA97E', edge: '#A08A60' }} />
        <Flowers at={up(lerp(c.top, c.bottom, 0.5), 7)} colours={['#D9453F', '#F4F1E8', '#E8B85B', '#D9453F']} seed={ctx.gx + ctx.gy} />
      </g>
    )
  },
  sunflower: (ctx) => {
    const p = lerp(corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).top, corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).bottom, 0.6)
    return (
      <g transform={`translate(${p.x} ${p.y})`}>
        <ellipse cx="8" cy="2" rx="10" ry="3" fill="#4A3B22" opacity="0.15" />
        {[-7, 0, 7].map((x, i) => (
          <g key={x} transform={`translate(${x} ${i === 1 ? -4 : 0})`}>
            <line x1="0" y1="0" x2="0" y2="-26" stroke="#4E7A3C" strokeWidth="1.6" />
            <ellipse cx="-4" cy="-12" rx="4" ry="2" fill="#5E8F4A" />
            {Array.from({ length: 8 }, (_, k) => (
              <ellipse key={k} cx="0" cy="-33" rx="2" ry="4.5" fill="#E8B85B" transform={`rotate(${k * 45} 0 -28)`} />
            ))}
            <circle cx="0" cy="-28" r="3" fill="#7A5A3D" />
          </g>
        ))}
      </g>
    )
  },
  lavender: (ctx) => {
    const p = lerp(corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).top, corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).bottom, 0.55)
    return (
      <g transform={`translate(${p.x} ${p.y})`}>
        <ellipse cx="0" cy="0" rx="16" ry="6" fill="#6E8F57" />
        {Array.from({ length: 11 }, (_, i) => (
          <g key={i} transform={`translate(${-14 + i * 2.8} 0)`}>
            <line x1="0" y1="0" x2={(i - 5) * 0.6} y2={-14 - (i % 3) * 3} stroke="#6E8F57" strokeWidth="1" />
            <ellipse cx={(i - 5) * 0.6} cy={-16 - (i % 3) * 3} rx="1.6" ry="3.5" fill="#9B86C9" />
          </g>
        ))}
      </g>
    )
  },
  rose_bush: (ctx) => {
    const p = lerp(corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).top, corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).bottom, 0.6)
    return (
      <g transform={`translate(${p.x} ${p.y})`}>
        <ellipse cx="10" cy="2" rx="18" ry="5" fill="#4A3B22" opacity="0.16" />
        <circle cx="-7" cy="-9" r="9" fill="#4E8A5A" />
        <circle cx="7" cy="-9" r="9" fill="#437C4E" />
        <circle cx="0" cy="-16" r="10" fill="#5D9868" />
        {[
          [-6, -14],
          [5, -18],
          [7, -8],
          [-8, -6],
          [0, -9],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="#D9566B" />
        ))}
      </g>
    )
  },
  vegetable_patch: (ctx) => {
    const c = corners(ctx.gx + 0.08, ctx.gy + 0.08, 0.84, 0.84, 0, ctx.o)
    return (
      <g>
        <polygon points={pts([c.top, c.right, c.bottom, c.left])} fill="#8A6545" />
        {[0.25, 0.5, 0.75].map((t) => {
          const a = lerp(c.top, c.left, t)
          const b = lerp(c.right, c.bottom, t)
          return (
            <g key={t}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#6E4E31" strokeWidth="2.5" />
              {[0.2, 0.45, 0.7, 0.9].map((s) => {
                const p = lerp(a, b, s)
                return <path key={s} d={`M${p.x},${p.y} l-3,-6 M${p.x},${p.y} l0,-7 M${p.x},${p.y} l3,-6`} stroke="#6FA04E" strokeWidth="1.6" strokeLinecap="round" />
              })}
            </g>
          )
        })}
      </g>
    )
  },

  stone_path: (ctx) => {
    const c = corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o)
    return (
      <g>
        <polygon points={pts([c.top, c.right, c.bottom, c.left])} fill="#C7B48B" />
        {[
          [0.06, 0.06, 0.46, 0.46],
          [0.54, 0.06, 0.94, 0.46],
          [0.06, 0.54, 0.46, 0.94],
          [0.54, 0.54, 0.94, 0.94],
        ].map(([x0, y0, x1, y1], i) => {
          const k = corners(ctx.gx + x0, ctx.gy + y0, x1 - x0, y1 - y0, 0, ctx.o)
          return <polygon key={i} points={pts([k.top, k.right, k.bottom, k.left])} fill={i % 2 ? '#E4D6B5' : '#DCCBA6'} stroke="#B4A07A" strokeWidth="0.8" />
        })}
      </g>
    )
  },
  brick_path: (ctx) => {
    const c = corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o)
    return (
      <g>
        <polygon points={pts([c.top, c.right, c.bottom, c.left])} fill="#A9553A" />
        {[0.25, 0.5, 0.75].map((t) => {
          const a = lerp(c.top, c.left, t)
          const b = lerp(c.right, c.bottom, t)
          return <line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#8F4430" strokeWidth="1" />
        })}
      </g>
    )
  },
  stepping_stones: (ctx) => {
    const c = corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o)
    return (
      <g>
        {[0.25, 0.5, 0.75].map((t) => {
          const p = lerp(c.top, c.bottom, t)
          return <Ellipse key={t} at={{ x: p.x + (t - 0.5) * 10, y: p.y }} rx={9} ry={4.5} fill="#D6C9AC" />
        })}
      </g>
    )
  },

  well: (ctx) => {
    const p = lerp(corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).top, corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).bottom, 0.55)
    return (
      <g transform={`translate(${p.x} ${p.y})`}>
        <ellipse cx="10" cy="3" rx="22" ry="7" fill="#4A3B22" opacity="0.18" />
        <path d="M-17,-12 L-17,0 Q0,9 17,0 L17,-12 Z" fill="#D9C8A2" />
        <path d="M2,-12 L17,-12 L17,0 Q10,5 2,6 Z" fill="#BFA97E" />
        <ellipse cx="0" cy="-12" rx="17" ry="7" fill="#E9DCBD" />
        <ellipse cx="0" cy="-12" rx="12" ry="4.5" fill="#3E6B85" />
        <line x1="-13" y1="-12" x2="-8" y2="-40" stroke="#7A5233" strokeWidth="2.2" />
        <line x1="13" y1="-12" x2="8" y2="-40" stroke="#5E3E26" strokeWidth="2.2" />
        <line x1="-10" y1="-38" x2="10" y2="-38" stroke="#6B4528" strokeWidth="2.6" />
        <line x1="0" y1="-38" x2="0" y2="-24" stroke="#C9B184" strokeWidth="0.8" />
        <path d="M-4,-24 L4,-24 L3,-18 L-3,-18 Z" fill="#8B6A45" />
      </g>
    )
  },
  bench: (ctx) => {
    const c = corners(ctx.gx + 0.15, ctx.gy + 0.35, 0.7, 0.3, 0, ctx.o)
    const seat = (z: number) => pts([up(c.top, z), up(c.right, z), up(c.bottom, z), up(c.left, z)])
    return (
      <g>
        <polygon points={pts([c.left, c.bottom, { x: c.bottom.x + 8, y: c.bottom.y + 2 }, { x: c.right.x + 8, y: c.right.y + 2 }, c.right])} fill="#4A3B22" opacity="0.15" />
        {[c.left, c.bottom, c.right].map((p, i) => (
          <rect key={i} x={p.x - 1} y={p.y - 8} width="2" height="8" fill="#5E3E26" />
        ))}
        <polygon points={seat(9)} fill="#A9774E" stroke="#7A5233" strokeWidth="0.6" />
        <polygon points={pts([up(c.top, 9), up(c.right, 9), up(c.right, 20), up(c.top, 20)])} fill="#946540" stroke="#7A5233" strokeWidth="0.6" />
      </g>
    )
  },
  lantern: (ctx) => {
    const p = lerp(corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).top, corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).bottom, 0.55)
    return (
      <g transform={`translate(${p.x} ${p.y})`}>
        <ellipse cx="4" cy="1" rx="7" ry="2.5" fill="#4A3B22" opacity="0.18" />
        <rect x="-1.5" y="-30" width="3" height="30" fill="#5E3E26" />
        <circle cx="0" cy="-34" r="12" fill="#FFD98A" opacity="0.35">
          {ctx.animate && <animate attributeName="opacity" values="0.25;0.45;0.3;0.4;0.25" dur="3s" repeatCount="indefinite" />}
        </circle>
        <path d="M-6,-30 Q0,-28 6,-30 Q4,-36 0,-36 Q-4,-36 -6,-30 Z" fill="#C98B5A" />
        <path d="M-1,-36 Q0,-42 1,-36 Z" fill="#F0A23B" />
      </g>
    )
  },
  birdbath: (ctx) => {
    const p = lerp(corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).top, corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).bottom, 0.55)
    return (
      <g transform={`translate(${p.x} ${p.y})`}>
        <rect x="-3" y="-14" width="6" height="14" fill="#CFC2A4" />
        <ellipse cx="0" cy="-15" rx="13" ry="5" fill="#DDD1B5" />
        <ellipse cx="0" cy="-16" rx="9" ry="3" fill="#8CC3D6" />
        <g transform="translate(6 -20)">
          <ellipse cx="0" cy="0" rx="4" ry="2.6" fill="#F4F1E8" />
          <circle cx="3" cy="-2" r="1.8" fill="#F4F1E8" />
        </g>
      </g>
    )
  },
  verse_sign: (ctx) => {
    const p = lerp(corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).top, corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).bottom, 0.55)
    return (
      <g transform={`translate(${p.x} ${p.y})`}>
        <rect x="-1.5" y="-26" width="3" height="26" fill="#6B4528" />
        <path d="M-14,-26 L10,-30 L14,-24 L10,-19 L-14,-15 Z" fill="#B68A5C" stroke="#7A5233" strokeWidth="0.8" />
        <path d="M-10,-22 L6,-25" stroke="#FFF3CF" strokeWidth="1.2" />
      </g>
    )
  },
  beehive: (ctx) => {
    const p = lerp(corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).top, corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).bottom, 0.55)
    return (
      <g transform={`translate(${p.x} ${p.y})`}>
        <ellipse cx="6" cy="1" rx="13" ry="4" fill="#4A3B22" opacity="0.18" />
        <path d="M-11,0 Q-12,-22 0,-24 Q12,-22 11,0 Z" fill="#D9AE5B" />
        {[-6, -12, -18].map((y) => (
          <path key={y} d={`M-11,${y + 2} Q0,${y + 5} 11,${y + 2}`} stroke="#B8893C" strokeWidth="1.2" fill="none" />
        ))}
        <path d="M-3,0 Q-3,-5 0,-5 Q3,-5 3,0 Z" fill="#5B3E1E" />
      </g>
    )
  },
  fountain: (ctx) => {
    const p = lerp(corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).top, corners(ctx.gx, ctx.gy, 1, 1, 0, ctx.o).bottom, 0.55)
    return (
      <g transform={`translate(${p.x} ${p.y})`}>
        <path d="M-20,-6 L-20,0 Q0,10 20,0 L20,-6 Z" fill="#D9C8A2" />
        <ellipse cx="0" cy="-6" rx="20" ry="8" fill="#E9DCBD" />
        <ellipse cx="0" cy="-6" rx="16" ry="6" fill="#7FC4D6" />
        <rect x="-2.5" y="-24" width="5" height="18" fill="#D9C8A2" />
        <ellipse cx="0" cy="-24" rx="7" ry="2.5" fill="#E9DCBD" />
        <path d="M0,-26 Q-6,-34 -10,-8 M0,-26 Q6,-34 10,-8" stroke="#BFE6F2" strokeWidth="1.4" fill="none">
          {ctx.animate && <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" />}
        </path>
      </g>
    )
  },
}

export function hasVillageArt(itemId: string): boolean {
  return itemId in ITEM_ART
}

export function VillageItemArt({ itemId, ctx }: { itemId: string; ctx: ArtContext }) {
  const draw = ITEM_ART[itemId]
  return draw ? draw(ctx) : null
}

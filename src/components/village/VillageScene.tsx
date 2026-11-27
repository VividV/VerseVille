/**
 * The garden, drawn as an isometric (2.5D) Bible-lands village.
 * Drag to look around, pinch / scroll / buttons to zoom. In placement mode a
 * faint grid appears, every unlocked tile becomes a button, and the item being
 * placed is previewed in gold (fits) or red (doesn't fit).
 * All placement rules come from src/engine/garden — this only draws.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type WheelEvent } from 'react'
import type { GardenItemDefinition, PlacedGardenItem } from '../../types/garden'
import { getItem } from '../../engine/garden/catalog'
import { BLOCKED_TILES, GRID_COLUMNS, expansionRows, unlockedRowCount, validatePlacement } from '../../engine/garden/gardenGrid'
import { nextExpansion } from '../../engine/progression/gardenUnlocks'
import { corners, iso, lerp, pts, seeded, up, type Origin, type Pt } from './isoMath'
import { Cypress, OliveTree, Palm, VillageItemArt, type ArtContext } from './villageArt'

const VIEW = { x: 170, y: 330, w: 660, h: 610 }
const PLATFORM_DEPTH = 26

export type VillageMode =
  | { kind: 'view' }
  | { kind: 'place'; def: GardenItemDefinition; movingId?: string; target: { x: number; y: number } | null }

export interface VillageSceneProps {
  items: PlacedGardenItem[]
  expansionsUnlocked: number
  animate: boolean
  mode?: VillageMode
  /** An item that was just placed, to fade it in. */
  justPlacedId?: string | null
  onItemTap: (item: PlacedGardenItem) => void
  onLockedTap: () => void
  onTileTap?: (x: number, y: number) => void
}

// ---------- Background ------------------------------------------------------

function Sky({ animate }: { animate: boolean }) {
  return (
    <g>
      <rect x="0" y="0" width="1000" height="560" fill="url(#vv-sky)" />
      <circle cx="770" cy="345" r="90" fill="url(#vv-sun-glow)" />
      <circle cx="770" cy="345" r="26" fill="#FFF1C9" />
      {[
        { x: 260, y: 335, s: 1, dur: 140 },
        { x: 620, y: 360, s: 0.7, dur: 110 },
      ].map((c, i) => (
        <g key={i} opacity="0.9">
          {animate && <animateTransform attributeName="transform" type="translate" values={`0 0; ${180 * (i ? -1 : 1)} 0; 0 0`} dur={`${c.dur}s`} repeatCount="indefinite" />}
          <g transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
            <ellipse cx="0" cy="0" rx="46" ry="13" fill="#FFFFFF" />
            <ellipse cx="-20" cy="-8" rx="24" ry="12" fill="#FFFFFF" />
            <ellipse cx="18" cy="-10" rx="28" ry="15" fill="#FFFFFF" />
            <ellipse cx="0" cy="4" rx="44" ry="6" fill="#F2E6D6" />
          </g>
        </g>
      ))}
    </g>
  )
}

function Hills({ animate }: { animate: boolean }) {
  const rand = seeded(7)
  return (
    <g>
      {/* far hills, hazy lavender */}
      <path d="M0,430 C90,390 160,380 240,400 C320,360 400,350 480,385 C560,365 650,350 730,380 C820,360 900,370 1000,395 L1000,520 L0,520 Z" fill="#C8BFD3" />
      {/* a white hill town on the far ridge */}
      <g>
        {Array.from({ length: 14 }, (_, i) => {
          const x = 300 + i * 9 + (i % 3) * 3
          const y = 388 - Math.sin(i / 2.2) * 9 - (i % 2) * 5
          const w = 9 + (i % 3) * 3
          return (
            <g key={i}>
              <rect x={x} y={y} width={w} height={9} fill={i % 4 ? '#F4EEE4' : '#E7DCC9'} />
              <rect x={x + w * 0.6} y={y} width={w * 0.4} height={9} fill="#D9CDB8" />
              <rect x={x + 2} y={y + 4} width="1.6" height="2.4" fill="#9A8F86" />
            </g>
          )
        })}
        <path d="M352,371 Q358,356 364,371 Z" fill="#E7DCC9" />
      </g>
      {/* middle hills: terraces of olive trees */}
      <path d="M0,470 C110,430 220,425 330,452 C430,430 520,440 600,465 L600,560 L0,560 Z" fill="#B9B377" />
      <path d="M0,470 C110,430 220,425 330,452 C430,430 520,440 600,465" stroke="#CFC48A" strokeWidth="3" fill="none" />
      {[478, 492, 506, 520].map((y, row) => (
        <g key={y}>
          <path d={`M0,${y} C150,${y - 30 + row * 4} 330,${y - 6} 600,${y + 10}`} stroke="#A19B62" strokeWidth="1.5" fill="none" />
          {Array.from({ length: 14 }, (_, i) => {
            const x = 20 + i * 42 + (row % 2) * 20
            const yy = y - 18 + row * 3 - Math.sin(x / 120) * 8 + rand() * 3
            return <ellipse key={i} cx={x} cy={yy} rx="7" ry="4.5" fill={i % 3 ? '#8E9C64' : '#7F8E57'} />
          })}
        </g>
      ))}
      {/* the lake, with a fishing boat */}
      <path d="M560,478 C650,462 820,458 1000,470 L1000,555 C860,560 700,556 560,540 C530,520 535,490 560,478 Z" fill="url(#vv-lake)" />
      <path d="M570,482 C660,468 820,463 1000,474" stroke="#E8F4F2" strokeWidth="2" fill="none" opacity="0.7" />
      {[
        [640, 500, 30],
        [760, 515, 44],
        [880, 496, 36],
        [700, 530, 26],
      ].map(([x, y, w], i) => (
        <line key={i} x1={x} y1={y} x2={x + w} y2={y} stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
          {animate && <animate attributeName="opacity" values="0.15;0.75;0.15" dur={`${3 + i}s`} repeatCount="indefinite" />}
        </line>
      ))}
      <g>
        {animate && <animateTransform attributeName="transform" type="translate" values="0 0; 40 2; 0 0" dur="40s" repeatCount="indefinite" />}
        <g transform="translate(800 505)">
          <path d="M-22,0 L22,0 L15,8 L-15,8 Z" fill="#7A5233" />
          <line x1="0" y1="0" x2="0" y2="-30" stroke="#5E3E26" strokeWidth="1.5" />
          <path d="M1,-29 L17,-4 L1,-4 Z" fill="#F4EEE4" />
          <path d="M-1,-24 L-12,-4 L-1,-4 Z" fill="#E7DCC9" />
        </g>
      </g>
    </g>
  )
}

function Doves({ animate }: { animate: boolean }) {
  if (!animate) return null
  const paths = [
    'M-40,400 C200,360 420,390 1050,330',
    'M1050,420 C800,380 500,410 -60,370',
  ]
  return (
    <g>
      {paths.map((p, i) => (
        <g key={i}>
          {[0, 1, 2].map((k) => (
            <g key={k}>
              <animateMotion path={p} dur={`${26 + i * 8}s`} begin={`${k * 0.6 + i * 9}s`} repeatCount="indefinite" />
              <g transform={`translate(${k * 14} ${k % 2 ? 6 : -4})`}>
                <path d="M-6,0 Q-3,-4 0,0 Q3,-4 6,0" stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round">
                  <animate attributeName="d" values="M-6,0 Q-3,-4 0,0 Q3,-4 6,0;M-6,-2 Q-3,1 0,0 Q3,1 6,-2;M-6,0 Q-3,-4 0,0 Q3,-4 6,0" dur="0.7s" repeatCount="indefinite" />
                </path>
              </g>
            </g>
          ))}
        </g>
      ))}
    </g>
  )
}

function Villager({ robe, scarf, staff = false }: { robe: string; scarf: string; staff?: boolean }) {
  return (
    <g>
      <ellipse cx="3" cy="1" rx="7" ry="2.2" fill="#4A3B22" opacity="0.2" />
      <path d="M-5,0 L-3.5,-15 L3.5,-15 L5,0 Z" fill={robe} />
      <path d="M0,-15 L3.5,-15 L5,0 L1,0 Z" fill="#000" opacity="0.12" />
      <rect x="-3.5" y="-11" width="7" height="1.6" fill={scarf} />
      <circle cx="0" cy="-18" r="3.2" fill="#C68E62" />
      <path d="M-3.8,-17 Q0,-24 3.8,-17 L4.2,-12 L-4.2,-12 Z" fill={scarf} />
      {staff && <line x1="6" y1="1" x2="7.5" y2="-24" stroke="#6B4528" strokeWidth="1.2" />}
    </g>
  )
}

function Sheep({ at, flip = false, animate, delay = 0 }: { at: Pt; flip?: boolean; animate: boolean; delay?: number }) {
  return (
    <g transform={`translate(${at.x} ${at.y}) scale(${flip ? -1 : 1} 1)`}>
      <ellipse cx="3" cy="1" rx="9" ry="2.5" fill="#4A3B22" opacity="0.18" />
      <rect x="-5" y="-4" width="1.6" height="5" fill="#3B3328" />
      <rect x="3" y="-4" width="1.6" height="5" fill="#3B3328" />
      <ellipse cx="0" cy="-7" rx="8" ry="5.5" fill="#F7F3EA" />
      <circle cx="-4" cy="-9" r="3.5" fill="#FFFFFF" />
      <circle cx="3" cy="-10" r="3.5" fill="#FFFFFF" />
      <g>
        {animate && <animateTransform attributeName="transform" type="rotate" values="0 7 -7;25 7 -7;0 7 -7" dur="3s" begin={`${delay}s`} repeatCount="indefinite" />}
        <ellipse cx="9" cy="-7" rx="3.2" ry="2.4" fill="#3B3328" />
      </g>
    </g>
  )
}

/** Texture on the open land around the village: dry grass, stones, shrubs and anemones. */
function SandDetail({ areas }: { areas: { x: number; y: number; w: number; h: number; n: number }[] }) {
  const rand = seeded(41)
  const out: ReactNode[] = []
  areas.forEach((a, ai) => {
    for (let i = 0; i < a.n; i++) {
      const x = a.x + rand() * a.w
      const y = a.y + rand() * a.h
      const k = rand()
      const key = `${ai}-${i}`
      if (k < 0.45) out.push(<path key={key} d={`M${x - 3},${y} l1.5,-5 M${x},${y} l0,-6 M${x + 3},${y} l-1.5,-5`} stroke="#B7A465" strokeWidth="1.1" strokeLinecap="round" />)
      else if (k < 0.65) out.push(<ellipse key={key} cx={x} cy={y} rx={2 + rand() * 4} ry={1.2 + rand() * 2} fill="#CDB98E" />)
      else if (k < 0.8)
        out.push(
          <g key={key}>
            <ellipse cx={x} cy={y} rx="7" ry="3.5" fill="#9AA866" />
            <ellipse cx={x - 2} cy={y - 2} rx="4" ry="2.5" fill="#AEBB78" />
          </g>,
        )
      else
        out.push(
          <g key={key}>
            {[0, 1, 2].map((j) => (
              <circle key={j} cx={x + j * 3 - 3} cy={y - (j % 2) * 2} r="1.6" fill={j === 1 ? '#F4F1E8' : '#D9453F'} />
            ))}
          </g>,
        )
    }
  })
  return <g>{out}</g>
}

/** A small field of ripening wheat in neat rows. */
function WheatField({ o, animate }: { o: Origin; animate: boolean }) {
  const c = corners(0, 0, 3, 2, 0, o)
  return (
    <g>
      <polygon points={pts([c.top, c.right, c.bottom, c.left])} fill="#D9B45E" />
      {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((t) => {
        const a = lerp(c.top, c.left, t)
        const b = lerp(c.right, c.bottom, t)
        return (
          <g key={t}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#C49A45" strokeWidth="1.5" />
            {Array.from({ length: 9 }, (_, i) => {
              const p = lerp(a, b, (i + 0.5) / 9)
              return (
                <path key={i} d={`M${p.x},${p.y} l-1,-7 M${p.x},${p.y} l1.5,-6`} stroke="#EBCB78" strokeWidth="1.3" strokeLinecap="round">
                  {animate && i % 3 === 0 && <animateTransform attributeName="transform" type="rotate" values={`0 ${p.x} ${p.y};6 ${p.x} ${p.y};0 ${p.x} ${p.y}`} dur="3.5s" repeatCount="indefinite" />}
                </path>
              )
            })}
          </g>
        )
      })}
    </g>
  )
}

function Butterfly({ at, colour, animate, delay }: { at: Pt; colour: string; animate: boolean; delay: number }) {
  const loop = `M${at.x},${at.y} c10,-12 22,-4 14,6 c-8,10 -22,6 -14,-6 z`
  return (
    <g>
      {animate && <animateMotion path={loop} dur="7s" begin={`${delay}s`} repeatCount="indefinite" />}
      <g transform={animate ? undefined : `translate(${at.x} ${at.y})`}>
        <ellipse cx="-2.2" cy="0" rx="2.6" ry="1.8" fill={colour}>
          {animate && <animate attributeName="rx" values="2.6;0.6;2.6" dur="0.35s" repeatCount="indefinite" />}
        </ellipse>
        <ellipse cx="2.2" cy="0" rx="2.6" ry="1.8" fill={colour}>
          {animate && <animate attributeName="rx" values="2.6;0.6;2.6" dur="0.35s" repeatCount="indefinite" />}
        </ellipse>
        <rect x="-0.4" y="-1.5" width="0.8" height="3" fill="#3B3328" />
      </g>
    </g>
  )
}

function Chicken({ at, flip = false, animate, delay = 0 }: { at: Pt; flip?: boolean; animate: boolean; delay?: number }) {
  return (
    <g transform={`translate(${at.x} ${at.y}) scale(${flip ? -1 : 1} 1)`}>
      <ellipse cx="1" cy="0.5" rx="5" ry="1.5" fill="#4A3B22" opacity="0.18" />
      <line x1="-1" y1="0" x2="-1" y2="-3" stroke="#D9A23B" strokeWidth="0.8" />
      <line x1="1" y1="0" x2="1" y2="-3" stroke="#D9A23B" strokeWidth="0.8" />
      <ellipse cx="0" cy="-5" rx="4.5" ry="3.2" fill="#F4EEE4" />
      <path d="M-4,-6 L-7,-9 L-4,-4 Z" fill="#E7DCC9" />
      <g>
        {animate && <animateTransform attributeName="transform" type="rotate" values="0 3 -6;40 3 -6;0 3 -6;0 3 -6" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />}
        <circle cx="4" cy="-8" r="2.2" fill="#F4EEE4" />
        <path d="M5.8,-8.4 L7.6,-7.8 L5.8,-7.2 Z" fill="#E8A13A" />
        <path d="M3.2,-10.2 q0.8,-1.4 1.6,0" fill="#D9453F" />
      </g>
    </g>
  )
}

// ---------- The plot -----------------------------------------------------------

function Platform({ o, cols, rows, unlockedRows }: { o: Origin; cols: number; rows: number; unlockedRows: number }) {
  const c = corners(0, 0, cols, rows, 0, o)
  const D = PLATFORM_DEPTH
  const rand = seeded(11)
  const tiles: ReactNode[] = []
  const shades = ['#A9C171', '#A2BC6A', '#AFC679', '#9FB866']
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const k = corners(x, y, 1, 1, 0, o)
      const locked = y >= unlockedRows
      tiles.push(
        <polygon
          key={`${x},${y}`}
          points={pts([k.top, k.right, k.bottom, k.left])}
          fill={locked ? (rand() > 0.5 ? '#CDBB8C' : '#C6B383') : shades[Math.floor(rand() * shades.length)]}
        />,
      )
    }
  }
  return (
    <g>
      {/* earth sides with soil and limestone layers */}
      <polygon points={pts([c.left, c.bottom, { x: c.bottom.x, y: c.bottom.y + D }, { x: c.left.x, y: c.left.y + D }])} fill="#B99A68" />
      <polygon points={pts([c.bottom, c.right, { x: c.right.x, y: c.right.y + D }, { x: c.bottom.x, y: c.bottom.y + D }])} fill="#9E7F52" />
      <polygon points={pts([c.left, c.bottom, { x: c.bottom.x, y: c.bottom.y + 7 }, { x: c.left.x, y: c.left.y + 7 }])} fill="#8C6A42" />
      <polygon points={pts([c.bottom, c.right, { x: c.right.x, y: c.right.y + 7 }, { x: c.bottom.x, y: c.bottom.y + 7 }])} fill="#76573A" />
      {Array.from({ length: 22 }, (_, i) => {
        const t = rand()
        const onLeft = i % 2 === 0
        const p = onLeft ? lerp(c.left, c.bottom, t) : lerp(c.bottom, c.right, t)
        return <ellipse key={i} cx={p.x} cy={p.y + 12 + rand() * 10} rx={3 + rand() * 4} ry={1.5 + rand() * 2} fill={onLeft ? '#D8C49A' : '#BFA77B'} />
      })}
      {tiles}
      {/* soft lighting: brighter towards the sun (back), a little darker at the front */}
      <polygon points={pts([c.top, c.right, c.bottom, c.left])} fill="url(#vv-ground-light)" />
    </g>
  )
}

/** Grass tufts, wildflowers and pebbles on free tiles. */
function GroundDetail({ o, cols, unlockedRows, occupied }: { o: Origin; cols: number; unlockedRows: number; occupied: Set<string> }) {
  const rand = seeded(23)
  const out: ReactNode[] = []
  for (let y = 0; y < unlockedRows; y++) {
    for (let x = 0; x < cols; x++) {
      if (occupied.has(`${x},${y}`)) continue
      const n = 2 + Math.floor(rand() * 3)
      for (let i = 0; i < n; i++) {
        const p = iso(x + 0.15 + rand() * 0.7, y + 0.15 + rand() * 0.7, 0, o)
        const kind = rand()
        if (kind < 0.62) out.push(<path key={`${x}${y}${i}`} d={`M${p.x - 2.5},${p.y} l1,-4 M${p.x},${p.y} l0,-5 M${p.x + 2.5},${p.y} l-1,-4`} stroke="#7F9E50" strokeWidth="1" strokeLinecap="round" />)
        else if (kind < 0.8) out.push(<circle key={`${x}${y}${i}`} cx={p.x} cy={p.y - 1} r="1.4" fill={rand() > 0.5 ? '#D9453F' : '#F4F1E8'} />)
        else out.push(<ellipse key={`${x}${y}${i}`} cx={p.x} cy={p.y} rx="2.2" ry="1.2" fill="#D6C9AC" />)
      }
    }
  }
  return <g>{out}</g>
}

function Spring({ o, animate }: { o: Origin; animate: boolean }) {
  const c = corners(6, 6, 2, 2, 0, o)
  const mid = lerp(c.top, c.bottom, 0.5)
  return (
    <g>
      <ellipse cx={mid.x} cy={mid.y} rx="52" ry="24" fill="#B8A47A" />
      <ellipse cx={mid.x} cy={mid.y - 1} rx="46" ry="20" fill="url(#vv-lake)" />
      <ellipse cx={mid.x - 12} cy={mid.y - 7} rx="16" ry="4" fill="#E8F6F7" opacity="0.6">
        {animate && <animate attributeName="opacity" values="0.3;0.7;0.3" dur="4s" repeatCount="indefinite" />}
      </ellipse>
      {Array.from({ length: 11 }, (_, i) => {
        const a = (i / 11) * Math.PI * 2
        return <ellipse key={i} cx={mid.x + Math.cos(a) * 50} cy={mid.y + Math.sin(a) * 22} rx="6" ry="3.5" fill={i % 2 ? '#DCCDAA' : '#CDBD97'} />
      })}
      {[-30, -24, 34].map((dx, i) => (
        <g key={i} transform={`translate(${mid.x + dx} ${mid.y + (i === 2 ? -6 : 8)})`}>
          <path d="M0,0 L-2,-16 M2,0 L3,-14 M-1,0 L0,-18" stroke="#6F8F45" strokeWidth="1.4" />
          <ellipse cx="0" cy="-18" rx="1.4" ry="3.4" fill="#7A5A3D" />
        </g>
      ))}
    </g>
  )
}

function LockedLand({ o, firstRow, rows, name, onTap, disabled }: { o: Origin; firstRow: number; rows: number; name: string; onTap: () => void; disabled?: boolean }) {
  const c = corners(0, firstRow, GRID_COLUMNS, rows, 0, o)
  const rand = seeded(5)
  const mid = lerp(c.top, c.bottom, 0.5)
  return (
    <g
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? undefined : 0}
      aria-label={disabled ? undefined : `${name} · tap to unlock (locked land)`}
      onClick={disabled ? undefined : onTap}
      onKeyDown={disabled ? undefined : (e) => (e.key === 'Enter' || e.key === ' ') && onTap()}
      style={{ cursor: disabled ? undefined : 'pointer' }}
    >
      <polygon points={pts([c.top, c.right, c.bottom, c.left])} fill="#BFA97A" opacity="0.55" />
      {Array.from({ length: 16 }, (_, i) => {
        const p = iso(rand() * GRID_COLUMNS, firstRow + rand() * rows, 0, o)
        return i % 3 ? (
          <ellipse key={i} cx={p.x} cy={p.y} rx={3 + rand() * 5} ry={2 + rand() * 2} fill="#A8946A" />
        ) : (
          <path key={i} d={`M${p.x},${p.y} l-3,-7 M${p.x},${p.y} l0,-9 M${p.x},${p.y} l3,-7`} stroke="#8E8A55" strokeWidth="1.2" />
        )
      })}
      {/* low dry-stone wall along the boundary */}
      {Array.from({ length: 16 }, (_, i) => {
        const p = lerp(c.top, c.right, (i + 0.5) / 16)
        return <ellipse key={`w${i}`} cx={p.x} cy={p.y - 3} rx="6" ry="4" fill={i % 2 ? '#D3C3A0' : '#C5B48F'} />
      })}
      <g transform={`translate(${mid.x} ${mid.y})`}>
        <rect x="-1.5" y="-30" width="3" height="30" fill="#6B4528" />
        <rect x="-38" y="-44" width="76" height="20" rx="4" fill="#B68A5C" stroke="#7A5233" strokeWidth="1" />
        <text x="0" y="-30" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFF8EA" fontFamily="Nunito, sans-serif">
          🔒 {name}
        </text>
      </g>
    </g>
  )
}

/** Placement mode: faint grid, preview of the item, and a button on every unlocked tile. */
function PlacementLayer({
  o,
  cols,
  unlockedRows,
  mode,
  check,
  onTileTap,
}: {
  o: Origin
  cols: number
  unlockedRows: number
  mode: Extract<VillageMode, { kind: 'place' }>
  check: ReturnType<typeof validatePlacement> | null
  onTileTap: (x: number, y: number) => void
}) {
  const tiles: ReactNode[] = []
  const grid: ReactNode[] = []
  for (let y = 0; y < unlockedRows; y++) {
    for (let x = 0; x < cols; x++) {
      const k = corners(x, y, 1, 1, 0, o)
      const points = pts([k.top, k.right, k.bottom, k.left])
      grid.push(<polygon key={`g${x},${y}`} points={points} fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="0.8" />)
      tiles.push(
        <polygon
          key={`t${x},${y}`}
          points={points}
          fill="transparent"
          role="button"
          tabIndex={0}
          aria-label={`Place at row ${y + 1}, column ${x + 1}`}
          onClick={() => onTileTap(x, y)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTileTap(x, y)}
          style={{ cursor: 'pointer' }}
          className="outline-none focus-visible:fill-[rgba(232,184,91,0.35)]"
        />,
      )
    }
  }
  const t = mode.target
  const foot = t ? corners(t.x, t.y, mode.def.width, mode.def.height, 0, o) : null
  return (
    <g>
      <g pointerEvents="none">{grid}</g>
      {t && foot && (
        <g pointerEvents="none">
          <polygon
            points={pts([foot.top, foot.right, foot.bottom, foot.left])}
            fill={check?.ok ? 'rgba(232,184,91,0.45)' : 'rgba(182,75,60,0.45)'}
            stroke={check?.ok ? '#E8B85B' : '#B64B3C'}
            strokeWidth="2.5"
          />
          <g opacity="0.8">
            <VillageItemArt itemId={mode.def.id} ctx={{ gx: t.x, gy: t.y, w: mode.def.width, d: mode.def.height, o, animate: false }} />
          </g>
        </g>
      )}
      {tiles}
    </g>
  )
}

// ---------- Camera (drag + pinch + wheel) -------------------------------------------

function useCamera() {
  const [cam, setCam] = useState({ scale: 1, x: 0, y: 0 })
  // (scale 1 already frames the village; zoom in to see details)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const last = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null)
  const moved = useRef(0)
  const svgRef = useRef<SVGSVGElement>(null)

  const unitsPerPx = () => {
    const r = svgRef.current?.getBoundingClientRect()
    return r ? VIEW.w / r.width : 1
  }
  const clamp = (c: { scale: number; x: number; y: number }) => {
    const scale = Math.min(2.6, Math.max(1, c.scale))
    const maxX = (VIEW.w * (scale - 1)) / 2 + 120
    const maxY = (VIEW.h * (scale - 1)) / 2 + 90
    return { scale, x: Math.max(-maxX, Math.min(maxX, c.x)), y: Math.max(-maxY, Math.min(maxY, c.y)) }
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) moved.current = 0
    last.current = null
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const now = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, now)
    const k = unitsPerPx()
    if (pointers.current.size === 1) {
      const dx = now.x - prev.x
      const dy = now.y - prev.y
      moved.current += Math.abs(dx) + Math.abs(dy)
      if (moved.current > 6) setCam((c) => clamp({ ...c, x: c.x + dx * k, y: c.y + dy * k }))
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      if (last.current) {
        const ratio = dist / last.current.dist
        setCam((c) => clamp({ scale: c.scale * ratio, x: c.x + (mid.x - last.current!.mid.x) * k, y: c.y + (mid.y - last.current!.mid.y) * k }))
      }
      last.current = { dist, mid }
      moved.current = 100
    }
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId)
    last.current = null
  }
  const onWheel = (e: WheelEvent) => setCam((c) => clamp({ ...c, scale: c.scale * (e.deltaY < 0 ? 1.1 : 0.9) }))
  const zoom = (factor: number) => setCam((c) => clamp({ ...c, scale: c.scale * factor }))

  /** Ignore the click that ends a drag. */
  const wasDrag = () => moved.current > 6

  /** Jump to a zoom level centred on a point in scene units. */
  const focus = (scale: number, at: { x: number; y: number }) =>
    setCam(clamp({ scale, x: (500 - at.x) * scale, y: (665 - at.y) * scale }))

  return { cam, svgRef, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel }, zoom, focus, wasDrag }
}

// ---------- Scene -----------------------------------------------------------------

export function VillageScene({
  items,
  expansionsUnlocked,
  animate,
  mode = { kind: 'view' },
  justPlacedId,
  onItemTap,
  onLockedTap,
  onTileTap,
}: VillageSceneProps) {
  const placing = mode.kind === 'place'
  const unlockedRows = unlockedRowCount(expansionsUnlocked)
  const upcoming = nextExpansion(expansionsUnlocked)
  const lockedRows = upcoming ? expansionRows(upcoming.id).rows : 0
  const rows = unlockedRows + lockedRows
  const cols = GRID_COLUMNS
  const o: Origin = { x: 500 - ((cols - rows) * 32) / 2, y: 540 - Math.max(0, rows - 10) * 8 }
  const { cam, svgRef, handlers, zoom, focus, wasDrag } = useCamera()

  // Zoom in when placing starts, so tiles are big enough to tap; zoom back out afterwards.
  const plotCentre = iso(cols / 2, unlockedRows / 2, 0, o)
  useEffect(() => {
    if (placing) focus(1.6, plotCentre)
    else focus(1, { x: 500, y: 665 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placing])

  const occupied = useMemo(() => {
    const set = new Set<string>(BLOCKED_TILES.map((t) => `${t.x},${t.y}`))
    for (const item of items) {
      const def = getItem(item.itemId)
      if (!def) continue
      for (let dy = 0; dy < def.height; dy++) for (let dx = 0; dx < def.width; dx++) set.add(`${item.gridX + dx},${item.gridY + dy}`)
    }
    return set
  }, [items])

  // Draw back-to-front so nearer things overlap farther ones.
  const sorted = useMemo(
    () =>
      items
        .map((item) => ({ item, def: getItem(item.itemId) }))
        .filter((x): x is { item: PlacedGardenItem; def: NonNullable<ReturnType<typeof getItem>> } => x.def !== undefined)
        .sort((a, b) => a.item.gridX + a.item.gridY + a.def.width + a.def.height - (b.item.gridX + b.item.gridY + b.def.width + b.def.height) || a.item.gridX - b.item.gridX),
    [items],
  )

  const plot = corners(0, 0, cols, rows, 0, o)
  const gate = lerp(plot.left, plot.bottom, 0.3)
  const road = `M${VIEW.x + 10},${VIEW.y + VIEW.h + 20} C${gate.x - 70},${gate.y + 140} ${gate.x - 10},${gate.y + 90} ${gate.x},${gate.y + PLATFORM_DEPTH + 2}`
  const tap = (fn: () => void) => () => {
    if (!wasDrag()) fn()
  }

  return (
    <div className="relative overflow-hidden rounded-card shadow-soft">
      <svg
        ref={svgRef}
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        className="block h-auto w-full select-none"
        style={{ touchAction: 'none', background: '#E6D2A0' }}
        role="group"
        aria-label="Your garden"
        {...handlers}
      >
        <defs>
          <linearGradient id="vv-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.35" stopColor="#9FD0E6" />
            <stop offset="0.75" stopColor="#F7E4C2" />
            <stop offset="1" stopColor="#F3D9A8" />
          </linearGradient>
          <radialGradient id="vv-sun-glow">
            <stop offset="0" stopColor="#FFE9B0" stopOpacity="0.9" />
            <stop offset="1" stopColor="#FFE9B0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="vv-lake" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8FCBD7" />
            <stop offset="1" stopColor="#4F9DB3" />
          </linearGradient>
          <linearGradient id="vv-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E9D6A6" />
            <stop offset="1" stopColor="#D9BE86" />
          </linearGradient>
          <linearGradient id="vv-ground-light" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFF6D6" stopOpacity="0.22" />
            <stop offset="1" stopColor="#3B4A22" stopOpacity="0.12" />
          </linearGradient>
          <radialGradient id="vv-tree-glow">
            <stop offset="0" stopColor="#FFE7A6" stopOpacity="0.9" />
            <stop offset="1" stopColor="#FFE7A6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform={`translate(${500 + cam.x} ${665 + cam.y}) scale(${cam.scale}) translate(-500 -665)`}>
          <Sky animate={animate} />
          <Hills animate={animate} />
          <rect x="-200" y="545" width="1400" height="700" fill="url(#vv-sand)" />
          <path d="M-200,548 C100,540 300,555 600,546 C800,540 1000,552 1200,548" stroke="#F3E3B9" strokeWidth="5" fill="none" />

          <SandDetail
            areas={[
              { x: VIEW.x, y: 560, w: plot.left.x - VIEW.x + 40, h: 150, n: 40 },
              { x: plot.right.x - 40, y: 560, w: VIEW.x + VIEW.w - plot.right.x + 40, h: 160, n: 40 },
              { x: VIEW.x, y: plot.left.y + 60, w: VIEW.w, h: VIEW.y + VIEW.h - plot.left.y - 60, n: 120 },
            ]}
          />
          <WheatField o={{ x: plot.bottom.x + 120, y: plot.bottom.y - 10 }} animate={animate} />

          {/* scenery behind the plot */}
          <Cypress at={{ x: plot.top.x - 70, y: plot.top.y + 10 }} s={1.1} />
          <Cypress at={{ x: plot.top.x - 45, y: plot.top.y + 2 }} s={0.85} />
          <Cypress at={{ x: plot.top.x + 70, y: plot.top.y + 8 }} />
          <OliveTree at={{ x: plot.left.x - 30, y: plot.left.y - 40 }} s={0.9} sway={animate} />
          <Palm at={{ x: plot.right.x + 40, y: plot.right.y - 18 }} s={1.1} />
          <Palm at={{ x: plot.right.x + 72, y: plot.right.y + 4 }} s={0.85} />

          <Platform o={o} cols={cols} rows={rows} unlockedRows={unlockedRows} />
          <GroundDetail o={o} cols={cols} unlockedRows={unlockedRows} occupied={occupied} />
          {BLOCKED_TILES.some((t) => t.y < unlockedRows) && <Spring o={o} animate={animate} />}
          {upcoming && <LockedLand o={o} firstRow={unlockedRows} rows={lockedRows} name={upcoming.name} onTap={tap(onLockedTap)} disabled={placing} />}

          {sorted.map(({ item, def }) => {
            const ctx: ArtContext = { gx: item.gridX, gy: item.gridY, w: def.width, d: def.height, o, animate }
            const c = corners(item.gridX, item.gridY, def.width, def.height, 0, o)
            const moving = mode.kind === 'place' && mode.movingId === item.id
            return (
              <g
                key={item.id}
                role={placing ? undefined : 'button'}
                tabIndex={placing ? undefined : 0}
                aria-label={def.name}
                aria-hidden={placing ? true : undefined}
                onClick={placing ? undefined : tap(() => onItemTap(item))}
                onKeyDown={placing ? undefined : (e) => (e.key === 'Enter' || e.key === ' ') && onItemTap(item)}
                style={{ cursor: placing ? undefined : 'pointer', pointerEvents: placing ? 'none' : undefined }}
                opacity={moving ? 0.3 : undefined}
                className={item.id === justPlacedId ? 'animate-fade-in' : undefined}
              >
                {/* invisible tap area covering the footprint and the space above it */}
                <polygon points={pts([up(c.top, 60), up(c.right, 30), c.right, c.bottom, c.left, up(c.left, 30)])} fill="transparent" />
                <VillageItemArt itemId={def.id} ctx={ctx} />
              </g>
            )
          })}

          {mode.kind === 'place' && (
            <PlacementLayer
              o={o}
              cols={cols}
              unlockedRows={unlockedRows}
              mode={mode}
              check={mode.target ? validatePlacement({ items, expansionsUnlocked }, mode.def, mode.target.x, mode.target.y, mode.movingId) : null}
              onTileTap={(x, y) => {
                if (!wasDrag()) onTileTap?.(x, y)
              }}
            />
          )}

          {/* village life: butterflies over flowers, chickens near homes */}
          {sorted
            .filter(({ def }) => ['flower_bed', 'lavender', 'rose_bush', 'sunflower'].includes(def.id))
            .slice(0, 4)
            .map(({ item }, i) => (
              <Butterfly key={item.id} at={iso(item.gridX + 0.5, item.gridY + 0.5, 22, o)} colour={['#F2C14E', '#F4F1E8', '#E58F6F', '#A8D5E5'][i % 4]} animate={animate} delay={i * 1.3} />
            ))}
          {(() => {
            const home = sorted.find(({ def }) => def.id === 'barn') ?? sorted.find(({ def }) => def.id === 'small_cottage')
            if (!home) return null
            const p = iso(home.item.gridX + home.def.width + 0.25, home.item.gridY + home.def.height - 0.4, 0, o)
            return [0, 1, 2].map((i) => <Chicken key={i} at={{ x: p.x + i * 9 - 6, y: p.y + (i % 2) * 6 }} flip={i === 1} animate={animate} delay={i * 0.8} />)
          })()}

          {/* the road into the village, with travellers */}
          <path d={road} stroke="#C8A86E" strokeWidth="22" fill="none" strokeLinecap="round" />
          <path d={road} stroke="#DDC28C" strokeWidth="16" fill="none" strokeLinecap="round" />
          <path d={road} stroke="#C8A86E" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="1 9" opacity="0.8" />
          {[
            { robe: '#4F86A8', scarf: '#F4EEE4', staff: true, dur: 34, begin: 0 },
            { robe: '#B8604A', scarf: '#E8B85B', staff: false, dur: 34, begin: 15 },
          ].map((v, i) =>
            animate ? (
              <g key={i}>
                <animateMotion path={road} dur={`${v.dur}s`} begin={`${v.begin}s`} repeatCount="indefinite" keyPoints="0;1;1;0;0" keyTimes="0;0.45;0.5;0.95;1" calcMode="linear" />
                <g>
                  <animateTransform attributeName="transform" type="translate" values="0 0;0 -1.2;0 0" dur="0.6s" repeatCount="indefinite" />
                  <Villager robe={v.robe} scarf={v.scarf} staff={v.staff} />
                </g>
              </g>
            ) : (
              <g key={i} transform={`translate(${plot.left.x - 30 + i * 18} ${plot.left.y + 70 + i * 22})`}>
                <Villager robe={v.robe} scarf={v.scarf} staff={v.staff} />
              </g>
            ),
          )}

          {/* a shepherd and his flock in front of the village */}
          <g>
            <g transform={`translate(${plot.bottom.x - 70} ${plot.bottom.y + 58})`}>
              <Villager robe="#8B6A45" scarf="#F4EEE4" staff />
            </g>
            {[
              [-40, 54],
              [-20, 66],
              [-48, 74],
              [0, 58],
              [-24, 86],
              [14, 78],
            ].map(([dx, dy], i) => (
              <Sheep key={i} at={{ x: plot.bottom.x + dx, y: plot.bottom.y + dy }} flip={i % 2 === 1} animate={animate} delay={i * 0.7} />
            ))}
          </g>
          {/* foreground: a dry-stone wall, wildflowers and rocks */}
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx={plot.bottom.x + 70 + i * 11} cy={plot.bottom.y + 96 - i * 5.5} rx="6.5" ry="4.2" fill={i % 2 ? '#D3C3A0' : '#C5B48F'} />
          ))}
          <OliveTree at={{ x: VIEW.x + 40, y: plot.left.y + 150 }} s={1.1} sway={animate} />
          <Cypress at={{ x: VIEW.x + VIEW.w - 30, y: VIEW.y + VIEW.h - 30 }} s={0.9} />
          <OliveTree at={{ x: VIEW.x + VIEW.w - 70, y: VIEW.y + VIEW.h - 10 }} s={0.9} sway={animate} />
          <Doves animate={animate} />
        </g>
      </svg>

      <div className="absolute right-2 top-2 flex gap-1 opacity-90">
        <button type="button" aria-label="Zoom in" onClick={() => zoom(1.25)} className="h-11 w-11 rounded-full bg-cream/90 text-xl font-extrabold text-leaf-dark shadow-soft">
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoom(0.8)} className="h-11 w-11 rounded-full bg-cream/90 text-xl font-extrabold text-leaf-dark shadow-soft">
          −
        </button>
      </div>
    </div>
  )
}

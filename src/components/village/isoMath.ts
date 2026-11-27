/**
 * Isometric (2.5D) helpers for the village view.
 * A tile is a diamond TILE_W wide and TILE_H tall (2:1). Grid x runs down-right,
 * grid y runs down-left; z lifts a point straight up (in SVG units).
 */
export const TILE_W = 64
export const TILE_H = 32

export interface Pt {
  x: number
  y: number
}

export interface Origin {
  x: number
  y: number
}

export function iso(gx: number, gy: number, z: number, o: Origin): Pt {
  return { x: o.x + ((gx - gy) * TILE_W) / 2, y: o.y + ((gx + gy) * TILE_H) / 2 - z }
}

export const pts = (list: Pt[]) => list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

export const up = (p: Pt, z: number): Pt => ({ x: p.x, y: p.y - z })

/** The four ground corners of a footprint: top (back), right, bottom (front), left. */
export function corners(gx: number, gy: number, w: number, d: number, z: number, o: Origin) {
  return {
    top: iso(gx, gy, z, o),
    right: iso(gx + w, gy, z, o),
    bottom: iso(gx + w, gy + d, z, o),
    left: iso(gx, gy + d, z, o),
  }
}

/** Centre of a footprint on the ground. */
export function centre(gx: number, gy: number, w: number, d: number, o: Origin): Pt {
  return iso(gx + w / 2, gy + d / 2, 0, o)
}

/** A small deterministic random generator so scenery doesn't jump between renders. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

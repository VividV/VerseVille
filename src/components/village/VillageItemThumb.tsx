/** A small picture of an item in the village style, for the shop, inventory and popups. */
import { useLayoutEffect, useRef, useState } from 'react'
import { getItem } from '../../engine/garden/catalog'
import { VillageItemArt } from './villageArt'

export function VillageItemThumb({ itemId, className = '' }: { itemId: string; className?: string }) {
  const def = getItem(itemId)
  const art = useRef<SVGGElement>(null)
  const span = def ? def.width + def.height : 2
  // A first guess; replaced by the drawing's real size once it has been drawn.
  const [box, setBox] = useState(() => {
    const above = span >= 4 ? 110 : 55
    return { x: -(def?.height ?? 1) * 32 - 6, y: -above, w: span * 32 + 24, h: above + span * 16 + 8 }
  })

  useLayoutEffect(() => {
    const g = art.current
    if (!g || typeof g.getBBox !== 'function') return
    const b = g.getBBox()
    if (!b.width || !b.height) return
    // Square box around the drawing with a little breathing room.
    const size = Math.max(b.width, b.height) * 1.12
    setBox({ x: b.x + b.width / 2 - size / 2, y: b.y + b.height / 2 - size / 2, w: size, h: size })
  }, [itemId])

  if (!def) return null
  return (
    <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className={className} aria-hidden="true">
      <g ref={art}>
        <VillageItemArt itemId={itemId} ctx={{ gx: 0, gy: 0, w: def.width, d: def.height, o: { x: 0, y: 0 }, animate: false }} />
      </g>
    </svg>
  )
}

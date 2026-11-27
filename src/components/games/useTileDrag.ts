import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/**
 * Pointer-based drag and drop for word tiles (works with touch, mouse and pen).
 * A short press without movement is left as a normal tap/click.
 *
 * Drop targets are found with data attributes:
 *   data-drop-zone="answer" | "pool"   – areas that accept tiles
 *   data-answer-index="3"              – an answer tile (drop before/after it)
 */
export type DragSource = 'answer' | 'pool'

export interface DropInfo {
  tileId: string
  source: DragSource
  zone: DragSource
  /** Position in the answer line to insert at (only for zone "answer"). */
  insertAt?: number
}

export interface DragGhost {
  tileId: string
  label: string
  x: number
  y: number
}

const DRAG_THRESHOLD = 8

export function useTileDrag(onDrop: (drop: DropInfo) => void) {
  const [ghost, setGhost] = useState<DragGhost | null>(null)
  const pending = useRef<{ tileId: string; label: string; source: DragSource; startX: number; startY: number; dragging: boolean } | null>(null)
  const suppressClick = useRef(false)
  const onDropRef = useRef(onDrop)
  useEffect(() => {
    onDropRef.current = onDrop
  }, [onDrop])

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = pending.current
      if (!p) return
      if (!p.dragging && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < DRAG_THRESHOLD) return
      p.dragging = true
      e.preventDefault()
      setGhost({ tileId: p.tileId, label: p.label, x: e.clientX, y: e.clientY })
    }
    const up = (e: PointerEvent) => {
      const p = pending.current
      pending.current = null
      if (!p?.dragging) return
      setGhost(null)
      suppressClick.current = true // the click that follows a drag is not a tap
      setTimeout(() => (suppressClick.current = false), 0)
      const target = document.elementFromPoint(e.clientX, e.clientY)
      const zoneEl = target?.closest<HTMLElement>('[data-drop-zone]')
      if (!zoneEl) return
      const zone = zoneEl.dataset.dropZone as DragSource
      let insertAt: number | undefined
      if (zone === 'answer') {
        const tileEl = target?.closest<HTMLElement>('[data-answer-index]')
        if (tileEl) {
          const rect = tileEl.getBoundingClientRect()
          const index = Number(tileEl.dataset.answerIndex)
          insertAt = e.clientX > rect.left + rect.width / 2 ? index + 1 : index
        }
      }
      onDropRef.current({ tileId: p.tileId, source: p.source, zone, insertAt })
    }
    const cancel = () => {
      pending.current = null
      setGhost(null)
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [])

  /** Spread onto a tile: onPointerDown={startDrag(...)} */
  const startDrag = useCallback(
    (tileId: string, label: string, source: DragSource) => (e: ReactPointerEvent) => {
      if (e.button !== 0) return
      pending.current = { tileId, label, source, startX: e.clientX, startY: e.clientY, dragging: false }
    },
    [],
  )

  /** Wrap tap handlers so a drag doesn't also count as a tap. */
  const tap = useCallback(
    (handler: () => void) => () => {
      if (!suppressClick.current) handler()
    },
    [],
  )

  return { ghost, startDrag, tap }
}

import { useRef } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

interface ResizeHandleProps {
  /** Which axis the handle moves along. */
  axis: 'x' | 'y'
  label: string
  /** Reports pointer movement along the axis in pixels while the handle is held. */
  onResize: (delta: number) => void
  className: string
}

/**
 * A thin draggable separator between two panels. Arrow keys nudge by 16px
 * so the same control works without a pointer.
 */
export default function ResizeHandle({ axis, label, onResize, className }: ResizeHandleProps) {
  const lastPos = useRef(0)

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    lastPos.current = axis === 'x' ? event.clientX : event.clientY
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const pos = axis === 'x' ? event.clientX : event.clientY
    onResize(pos - lastPos.current)
    lastPos.current = pos
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const back = axis === 'x' ? 'ArrowLeft' : 'ArrowUp'
    const forward = axis === 'x' ? 'ArrowRight' : 'ArrowDown'
    if (event.key !== back && event.key !== forward) return
    event.preventDefault()
    onResize(event.key === back ? -16 : 16)
  }

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation={axis === 'x' ? 'horizontal' : 'vertical'}
      tabIndex={0}
      className={`touch-none select-none ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
    />
  )
}

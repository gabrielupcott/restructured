/**
 * Motion support (Alpha 3). CSS keyframes live in global.css under the
 * anim-* classes; this module holds the reduced-motion hook and the
 * session boot flag. Every animation is decorative: when the user asks
 * for reduced motion, the CSS media rule renders all classes static and
 * the JS-driven effects (boot, XP count-up) skip themselves.
 */
import { useEffect, useState } from 'react'

/** One-shot read of the reduced-motion preference; safe without a DOM. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Live reduced-motion preference: true whenever effects must stay off. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

const BOOT_KEY = 'restructured.booted'

/** Event that asks the menu to replay its boot sequence in place. */
export const BOOT_REPLAY_EVENT = 'restructured:boot'

/**
 * True when the boot sequence already ran this tab session, or when
 * session storage is unavailable (then the boot stays off: the safe,
 * static default).
 */
export function hasBootedThisSession(): boolean {
  if (typeof sessionStorage === 'undefined') return true
  try {
    return sessionStorage.getItem(BOOT_KEY) === '1'
  } catch {
    return true
  }
}

/** Marks the boot sequence as done for this tab session. */
export function markBooted(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(BOOT_KEY, '1')
  } catch {
    // storage may be unavailable; the boot simply replays next session
  }
}

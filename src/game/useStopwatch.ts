import { useEffect, useState } from 'react'

export interface Stopwatch {
  /** Seconds since start, refreshed about four times a second. */
  elapsedSec: number
  /** The current reading, without waiting for the next render. */
  getSeconds(): number
}

/**
 * Wall-clock stopwatch for the problem screen. It never pauses: every
 * reading is now-minus-start, so throttled background tabs stay honest.
 */
export function useStopwatch(): Stopwatch {
  const [startMs] = useState(() => Date.now())
  const [now, setNow] = useState(startMs)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [])
  return {
    elapsedSec: (now - startMs) / 1000,
    getSeconds: () => (Date.now() - startMs) / 1000,
  }
}

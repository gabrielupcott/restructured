/** Palette handling: presets, persistence, and application to the page. */

export interface Palette {
  name: string
  bg: string
  text: string
}

/**
 * Preset pairs following the house pattern: a dark, fully saturated hue for
 * the canvas and a light tint of the same hue for text.
 */
export const PRESETS: Palette[] = [
  { name: 'red', bg: '#6e0000', text: '#ff9c9c' },
  { name: 'orange', bg: '#6e3c00', text: '#ffce9c' },
  { name: 'green', bg: '#006e2c', text: '#9cffc4' },
  { name: 'blue', bg: '#004c6e', text: '#9ce7ff' },
  { name: 'magenta', bg: '#6e004c', text: '#ff9ce7' },
]

export const DEFAULT_PALETTE: Palette = PRESETS[PRESETS.length - 1]

const STORAGE_KEY = 'restructured.palette'

export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

export function normalizeHex(value: string): string {
  return value.toLowerCase()
}

export function loadPalette(): Palette {
  if (typeof localStorage === 'undefined') return DEFAULT_PALETTE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PALETTE
    const parsed = JSON.parse(raw) as Partial<Palette>
    const { name, bg, text } = parsed
    if (
      typeof name === 'string' &&
      typeof bg === 'string' &&
      typeof text === 'string' &&
      isValidHex(bg) &&
      isValidHex(text)
    ) {
      return { name, bg: normalizeHex(bg), text: normalizeHex(text) }
    }
  } catch {
    // any storage or parse failure falls through to the default
  }
  return DEFAULT_PALETTE
}

let listeners: Array<(palette: Palette) => void> = []

export function onPaletteChange(listener: (palette: Palette) => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((entry) => entry !== listener)
  }
}

export function applyPalette(palette: Palette): void {
  const clean: Palette = {
    name: palette.name,
    bg: normalizeHex(palette.bg),
    text: normalizeHex(palette.text),
  }
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--color-dos-bg', clean.bg)
    document.documentElement.style.setProperty('--color-dos-text', clean.text)
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
    } catch {
      // storage may be unavailable; the page still switches for this session
    }
  }
  for (const listener of listeners) listener(clean)
}

/** Mixes two hex colors; t from 0 (a) to 1 (b). Used to derive editor shades. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = parseHex(a)
  const cb = parseHex(b)
  const mixed = ca.map((channel, i) => Math.round(channel + (cb[i] - channel) * t))
  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function parseHex(value: string): number[] {
  const digits = value.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16))
}

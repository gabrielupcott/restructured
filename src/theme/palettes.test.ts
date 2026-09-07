import { describe, expect, it } from 'vitest'
import {
  applyPalette,
  isValidHex,
  loadPalette,
  mixHex,
  onPaletteChange,
  DEFAULT_PALETTE,
} from './palettes'

describe('isValidHex', () => {
  it('accepts six digit hex with hash, any case', () => {
    expect(isValidHex('#6e004c')).toBe(true)
    expect(isValidHex('#6E004C')).toBe(true)
  })

  it('rejects malformed values', () => {
    expect(isValidHex('6e004c')).toBe(false)
    expect(isValidHex('#6e00')).toBe(false)
    expect(isValidHex('#6e004')).toBe(false)
    expect(isValidHex('')).toBe(false)
  })
})

describe('mixHex', () => {
  it('returns the endpoints at t 0 and 1', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
  })

  it('returns the midpoint at t 0.5', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
})

describe('loadPalette', () => {
  it('falls back to the default palette without storage', () => {
    expect(loadPalette()).toEqual(DEFAULT_PALETTE)
    expect(DEFAULT_PALETTE.name).toBe('magenta')
  })
})

describe('applyPalette', () => {
  it('normalizes and notifies listeners', () => {
    const seen: string[] = []
    const stop = onPaletteChange((palette) => seen.push(palette.text))
    applyPalette({ name: 'custom', bg: '#6E0000', text: '#FF9C9C' })
    stop()
    expect(seen).toEqual(['#ff9c9c'])
  })
})

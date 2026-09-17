import { describe, expect, it, vi } from 'vitest'
import { GAIN_CAP, RECIPES, type SoundEvent } from './sound'

const ALL_EVENTS: SoundEvent[] = [
  'boot',
  'run-start',
  'test-pass',
  'test-fail',
  'submit-accept',
  'submit-fail',
  'overtime',
  'quiz-correct',
  'quiz-miss',
  'hint-reveal',
  'unlock-sparkle',
]

describe('recipes', () => {
  it('covers every sound event', () => {
    for (const event of ALL_EVENTS) {
      expect(RECIPES[event], event).toBeDefined()
      expect(RECIPES[event].length, event).toBeGreaterThan(0)
    }
  })

  it('only contains positive frequencies and durations', () => {
    for (const event of ALL_EVENTS) {
      for (const note of RECIPES[event]) {
        expect(note.freq, event).toBeGreaterThan(0)
        expect(note.durMs, event).toBeGreaterThan(0)
      }
    }
  })

  it('keeps the gain under the 0.15 cap from the plan', () => {
    expect(GAIN_CAP).toBeLessThan(0.15)
  })
})

describe('play', () => {
  it('does nothing and never throws without an AudioContext', async () => {
    vi.resetModules()
    const sound = await import('./sound')
    for (const event of ALL_EVENTS) {
      expect(() => sound.play(event)).not.toThrow()
    }
  })
})

describe('mute persistence', () => {
  function stubStorage() {
    const store = new Map<string, string>()
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    }
    return store
  }

  function clearStorage() {
    delete (globalThis as { localStorage?: unknown }).localStorage
  }

  it('defaults to unmuted without storage', async () => {
    clearStorage()
    vi.resetModules()
    const sound = await import('./sound')
    expect(sound.isMuted()).toBe(false)
  })

  it('persists the muted flag and reloads it on a fresh import', async () => {
    const store = stubStorage()
    vi.resetModules()
    const sound = await import('./sound')
    sound.setMuted(true)
    expect(sound.isMuted()).toBe(true)
    expect(store.get('restructured.sound')).toBe('off')

    vi.resetModules()
    const reloaded = await import('./sound')
    expect(reloaded.isMuted()).toBe(true)
  })

  it('notifies listeners on change', async () => {
    clearStorage()
    vi.resetModules()
    const sound = await import('./sound')
    const seen: boolean[] = []
    const stop = sound.onMuteChange((muted: boolean) => seen.push(muted))
    sound.setMuted(true)
    sound.setMuted(false)
    stop()
    sound.setMuted(true)
    expect(seen).toEqual([true, false])
  })
})

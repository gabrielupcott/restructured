/**
 * Square-wave synth for UI sounds (Alpha 3). Lazy Web Audio context, no
 * audio files, nothing downloaded: every event is a short note sequence
 * scheduled on the shared context. Volume stays well under the 0.15 cap
 * from the plan. The mute setting persists under its own storage key and
 * defaults to on.
 */

export type SoundEvent =
  | 'boot'
  | 'run-start'
  | 'test-pass'
  | 'test-fail'
  | 'submit-accept'
  | 'submit-fail'
  | 'overtime'
  | 'quiz-correct'
  | 'quiz-miss'
  | 'hint-reveal'
  | 'unlock-sparkle'

interface Note {
  freq: number
  /** Optional linear pitch drift target across the note, for sweeps. */
  endFreq?: number
  durMs: number
  gapMs?: number
  /** Volume multiplier against GAIN_CAP; 1 when omitted. */
  gain?: number
}

/** Loudest gain any note reaches; kept low so the synth stays unobtrusive. */
export const GAIN_CAP = 0.0125

/**
 * Note recipes per event. Ascending runs for wins, falling runs for
 * failures, single ticks for the per-test stream. Game-design numbers:
 * change by decision only.
 */
export const RECIPES: Record<SoundEvent, Note[]> = {
  boot: [
    { freq: 60, endFreq: 220, durMs: 700, gain: 0.7, gapMs: 50 },
    { freq: 262, durMs: 100 },
    { freq: 523, durMs: 300 },
  ],
  'run-start': [
    { freq: 220, durMs: 60 },
    { freq: 330, durMs: 60 },
  ],
  'test-pass': [{ freq: 880, durMs: 40 }],
  'test-fail': [{ freq: 110, durMs: 120 }],
  'submit-accept': [
    { freq: 523, durMs: 90 },
    { freq: 659, durMs: 90 },
    { freq: 784, durMs: 90 },
    { freq: 1047, durMs: 140 },
  ],
  'submit-fail': [
    { freq: 330, durMs: 100 },
    { freq: 262, durMs: 100 },
    { freq: 196, durMs: 160 },
  ],
  overtime: [
    { freq: 587, durMs: 100 },
    { freq: 587, durMs: 100, gapMs: 80 },
  ],
  'quiz-correct': [
    { freq: 784, durMs: 80 },
    { freq: 1047, durMs: 120 },
  ],
  'quiz-miss': [{ freq: 233, durMs: 160 }],
  'hint-reveal': [
    { freq: 660, durMs: 50 },
    { freq: 880, durMs: 70 },
  ],
  'unlock-sparkle': [
    { freq: 1047, durMs: 60 },
    { freq: 1319, durMs: 60 },
    { freq: 1568, durMs: 110 },
  ],
}

const STORAGE_KEY = 'restructured.sound'

let muted = loadMuted()
let listeners: Array<(muted: boolean) => void> = []

export function isMuted(): boolean {
  return muted
}

export function onMuteChange(listener: (muted: boolean) => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((entry) => entry !== listener)
  }
}

export function setMuted(next: boolean): void {
  muted = next
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'off' : 'on')
    } catch {
      // storage may be unavailable; the session keeps its in-memory state
    }
  }
  for (const listener of listeners) listener(muted)
}

function loadMuted(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === 'off'
  } catch {
    return false
  }
}

let context: AudioContext | null = null

/**
 * Plays one event. Safe to call from anywhere: without a stored context
 * the browser only allows creation during a user gesture, and a suspended
 * or failed context stays silent instead of throwing into gameplay.
 */
export function play(event: SoundEvent): void {
  if (muted) return
  const audio = acquireContext()
  if (!audio) return
  if (audio.state === 'suspended') {
    audio.resume().catch(() => {
      // stays silent until the next user-gesture attempt
    })
  }
  let cursor = audio.currentTime + 0.01
  for (const note of RECIPES[event]) {
    scheduleNote(audio, note, cursor)
    cursor += note.durMs / 1000 + (note.gapMs ?? 0) / 1000
  }
}

function acquireContext(): AudioContext | null {
  if (context) return context
  const ctor = typeof window !== 'undefined' ? window.AudioContext : undefined
  if (!ctor) return null
  try {
    context = new ctor()
  } catch {
    context = null
  }
  return context
}

function scheduleNote(audio: AudioContext, note: Note, when: number): void {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  const durSec = note.durMs / 1000
  const peak = GAIN_CAP * (note.gain ?? 1)
  osc.type = 'square'
  osc.frequency.setValueAtTime(note.freq, when)
  if (note.endFreq !== undefined) {
    osc.frequency.linearRampToValueAtTime(note.endFreq, when + durSec)
  }
  gain.gain.setValueAtTime(0, when)
  gain.gain.linearRampToValueAtTime(peak, when + 0.005)
  gain.gain.setValueAtTime(peak, when + Math.max(durSec - 0.02, 0.005))
  gain.gain.linearRampToValueAtTime(0, when + durSec)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(when)
  osc.stop(when + durSec + 0.001)
}

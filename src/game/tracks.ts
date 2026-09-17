import type { Problem } from '../content/types'

export interface TrackGroup {
  name: string
  problems: Problem[]
}

/** Tracks planned for Phase 4, shown on the map as coming-soon nodes. */
export const UPCOMING_TRACKS = [
  'Sliding Window',
  'Stacks',
  'Binary Search',
  'Linked Lists',
  'Trees',
  'Graphs',
  'Dynamic Programming',
]

/** Map chain order: the suggested curriculum for existing content. */
const MAP_ORDER = ['Arrays', 'Strings', 'Hash Maps', 'Two Pointers']

function mapRank(name: string): number {
  const index = MAP_ORDER.indexOf(name)
  return index === -1 ? MAP_ORDER.length : index
}

/** Visual identity for one track: ASCII motif plus accent utility classes. */
export interface TrackIdentity {
  motif: string
  textClass: string
  borderClass: string
  bgClass: string
  hoverBorderClass: string
  /** Deep tint, readable on the light text channel (hover fills, chips). */
  deepTextClass: string
}

/**
 * Accent utilities are full literals so the Tailwind scanner sees them;
 * the colors themselves live in global.css as palette-mixed variables.
 */
const IDENTITIES: Record<string, TrackIdentity> = {
  Arrays: {
    motif: '[#]',
    textClass: 'text-track-arrays',
    borderClass: 'border-track-arrays',
    bgClass: 'bg-track-arrays',
    hoverBorderClass: 'hover:border-track-arrays',

    deepTextClass: 'text-track-arrays-deep',
  },
  Strings: {
    motif: '"aA"',
    textClass: 'text-track-strings',
    borderClass: 'border-track-strings',
    bgClass: 'bg-track-strings',
    hoverBorderClass: 'hover:border-track-strings',

    deepTextClass: 'text-track-strings-deep',
  },
  'Hash Maps': {
    motif: '{k:v}',
    textClass: 'text-track-hashmaps',
    borderClass: 'border-track-hashmaps',
    bgClass: 'bg-track-hashmaps',
    hoverBorderClass: 'hover:border-track-hashmaps',

    deepTextClass: 'text-track-hashmaps-deep',
  },
  'Two Pointers': {
    motif: '<->',
    textClass: 'text-track-twopointers',
    borderClass: 'border-track-twopointers',
    bgClass: 'bg-track-twopointers',
    hoverBorderClass: 'hover:border-track-twopointers',

    deepTextClass: 'text-track-twopointers-deep',
  },
}

/** Fallback for tracks without a designed identity (future content). */
const FALLBACK: TrackIdentity = {
  motif: '[?]',
  textClass: 'text-dos-cyan',
  borderClass: 'border-dos-cyan',
  bgClass: 'bg-dos-cyan',
  hoverBorderClass: 'hover:border-dos-cyan',

  deepTextClass: 'text-dos-cyan',
}

export function trackIdentity(trackName: string): TrackIdentity {
  return IDENTITIES[trackName] ?? FALLBACK
}

const DIFFICULTY_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 }

/**
 * Groups problems into tracks, chained in map order (unknown tracks keep
 * first-seen order at the end). Within a track the order is difficulty
 * rank, then id: easy problems gate on nothing, so each track starts
 * learnable.
 */
export function groupByTrack(problems: Problem[]): TrackGroup[] {
  const groups: TrackGroup[] = []
  const byName = new Map<string, Problem[]>()
  for (const problem of problems) {
    let list = byName.get(problem.track)
    if (!list) {
      list = []
      byName.set(problem.track, list)
      groups.push({ name: problem.track, problems: list })
    }
    list.push(problem)
  }
  groups.sort((a, b) => mapRank(a.name) - mapRank(b.name))
  for (const group of groups) {
    group.problems.sort(
      (a, b) =>
        DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] || a.id.localeCompare(b.id),
    )
  }
  return groups
}

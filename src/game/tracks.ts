import type { Problem } from '../content/types'

export interface TrackGroup {
  name: string
  problems: Problem[]
}

/**
 * Tracks planned for Phase 4 but not yet shipped, shown as coming-soon
 * nodes. Empty since Batch 4: the planned curriculum is fully shipped.
 */
export const UPCOMING_TRACKS: string[] = []

/** Map chain order: the suggested curriculum. Later tracks unlock as content ships. */
const MAP_ORDER = [
  'Arrays',
  'Strings',
  'Hash Maps',
  'Two Pointers',
  'Sliding Window',
  'Stacks',
  'Binary Search',
  'Linked Lists',
  'Trees',
  'Graphs',
  'Dynamic Programming',
]

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
  'Sliding Window': {
    motif: '[<>]',
    textClass: 'text-track-slidingwindow',
    borderClass: 'border-track-slidingwindow',
    bgClass: 'bg-track-slidingwindow',
    hoverBorderClass: 'hover:border-track-slidingwindow',

    deepTextClass: 'text-track-slidingwindow-deep',
  },
  Stacks: {
    motif: '[||]',
    textClass: 'text-track-stacks',
    borderClass: 'border-track-stacks',
    bgClass: 'bg-track-stacks',
    hoverBorderClass: 'hover:border-track-stacks',

    deepTextClass: 'text-track-stacks-deep',
  },
  'Binary Search': {
    motif: '[1|0]',
    textClass: 'text-track-binarysearch',
    borderClass: 'border-track-binarysearch',
    bgClass: 'bg-track-binarysearch',
    hoverBorderClass: 'hover:border-track-binarysearch',

    deepTextClass: 'text-track-binarysearch-deep',
  },
  'Linked Lists': {
    motif: '[o->]',
    textClass: 'text-track-linkedlists',
    borderClass: 'border-track-linkedlists',
    bgClass: 'bg-track-linkedlists',
    hoverBorderClass: 'hover:border-track-linkedlists',

    deepTextClass: 'text-track-linkedlists-deep',
  },
  Trees: {
    motif: '[/\\]',
    textClass: 'text-track-trees',
    borderClass: 'border-track-trees',
    bgClass: 'bg-track-trees',
    hoverBorderClass: 'hover:border-track-trees',

    deepTextClass: 'text-track-trees-deep',
  },
  'Dynamic Programming': {
    motif: '[::]',
    textClass: 'text-track-dp',
    borderClass: 'border-track-dp',
    bgClass: 'bg-track-dp',
    hoverBorderClass: 'hover:border-track-dp',

    deepTextClass: 'text-track-dp-deep',
  },
  Graphs: {
    motif: '[o:o]',
    textClass: 'text-track-graphs',
    borderClass: 'border-track-graphs',
    bgClass: 'bg-track-graphs',
    hoverBorderClass: 'hover:border-track-graphs',

    deepTextClass: 'text-track-graphs-deep',
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

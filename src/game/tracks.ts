import type { Problem } from '../content/types'

export interface TrackGroup {
  name: string
  problems: Problem[]
}

const DIFFICULTY_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 }

/**
 * Groups problems by track in first-seen order. Within a track the order
 * is difficulty rank, then id: easy problems gate on nothing, so each
 * track starts learnable.
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
  for (const group of groups) {
    group.problems.sort(
      (a, b) =>
        DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] || a.id.localeCompare(b.id),
    )
  }
  return groups
}

/**
 * Cosmetic player title from total XP (Alpha 3). XP never gates content;
 * the title is display-only, shown on the menu and the results screen.
 */

/** One ladder step: total XP at which the title is reached, ascending. */
export interface LevelThreshold {
  xp: number
  title: string
}

/** The title ladder. Game-design numbers, tuned by decision only. */
export const LEVELS: LevelThreshold[] = [
  { xp: 0, title: 'BEGINNER' },
  { xp: 200, title: 'NOVICE' },
  { xp: 500, title: 'INTERMEDIATE' },
  { xp: 900, title: 'EXPERIENCED' },
  { xp: 1400, title: 'PROFESSIONAL' },
  { xp: 2000, title: 'EXPERT' },
]

/**
 * Title for a total XP value: the highest threshold reached. Negative or
 * NaN input clamps to the first title so the UI can never render garbage.
 */
export function titleForXp(xp: number): string {
  const safe = Number.isFinite(xp) ? Math.max(Math.floor(xp), 0) : 0
  let title = LEVELS[0].title
  for (const level of LEVELS) {
    if (safe >= level.xp) title = level.title
  }
  return title
}

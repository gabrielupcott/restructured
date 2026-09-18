/**
 * Cosmetic player title from total XP (Alpha 3). XP never gates content;
 * the title is display-only, shown on the menu and the results screen.
 */

/** One ladder step: total XP at which the title is reached, ascending. */
export interface LevelThreshold {
  xp: number
  title: string
}

/**
 * The title ladder. Game-design numbers, tuned by decision only.
 *
 * Borders span the locked 62-problem roster: a perfect run of every problem
 * earns 17x100 + 34x250 + 11x500 = 15,700 XP, so EXPERT sits just under the
 * ceiling and each later tier is roughly a quarter of the game apart
 * (~6, 16, 30, 46, and 60 full-value solves).
 */
export const LEVELS: LevelThreshold[] = [
  { xp: 0, title: 'BEGINNER' },
  { xp: 1500, title: 'NOVICE' },
  { xp: 4000, title: 'INTERMEDIATE' },
  { xp: 7500, title: 'EXPERIENCED' },
  { xp: 11500, title: 'PROFESSIONAL' },
  { xp: 15000, title: 'EXPERT' },
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

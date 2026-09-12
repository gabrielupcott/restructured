import type { Problem } from '../content/types'
import type { Mode } from '../game/progress'
import { isWorseThanExpected } from '../game/complexity'
import { TIER_LABEL, type RuntimeTier } from '../game/tiers'
import { formatClock, formatMs } from '../lib/format'

export interface SolveResult {
  timeSec: number
  runtimeMs: number
  tier: RuntimeTier
  xp: number
  quizCorrect: boolean
  quizSkipped: boolean
  solutionRevealed: boolean
  claimedTime: string | null
}

interface ResultsPanelProps {
  problem: Problem
  mode: Mode
  result: SolveResult
  onImprove(): void
  onBack(): void
}

function quizLine(result: SolveResult): string {
  if (result.solutionRevealed) return 'SOLUTION SHOWN: flat 10% XP'
  if (result.quizCorrect) return 'OPTIMUM NAMED: full XP'
  if (result.quizSkipped) return 'QUIZ SKIPPED: 75% XP'
  return 'OPTIMUM MISSED: 75% XP'
}

/**
 * The post-solve screen: time, runtime tier, and XP, per the scope layout.
 * When the claimed time complexity is worse than expected, it offers the
 * improve-it loop instead of ending the run.
 */
export default function ResultsPanel({
  problem,
  mode,
  result,
  onImprove,
  onBack,
}: ResultsPanelProps) {
  const reveal = isWorseThanExpected(result.claimedTime, problem.expectedComplexity.time)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-dos-bg p-4">
      <div className="w-full max-w-xl border-2 border-dos-text p-6">
        <h2 className="font-pixel text-4xl tracking-widest text-dos-white">
          {mode === 'challenge' ? 'CHALLENGE CLEAR' : 'PRACTICE CLEAR'}
        </h2>

        <div className="mt-6 space-y-2 text-sm">
          <div className="flex">
            <span className="w-28 text-dos-dim">Time:</span>
            <span>{formatClock(result.timeSec)}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-dos-dim">Runtime:</span>
            <span>
              {formatMs(result.runtimeMs)}{' '}
              <span className="text-dos-cyan">({TIER_LABEL[result.tier]})</span>
            </span>
          </div>
          <div className="flex">
            <span className="w-28 text-dos-dim">XP:</span>
            <span className="text-dos-white">{result.xp}</span>
          </div>
        </div>

        <div className="mt-6 space-y-1 border-t border-dos-faint pt-3 text-xs text-dos-dim">
          <div>{quizLine(result)}</div>
          <div>
            optimal: time {problem.expectedComplexity.time} / space{' '}
            {problem.expectedComplexity.space}
          </div>
        </div>

        {reveal && (
          <div className="mt-6 border-2 border-dos-magenta p-3 text-sm text-dos-magenta">
            <p>You solved it in {result.claimedTime}. Can you improve it?</p>
            <button
              onClick={onImprove}
              className="mt-3 border-2 border-dos-magenta px-4 py-1 hover:bg-dos-magenta hover:text-dos-bg"
            >
              KEEP CODING
            </button>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={onBack}
            className="border-2 border-dos-text px-5 py-1 text-sm hover:bg-dos-text hover:text-dos-bg"
          >
            BACK TO PROBLEMS
          </button>
        </div>
      </div>
    </div>
  )
}

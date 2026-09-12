import { useState } from 'react'
import type { Problem } from '../content/types'
import { quizOptions } from '../game/complexity'

interface QuizPanelProps {
  problem: Problem
  onContinue(selfTime: string, optimalTime: string, optimalSpace: string): void
  onSkip(): void
}

function Question({
  label,
  hint,
  options,
  value,
  onPick,
}: {
  label: string
  hint: string
  options: string[]
  value: string | null
  onPick(option: string): void
}) {
  return (
    <div className="mt-5">
      <div className="text-xs tracking-widest text-dos-cyan">{label}</div>
      <div className="mt-0.5 text-xs text-dos-faint">{hint}</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onPick(option)}
            className={
              option === value
                ? 'border-2 border-dos-text bg-dos-text px-2 py-2 text-sm text-dos-bg'
                : 'border-2 border-dos-faint px-2 py-2 text-sm hover:border-dos-text'
            }
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Post-accept complexity quiz, rendered beside the editor so the submitted
 * code stays visible while the player answers.
 *
 * Three questions: an unscored, honest claim about the player's own solution
 * (it only drives the improve-it reveal), then two scored questions naming
 * the optimal time and space, graded against the problem's expectedComplexity.
 */
export default function QuizPanel({ problem, onContinue, onSkip }: QuizPanelProps) {
  const [selfTime, setSelfTime] = useState<string | null>(null)
  const [optimalTime, setOptimalTime] = useState<string | null>(null)
  const [optimalSpace, setOptimalSpace] = useState<string | null>(null)
  const ready =
    selfTime !== null && optimalTime !== null && optimalSpace !== null

  return (
    <div className="border-2 border-dos-cyan p-4">
      <h2 className="font-pixel text-3xl tracking-widest text-dos-white">COMPLEXITY CHECK</h2>
      <p className="mt-2 text-xs text-dos-dim">
        Claim what your solution costs, then name the optimum. The claim is free; the optimum pays.
      </p>
      <Question
        label="YOUR SOLUTION, TIME"
        hint="an honest claim, even a slow one, costs nothing"
        options={quizOptions(problem.expectedComplexity.time)}
        value={selfTime}
        onPick={setSelfTime}
      />
      <Question
        label="OPTIMUM, TIME"
        hint="the best achievable; both optima must be right for full XP"
        options={quizOptions(problem.expectedComplexity.time)}
        value={optimalTime}
        onPick={setOptimalTime}
      />
      <Question
        label="OPTIMUM, SPACE"
        hint="the best achievable"
        options={quizOptions(problem.expectedComplexity.space)}
        value={optimalSpace}
        onPick={setOptimalSpace}
      />
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => ready && onContinue(selfTime, optimalTime, optimalSpace)}
          disabled={!ready}
          className="border-2 border-dos-green px-5 py-1 text-sm text-dos-green hover:bg-dos-green hover:text-dos-bg disabled:cursor-not-allowed disabled:opacity-40"
        >
          CONTINUE
        </button>
        <button
          onClick={onSkip}
          className="text-xs text-dos-faint underline hover:text-dos-text"
        >
          skip quiz (75% XP)
        </button>
      </div>
    </div>
  )
}

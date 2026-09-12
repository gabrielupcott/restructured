import { useMemo, useState } from 'react'
import { PROBLEMS } from '../content'
import type { Problem } from '../content/types'
import {
  isSolved,
  totalXp,
  type Mode,
  type PlayerProgress,
  type ProblemRecord,
} from '../game/progress'
import { TIER_LABEL } from '../game/tiers'
import { groupByTrack } from '../game/tracks'
import { formatClock, formatMs } from '../lib/format'

interface MenuScreenProps {
  progress: PlayerProgress
  onStart(problemId: string, mode: Mode): void
}

function difficultyClass(difficulty: string): string {
  if (difficulty === 'easy') return 'text-dos-green group-hover:text-dos-bg'
  if (difficulty === 'medium') return 'text-dos-yellow group-hover:text-dos-bg'
  return 'text-dos-red group-hover:text-dos-bg'
}

/** Compact per-problem record line: challenge bests, then practice best. */
function recordLine(record: ProblemRecord | undefined): string {
  if (!record) return ''
  const parts: string[] = []
  const challenge = record.challenge
  if (challenge.bestTimeSec !== undefined) {
    parts.push(`BEST ${formatClock(challenge.bestTimeSec)}`)
  }
  if (challenge.bestRuntimeMs !== undefined) {
    const tier = challenge.bestRuntimeTier ? ` ${TIER_LABEL[challenge.bestRuntimeTier]}` : ''
    parts.push(`${formatMs(challenge.bestRuntimeMs)}${tier}`)
  }
  if (record.practice.bestTimeSec !== undefined) {
    parts.push(`PRACTICE ${formatClock(record.practice.bestTimeSec)}`)
  }
  return parts.join('  ')
}

function ProblemRow({
  problem,
  locked,
  solved,
  record,
  chooserOpen,
  onToggle,
  onStart,
}: {
  problem: Problem
  locked: boolean
  solved: boolean
  record: ProblemRecord | undefined
  chooserOpen: boolean
  onToggle(): void
  onStart(mode: Mode): void
}) {
  const records = recordLine(record)
  if (locked) {
    return (
      <div className="flex w-full flex-wrap items-center gap-3 border-2 border-dos-faint px-4 py-3 text-dos-faint">
        <span className="text-xs">{problem.track.toUpperCase()}</span>
        <span className="text-lg tracking-widest">{problem.title}</span>
        <span className="ml-auto text-xs">LOCKED</span>
        <span className="text-xs">PAR {formatClock(problem.parTimeSec)}</span>
      </div>
    )
  }
  return (
    <>
      <button
        onClick={onToggle}
        className="group flex w-full flex-wrap items-center gap-3 border-2 border-dos-text px-4 py-3 text-left hover:bg-dos-text hover:text-dos-bg"
      >
        <span className="text-xs text-dos-dim group-hover:text-dos-bg">
          {problem.track.toUpperCase()}
        </span>
        <span className="text-lg tracking-widest">{problem.title}</span>
        <span className={`text-xs ${difficultyClass(problem.difficulty)}`}>
          {problem.difficulty.toUpperCase()}
        </span>
        {solved && <span className="text-xs text-dos-green group-hover:text-dos-bg">SOLVED</span>}
        {records && (
          <span className="w-full text-xs text-dos-dim group-hover:text-dos-bg md:w-auto md:ml-auto">
            {records}
          </span>
        )}
        {!records && (
          <span className="ml-auto text-xs text-dos-dim group-hover:text-dos-bg">
            PAR {formatClock(problem.parTimeSec)}
          </span>
        )}
      </button>
      {chooserOpen && (
        <div className="flex flex-wrap items-center gap-3 border-2 border-dos-cyan px-4 py-3">
          <span className="text-xs tracking-widest text-dos-cyan">SELECT MODE</span>
          <button
            onClick={() => onStart('challenge')}
            className="border-2 border-dos-text px-4 py-1 text-sm hover:bg-dos-text hover:text-dos-bg"
          >
            CHALLENGE
            <span className="ml-2 text-xs text-dos-dim">par {formatClock(problem.parTimeSec)}</span>
          </button>
          <button
            onClick={() => onStart('practice')}
            className="border-2 border-dos-cyan px-4 py-1 text-sm text-dos-cyan hover:bg-dos-cyan hover:text-dos-bg"
          >
            PRACTICE
            <span className="ml-2 text-xs opacity-70">no timer</span>
          </button>
        </div>
      )}
    </>
  )
}

export default function MenuScreen({ progress, onStart }: MenuScreenProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const tracks = useMemo(() => groupByTrack(PROBLEMS), [])
  const xp = totalXp(progress)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center px-6 py-20">
      <h1 className="font-pixel text-5xl text-dos-white">RESTRUCTURED</h1>
      <p className="mt-3 text-xs text-dos-dim">ALPHA 2</p>
      <p className="mt-6 text-sm text-dos-dim">
        <span>{`XP ${xp}`}</span>
        <span className="text-dos-faint">{' | '}</span>
        <span>{`STREAK ${progress.streak.current}D`}</span>
        <span className="text-dos-faint">{' | '}</span>
        <span>{`BEST ${progress.streak.longest}D`}</span>
      </p>

      <div className="mt-12 w-full space-y-10">
        {tracks.map((track) => (
          <section key={track.name}>
            <h2 className="mb-3 text-sm tracking-[0.3em] text-dos-cyan">
              {track.name.toUpperCase()}
            </h2>
            <ul className="space-y-3">
              {track.problems.map((problem, index) => {
                const unlocked =
                  index === 0 || isSolved(progress, track.problems[index - 1].id)
                return (
                  <li key={problem.id}>
                    <ProblemRow
                      problem={problem}
                      locked={!unlocked}
                      solved={isSolved(progress, problem.id)}
                      record={progress.problems[problem.id]}
                      chooserOpen={openId === problem.id}
                      onToggle={() => setOpenId(openId === problem.id ? null : problem.id)}
                      onStart={(mode) => onStart(problem.id, mode)}
                    />
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}

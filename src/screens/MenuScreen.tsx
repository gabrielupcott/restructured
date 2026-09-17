import { useEffect, useMemo, useState } from 'react'
import { PROBLEMS } from '../content'
import type { Problem } from '../content/types'
import { titleForXp } from '../game/level'
import {
  BOOT_REPLAY_EVENT,
  hasBootedThisSession,
  markBooted,
  prefersReducedMotion,
} from '../game/motion'
import { play } from '../game/sound'
import {
  isSolved,
  totalXp,
  type Mode,
  type PlayerProgress,
  type ProblemRecord,
} from '../game/progress'
import { groupByTrack, trackIdentity, UPCOMING_TRACKS, type TrackGroup } from '../game/tracks'
import { TIER_LABEL } from '../game/tiers'
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

/**
 * Inline best-run record: best time plus a color-coded runtime (green
 * fast, orange slow). Tier label and the practice best live on hover.
 */
/** True when the record has anything worth showing in the row. */
function hasRecordLine(record: ProblemRecord | undefined): boolean {
  if (!record) return false
  return (
    record.challenge.bestTimeSec !== undefined ||
    record.challenge.bestRuntimeMs !== undefined ||
    record.practice.bestTimeSec !== undefined
  )
}

/**
 * Best-run record, right-aligned: best time plus a color-coded runtime
 * (green fast, orange slow). Tier label and the practice best live on
 * hover. Renders nothing when the record has no visible fields.
 */
function RecordInline({ record }: { record: ProblemRecord | undefined }) {
  if (!record || !hasRecordLine(record)) return null
  const { challenge, practice } = record
  const tooltip: string[] = []
  if (challenge.bestRuntimeTier) tooltip.push(TIER_LABEL[challenge.bestRuntimeTier])
  if (practice.bestTimeSec !== undefined) {
    tooltip.push(`PRACTICE ${formatClock(practice.bestTimeSec)}`)
  }
  return (
    <span
      className="ml-auto flex items-center gap-3 text-xs"
      title={tooltip.join(' - ') || undefined}
    >
      {challenge.bestTimeSec !== undefined && (
        <span className="text-dos-dim">BEST {formatClock(challenge.bestTimeSec)}</span>
      )}
      {challenge.bestRuntimeMs !== undefined && (
        <span
          className={
            challenge.bestRuntimeTier === 'brute' ? 'text-dos-orange' : 'text-dos-green'
          }
        >
          {formatMs(challenge.bestRuntimeMs)}
        </span>
      )}
      {challenge.bestTimeSec === undefined &&
        challenge.bestRuntimeMs === undefined &&
        practice.bestTimeSec !== undefined && (
          <span className="text-dos-dim">PRACTICE {formatClock(practice.bestTimeSec)}</span>
        )}
    </span>
  )
}

/** Dashed chain link between track nodes on the map. */
function Connector() {
  return (
    <div
      aria-hidden="true"
      className="my-3 ml-8 h-8 border-l-2 border-dashed border-dos-faint"
    />
  )
}

/**
 * Fixed rail of per-track progress bars, one per map section in chain
 * order, so progress stays visible at any scroll position. Desktop only:
 * below lg the content spans nearly the full viewport and a fixed rail
 * would cover it, so the header row carries the bars there instead.
 */
function TrackRail({
  tracks,
  progress,
}: {
  tracks: TrackGroup[]
  progress: PlayerProgress
}) {
  return (
    <div
      className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-5 lg:flex"
    >
      {tracks.map((track) => {
        const identity = trackIdentity(track.name)
        const solved = track.problems.filter((problem) => isSolved(progress, problem.id)).length
        const percent =
          track.problems.length === 0
            ? 0
            : Math.round((solved / track.problems.length) * 100)
        return (
          <div
            key={track.name}
            className="flex flex-col items-center gap-1"
            title={`${track.name}: ${solved}/${track.problems.length} solved`}
          >
            <div className="flex h-20 w-3 items-end border border-dos-faint">
              <div className={`w-full ${identity.bgClass}`} style={{ height: `${percent}%` }} />
            </div>
            <span className={`text-xs ${identity.textClass}`}>{identity.motif}</span>
          </div>
        )
      })}
    </div>
  )
}

function ProblemRow({
  problem,
  locked,
  solved,
  record,
  onStart,
}: {
  problem: Problem
  locked: boolean
  solved: boolean
  record: ProblemRecord | undefined
  onStart(mode: Mode): void
}) {
  const identity = trackIdentity(problem.track)
  if (locked) {
    return (
      <div className="flex w-full flex-wrap items-center gap-3 border-2 border-dos-faint px-4 py-3 text-dos-faint">
        <span className="text-xs">[]</span>
        <span className="text-base">{problem.title}</span>
        <span className="ml-auto text-xs">LOCKED</span>
        <span className="text-xs">PAR {formatClock(problem.parTimeSec)}</span>
      </div>
    )
  }
  return (
    <div
      className={`flex w-full flex-wrap items-center gap-3 border-2 border-dos-text px-4 py-3 ${identity.hoverBorderClass}`}
    >
      {solved ? (
        <span className="text-xs text-dos-green">[x]</span>
      ) : (
        <span className="text-xs text-dos-dim">[]</span>
      )}
      <span className="text-base">{problem.title}</span>
      <span className={`text-xs ${difficultyClass(problem.difficulty)}`}>
        {problem.difficulty.toUpperCase()}
      </span>
      {hasRecordLine(record) && <RecordInline record={record} />}
      <div className={`flex flex-wrap gap-3 ${hasRecordLine(record) ? '' : 'ml-auto'}`}>
        <button
          onClick={() => onStart('practice')}
          title="PRACTICE - no timer"
          aria-label="Start practice, no timer"
          className="border-2 border-dos-dim px-3 py-0.5 text-sm text-dos-dim hover:border-dos-cyan hover:text-dos-cyan"
        >
          practice
        </button>
        <button
          onClick={() => onStart('challenge')}
          title={`CHALLENGE - par ${formatClock(problem.parTimeSec)}`}
          aria-label={`Start challenge, par ${formatClock(problem.parTimeSec)}`}
          className="border-2 border-dos-text px-3 py-0.5 text-lg font-bold hover:bg-dos-text hover:text-dos-bg"
        >
          {'>'}
        </button>
      </div>
    </div>
  )
}

/** Track node on the map: motif, accent, name, and solve count. */
function TrackNode({
  name,
  solved,
  total,
}: {
  name: string
  solved: number
  total: number
}) {
  const identity = trackIdentity(name)
  const complete = solved === total
  return (
    <div className={`inline-flex flex-wrap items-center gap-3 border-2 px-4 py-2 ${identity.borderClass}`}>
      <span className={`text-sm ${identity.textClass}`}>{identity.motif}</span>
      <span className="text-sm tracking-[0.3em] text-dos-white">{name.toUpperCase()}</span>
      {complete ? (
        <span className="text-xs text-dos-green">COMPLETE</span>
      ) : (
        <span className="text-xs text-dos-dim">{`${solved}/${total}`}</span>
      )}
    </div>
  )
}

/**
 * One-time-per-session boot: the logo with a single scanline sweep. Any
 * input skips it; reduced motion never shows it (the flag initializer
 * reads prefersReducedMotion directly).
 */
function BootOverlay() {
  useEffect(() => {
    play('boot')
  }, [])
  return (
    <div className="anim-fade-in fixed inset-0 z-[60] flex flex-col items-center justify-center bg-dos-bg">
      <h1 className="anim-fade-in font-pixel text-6xl text-dos-white">RESTRUCTURED</h1>
      <p className="mt-3 text-xs tracking-[0.3em] text-dos-dim">INITIALIZING...</p>
      <div
        aria-hidden="true"
        className="anim-scanline absolute left-0 top-0 h-0.5 w-full bg-dos-text"
      />
    </div>
  )
}

export default function MenuScreen({ progress, onStart }: MenuScreenProps) {
  const tracks = useMemo(() => groupByTrack(PROBLEMS), [])
  const xp = totalXp(progress)
  const title = titleForXp(xp)
  const [booting, setBooting] = useState(
    () => !prefersReducedMotion() && !hasBootedThisSession(),
  )

  useEffect(() => {
    function replay() {
      if (prefersReducedMotion()) return
      setBooting(true)
    }
    window.addEventListener(BOOT_REPLAY_EVENT, replay)
    return () => window.removeEventListener(BOOT_REPLAY_EVENT, replay)
  }, [])

  useEffect(() => {
    if (!booting) return
    markBooted()
    // The cut lands exactly when the boot jingle's final beep begins, so
    // the menu reveals in sync with the sound.
    const timer = setTimeout(() => setBooting(false), 850)
    const skip = () => setBooting(false)
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [booting])

  return (
    <main className="anim-fade-in mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center px-6 py-20">
      {booting && <BootOverlay />}
      <TrackRail tracks={tracks} progress={progress} />
      <h1 className="font-pixel text-5xl text-dos-white">RESTRUCTURED</h1>
      <p className="mt-2 pl-[0.3em] font-pixel text-3xl tracking-[0.3em] text-dos-white">{title}</p>
      <p className="mt-4 text-sm text-dos-dim">
        <span>{`XP ${xp}`}</span>
        <span className="text-dos-faint">{' | '}</span>
        <span>{`STREAK ${progress.streak.current}D`}</span>
        <span className="text-dos-faint">{' | '}</span>
        <span>{`BEST ${progress.streak.longest}D`}</span>
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:hidden">
        {tracks.map((track) => {
          const identity = trackIdentity(track.name)
          const solved = track.problems.filter((problem) => isSolved(progress, problem.id)).length
          const percent =
            track.problems.length === 0
              ? 0
              : Math.round((solved / track.problems.length) * 100)
          return (
            <div
              key={track.name}
              className="flex items-center gap-2"
              title={`${track.name}: ${solved}/${track.problems.length} solved`}
            >
              <span className={`text-xs ${identity.textClass}`}>{identity.motif}</span>
              <div className="h-2 w-16 border border-dos-faint">
                <div className={`h-full ${identity.bgClass}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-12 w-full">
        {tracks.map((track, index) => {
          const solved = track.problems.filter((problem) => isSolved(progress, problem.id)).length
          return (
            <div key={track.name}>
              {index > 0 && <Connector />}
              <section>
                <TrackNode
                  name={track.name}
                  solved={solved}
                  total={track.problems.length}
                />
                <ul className="mt-3 space-y-3">
                  {track.problems.map((problem, problemIndex) => {
                    const unlocked =
                      problemIndex === 0 || isSolved(progress, track.problems[problemIndex - 1].id)
                    return (
                      <li key={problem.id}>
                        <ProblemRow
                          problem={problem}
                          locked={!unlocked}
                          solved={isSolved(progress, problem.id)}
                          record={progress.problems[problem.id]}
                          onStart={(mode) => onStart(problem.id, mode)}
                        />
                      </li>
                    )
                  })}
                </ul>
              </section>
            </div>
          )
        })}

        <Connector />
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs tracking-widest text-dos-faint">COMING SOON</span>
          {UPCOMING_TRACKS.map((name) => (
            <span
              key={name}
              className="border-2 border-dashed border-dos-faint px-3 py-1 text-xs text-dos-faint"
            >
              {name.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}

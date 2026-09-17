import { type ReactNode } from 'react'
import { PROBLEMS } from '../content'
import { titleForXp } from '../game/level'
import { BOOT_REPLAY_EVENT } from '../game/motion'
import {
  emptyModeRecord,
  emptyProblemRecord,
  emptyProgress,
  todayLocal,
  totalXp,
  type ProblemRecord,
  type PlayerProgress,
} from '../game/progress'
import { RECIPES, play, type SoundEvent } from '../game/sound'
import { groupByTrack } from '../game/tracks'
import { XP_BASE } from '../game/xp'

interface AdminPanelProps {
  progress: PlayerProgress
  onProgress(next: PlayerProgress): void
  onResetFailedSubmits(): void
}

const SOUND_EVENTS = Object.keys(RECIPES) as SoundEvent[]

/** Full-XP synthetic solve: enough for XP, PRs, and unlock testing. */
function syntheticSolve(difficulty: 'easy' | 'medium' | 'hard'): ProblemRecord {
  const today = todayLocal()
  return {
    ...emptyProblemRecord(),
    bestXp: XP_BASE[difficulty],
    bestClaimedTime: 'O(n)',
    challenge: {
      ...emptyModeRecord(),
      attempts: 1,
      bestTimeSec: 61,
      bestRuntimeMs: 42,
      bestRuntimeTier: 'optimal',
      lastSolved: today,
    },
    practice: { ...emptyModeRecord(), attempts: 1, lastSolved: today },
  }
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border border-dos-faint p-2">
      <h3 className="mb-2 text-xs tracking-widest text-dos-cyan">{label}</h3>
      {children}
    </section>
  )
}

/**
 * Gabriel's testing panel: sound board, progress surgery, and storage
 * resets. Dev tool only; every mutation goes through the same progress
 * shape the game reads, so tests exercise real save data.
 */
export default function AdminPanel({ progress, onProgress, onResetFailedSubmits }: AdminPanelProps) {
  function setProblemRecord(problemId: string, record: ProblemRecord | null) {
    const problems: Record<string, ProblemRecord> = {}
    for (const [id, existing] of Object.entries(progress.problems)) {
      if (id !== problemId) problems[id] = existing
    }
    if (record) problems[problemId] = record
    onProgress({ ...progress, problems })
  }

  function setSolved(problemId: string, difficulty: 'easy' | 'medium' | 'hard', solved: boolean) {
    setProblemRecord(problemId, solved ? syntheticSolve(difficulty) : null)
  }

  function setBestXp(problemId: string, xp: number) {
    if (!Number.isFinite(xp)) return
    const record = progress.problems[problemId] ?? syntheticSolve('easy')
    setProblemRecord(problemId, { ...record, bestXp: Math.max(xp, 0) })
  }

  function solveAll() {
    const problems: Record<string, ProblemRecord> = {}
    for (const problem of PROBLEMS) problems[problem.id] = syntheticSolve(problem.difficulty)
    onProgress({ ...progress, problems })
  }

  function setStreak(patch: Partial<PlayerProgress['streak']>) {
    onProgress({ ...progress, streak: { ...progress.streak, ...patch } })
  }

  function wipeStorage() {
    for (const storage of [localStorage, sessionStorage]) {
      const keys: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key?.startsWith('restructured.')) keys.push(key)
      }
      for (const key of keys) storage.removeItem(key)
    }
    location.reload()
  }

  /**
   * Clears the session boot flag and asks the menu to replay its boot in
   * place. No reload: the click itself is the user gesture that lets the
   * boot sound play (a reload would start a page with no gesture, where
   * browsers silence the AudioContext).
   */
  function replayBoot() {
    try {
      sessionStorage.removeItem('restructured.booted')
    } catch {
      // without session storage the flag never blocked anything
    }
    window.dispatchEvent(new Event(BOOT_REPLAY_EVENT))
  }

  const xp = totalXp(progress)

  return (
    <div className="fixed bottom-12 left-4 z-50 flex max-h-[80vh] w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 overflow-y-auto border-2 border-dos-text bg-dos-bg p-3 text-xs">
      <p className="text-dos-dim">
        ADMIN - XP {xp} ({titleForXp(xp)}) - changes save like real play
      </p>

      <Section label="SOUND BOARD">
        <div className="flex flex-wrap gap-1">
          {SOUND_EVENTS.map((event) => (
            <button
              key={event}
              onClick={() => play(event)}
              className="border border-dos-faint px-2 py-0.5 hover:border-dos-text hover:text-dos-text"
            >
              {event.replace('-', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </Section>

      <Section label="PROBLEMS">
        <div className="space-y-1">
          {groupByTrack(PROBLEMS).map((track) => (
            <div key={track.name}>
              <div className="text-dos-faint">{track.name.toUpperCase()}</div>
              {track.problems.map((problem) => {
                const record = progress.problems[problem.id]
                return (
                  <div key={problem.id} className="flex items-center gap-2 pl-2">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={record !== undefined}
                        onChange={(event) =>
                          setSolved(problem.id, problem.difficulty, event.target.checked)
                        }
                      />
                      {problem.title}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={record?.bestXp ?? 0}
                      onChange={(event) => setBestXp(problem.id, event.target.valueAsNumber)}
                      aria-label={`${problem.title} best XP`}
                      className="ml-auto w-16 border border-dos-faint bg-dos-bg px-1 py-0 text-right font-dos"
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={solveAll}
            className="border border-dos-faint px-2 py-0.5 hover:border-dos-text hover:text-dos-text"
          >
            SOLVE ALL
          </button>
          <button
            onClick={() => onProgress({ ...emptyProgress(), streak: progress.streak })}
            className="border border-dos-faint px-2 py-0.5 hover:border-dos-text hover:text-dos-text"
          >
            CLEAR PROBLEMS
          </button>
        </div>
      </Section>

      <Section label="STREAK">
        <div className="flex items-center gap-2">
          <label>
            current{' '}
            <input
              type="number"
              min={0}
              value={progress.streak.current}
              onChange={(event) => setStreak({ current: Math.max(event.target.valueAsNumber, 0) })}
              className="w-14 border border-dos-faint bg-dos-bg px-1 py-0 text-right font-dos"
            />
          </label>
          <label>
            longest{' '}
            <input
              type="number"
              min={0}
              value={progress.streak.longest}
              onChange={(event) => setStreak({ longest: Math.max(event.target.valueAsNumber, 0) })}
              className="w-14 border border-dos-faint bg-dos-bg px-1 py-0 text-right font-dos"
            />
          </label>
        </div>
      </Section>

      <Section label="SESSION / STORAGE">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onResetFailedSubmits}
            className="border border-dos-faint px-2 py-0.5 hover:border-dos-text hover:text-dos-text"
          >
            RESET FAILED SUBMITS
          </button>
          <button
            onClick={replayBoot}
            className="border border-dos-faint px-2 py-0.5 hover:border-dos-text hover:text-dos-text"
          >
            REPLAY BOOT
          </button>
          <button
            onClick={wipeStorage}
            className="border border-dos-red px-2 py-0.5 text-dos-red hover:bg-dos-red hover:text-dos-bg"
          >
            WIPE STORAGE
          </button>
        </div>
      </Section>
    </div>
  )
}

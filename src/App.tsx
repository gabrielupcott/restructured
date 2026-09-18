import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { PROBLEMS } from './content'
import {
  isSolved,
  loadProgress,
  recordAccept,
  recordAttempt,
  recordResult,
  recordSubmission,
  saveProgress,
  type Mode,
  type PlayerProgress,
} from './game/progress'
import PalettePicker from './components/PalettePicker'
import OptionsMenu from './components/OptionsMenu'
import AdminPanel from './components/AdminPanel'
import MenuScreen from './screens/MenuScreen'
import { play } from './game/sound'
import { groupByTrack } from './game/tracks'
import { titleForXp } from './game/level'
import { totalXp } from './game/progress'

const ProblemScreen = lazy(() => import('./screens/ProblemScreen'))

interface ActiveProblem {
  id: string
  mode: Mode
}

/**
 * Plays the unlock sparkle when an accept unlocks the next problem in its
 * track: only on a first solve, only when a next problem exists, delayed
 * so it follows the accept jingle instead of stacking on it.
 */
function playUnlockSparkle(progress: PlayerProgress, problemId: string) {
  const track = groupByTrack(PROBLEMS).find((entry) =>
    entry.problems.some((problem) => problem.id === problemId),
  )
  if (!track) return
  const index = track.problems.findIndex((problem) => problem.id === problemId)
  const next = track.problems[index + 1]
  if (!next) return
  if (isSolved(progress, problemId) || isSolved(progress, next.id)) return
  setTimeout(() => play('unlock-sparkle'), 400)
}

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress())
  const [active, setActive] = useState<ActiveProblem | null>(null)
  const [failedSubmits, setFailedSubmits] = useState<Record<string, number>>({})
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const secretBuffer = useRef('')

  // The admin panel is a dev tool: hidden until the secret is typed. Keys
  // typed into inputs (editor, hex fields) never count toward the secret.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.key.length !== 1) return
      secretBuffer.current = (secretBuffer.current + event.key.toLowerCase()).slice(-16)
      if (secretBuffer.current.endsWith('iddqd')) {
        secretBuffer.current = ''
        setAdminUnlocked(true)
        setAdminOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const selected = active ? (PROBLEMS.find((p) => p.id === active.id) ?? null) : null
  const rank = titleForXp(totalXp(progress))

  return (
    <div className="min-h-screen bg-dos-bg font-dos text-dos-text">
      {selected && active ? (
        <Suspense fallback={<div className="p-8 text-dos-dim">LOADING...</div>}>
          <ProblemScreen
            key={`${active.id}:${active.mode}`}
            problem={selected}
            mode={active.mode}
            rank={rank}
            failedSubmits={failedSubmits[selected.id] ?? 0}
            onFailedSubmit={(id) =>
              setFailedSubmits((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
            }
            onAttempt={(id, mode) => setProgress((prev) => recordAttempt(prev, id, mode))}
            onAccepted={(id, accept) => {
              playUnlockSparkle(progress, id)
              setProgress((prev) => recordAccept(prev, id, accept))
            }}
            onResult={(id, result) => setProgress((prev) => recordResult(prev, id, result))}
            onSubmitted={(id, entry) => setProgress((prev) => recordSubmission(prev, id, entry))}
            submissions={progress.submissions?.[selected.id] ?? []}
            onBack={() => setActive(null)}
          />
        </Suspense>
      ) : (
        <>
          <div className="fixed right-4 top-3 z-50 flex items-start gap-2">
            <PalettePicker />
            <OptionsMenu progress={progress} onProgress={setProgress} />
          </div>
          <MenuScreen
            progress={progress}
            onStart={(id, mode) => setActive({ id, mode })}
          />
          <footer className="fixed bottom-3 right-4 text-xs text-dos-faint">
            BETA 1 - made by{" "}
            <a
              href="https://gabrielupcott.dev"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-dos-text"
            >
              Gabriel Upcott
            </a>{" "}
            - 2026
          </footer>
          {adminOpen && adminUnlocked && (
            <AdminPanel
              progress={progress}
              onProgress={setProgress}
              onResetFailedSubmits={() => setFailedSubmits({})}
            />
          )}
        </>
      )}
      {!active && adminUnlocked && (
        <button
          onClick={() => setAdminOpen((value) => !value)}
          className={`fixed bottom-3 left-4 z-50 border px-2 py-0.5 text-xs ${
            adminOpen
              ? 'border-dos-white text-dos-white'
              : 'border-dos-faint text-dos-faint hover:border-dos-text hover:text-dos-text'
          }`}
        >
          {adminOpen ? 'ADMIN CLOSE' : 'ADMIN'}
        </button>
      )}
    </div>
  )
}

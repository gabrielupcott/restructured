import { lazy, Suspense, useEffect, useState } from 'react'
import { PROBLEMS } from './content'
import {
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
import MenuScreen from './screens/MenuScreen'

const ProblemScreen = lazy(() => import('./screens/ProblemScreen'))

interface ActiveProblem {
  id: string
  mode: Mode
}

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress())
  const [active, setActive] = useState<ActiveProblem | null>(null)
  const [failedSubmits, setFailedSubmits] = useState<Record<string, number>>({})

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const selected = active ? (PROBLEMS.find((p) => p.id === active.id) ?? null) : null

  return (
    <div className="min-h-screen bg-dos-bg font-dos text-dos-text">
      {selected && active ? (
        <Suspense fallback={<div className="p-8 text-dos-dim">LOADING...</div>}>
          <ProblemScreen
            key={`${active.id}:${active.mode}`}
            problem={selected}
            mode={active.mode}
            failedSubmits={failedSubmits[selected.id] ?? 0}
            onFailedSubmit={(id) =>
              setFailedSubmits((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
            }
            onAttempt={(id, mode) => setProgress((prev) => recordAttempt(prev, id, mode))}
            onAccepted={(id, accept) => setProgress((prev) => recordAccept(prev, id, accept))}
            onResult={(id, result) => setProgress((prev) => recordResult(prev, id, result))}
            onSubmitted={(id, entry) => setProgress((prev) => recordSubmission(prev, id, entry))}
            submissions={progress.submissions?.[selected.id] ?? []}
            onBack={() => setActive(null)}
          />
        </Suspense>
      ) : (
        <>
          <div className="fixed right-4 top-3 z-50">
            <PalettePicker />
          </div>
          <MenuScreen
            progress={progress}
            onStart={(id, mode) => setActive({ id, mode })}
          />
          <footer className="fixed bottom-3 right-4 text-xs text-dos-faint">
            made by{" "}
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
        </>
      )}
    </div>
  )
}

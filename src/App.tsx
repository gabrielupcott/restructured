import { lazy, Suspense, useState } from 'react'
import { PROBLEMS } from './content'
import { formatClock } from './lib/format'

const ProblemScreen = lazy(() => import('./screens/ProblemScreen'))

function difficultyClass(difficulty: string): string {
  if (difficulty === 'easy') return 'text-dos-green group-hover:text-dos-bg'
  if (difficulty === 'medium') return 'text-dos-yellow group-hover:text-dos-bg'
  return 'text-dos-red group-hover:text-dos-bg'
}

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [failedSubmits, setFailedSubmits] = useState<Record<string, number>>({})

  const selected = PROBLEMS.find((problem) => problem.id === selectedId) ?? null

  return (
    <div className="min-h-screen bg-dos-bg font-dos text-dos-text">
      {selected ? (
        <Suspense fallback={<div className="p-8 text-dos-dim">LOADING...</div>}>
          <ProblemScreen
            key={selected.id}
            problem={selected}
            failedSubmits={failedSubmits[selected.id] ?? 0}
            onFailedSubmit={(id) =>
              setFailedSubmits((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
            }
            onBack={() => setSelectedId(null)}
          />
        </Suspense>
      ) : (
        <>
          <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center px-6 py-20">
          <h1 className="font-pixel text-5xl text-dos-white">RESTRUCTURED</h1>
          <p className="mt-3 text-xs text-dos-dim">ALPHA 1</p>
          <ul className="mt-16 w-full space-y-3">
            {PROBLEMS.map((problem) => (
              <li key={problem.id}>
                <button
                  onClick={() => setSelectedId(problem.id)}
                  className="group flex w-full flex-wrap items-center gap-3 border-2 border-dos-text px-4 py-3 text-left hover:bg-dos-text hover:text-dos-bg"
                >
                  <span className="text-xs text-dos-dim group-hover:text-dos-bg">
                    {problem.track.toUpperCase()}
                  </span>
                  <span className="text-lg tracking-widest">{problem.title}</span>
                  <span className={`text-xs ${difficultyClass(problem.difficulty)}`}>
                    {problem.difficulty.toUpperCase()}
                  </span>
                  <span className="ml-auto text-xs text-dos-dim group-hover:text-dos-bg">
                    PAR {formatClock(problem.parTimeSec)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </main>
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

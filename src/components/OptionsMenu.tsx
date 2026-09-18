import { useEffect, useRef, useState } from 'react'
import {
  emptyProgress,
  sanitizeProgress,
  STORAGE_KEY,
  todayLocal,
  type PlayerProgress,
} from '../game/progress'
import SoundToggle from './SoundToggle'

/**
 * Top-right options button with a collapsible panel: sound toggle and save
 * management. Export downloads the live save as a JSON file; import
 * validates a chosen file through the same sanitizer the loader uses;
 * clear memory wipes the save key after an in-menu confirmation.
 */
export default function OptionsMenu({
  progress,
  onProgress,
}: {
  progress: PlayerProgress
  onProgress(next: PlayerProgress): void
}) {
  const [open, setOpen] = useState(false)
  const [armed, setArmed] = useState(false)
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handleMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
        setArmed(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setArmed(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function exportSave() {
    const blob = new Blob([JSON.stringify(progress, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `restructured-save-${todayLocal()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setStatus('SAVE EXPORTED')
  }

  async function importSave(file: File) {
    try {
      const imported = sanitizeProgress(JSON.parse(await file.text()))
      onProgress(imported)
      setStatus('SAVE LOADED')
    } catch {
      setStatus('INVALID FILE')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  function clearMemory() {
    if (!armed) {
      setArmed(true)
      return
    }
    localStorage.removeItem(STORAGE_KEY)
    onProgress(emptyProgress())
    setArmed(false)
    setStatus('MEMORY CLEARED')
  }

  return (
    <div ref={rootRef} className="relative text-xs">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="options-panel"
        className={`border px-2 py-0.5 ${
          open
            ? 'border-dos-white text-dos-white'
            : 'border-dos-faint text-dos-dim hover:border-dos-text hover:text-dos-text'
        }`}
      >
        OPTIONS
      </button>
      {open && (
        <div
          id="options-panel"
          className="absolute right-0 top-full mt-1 flex w-56 flex-col gap-2 border border-dos-faint bg-dos-bg p-3"
        >
          <SoundToggle />
          <div className="border-t border-dos-faint" />
          <button
            onClick={exportSave}
            className="border border-dos-faint px-2 py-1 text-left text-dos-dim hover:border-dos-text hover:text-dos-text"
          >
            EXPORT SAVE
          </button>
          <label className="cursor-pointer border border-dos-faint px-2 py-1 text-dos-dim hover:border-dos-text hover:text-dos-text">
            IMPORT SAVE
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importSave(file)
              }}
              className="sr-only"
            />
          </label>
          <button
            onClick={clearMemory}
            className={
              armed
                ? 'border border-dos-red px-2 py-1 text-left text-dos-red hover:bg-dos-red hover:text-dos-bg'
                : 'border border-dos-faint px-2 py-1 text-left text-dos-dim hover:border-dos-text hover:text-dos-text'
            }
          >
            {armed ? 'CLEAR? SURE?' : 'CLEAR MEMORY'}
          </button>
          <p aria-live="polite" className="min-h-4 text-dos-faint">
            {status || '\u00a0'}
          </p>
        </div>
      )}
    </div>
  )
}

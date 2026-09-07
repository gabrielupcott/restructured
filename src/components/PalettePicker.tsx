import { useEffect, useRef, useState } from 'react'
import {
  applyPalette,
  isValidHex,
  loadPalette,
  normalizeHex,
  PRESETS,
  type Palette,
} from '../theme/palettes'

export default function PalettePicker() {
  const [active, setActive] = useState<Palette>(loadPalette)
  const [open, setOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(active.name === 'custom')
  const [bgDraft, setBgDraft] = useState(active.bg)
  const [textDraft, setTextDraft] = useState(active.text)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handleMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function choose(preset: Palette) {
    applyPalette(preset)
    setActive(preset)
    setCustomOpen(false)
  }

  function applyCustom() {
    if (!isValidHex(bgDraft) || !isValidHex(textDraft)) return
    const palette: Palette = {
      name: 'custom',
      bg: normalizeHex(bgDraft),
      text: normalizeHex(textDraft),
    }
    applyPalette(palette)
    setActive(palette)
  }

  const customValid = isValidHex(bgDraft) && isValidHex(textDraft)

  return (
    <div
      ref={rootRef}
      className="relative z-50 flex flex-col items-end text-xs text-dos-dim"
    >
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="palette picker"
        className={`border px-2 py-0.5 ${
          open
            ? 'border-dos-white text-dos-white'
            : 'border-dos-faint hover:border-dos-text hover:text-dos-text'
        }`}
      >
        PALETTE
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 flex flex-col items-end gap-2 border border-dos-faint bg-dos-bg p-2">
          <div className="flex items-center gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => choose(preset)}
                title={`${preset.name} palette`}
                aria-label={`${preset.name} palette`}
                className={`h-5 w-5 ${
                  active.name === preset.name
                    ? 'border border-dos-white'
                    : 'border border-transparent'
                }`}
                style={{ backgroundColor: preset.bg, boxShadow: `inset 0 0 0 2px ${preset.text}` }}
              />
            ))}
          </div>
          {customOpen ? (
            <div className="flex items-center gap-2">
              <input
                value={bgDraft}
                onChange={(event) => setBgDraft(event.target.value)}
                placeholder="#6e004c"
                maxLength={7}
                aria-label="background hex"
                className="w-20 border border-dos-faint bg-dos-bg px-1 py-0.5 font-dos text-dos-text"
              />
              <input
                value={textDraft}
                onChange={(event) => setTextDraft(event.target.value)}
                placeholder="#ff9ce7"
                maxLength={7}
                aria-label="text hex"
                className="w-20 border border-dos-faint bg-dos-bg px-1 py-0.5 font-dos text-dos-text"
              />
              <button
                onClick={applyCustom}
                disabled={!customValid}
                className="border border-dos-text px-2 py-0.5 text-dos-text hover:bg-dos-text hover:text-dos-bg disabled:cursor-not-allowed disabled:opacity-40"
              >
                APPLY
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCustomOpen(true)}
              className={`border px-2 py-0.5 ${
                active.name === 'custom'
                  ? 'border-dos-white text-dos-white'
                  : 'border-dos-faint hover:border-dos-text hover:text-dos-text'
              }`}
            >
              CUSTOM
            </button>
          )}
        </div>
      )}
    </div>
  )
}

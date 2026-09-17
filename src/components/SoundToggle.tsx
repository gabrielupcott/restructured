import { useEffect, useState } from 'react'
import { isMuted, onMuteChange, setMuted } from '../game/sound'

/** Header mute toggle for the synth; the setting persists across sessions. */
export default function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted)

  useEffect(() => onMuteChange(setMutedState), [])

  return (
    <button
      onClick={() => setMuted(!muted)}
      aria-pressed={!muted}
      aria-label={muted ? 'unmute sound' : 'mute sound'}
      className={
        muted
          ? 'border border-dos-faint px-2 py-0.5 text-xs text-dos-faint hover:border-dos-text hover:text-dos-text'
          : 'border border-dos-text px-2 py-0.5 text-xs text-dos-text'
      }
    >
      {muted ? 'SOUND OFF' : 'SOUND ON'}
    </button>
  )
}

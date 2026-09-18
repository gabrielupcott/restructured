import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import App from './App'

describe('App', () => {
  it('renders the title, the problem list, and the stats line', () => {
    const html = renderToString(<App />)
    expect(html).toContain('RESTRUCTURED')
    expect(html).toContain('BETA 1')
    expect(html).toContain('BEGINNER')
    expect(html).toContain('Two Sum')
    expect(html).toContain('Contains Duplicate')
    expect(html).toContain('05:00')
    expect(html).toContain('XP 0')
    expect(html).toContain('STREAK 0D')
    expect(html).toContain('gabrielupcott.dev')
  })

  it('locks later track problems on a fresh save', () => {
    const html = renderToString(<App />)
    // Two Pointers starts on the palindrome; the container stays locked.
    expect(html).toContain('Valid Palindrome')
    expect(html).toContain('LOCKED')
  })

  it('wires rail jumps, section anchors, and collapse toggles', () => {
    const html = renderToString(<App />)
    // Every track section carries its anchor id and a matching list id.
    expect(html).toContain('id="track-hash-maps"')
    expect(html).toContain('id="track-sliding-window"')
    expect(html).toContain('id="track-list-hash-maps"')
    // Each header has a collapse toggle, expanded on a fresh save.
    expect(html).toContain('aria-controls="track-list-hash-maps"')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('[-]')
    // Jump buttons label themselves for the rail and the header row.
    expect(html).toContain('Jump to Hash Maps')
  })

  it('renders hover peek lists with solved marks for every problem', () => {
    const html = renderToString(<App />)
    // Fresh save: nothing solved, so every peek row shows the empty box.
    expect(html).toContain('[ ]')
    expect(html).not.toContain('[x]')
  })

  it('renders the options trigger with the save panel closed', () => {
    const html = renderToString(<App />)
    expect(html).toContain('OPTIONS')
    expect(html).toContain('aria-expanded="false"')
    // The panel contents stay out of the closed markup.
    expect(html).not.toContain('EXPORT SAVE')
    expect(html).not.toContain('CLEAR MEMORY')
  })
})

import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import App from './App'

describe('App', () => {
  it('renders the title, the problem list, and the stats line', () => {
    const html = renderToString(<App />)
    expect(html).toContain('RESTRUCTURED')
    expect(html).toContain('ALPHA 3')
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
})

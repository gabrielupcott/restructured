import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import App from './App'

describe('App', () => {
  it('renders the title and the problem list', () => {
    const html = renderToString(<App />)
    expect(html).toContain('RESTRUCTURED')
    expect(html).toContain('Two Sum')
    expect(html).toContain('Contains Duplicate')
    expect(html).toContain('05:00')
    expect(html).toContain('gabrielupcott.dev')
  })
})

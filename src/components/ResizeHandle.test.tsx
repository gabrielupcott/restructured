import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import ResizeHandle from './ResizeHandle'

describe('ResizeHandle', () => {
  it('renders a labelled separator usable by pointer and keyboard', () => {
    const html = renderToString(
      <ResizeHandle axis="x" label="Resize editor" onResize={() => {}} className="w-1.5" />,
    )
    expect(html).toContain('role="separator"')
    expect(html).toContain('aria-label="Resize editor"')
    expect(html).toContain('aria-orientation="horizontal"')
    expect(html).toContain('tabindex="0"')
  })

  it('reports a vertical orientation on the y axis', () => {
    const html = renderToString(
      <ResizeHandle axis="y" label="Resize results" onResize={() => {}} className="h-1.5" />,
    )
    expect(html).toContain('aria-orientation="vertical"')
  })
})

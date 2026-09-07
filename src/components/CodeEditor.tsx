/**
 * Monaco editor with the DOS theme: blocky mono font stack,
 * 16-color palette, square chrome. Autocomplete is cut entirely.
 */
import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import type { LintDiagnostic } from '../execution/protocol'
import { loadPalette, mixHex, onPaletteChange, type Palette } from '../theme/palettes'

const monacoWindow = self as unknown as {
  MonacoEnvironment?: monaco.Environment
}
monacoWindow.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
}

/**
 * Builds the DOS editor theme from the active palette pair. Derived shades
 * (comments, line numbers, selection) mix the pair; fixed accent tints stay
 * readable on any dark canvas.
 */
function dosTheme(palette: Palette): monaco.editor.IStandaloneThemeData {
  const comment = mixHex(palette.text, palette.bg, 0.5).slice(1)
  const faint = mixHex(palette.text, palette.bg, 0.3).slice(1)
  return {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'ffffff' },
      { token: 'keyword', foreground: '9ce7ff' },
      { token: 'string', foreground: 'ffe79c' },
      { token: 'string.escape', foreground: 'ffc49c' },
      { token: 'number', foreground: 'd7b3ff' },
      { token: 'comment', foreground: comment },
      { token: 'type', foreground: '9cffc4' },
      { token: 'identifier', foreground: 'ffffff' },
      { token: 'delimiter', foreground: palette.text.slice(1) },
    ],
    colors: {
      'editor.background': palette.bg,
      'editor.foreground': '#ffffff',
      'editorLineNumber.foreground': faint,
      'editorLineNumber.activeForeground': palette.text,
      'editor.selectionBackground': mixHex(palette.bg, palette.text, 0.2),
      'editor.inactiveSelectionBackground': mixHex(palette.bg, palette.text, 0.12),
      'editor.lineHighlightBackground': mixHex(palette.bg, palette.text, 0.08),
      'editorCursor.foreground': palette.text,
      'editorIndentGuide.background1': mixHex(palette.bg, palette.text, 0.15),
      'editorWidget.background': palette.bg,
      'editorWidget.border': comment,
    },
  }
}

function applyEditorTheme(palette: Palette) {
  monaco.editor.defineTheme('dos', dosTheme(palette))
  monaco.editor.setTheme('dos')
}

applyEditorTheme(loadPalette())
onPaletteChange(applyEditorTheme)

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  diagnostics: LintDiagnostic[]
}

export default function CodeEditor({ value, onChange, diagnostics }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const editor = monaco.editor.create(host, {
      value,
      language: 'python',
      theme: 'dos',
      fontFamily: "'IBM Plex Mono', Consolas, Menlo, 'Courier New', monospace",
      fontSize: 15,
      tabSize: 4,
      insertSpaces: true,
      lineNumbers: 'on',
      minimap: { enabled: false },
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      parameterHints: { enabled: false },
      acceptSuggestionOnEnter: 'off',
      wordBasedSuggestions: 'off',
      occurrencesHighlight: 'off',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      stickyScroll: { enabled: false },
      padding: { top: 12, bottom: 12 },
    })
    editor.onDidChangeModelContent(() => onChangeRef.current(editor.getValue()))
    editorRef.current = editor
    return () => {
      editor.dispose()
      editorRef.current = null
    }
    // The editor is created once; `value` flows in through the sync effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.getValue() !== value) {
      editor.setValue(value)
    }
  }, [value])

  useEffect(() => {
    const model = editorRef.current?.getModel()
    if (!model) return
    monaco.editor.setModelMarkers(
      model,
      'pyflakes',
      diagnostics.map((diagnostic) => ({
        startLineNumber: diagnostic.line,
        endLineNumber: diagnostic.line,
        startColumn: Math.max(1, diagnostic.column),
        endColumn: Math.max(1, diagnostic.column) + 1,
        message: diagnostic.message,
        severity:
          diagnostic.severity === 'error'
            ? monaco.MarkerSeverity.Error
            : monaco.MarkerSeverity.Warning,
        source: 'pyflakes',
      })),
    )
  }, [diagnostics])

  return <div ref={hostRef} className="h-full w-full" />
}

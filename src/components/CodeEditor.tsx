/**
 * Monaco editor with the DOS theme: blocky mono font stack,
 * 16-color palette, square chrome. Autocomplete is cut entirely.
 */
import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'

const monacoWindow = self as unknown as {
  MonacoEnvironment?: monaco.Environment
}
monacoWindow.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
}

monaco.editor.defineTheme('dos', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'ffffff' },
    { token: 'keyword', foreground: '9ce7ff' },
    { token: 'string', foreground: 'ffe79c' },
    { token: 'string.escape', foreground: 'ffc49c' },
    { token: 'number', foreground: 'd7b3ff' },
    { token: 'comment', foreground: 'b36b9c' },
    { token: 'type', foreground: '9cffc4' },
    { token: 'identifier', foreground: 'ffffff' },
    { token: 'delimiter', foreground: 'ff9ce7' },
  ],
  colors: {
    // Keep these in sync with the active palette in global.css
    // (currently magenta: bg #6e004c, text #ff9ce7).
    'editor.background': '#6e004c',
    'editor.foreground': '#ffffff',
    'editorLineNumber.foreground': '#b36b9c',
    'editorLineNumber.activeForeground': '#ff9ce7',
    'editor.selectionBackground': '#a62978',
    'editor.inactiveSelectionBackground': '#86145f',
    'editor.lineHighlightBackground': '#7e1060',
    'editorCursor.foreground': '#ff9ce7',
    'editorIndentGuide.background1': '#8a2368',
    'editorWidget.background': '#6e004c',
    'editorWidget.border': '#b36b9c',
  },
})

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
}

export default function CodeEditor({ value, onChange }: CodeEditorProps) {
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

  return <div ref={hostRef} className="h-full w-full" />
}

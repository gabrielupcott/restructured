import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { applyPalette, loadPalette } from './theme/palettes'
import App from './App'

// Apply the stored palette before first paint so there is no flash of the
// default colors.
applyPalette(loadPalette())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

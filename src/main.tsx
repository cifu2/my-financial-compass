import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installGlobalErrorHandlers } from './lib/errorReporting.ts'

// Catch errors that escape React's render/lifecycle clock so they are logged
// (and eventually shipped to Sentry) instead of silently dying.
installGlobalErrorHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

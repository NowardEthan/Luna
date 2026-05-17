import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { LunaWorkspaceProvider } from './context/LunaWorkspaceContext'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LunaWorkspaceProvider>
      <App />
    </LunaWorkspaceProvider>
  </StrictMode>,
)

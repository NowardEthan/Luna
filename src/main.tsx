import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'

if (typeof window !== 'undefined' && window.electron) {
  document.documentElement.classList.add('luna-electron')
}

// Dev helper: expõe cloudSyncService em window pra debug via DevTools.
// Só carrega em dev (import.meta.env.DEV). Em prod é tree-shaken.
if (import.meta.env.DEV) {
  void Promise.all([
    import('./features/sync/cloudSyncService'),
    import('./features/sync/cloudSyncMigration'),
    import('./lib/firebase/client'),
    import('./lib/firebase/googleSignIn'),
  ]).then(([svc, mig, fb, gs]) => {
    ;(window as unknown as {
      cs?: typeof svc.cloudSyncService
      cms?: typeof mig
      fb?: typeof fb
      gs?: typeof gs
    }).cs = svc.cloudSyncService
    ;(window as unknown as { cms?: typeof mig }).cms = mig
    ;(window as unknown as { fb?: typeof fb }).fb = fb
    ;(window as unknown as { gs?: typeof gs }).gs = gs
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

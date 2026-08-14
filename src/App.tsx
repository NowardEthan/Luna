import { AppProviders } from './shell/AppProviders'
import { AppShell } from './shell/AppShell'
import { AuthGate } from './features/auth/AuthGate'

export default function App() {
  return (
    <AppProviders>
      <AuthGate app={<AppShell />} />
    </AppProviders>
  )
}

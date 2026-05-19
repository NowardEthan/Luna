/**
 * OAuth Google no Electron (janela modal). Evita loop: nunca repetir redirect
 * se já voltámos do Google ou se há tentativa pendente.
 */
import {
  browserLocalPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithRedirect,
  type Auth,
  type User,
} from 'firebase/auth'
import { getLunaAuth } from './lib/firebase/client'

const OAUTH_PENDING_KEY = 'luna.oauth.pending'

function setStatus(message: string) {
  const el = document.getElementById('oauth-status')
  if (el) el.textContent = message
}

function notify(result: { ok: boolean; error?: string; cancelled?: boolean }) {
  window.electron?.oauthComplete?.(result)
}

function hasFirebaseRedirectParams(): boolean {
  const { search, hash } = window.location
  return (
    search.includes('apiKey=') ||
    search.includes('authType=') ||
    search.includes('providerId=') ||
    hash.includes('access_token=') ||
    hash.includes('id_token=')
  )
}

function clearOAuthUrlParams() {
  const path = window.location.pathname
  if (window.location.search || window.location.hash) {
    window.history.replaceState({}, '', path)
  }
}

function waitForSignedInUser(auth: Auth, timeoutMs: number): Promise<User | null> {
  return new Promise((resolve) => {
    const existing = auth.currentUser
    if (existing && !existing.isAnonymous) {
      resolve(existing)
      return
    }

    const timer = window.setTimeout(() => {
      unsub()
      const u = auth.currentUser
      resolve(u && !u.isAnonymous ? u : null)
    }, timeoutMs)

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) {
        window.clearTimeout(timer)
        unsub()
        resolve(user)
      }
    })
  })
}

async function run() {
  const auth = getLunaAuth()
  if (!auth) {
    setStatus('Firebase não configurado.')
    notify({ ok: false, error: 'Firebase não configurado.' })
    return
  }

  try {
    await setPersistence(auth, browserLocalPersistence)

    const pending = await getRedirectResult(auth)
    if (pending?.user) {
      sessionStorage.removeItem(OAUTH_PENDING_KEY)
      clearOAuthUrlParams()
      notify({ ok: true })
      return
    }

    const returning =
      hasFirebaseRedirectParams() ||
      sessionStorage.getItem(OAUTH_PENDING_KEY) === '1'

    if (returning) {
      setStatus('A concluir sessão…')
      const user = await waitForSignedInUser(auth, 20_000)
      sessionStorage.removeItem(OAUTH_PENDING_KEY)
      clearOAuthUrlParams()

      if (user) {
        notify({ ok: true })
        return
      }

      setStatus('Não foi possível concluir o login.')
      notify({
        ok: false,
        error:
          'O Google voltou mas a sessão não ficou activa. Em Firebase Console → Authentication → domínios autorizados, confirma 127.0.0.1.',
      })
      return
    }

    sessionStorage.setItem(OAUTH_PENDING_KEY, '1')
    setStatus('A redirecionar para o Google…')
    await signInWithRedirect(auth, new GoogleAuthProvider())
  } catch (err) {
    sessionStorage.removeItem(OAUTH_PENDING_KEY)
    const message =
      err instanceof Error ? err.message : 'Não foi possível iniciar sessão.'
    setStatus(message)
    notify({ ok: false, error: message })
  }
}

void run()

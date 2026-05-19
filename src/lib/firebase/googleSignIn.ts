import type { Auth } from 'firebase/auth'
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth'

function firebaseAuthCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code: string }).code)
  }
  return ''
}

function currentHost(): string {
  if (typeof window === 'undefined') return ''
  return window.location.hostname
}

/** Redirect OAuth instável em 127.0.0.1; Electron usa browser do sistema. */
export function prefersGoogleRedirect(): boolean {
  if (typeof window === 'undefined') return false
  if (window.electron) return false
  const host = currentHost()
  if (host === '127.0.0.1' || host === 'localhost') return false
  return false
}

type ElectronGoogleResult =
  | { ok: true; idToken: string; accessToken?: string }
  | { ok: false; error?: string; cancelled?: boolean }

/**
 * Electron: OAuth no Chrome/Edge do sistema → signInWithCredential (projeto Luna).
 */
async function signInWithElectronBrowser(auth: Auth): Promise<'popup'> {
  const invoke = window.electron?.googleSignIn
  if (!invoke) {
    throw new Error('Login Google indisponível no Electron.')
  }

  const result = (await invoke()) as ElectronGoogleResult

  if (!result.ok || !result.idToken) {
    if (result.cancelled) {
      const err = new Error('Login cancelado.') as Error & { code?: string }
      err.code = 'auth/popup-closed-by-user'
      throw err
    }
    throw new Error(result.error || 'Não foi possível iniciar sessão.')
  }

  const credential = GoogleAuthProvider.credential(
    result.idToken,
    result.accessToken,
  )
  await signInWithCredential(auth, credential)
  return 'popup'
}

/** Completa login após redirect no browser (não Electron). */
export async function completeGoogleRedirectIfPending(
  auth: Auth,
): Promise<boolean> {
  if (window.electron) return false
  try {
    const result = await getRedirectResult(auth)
    return Boolean(result?.user)
  } catch (err) {
    console.warn('[Luna] Resultado redirect Google:', err)
    return false
  }
}

export async function startGoogleSignIn(
  auth: Auth,
): Promise<'popup' | 'redirect'> {
  if (window.electron?.googleSignIn) {
    return signInWithElectronBrowser(auth)
  }

  const provider = new GoogleAuthProvider()

  if (prefersGoogleRedirect()) {
    await signInWithRedirect(auth, provider)
    return 'redirect'
  }

  try {
    await signInWithPopup(auth, provider)
    return 'popup'
  } catch (err) {
    const code = firebaseAuthCode(err)
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      if (prefersGoogleRedirect()) {
        await signInWithRedirect(auth, provider)
        return 'redirect'
      }
    }
    throw err
  }
}

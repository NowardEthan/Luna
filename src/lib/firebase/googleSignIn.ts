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

/** Resposta New App (`ok`) ou Luna legado (`success`). */
function normalizeElectronOAuth(raw: unknown): ElectronGoogleResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Resposta OAuth inválida.' }
  }
  const r = raw as Record<string, unknown>
  if (r.ok === true && typeof r.idToken === 'string') {
    return {
      ok: true,
      idToken: r.idToken,
      accessToken:
        typeof r.accessToken === 'string' ? r.accessToken : undefined,
    }
  }
  if (r.success === true && typeof r.idToken === 'string') {
    return {
      ok: true,
      idToken: r.idToken,
      accessToken:
        typeof r.accessToken === 'string' ? r.accessToken : undefined,
    }
  }
  return {
    ok: false,
    error: String(r.error || 'Não foi possível iniciar sessão.'),
    cancelled: Boolean(r.cancelled),
  }
}

/**
 * Electron: OAuth no browser do sistema → signInWithCredential (projeto Luna).
 */
async function signInWithElectronBrowser(auth: Auth): Promise<'popup'> {
  const invoke =
    window.electron?.googleSignIn ??
    (typeof window.electronAPI?.startGoogleLogin === 'function'
      ? window.electronAPI.startGoogleLogin
      : null)

  if (!invoke) {
    throw new Error('Login Google indisponível no Electron.')
  }

  const result = normalizeElectronOAuth(await invoke())

  if (!result.ok || !result.idToken) {
    if (!result.ok && result.cancelled) {
      const err = new Error('Login cancelado.') as Error & { code?: string }
      err.code = 'auth/popup-closed-by-user'
      throw err
    }
    throw new Error(!result.ok ? result.error || 'Não foi possível iniciar sessão.' : 'Não foi possível iniciar sessão.')
  }

  const credential = GoogleAuthProvider.credential(
    result.idToken,
    result.accessToken ?? null,
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
  if (
    window.electron?.googleSignIn ||
    typeof window.electronAPI?.startGoogleLogin === 'function'
  ) {
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

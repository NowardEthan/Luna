import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, signInAnonymously, signOut, type User } from 'firebase/auth'
import { eventBus } from '../../core/events/EventBus'
import {
  DEFAULT_LUNA_ENTITLEMENTS,
  parseEntitlements,
  type LunaEntitlements,
} from '../../lib/firebase/entitlements'
import { getLunaAuth, isFirebaseConfigured } from '../../lib/firebase'
import {
  completeGoogleRedirectIfPending,
  startGoogleSignIn,
} from '../../lib/firebase/googleSignIn'
import { ensureUserProfile } from '../../lib/firebase/userProfile'
import {
  isRealLunarUser,
  readUsageMode,
  writeUsageMode,
  type LunaUsageMode,
} from '../../lib/lunarAccount'
import { registerLunarTokenGetter } from '../../lib/lunarAuthHeaders'
import { readLunaCloudConfig } from '../../lib/lunaCloud'

export type LunaAuthContextValue = {
  configured: boolean
  loading: boolean
  user: User | null
  idToken: string | null
  usageMode: LunaUsageMode
  isLunarConnected: boolean
  entitlements: LunaEntitlements
  error: string | null
  gateOpen: boolean
  openGate: () => void
  closeGate: () => void
  signInWithGoogle: () => Promise<void>
  googleSignInBusy: boolean
  signInAnonymouslyDev: () => Promise<void>
  signOut: () => Promise<void>
  continueOffline: () => void
  setUsageModeCloud: () => void
  getIdToken: () => Promise<string | null>
  anonAuthAllowed: boolean
}

const LunaAuthContext = createContext<LunaAuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured()
  const cloud = useMemo(() => readLunaCloudConfig(), [])
  const [user, setUser] = useState<User | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [usageMode, setUsageMode] = useState<LunaUsageMode>(readUsageMode)
  const [entitlements, setEntitlements] = useState<LunaEntitlements>(
    DEFAULT_LUNA_ENTITLEMENTS,
  )
  const [loading, setLoading] = useState(configured)
  const [error, setError] = useState<string | null>(null)
  const [gateOpen, setGateOpen] = useState(false)
  const [googleSignInBusy, setGoogleSignInBusy] = useState(false)

  const isLunarConnected =
    usageMode === 'cloud' && isRealLunarUser(user)

  const refreshToken = useCallback(async (u: User | null) => {
    if (!u || u.isAnonymous) {
      setIdToken(null)
      return null
    }
    try {
      const t = await u.getIdToken()
      setIdToken(t)
      return t
    } catch {
      setIdToken(null)
      return null
    }
  }, [])

  useEffect(() => {
    const getter = async () => {
      if (!user || user.isAnonymous || usageMode === 'offline') return null
      return user.getIdToken()
    }
    return registerLunarTokenGetter(getter)
  }, [user, usageMode])

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }

    const auth = getLunaAuth()
    if (!auth) {
      setLoading(false)
      return
    }

    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next)
      setLoading(false)
      void refreshToken(next)
      if (next && !next.isAnonymous) {
        writeUsageMode('cloud')
        setUsageMode('cloud')
        void ensureUserProfile(next)
          .then((profile) => {
            if (profile?.entitlements) {
              setEntitlements(parseEntitlements(profile.entitlements))
            }
          })
          .catch((err) => {
            console.warn('[Luna] Perfil Firestore:', err)
          })
        eventBus.emit('auth:signed-in', {
          uid: next.uid,
          email: next.email,
          isAnonymous: next.isAnonymous,
        })
      } else {
        eventBus.emit('auth:signed-out', {})
      }
    })

    return unsub
  }, [configured, refreshToken])

  useEffect(() => {
    const unsubs = [
      eventBus.on('lunar:auth-required', () => setGateOpen(true)),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  useEffect(() => {
    if (!configured) return
    const auth = getLunaAuth()
    if (!auth) return
    void completeGoogleRedirectIfPending(auth).then((signedIn) => {
      if (signedIn) setGateOpen(false)
    })
  }, [configured])

  const signInWithGoogle = useCallback(async () => {
    if (googleSignInBusy) return
    setError(null)
    const auth = getLunaAuth()
    if (!auth) {
      setError('Firebase não está configurado.')
      return
    }
    setGoogleSignInBusy(true)
    try {
      writeUsageMode('cloud')
      setUsageMode('cloud')
      const mode = await startGoogleSignIn(auth)
      if (mode === 'popup') setGateOpen(false)
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : ''
      if (code === 'auth/popup-closed-by-user') {
        setError('Login cancelado.')
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível iniciar sessão.',
        )
      }
    } finally {
      setGoogleSignInBusy(false)
    }
  }, [googleSignInBusy])

  const signInAnonymouslyDev = useCallback(async () => {
    if (!cloud.anonAuthEnabled) {
      setError('Auth anónima desactivada (VITE_LUNA_CLOUD_ANON).')
      return
    }
    setError(null)
    const auth = getLunaAuth()
    if (!auth) {
      setError('Firebase não está configurado.')
      return
    }
    try {
      await signInAnonymously(auth)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível iniciar sessão.',
      )
    }
  }, [cloud.anonAuthEnabled])

  const signOutUser = useCallback(async () => {
    setError(null)
    const auth = getLunaAuth()
    if (!auth) return
    try {
      await signOut(auth)
      setIdToken(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível terminar sessão.',
      )
    }
  }, [])

  const continueOffline = useCallback(() => {
    writeUsageMode('offline')
    setUsageMode('offline')
    setGateOpen(false)
    void signOutUser()
  }, [signOutUser])

  const setUsageModeCloud = useCallback(() => {
    writeUsageMode('cloud')
    setUsageMode('cloud')
  }, [])

  const getIdToken = useCallback(async () => {
    if (!user || user.isAnonymous || usageMode === 'offline') return null
    return user.getIdToken()
  }, [user, usageMode])

  const value = useMemo<LunaAuthContextValue>(
    () => ({
      configured,
      loading,
      user,
      idToken,
      usageMode,
      isLunarConnected,
      entitlements,
      error,
      gateOpen,
      openGate: () => setGateOpen(true),
      closeGate: () => setGateOpen(false),
      signInWithGoogle,
      googleSignInBusy,
      signInAnonymouslyDev,
      signOut: signOutUser,
      continueOffline,
      setUsageModeCloud,
      getIdToken,
      anonAuthAllowed: cloud.anonAuthEnabled && import.meta.env.DEV,
    }),
    [
      configured,
      loading,
      user,
      idToken,
      usageMode,
      isLunarConnected,
      entitlements,
      error,
      gateOpen,
      signInWithGoogle,
      googleSignInBusy,
      signInAnonymouslyDev,
      signOutUser,
      continueOffline,
      setUsageModeCloud,
      getIdToken,
      cloud.anonAuthEnabled,
    ],
  )

  return (
    <LunaAuthContext.Provider value={value}>{children}</LunaAuthContext.Provider>
  )
}

export function useLunaAuth(): LunaAuthContextValue {
  const ctx = useContext(LunaAuthContext)
  if (!ctx) {
    throw new Error('useLunaAuth deve ser usado dentro de AuthProvider')
  }
  return ctx
}

export function useLunaAuthOptional(): LunaAuthContextValue | null {
  return useContext(LunaAuthContext)
}

/** @deprecated Alias — usar useLunaAuth */
export const useLunarAccount = useLunaAuth

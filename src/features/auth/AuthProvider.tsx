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
import { doc, onSnapshot } from 'firebase/firestore'
import { eventBus } from '../../core/events/EventBus'
import {
  DEFAULT_LUNA_ENTITLEMENTS,
  parseEntitlements,
  parsePlanId,
  type LunaEntitlements,
  type LunaPlanId,
} from '../../lib/firebase/entitlements'
import { getLunaFirestore } from '../../lib/firebase/client'
import { userDoc } from '../../lib/firebase/paths'
import type { LunaBillingState } from '../../lib/firebase/types'
import { parseBilling } from '../billing/parseBilling'
import { setCachedLunarPlan, resetCachedLunarPlan } from '../../lib/lunarPlanCache'
import { getLunaAuth, isFirebaseConfigured } from '../../lib/firebase'
import {
  completeGoogleRedirectIfPending,
  startGoogleSignIn,
} from '../../lib/firebase/googleSignIn'
import {
  ensureUserProfile,
  fetchUserProfileFromServer,
} from '../../lib/firebase/userProfile'
import { syncAsaasBilling, syncTrialBilling } from '../billing/billingApi'
import {
  isRealLunarUser,
  readUsageMode,
  writeUsageMode,
  type LunaUsageMode,
} from '../../lib/lunarAccount'
import { registerLunarTokenGetter } from '../../lib/lunarAuthHeaders'
import { readLunaCloudConfig } from '../../lib/lunaCloud'
import i18n from '../../i18n'

export type LunaAuthContextValue = {
  configured: boolean
  loading: boolean
  user: User | null
  idToken: string | null
  usageMode: LunaUsageMode
  isLunarConnected: boolean
  entitlements: LunaEntitlements
  plan: LunaPlanId
  billing: LunaBillingState | null
  billingOverdue: boolean
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
  /** Recarrega plano/billing do servidor (Asaas + Firestore). */
  refreshAccount: () => Promise<void>
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
  const [plan, setPlan] = useState<LunaPlanId>('free')
  const [billing, setBilling] = useState<LunaBillingState | null>(null)
  const [loading, setLoading] = useState(configured)
  const [error, setError] = useState<string | null>(null)
  const [gateOpen, setGateOpen] = useState(false)
  const [googleSignInBusy, setGoogleSignInBusy] = useState(false)

  const isLunarConnected =
    usageMode === 'cloud' && isRealLunarUser(user)

  const applyUserProfile = useCallback(
    (profile: {
      plan?: unknown
      entitlements?: unknown
      billing?: unknown
    } | null | undefined) => {
      if (!profile) return
      const nextPlan = parsePlanId(profile.plan)
      setPlan(nextPlan)
      setCachedLunarPlan(nextPlan)
      if (profile.entitlements) {
        setEntitlements(parseEntitlements(profile.entitlements))
      }
      setBilling(parseBilling(profile.billing))
    },
    [],
  )

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
        void ensureUserProfile(next).then((profile) => {
          applyUserProfile(profile)
        })
          .catch((err) => {
            console.warn('[Luna] Perfil Firestore:', err)
            const msg =
              err instanceof Error
                ? err.message
                : i18n.t('lunarAccount.error.profileSave')
            if (msg.includes('insufficient permissions')) {
              setError(i18n.t('lunarAccount.error.firestoreDenied'))
            }
          })
        eventBus.emit('auth:signed-in', {
          uid: next.uid,
          email: next.email,
          isAnonymous: next.isAnonymous,
        })
      } else {
        setPlan('free')
        setBilling(null)
        resetCachedLunarPlan()
        eventBus.emit('auth:signed-out', {})
      }
    })

    return unsub
  }, [configured, refreshToken, applyUserProfile])

  const refreshAccount = useCallback(async () => {
    const uid = user?.uid
    if (!uid || user?.isAnonymous || !configured) return
    try {
      await syncTrialBilling()
    } catch {
      /* trial opcional */
    }
    try {
      await syncAsaasBilling()
    } catch {
      /* reconciliação opcional */
    }
    try {
      const profile = await fetchUserProfileFromServer(uid)
      applyUserProfile(profile)
    } catch (err) {
      console.warn('[Luna] refreshAccount:', err)
    }
  }, [user?.uid, user?.isAnonymous, configured, applyUserProfile])

  useEffect(() => {
    const uid = user?.uid
    if (!uid || user.isAnonymous || !configured) {
      return
    }
    const db = getLunaFirestore()
    if (!db) return

    const unsub = onSnapshot(
      doc(db, userDoc(uid)),
      (snap) => {
        if (!snap.exists()) return
        applyUserProfile(snap.data())
      },
      (err) => {
        console.warn('[Luna] user onSnapshot:', err)
      },
    )
    return unsub
  }, [user?.uid, user?.isAnonymous, configured, applyUserProfile])

  useEffect(() => {
    if (!user?.uid || user.isAnonymous || !configured) return

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void refreshAccount()
    }

    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user?.uid, user?.isAnonymous, configured, refreshAccount])

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
      setError(i18n.t('lunarAccount.error.firebaseNotConfigured'))
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
        setError(i18n.t('lunarAccount.error.loginCancelled'))
      } else {
        setError(
          err instanceof Error
            ? err.message
            : i18n.t('lunarAccount.error.signInFailed'),
        )
      }
    } finally {
      setGoogleSignInBusy(false)
    }
  }, [googleSignInBusy])

  const signInAnonymouslyDev = useCallback(async () => {
    if (!cloud.anonAuthEnabled) {
      setError(i18n.t('lunarAccount.error.anonDisabled'))
      return
    }
    setError(null)
    const auth = getLunaAuth()
    if (!auth) {
      setError(i18n.t('lunarAccount.error.firebaseNotConfigured'))
      return
    }
    try {
      await signInAnonymously(auth)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : i18n.t('lunarAccount.error.signInFailed'),
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
        err instanceof Error
          ? err.message
          : i18n.t('lunarAccount.error.signOutFailed'),
      )
    }
  }, [])

  const continueOffline = useCallback(() => {
    writeUsageMode('offline')
    setUsageMode('offline')
    eventBus.emit('lunar:usage-mode-changed', { mode: 'offline' })
    setGateOpen(false)
    void signOutUser()
  }, [signOutUser])

  const setUsageModeCloud = useCallback(() => {
    writeUsageMode('cloud')
    setUsageMode('cloud')
    eventBus.emit('lunar:usage-mode-changed', { mode: 'cloud' })
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
      plan,
      billing,
      billingOverdue: billing?.status === 'overdue',
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
      refreshAccount,
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
      plan,
      billing,
      error,
      gateOpen,
      signInWithGoogle,
      googleSignInBusy,
      signInAnonymouslyDev,
      signOutUser,
      continueOffline,
      setUsageModeCloud,
      getIdToken,
      refreshAccount,
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

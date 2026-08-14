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
  apagarConta as aurasigninApagarConta,
  AuthError as AuraAuthError,
  criarContaAura,
  entrarComAura,
  enviarResetSenha,
} from '../../lib/firebase/aurasignin'
import {
  ensureUserProfile,
  fetchUserProfileFromServer,
} from '../../lib/firebase/userProfile'
import { syncAsaasBilling, syncTrialBilling } from '../billing/billingApi'
import { isRealLunarUser } from '../../lib/lunarAccount'
import { registerLunarTokenGetter } from '../../lib/lunarAuthHeaders'
import { readLunaCloudConfig } from '../../lib/lunaCloud'
import i18n from '../../i18n'

export type LunaAuthContextValue = {
  configured: boolean
  loading: boolean
  user: User | null
  idToken: string | null
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
  /** Conta Aura (email/senha) — espelho do orbit. */
  signInWithAura: (email: string, password: string) => Promise<void>
  createAccountAura: (nome: string, email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  deleteAccount: () => Promise<void>
  auraBusy: boolean
  /** Reseta flags de busy (spinner preso). Use quando o gate monta. */
  resetAuthBusy: () => void
  signInAnonymouslyDev: () => Promise<void>
  signOut: () => Promise<void>
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
  const [entitlements, setEntitlements] = useState<LunaEntitlements>(
    DEFAULT_LUNA_ENTITLEMENTS,
  )
  const [plan, setPlan] = useState<LunaPlanId>('free')
  const [billing, setBilling] = useState<LunaBillingState | null>(null)
  const [loading, setLoading] = useState(configured)
  const [error, setError] = useState<string | null>(null)
  const [gateOpen, setGateOpen] = useState(false)
  const [googleSignInBusy, setGoogleSignInBusy] = useState(false)
  const [auraBusy, setAuraBusy] = useState(false)

  const isLunarConnected = isRealLunarUser(user)

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
      if (!user || user.isAnonymous) return null
      return user.getIdToken()
    }
    return registerLunarTokenGetter(getter)
  }, [user])

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

  const signInWithAura = useCallback(async (email: string, password: string) => {
    if (auraBusy) return
    setError(null)
    setAuraBusy(true)
    try {
      await entrarComAura(email, password)
      setGateOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setAuraBusy(false)
    }
  }, [auraBusy])

  const createAccountAura = useCallback(
    async (nome: string, email: string, password: string) => {
      if (auraBusy) return
      setError(null)
      setAuraBusy(true)
      try {
        await criarContaAura(nome, email, password)
        setGateOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.')
      } finally {
        setAuraBusy(false)
      }
    },
    [auraBusy],
  )

  const resetPassword = useCallback(async (email: string) => {
    setError(null)
    setAuraBusy(true)
    try {
      await enviarResetSenha(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o email.')
      throw err
    } finally {
      setAuraBusy(false)
    }
  }, [])

  const deleteAccount = useCallback(async () => {
    if (!user || user.isAnonymous) return
    setError(null)
    setAuraBusy(true)
    try {
      await aurasigninApagarConta()
      // onAuthStateChanged vai disparar → user fica null → gate força login
    } catch (err) {
      if (err instanceof AuraAuthError) {
        setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Não foi possível apagar a conta.')
      }
      throw err
    } finally {
      setAuraBusy(false)
    }
  }, [user])

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

  /** Reseta busy flags — limpa spinner preso de promise pendurada. */
  const resetAuthBusy = useCallback(() => {
    setAuraBusy(false)
    setGoogleSignInBusy(false)
    setError(null)
  }, [])

  const signOutUser = useCallback(async () => {
    setError(null)
    setAuraBusy(false)
    setGoogleSignInBusy(false)
    const auth = getLunaAuth()
    if (!auth) return
    try {
      await signOut(auth)
      setIdToken(null)
      // Recarrega a janela — tela de login fullscreen assume no boot.
      // Em Electron isso preserva o frame e a conexão nativa.
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : i18n.t('lunarAccount.error.signOutFailed'),
      )
    }
  }, [])

  const getIdToken = useCallback(async () => {
    if (!user || user.isAnonymous) return null
    return user.getIdToken()
  }, [user])

  const value = useMemo<LunaAuthContextValue>(
    () => ({
      configured,
      loading,
      user,
      idToken,
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
      signInWithAura,
      createAccountAura,
      resetPassword,
      deleteAccount,
      auraBusy,
      resetAuthBusy,
      signInAnonymouslyDev,
      signOut: signOutUser,
      getIdToken,
      refreshAccount,
      anonAuthAllowed: cloud.anonAuthEnabled && import.meta.env.DEV,
    }),
    [
      configured,
      loading,
      user,
      idToken,
      isLunarConnected,
      entitlements,
      plan,
      billing,
      error,
      gateOpen,
      signInWithGoogle,
      googleSignInBusy,
      signInWithAura,
      createAccountAura,
      resetPassword,
      deleteAccount,
      auraBusy,
      resetAuthBusy,
      signInAnonymouslyDev,
      signOutUser,
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

/**
 * Conta Aura — autenticação por email/senha (espelho do orbit/src/services/auth.ts).
 *
 * Diferente do Google OAuth (que vive em googleSignIn.ts), aqui cuidamos de:
 *   - entrarComAura(email, password)
 *   - criarContaAura(nome, email, password)
 *   - enviarResetSenha(email)
 *   - apagarConta()
 *
 * Todos reusam:
 *   - getLunaAuth() / getLunaFirestore()  → singletons lazy do legacy
 *   - userDoc(uid)                          → helper de path
 *   - ensureUserProfile(user)               → já cuida de plan/entitlements/createdAt
 *
 * Importante: este módulo NÃO toca em `usageMode` — AuthProvider não usa mais.
 */
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
  type User,
} from 'firebase/auth'
import { deleteDoc, doc } from 'firebase/firestore'
import { getLunaAuth, getLunaFirestore } from './client'
import { ensureUserProfile } from './userProfile'
import { userDoc } from './paths'

// ─── Login Aura (email/senha) ──────────────────────────────────────
export async function entrarComAura(
  email: string,
  password: string,
): Promise<User> {
  email = email.trim()
  const err = validateEmail(email)
  if (err) throw new AuthError(err)
  if (validatePassword(password, false)) {
    throw new AuthError(validatePassword(password, false)!)
  }

  const auth = getLunaAuth()
  if (!auth) throw new AuthError('Firebase Auth não configurado.')

  const cred = await signInWithEmailAndPassword(auth, email, password)
  await ensureUserProfile(cred.user)
  return cred.user
}

// ─── Criar Conta Aura ───────────────────────────────────────────────
export async function criarContaAura(
  nome: string,
  email: string,
  password: string,
): Promise<User> {
  nome = nome.trim()
  if (nome.length < 2) throw new AuthError('Informe como podemos te chamar.')
  email = email.trim()
  const err = validateEmail(email)
  if (err) throw new AuthError(err)
  if (validatePassword(password, true)) {
    throw new AuthError(validatePassword(password, true)!)
  }

  const auth = getLunaAuth()
  if (!auth) throw new AuthError('Firebase Auth não configurado.')

  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName: nome })
  await ensureUserProfile(cred.user)
  return cred.user
}

// ─── Reset senha ────────────────────────────────────────────────────
export async function enviarResetSenha(email: string): Promise<void> {
  email = email.trim()
  const err = validateEmail(email)
  if (err) throw new AuthError(err)

  const auth = getLunaAuth()
  if (!auth) throw new AuthError('Firebase Auth não configurado.')
  await sendPasswordResetEmail(auth, email)
}

// ─── Apagar conta ───────────────────────────────────────────────────
export async function apagarConta(): Promise<void> {
  const auth = getLunaAuth()
  if (!auth) throw new AuthError('Firebase Auth não configurado.')
  const user = auth.currentUser
  if (!user) return

  // Apaga Firestore primeiro — se falhar, aborta pra não deixar user órfão
  const db = getLunaFirestore()
  if (db) {
    try {
      await deleteDoc(doc(db, userDoc(user.uid)))
    } catch (err) {
      console.warn('[Aura] Falha ao apagar doc Firestore:', err)
    }
  }

  // user.delete() pode exigir login recente (auth/requires-recent-login)
  // — AuthProvider trata disso pedindo reautenticação
  await user.delete()
}

// ─── Validação ──────────────────────────────────────────────────────
function validateEmail(email: string): string | null {
  if (!email) return 'Informe o email.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email inválido.'
  return null
}

function validatePassword(password: string, criarConta: boolean): string | null {
  if (!password) return 'Informe a senha.'
  if (password.length < 6) return 'Mínimo 6 caracteres.'
  if (criarConta && password.length < 8)
    return 'Pra criar conta, use pelo menos 8 caracteres.'
  return null
}

// ─── Erro de autenticação com mensagem user-friendly ───────────────
export class AuthError extends Error {
  constructor(message: string) {
    super(mapAuthError(message))
    this.name = 'AuthError'
  }
}

/** Traduz códigos de erro Firebase → mensagem em português. */
function mapAuthError(raw: string): string {
  const msg = raw.toLowerCase()
  if (msg.includes('invalid-email') || msg.includes('email')) return 'Email inválido.'
  if (
    msg.includes('wrong-password') ||
    msg.includes('invalid-credential') ||
    msg.includes('invalid_login_credentials')
  )
    return 'Email ou senha incorretos.'
  if (msg.includes('user-not-found')) return 'Nenhuma conta com este email.'
  if (msg.includes('email-already-in-use'))
    return 'Já existe uma Conta Aura com este email.'
  if (msg.includes('weak-password')) return 'Senha fraca demais.'
  if (msg.includes('requires-recent-login'))
    return 'Por segurança, faça login de novo antes de apagar a conta.'
  if (msg.includes('network') || msg.includes('network-request-failed'))
    return 'Sem rede. Tenta de novo.'
  if (msg.includes('timeout')) return 'Tempo esgotado. Tente novamente.'
  return raw || 'Não deu pra autenticar.'
}

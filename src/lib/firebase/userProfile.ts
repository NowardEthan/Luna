import {
  doc,
  getDoc,
  getDocFromServer,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { DEFAULT_LUNA_ENTITLEMENTS } from './entitlements'
import { getLunaFirestore } from './client'
import { userDoc } from './paths'
import type { LunaUserProfile } from './types'

export async function ensureUserProfile(
  user: User,
): Promise<Partial<LunaUserProfile> | null> {
  const db = getLunaFirestore()
  if (!db) return null

  const ref = doc(db, userDoc(user.uid))
  const snap = await getDoc(ref)
  const now = serverTimestamp()

  // Fase 5: avatarUrl espelha photoURL pra compat com OrbitLab
  const patch: Partial<LunaUserProfile> = {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    avatarUrl: user.photoURL ?? null,
    updatedAt: now as LunaUserProfile['updatedAt'],
  }

  if (!snap.exists()) {
    const created: LunaUserProfile = {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      avatarUrl: user.photoURL ?? null,
      plan: 'free',
      entitlements: { ...DEFAULT_LUNA_ENTITLEMENTS },
      createdAt: now as LunaUserProfile['createdAt'],
      updatedAt: now as LunaUserProfile['updatedAt'],
    }
    await setDoc(ref, created)
    return created
  }

  await setDoc(ref, patch, { merge: true })
  const data = snap.data() as Partial<LunaUserProfile> | undefined
  return { ...data, ...patch }
}

/**
 * Edita campos opcionais do perfil (username, bio, avatarUrl, coverUrl).
 * Não toca displayName/email/photoURL (esses vêm do Firebase Auth).
 * Valida username: 3-24 chars, alphanum + underscore, lowercase.
 */
export async function updateCloudProfile(
  uid: string,
  patch: {
    username?: string | null
    bio?: string | null
    coverUrl?: string | null
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = getLunaFirestore()
  if (!db) return { ok: false, message: 'Firestore não configurado.' }

  const cleanPatch: Record<string, unknown> = {}

  if (patch.username !== undefined) {
    const u = patch.username?.trim().toLowerCase() ?? null
    if (u !== null && !/^[a-z0-9_]{3,24}$/.test(u)) {
      return {
        ok: false,
        message:
          'Username deve ter 3–24 caracteres (letras minúsculas, números e underscore).',
      }
    }
    cleanPatch.username = u
  }

  if (patch.bio !== undefined) {
    const b = patch.bio?.trim() ?? null
    if (b !== null && b.length > 160) {
      return { ok: false, message: 'Bio máximo 160 caracteres.' }
    }
    cleanPatch.bio = b
  }

  if (patch.coverUrl !== undefined) {
    cleanPatch.coverUrl = patch.coverUrl
  }

  cleanPatch.updatedAt = serverTimestamp()

  await setDoc(doc(db, userDoc(uid)), cleanPatch, { merge: true })
  return { ok: true }
}

/** Ignora cache local — útil após pagamento/webhook quando o Electron não propaga o snapshot. */
export async function fetchUserProfileFromServer(
  uid: string,
): Promise<Partial<LunaUserProfile> | null> {
  const db = getLunaFirestore()
  if (!db) return null
  const snap = await getDocFromServer(doc(db, userDoc(uid)))
  if (!snap.exists()) return null
  return snap.data() as Partial<LunaUserProfile>
}

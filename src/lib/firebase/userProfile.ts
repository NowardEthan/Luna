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

  const patch: Partial<LunaUserProfile> = {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    updatedAt: now as LunaUserProfile['updatedAt'],
  }

  if (!snap.exists()) {
    const created: LunaUserProfile = {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
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

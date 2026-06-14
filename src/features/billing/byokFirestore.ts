import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import type { ByokProviderId } from './byokProviders'
import { getLunaFirestore } from '../../lib/firebase/client'
import { userByokConfigDoc } from '../../lib/firebase/paths'

export type ByokProviderMeta = {
  baseUrl: string
  modelMenor: string
  modelMaior: string
  keyHint?: string
  connected: boolean
  updatedAt?: string
}

export type ByokConfigDoc = {
  activeProviderId: ByokProviderId | null
  providers: Partial<Record<ByokProviderId, ByokProviderMeta>>
  updatedAt?: unknown
}

export const EMPTY_BYOK_CONFIG: ByokConfigDoc = {
  activeProviderId: null,
  providers: {},
}

export function subscribeByokConfig(
  uid: string,
  onChange: (config: ByokConfigDoc) => void,
): () => void {
  const db = getLunaFirestore()
  if (!db) return () => {}

  const ref = doc(db, userByokConfigDoc(uid))
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      onChange({ ...EMPTY_BYOK_CONFIG })
      return
    }
    const data = snap.data() as ByokConfigDoc
    onChange({
      activeProviderId: data.activeProviderId ?? null,
      providers: data.providers ?? {},
      updatedAt: data.updatedAt,
    })
  })
}

export async function saveByokProviderMeta(
  uid: string,
  providerId: ByokProviderId,
  meta: Omit<ByokProviderMeta, 'connected'> & { connected: boolean },
  setActive = true,
): Promise<void> {
  const db = getLunaFirestore()
  if (!db) throw new Error('Firestore indisponível.')

  const ref = doc(db, userByokConfigDoc(uid))
  const patch: ByokConfigDoc = {
    activeProviderId: setActive ? providerId : null,
    providers: {
      [providerId]: {
        baseUrl: meta.baseUrl,
        modelMenor: meta.modelMenor,
        modelMaior: meta.modelMaior,
        keyHint: meta.keyHint,
        connected: meta.connected,
        updatedAt: new Date().toISOString(),
      },
    },
    updatedAt: serverTimestamp(),
  }

  await setDoc(ref, patch, { merge: true })
}

export async function disconnectByokProvider(
  uid: string,
  providerId: ByokProviderId,
  current: ByokConfigDoc,
): Promise<void> {
  const db = getLunaFirestore()
  if (!db) throw new Error('Firestore indisponível.')

  const providers = { ...current.providers }
  delete providers[providerId]

  await setDoc(
    doc(db, userByokConfigDoc(uid)),
    {
      activeProviderId:
        current.activeProviderId === providerId ? null : current.activeProviderId,
      providers: {
        [providerId]: {
          connected: false,
          baseUrl: '',
          modelMenor: '',
          modelMaior: '',
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function setActiveByokProvider(
  uid: string,
  providerId: ByokProviderId,
): Promise<void> {
  const db = getLunaFirestore()
  if (!db) throw new Error('Firestore indisponível.')
  await setDoc(
    doc(db, userByokConfigDoc(uid)),
    { activeProviderId: providerId, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

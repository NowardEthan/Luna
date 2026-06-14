import type { ByokProviderId } from './byokProviders'

export type ByokSaveKeyPayload = {
  uid: string
  providerId: ByokProviderId
  apiKey: string
}

export type ByokTestPayload = {
  providerId: ByokProviderId
  apiKey: string
  baseUrl?: string
  modelMenor?: string
  modelMaior?: string
}

function getByokBridge() {
  return typeof window !== 'undefined' ? window.byok : undefined
}

export function isByokVaultAvailable(): boolean {
  return Boolean(getByokBridge()?.saveKey)
}

export async function saveByokApiKey(
  payload: ByokSaveKeyPayload,
): Promise<{ ok: boolean; keyHint?: string; error?: string }> {
  const bridge = getByokBridge()
  if (!bridge) return { ok: false, error: 'Cofre BYOK indisponível (só no app desktop).' }
  return bridge.saveKey(payload)
}

export async function deleteByokApiKey(
  uid: string,
  providerId: ByokProviderId,
): Promise<{ ok: boolean; error?: string }> {
  const bridge = getByokBridge()
  if (!bridge) return { ok: false, error: 'Cofre BYOK indisponível.' }
  return bridge.deleteKey({ uid, providerId })
}

export async function listByokKeyHints(
  uid: string,
): Promise<Record<string, boolean>> {
  const bridge = getByokBridge()
  if (!bridge) return {}
  const res = await bridge.listKeyHints(uid)
  return res.ok ? (res.hints ?? {}) : {}
}

export async function testByokConnection(
  payload: ByokTestPayload,
): Promise<{ ok: boolean; error?: string }> {
  const bridge = getByokBridge()
  if (!bridge) return { ok: false, error: 'Teste BYOK só no app desktop.' }
  return bridge.test(payload)
}

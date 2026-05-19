import { readUsageMode } from './lunarAccount'

let tokenGetter: (() => Promise<string | null>) | null = null

export function registerLunarTokenGetter(
  getter: () => Promise<string | null>,
): () => void {
  tokenGetter = getter
  return () => {
    if (tokenGetter === getter) tokenGetter = null
  }
}

export async function getLunarAuthHeaders(
  options?: { forceOffline?: boolean },
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const offline =
    options?.forceOffline === true || readUsageMode() === 'offline'

  if (offline) {
    headers['X-Luna-Mode'] = 'offline'
    return headers
  }

  if (tokenGetter) {
    const token = await tokenGetter()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  return headers
}

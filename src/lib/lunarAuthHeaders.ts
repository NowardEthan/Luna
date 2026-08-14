let tokenGetter: (() => Promise<string | null>) | null = null

export function registerLunarTokenGetter(
  getter: () => Promise<string | null>,
): () => void {
  tokenGetter = getter
  return () => {
    if (tokenGetter === getter) tokenGetter = null
  }
}

export async function getLunarAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (tokenGetter) {
    const token = await tokenGetter()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  return headers
}

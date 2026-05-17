export function hostnameFromUrl(url: string | undefined): string {
  if (!url?.trim()) return ''
  try {
    return new URL(url.trim()).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function readPluginSettings(
  pluginId: string,
): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(`luna-plugin-settings:${pluginId}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

export function writePluginSettings(
  pluginId: string,
  values: Record<string, unknown>,
): void {
  try {
    localStorage.setItem(
      `luna-plugin-settings:${pluginId}`,
      JSON.stringify(values),
    )
  } catch {
    /* ignore */
  }
}

export function patchPluginSettings(
  pluginId: string,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...readPluginSettings(pluginId), ...patch }
  writePluginSettings(pluginId, next)
  return next
}

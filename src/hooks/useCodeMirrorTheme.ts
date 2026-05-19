import { useEffect, useMemo, useState } from 'react'
import type { Extension } from '@codemirror/state'
import { eventBus } from '../core/events/EventBus'
import {
  buildLunaCodeMirrorExtensions,
  buildMarkdownCodeBlockExtensions,
} from '../lib/codemirrorTheme'

export function useCodeMirrorThemeRevision(): number {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    return eventBus.on('theme:changed', () => {
      setRevision((r) => r + 1)
    })
  }, [])
  return revision
}

export function useLunaCodeMirrorExtensions(): Extension[] {
  const revision = useCodeMirrorThemeRevision()
  return useMemo(() => buildLunaCodeMirrorExtensions(), [revision])
}

export function useMarkdownCodeBlockExtensions(compact: boolean): Extension[] {
  const revision = useCodeMirrorThemeRevision()
  return useMemo(
    () => buildMarkdownCodeBlockExtensions(compact),
    [revision, compact],
  )
}

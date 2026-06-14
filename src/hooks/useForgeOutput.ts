import { useEffect, useState } from 'react'
import {
  getForgeOutputLines,
  getForgeOutputRevision,
  subscribeForgeOutput,
  type ForgeOutputChannel,
  type ForgeOutputLine,
} from '../lib/forgeOutputStore'

export function useForgeOutput(
  channel?: ForgeOutputChannel,
): ForgeOutputLine[] {
  const [revision, setRevision] = useState(getForgeOutputRevision())

  useEffect(() => {
    return subscribeForgeOutput(() => {
      setRevision(getForgeOutputRevision())
    })
  }, [])

  void revision
  return getForgeOutputLines(channel)
}

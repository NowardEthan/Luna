import { type KeyboardEvent, useCallback, useEffect, useState } from 'react'
import {
  clearComposerDraft,
  getComposerDraft,
} from '../lib/composerDraftStore'
import type { PreparedImageAttachment } from '../lib/imageResize'

type UseComposerDraftOpts = {
  activeId: string | null | undefined
  sendMessage: (text: string, imgs?: PreparedImageAttachment[]) => Promise<void>
  redoRegenerateAt: (messageId: string) => Promise<void>
  canRedoMessage: (messageId: string) => boolean
}

export function useComposerDraft({
  activeId,
  sendMessage,
  redoRegenerateAt,
  canRedoMessage,
}: UseComposerDraftOpts) {
  const [attachedImages, setAttachedImages] = useState<PreparedImageAttachment[]>([])
  const [composerBusy, setComposerBusy] = useState(false)
  const [composerMenuOpen, setComposerMenuOpen] = useState(false)

  useEffect(() => {
    clearComposerDraft()
    setAttachedImages([])
  }, [activeId])

  const handleSend = useCallback(async () => {
    const text = getComposerDraft().trim()
    if ((!text && attachedImages.length === 0) || composerBusy) return
    setComposerBusy(true)
    clearComposerDraft()
    const imgs = [...attachedImages]
    setAttachedImages([])
    const safety = window.setTimeout(() => setComposerBusy(false), 240_000)
    try {
      await sendMessage(text, imgs.length ? imgs : undefined)
    } finally {
      window.clearTimeout(safety)
      setComposerBusy(false)
    }
  }, [attachedImages, composerBusy, sendMessage])

  const handleRedoMessage = useCallback(
    async (messageId: string) => {
      if (composerBusy || !canRedoMessage(messageId)) return
      setComposerBusy(true)
      const safety = window.setTimeout(() => setComposerBusy(false), 240_000)
      try {
        await redoRegenerateAt(messageId)
      } finally {
        window.clearTimeout(safety)
        setComposerBusy(false)
      }
    },
    [composerBusy, canRedoMessage, redoRegenerateAt],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (composerBusy) return
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }
    },
    [composerBusy, handleSend],
  )

  return {
    attachedImages,
    setAttachedImages,
    composerBusy,
    composerMenuOpen,
    setComposerMenuOpen,
    handleSend,
    handleRedoMessage,
    handleKeyDown,
  }
}

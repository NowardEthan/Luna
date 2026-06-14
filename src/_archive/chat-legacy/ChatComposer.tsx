import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { IdeMentionPicker } from '../../../components/ide/IdeMentionPicker'
import { ModelSelector } from './ModelSelector'
import { ReasoningToggle } from '../../../components/ReasoningToggle'
import { useLunaWorkspaceOptional } from '../../../context/LunaWorkspaceContext'
import {
  buildMentionSuggestions,
  getMentionTrigger,
  insertMention,
  type MentionSuggestion,
  type MentionTrigger,
} from '../../../lib/ideMentionAutocomplete'
import type { LunaModelOption } from '../../../lib/llmModelSelection'
import {
  prepareImageAttachment,
  type PreparedImageAttachment,
} from '../../../lib/imageResize'
import { isLunaFileExplorerAvailable } from '../../../lib/lunaFileExplorer'
import { lunaPickFiles } from '../../../lib/lunaFileExplorerPrompt'
import { modelSupportsReasoningToggle } from '../../../lib/reasoningModelCapabilities'
import { useTranslation } from 'react-i18next'

const MAX_IMAGES = 5

function SendArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  )
}

const promptWell = 'luna-input-well relative'

const MIN_TEXTAREA_LINES = 1
const MAX_TEXTAREA_LINES = 6
const LINE_HEIGHT_PX = 22
const TEXTAREA_MIN_PX = MIN_TEXTAREA_LINES * LINE_HEIGHT_PX
const TEXTAREA_MAX_PX = MAX_TEXTAREA_LINES * LINE_HEIGHT_PX

export type ChatComposerProps = {
  draft: string
  onChange: (value: string) => void
  onSend: () => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onLimpar?: () => void
  composerBusy?: boolean
  /** Substitui «A pensar…» durante a geração */
  workingLabel?: string
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  attachedImages: PreparedImageAttachment[]
  onAttachedImagesChange: (images: PreparedImageAttachment[]) => void
  memoryCrossChatEnabled?: boolean
  onMemoryCrossChatToggle?: () => void
  memoryConversationSearchEnabled?: boolean
  onMemoryConversationSearchToggle?: () => void
  onClearUserProfileMemory?: () => void
  onClearConversationMemory?: () => void
  modelCatalog?: LunaModelOption[]
  selectedModelId?: string | null
  onModelChange?: (id: string) => void
  modelCatalogLoading?: boolean
  modelCatalogError?: string | null
  /** Placeholder e dicas @ no modo IDE */
  ideMode?: boolean
  /** Placeholder e UX do Luna Finanças (sem menções @ de ficheiros) */
  financesMode?: boolean
  onShowShortcutsHelp?: () => void
  onExportConversation?: () => void
  onOpenSettings?: () => void
  onStop?: () => void
  reasoningEnabled?: boolean
  onReasoningChange?: (enabled: boolean) => void
}

export function ChatComposer({
  draft,
  onChange,
  onSend,
  onKeyDown,
  onLimpar,
  composerBusy = false,
  workingLabel,
  menuOpen,
  onMenuOpenChange,
  attachedImages,
  onAttachedImagesChange,
  memoryCrossChatEnabled = true,
  onMemoryCrossChatToggle,
  memoryConversationSearchEnabled = true,
  onMemoryConversationSearchToggle,
  onClearUserProfileMemory,
  onClearConversationMemory,
  modelCatalog = [],
  selectedModelId = null,
  onModelChange,
  modelCatalogLoading = false,
  modelCatalogError = null,
  ideMode = false,
  financesMode = false,
  onShowShortcutsHelp,
  onExportConversation,
  onOpenSettings,
  onStop,
  reasoningEnabled = false,
  onReasoningChange,
}: ChatComposerProps) {
  const { t } = useTranslation()
  const ideComposer = ideMode && !financesMode
  const hasMoreMenu =
    Boolean(onLimpar) ||
    Boolean(onShowShortcutsHelp) ||
    Boolean(onExportConversation) ||
    Boolean(onOpenSettings) ||
    Boolean(onMemoryCrossChatToggle) ||
    Boolean(onMemoryConversationSearchToggle) ||
    Boolean(onClearUserProfileMemory) ||
    Boolean(onClearConversationMemory)
  const canSend =
    (draft.trim().length > 0 || attachedImages.length > 0) && !composerBusy
  const ws = useLunaWorkspaceOptional()
  const menuRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [mentionTrigger, setMentionTrigger] = useState<MentionTrigger | null>(
    null,
  )
  const [mentionSuggestions, setMentionSuggestions] = useState<
    MentionSuggestion[]
  >([])
  const [mentionIndex, setMentionIndex] = useState(0)

  const selectedOption = modelCatalog.find((m) => m.id === selectedModelId)
  const supportsReasoning = modelSupportsReasoningToggle({
    provider: selectedOption?.provider as any,
    model: selectedOption?.model || '',
  })

  const addFilesFromList = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith('image/'))
      const next = [...attachedImages]
      for (const f of imageFiles) {
        if (next.length >= MAX_IMAGES) break
        try {
          next.push(await prepareImageAttachment(f))
        } catch {
          /* arquivo inválido */
        }
      }
      onAttachedImagesChange(next)
    },
    [attachedImages, onAttachedImagesChange],
  )

  const removeAttachment = useCallback(
    (id: string) => {
      onAttachedImagesChange(attachedImages.filter((a) => a.id !== id))
    },
    [attachedImages, onAttachedImagesChange],
  )

  const pickImages = useCallback(async () => {
    if (attachedImages.length >= MAX_IMAGES) return
    if (isLunaFileExplorerAvailable()) {
      const files = await lunaPickFiles({
        title: 'Anexar imagens',
        confirmLabel: 'Anexar',
        multiple: true,
        accept: {
          extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'],
          maxFiles: MAX_IMAGES - attachedImages.length,
          maxBytesPerFile: 12 * 1024 * 1024,
        },
      })
      if (files?.length) await addFilesFromList(files)
      return
    }
    fileRef.current?.click()
  }, [attachedImages.length, addFilesFromList])

  const handlePaste = useCallback(
    async (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items
      if (!items?.length) return
      const files: File[] = []
      for (const it of items) {
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const f = it.getAsFile()
          if (f) files.push(f)
        }
      }
      if (!files.length) return
      e.preventDefault()
      await addFilesFromList(files)
    },
    [addFilesFromList],
  )

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    const next = Math.min(
      Math.max(TEXTAREA_MIN_PX, el.scrollHeight),
      TEXTAREA_MAX_PX,
    )
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_PX ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [draft, attachedImages.length, resizeTextarea])

  useEffect(() => {
    const el = textareaRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => resizeTextarea())
    ro.observe(el)
    return () => ro.disconnect()
  }, [resizeTextarea])

  const syncMentionTrigger = useCallback(
    (value: string, cursor: number) => {
      if (!ideComposer) {
        setMentionTrigger(null)
        return
      }
      setMentionTrigger(getMentionTrigger(value, cursor))
      setMentionIndex(0)
    },
    [ideComposer],
  )

  const handleDraftChange = useCallback(
    (value: string) => {
      onChange(value)
      const el = textareaRef.current
      const cursor = el?.selectionStart ?? value.length
      syncMentionTrigger(value, cursor)
    },
    [onChange, syncMentionTrigger],
  )

  useEffect(() => {
    if (!ideComposer || !mentionTrigger) {
      setMentionSuggestions([])
      return
    }
    let cancelled = false
    void buildMentionSuggestions(
      ws?.workspaceRoot ?? null,
      ws?.openFiles.map((f) => f.path) ?? [],
      mentionTrigger.query,
    ).then((items) => {
      if (!cancelled) setMentionSuggestions(items)
    })
    return () => {
      cancelled = true
    }
  }, [ideComposer, mentionTrigger, ws?.workspaceRoot, ws?.openFiles])

  const pickMention = useCallback(
    (item: MentionSuggestion) => {
      if (!mentionTrigger) return
      const { next, cursor } = insertMention(draft, mentionTrigger, item.insert)
      onChange(next)
      setMentionTrigger(null)
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(cursor, cursor)
      })
    },
    [draft, mentionTrigger, onChange],
  )

  const handleComposerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionTrigger && mentionSuggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setMentionIndex((i) => (i + 1) % mentionSuggestions.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setMentionIndex(
            (i) =>
              (i - 1 + mentionSuggestions.length) % mentionSuggestions.length,
          )
          return
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          pickMention(mentionSuggestions[mentionIndex]!)
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setMentionTrigger(null)
          return
        }
      }
      onKeyDown(e)
    },
    [
      mentionTrigger,
      mentionSuggestions,
      mentionIndex,
      pickMention,
      onKeyDown,
    ],
  )

  useEffect(() => {
    if (!menuOpen) return
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuOpenChange(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen, onMenuOpenChange])

  return (
    <footer className="shrink-0 border-t border-line bg-canvas">
      <div
        className={
          ideComposer || financesMode
            ? 'w-full px-2 pb-1.5 pt-1.5'
            : 'mx-auto max-w-3xl px-3 pb-2.5 pt-2'
        }
      >
        {hasMoreMenu ? (
          <div className="mb-1.5 flex items-center justify-end px-0.5">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="luna-btn-ghost text-[11px] text-fg-muted"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => onMenuOpenChange(!menuOpen)}
              >
                Mais opções
                <span className="sr-only"> — abrir menu</span>
              </button>
              {menuOpen ? (
                <div
                  className="luna-select-menu absolute bottom-full right-0 z-10 mb-1 min-w-[14rem]"
                  role="menu"
                >
                  {onMemoryCrossChatToggle ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="luna-hover-row w-full px-3 py-2 text-left text-[12px] text-fg-dim"
                      onClick={() => {
                        onMemoryCrossChatToggle()
                        onMenuOpenChange(false)
                      }}
                    >
                      Memória entre conversas:{' '}
                      {memoryCrossChatEnabled ? 'ligada' : 'desligada'}
                    </button>
                  ) : null}
                  {onMemoryConversationSearchToggle ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="luna-hover-row w-full px-3 py-2 text-left text-[12px] text-fg-dim"
                      onClick={() => {
                        onMemoryConversationSearchToggle()
                        onMenuOpenChange(false)
                      }}
                    >
                      Busca em conversas antigas:{' '}
                      {memoryConversationSearchEnabled ? 'ligada' : 'desligada'}
                    </button>
                  ) : null}
                  {onClearUserProfileMemory ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="luna-hover-row w-full px-3 py-2 text-left text-[12px] text-fg-dim"
                      onClick={() => {
                        onClearUserProfileMemory()
                        onMenuOpenChange(false)
                      }}
                    >
                      Limpar todas as notas de memória (save_memory)
                    </button>
                  ) : null}
                  {onClearConversationMemory ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="luna-hover-row w-full px-3 py-2 text-left text-[12px] text-fg-dim"
                      onClick={() => {
                        onClearConversationMemory()
                        onMenuOpenChange(false)
                      }}
                    >
                      Limpar resumo desta conversa
                    </button>
                  ) : null}
                  {onMemoryCrossChatToggle ||
                  onMemoryConversationSearchToggle ||
                  onClearUserProfileMemory ||
                  onClearConversationMemory ? (
                    <div className="my-1 border-t border-line" role="separator" />
                  ) : null}
                  {onExportConversation ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="luna-hover-row w-full px-3 py-2 text-left text-[12px] text-fg-dim"
                      onClick={() => {
                        onExportConversation()
                        onMenuOpenChange(false)
                      }}
                    >
                      Exportar conversa (Markdown)
                    </button>
                  ) : null}
                  {onOpenSettings ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="luna-hover-row w-full px-3 py-2 text-left text-[12px] text-fg-dim"
                      onClick={() => {
                        onOpenSettings()
                        onMenuOpenChange(false)
                      }}
                    >
                      Definições (Ctrl+,)
                    </button>
                  ) : null}
                  {onShowShortcutsHelp ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="luna-hover-row w-full px-3 py-2 text-left text-[12px] text-fg-dim"
                      onClick={() => {
                        onShowShortcutsHelp()
                        onMenuOpenChange(false)
                      }}
                    >
                      Atalhos de teclado (?)
                    </button>
                  ) : null}
                  {(onExportConversation || onOpenSettings || onShowShortcutsHelp) &&
                  onLimpar ? (
                    <div className="my-1 border-t border-line" role="separator" />
                  ) : null}
                  {onLimpar ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="luna-hover-row w-full px-3 py-2 text-left text-[12px] text-fg-dim"
                      onClick={() => {
                        onLimpar()
                        onMenuOpenChange(false)
                      }}
                    >
                      Apagar esta conversa
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className={`${promptWell} ${ideComposer || financesMode ? 'p-2' : 'p-3'}`}
          onMouseDown={(e) => {
            if (composerBusy) return
            const t = e.target as HTMLElement
            if (t.closest('button, select, [role="listbox"], a, input[type="file"]')) return
            textareaRef.current?.focus()
          }}
          onDragEnter={(e) => {
            if (e.dataTransfer.types.includes('Files')) setDragOver(true)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const fl = e.dataTransfer.files
            if (fl?.length) void addFilesFromList([...fl])
          }}
        >
          {dragOver ? (
            <div className="luna-drop-target pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-ui font-medium text-accent">
              Largar imagens aqui
            </div>
          ) : null}
          {!isLunaFileExplorerAvailable() ? (
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => {
                const fl = e.target.files
                if (fl?.length) void addFilesFromList([...fl])
                e.target.value = ''
              }}
            />
          ) : null}

          {attachedImages.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachedImages.map((im) => (
                <div
                  key={im.id}
                  className="luna-card flex max-w-[11rem] items-center gap-1 !rounded-lg !p-1"
                >
                  <img
                    src={im.dataUrl}
                    alt=""
                    className="size-9 shrink-0 rounded-md object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-[10px] text-fg-muted" title={im.name}>
                    {im.name}
                  </span>
                  <button
                    type="button"
                    className="luna-btn-ghost shrink-0 !p-0.5 text-fg-muted"
                    aria-label={`Remover ${im.name}`}
                    onClick={() => removeAttachment(im.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="relative">
            {ideComposer && mentionTrigger ? (
              <IdeMentionPicker
                suggestions={mentionSuggestions}
                activeIndex={mentionIndex}
                onPick={pickMention}
              />
            ) : null}
            <textarea
              ref={textareaRef}
              id="msg-input"
              rows={1}
              placeholder={
                financesMode
                  ? 'Pergunte sobre saldo, lançamentos, orçamentos ou metas…'
                  : ideComposer
                    ? 'Digite aqui… @ para ficheiro, Terminal, Git ou Regras'
                    : t('composer.placeholder')
              }
              value={draft}
              disabled={composerBusy}
              onChange={(e) => handleDraftChange(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              onClick={(e) => {
                const t = e.currentTarget
                syncMentionTrigger(t.value, t.selectionStart ?? t.value.length)
              }}
              onKeyUp={(e) => {
                const t = e.currentTarget
                syncMentionTrigger(t.value, t.selectionStart ?? t.value.length)
              }}
              onPaste={handlePaste}
              className="block w-full min-h-0 resize-none overflow-hidden bg-transparent px-0.5 py-0.5 text-body leading-[22px] text-fg placeholder:text-fg-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div
            className={`flex items-center justify-between gap-2 border-t border-line ${
              ideComposer || financesMode ? 'mt-1.5 pt-2' : 'mt-2 pt-2.5'
            }`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                disabled={composerBusy || attachedImages.length >= MAX_IMAGES}
                onClick={() => void pickImages()}
                title="Anexar imagem (Lunar Vision gera a descrição para o chat)"
                aria-label="Anexar imagem"
                className="luna-icon-btn !size-8 shrink-0 disabled:opacity-40"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>
                  <path d="M21.44 11.05 12.25 20.24a5.47 5.47 0 0 1-7.75-7.75l9.19-9.19a3.65 3.65 0 0 1 5.16 5.16l-8.53 8.53a2.43 2.43 0 1 1-3.44-3.44l7.9-7.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {onModelChange ? (
                <ModelSelector
                  models={modelCatalog}
                  selectedId={selectedModelId}
                  onChange={onModelChange}
                  disabled={composerBusy}
                  loading={modelCatalogLoading}
                  error={modelCatalogError}
                />
              ) : null}
              {onReasoningChange ? (
                <ReasoningToggle
                  enabled={reasoningEnabled && supportsReasoning}
                  onChange={onReasoningChange}
                  disabled={composerBusy}
                  unsupportedMsg={
                    !supportsReasoning
                      ? 'O modelo selecionado não suporta o modo de raciocínio. Por favor, escolha um modelo com (Thinking) ou (Com Raciocínio) no nome.'
                      : undefined
                  }
                />
              ) : null}
              {!ideComposer ? (
                <p className="hidden min-w-0 flex-1 truncate text-[10px] text-fg-muted lg:block">
                  Imagens → Lunar Vision
                </p>
              ) : null}
            </div>
            {composerBusy && onStop ? (
              <button
                type="button"
                onClick={onStop}
                title="Parar geração"
                aria-label="Parar geração"
                className="luna-btn-secondary flex size-[36px] shrink-0 items-center justify-center !rounded-full border-danger/30 bg-danger-muted !p-0 text-danger focus-visible:ring-offset-composer-well"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSend}
                onClick={onSend}
                title={
                  canSend
                    ? 'Enviar mensagem'
                    : 'Escreva algo ou anexe uma imagem'
                }
                aria-label="Enviar mensagem"
                className="luna-btn-primary flex size-[36px] shrink-0 items-center justify-center !rounded-full !p-0 disabled:pointer-events-none disabled:opacity-[0.32] focus-visible:ring-offset-composer-well"
              >
                <SendArrowIcon />
              </button>
            )}
          </div>
        </div>

        {composerBusy ? (
          <p className="mt-1.5 flex items-center gap-2 text-ui text-fg-muted" aria-live="polite" role="status">
            <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span>{workingLabel ?? t('composer.working')}</span>
          </p>
        ) : null}
      </div>
    </footer>
  )
}

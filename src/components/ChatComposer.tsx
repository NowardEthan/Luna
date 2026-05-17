import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { BRAND_APP_NAME } from '../brand'
import { ModelSelector } from './ModelSelector'
import type { LunaModelOption } from '../lib/llmModelSelection'
import {
  prepareImageAttachment,
  type PreparedImageAttachment,
} from '../lib/imageResize'

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

const promptWell =
  'relative rounded-2xl border border-line bg-composer-well p-3 transition-shadow focus-within:border-line focus-within:shadow-[0_0_0_1px_rgba(86,156,214,0.35)]'

const MAX_TEXTAREA_LINES = 6
const LINE_HEIGHT_PX = 22

export type ChatComposerProps = {
  draft: string
  onChange: (value: string) => void
  onSend: () => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onLimpar?: () => void
  composerBusy?: boolean
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
  onShowShortcutsHelp?: () => void
}

export function ChatComposer({
  draft,
  onChange,
  onSend,
  onKeyDown,
  onLimpar,
  composerBusy = false,
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
  onShowShortcutsHelp,
}: ChatComposerProps) {
  const canSend =
    (draft.trim().length > 0 || attachedImages.length > 0) && !composerBusy
  const menuRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [dragOver, setDragOver] = useState(false)

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
    el.style.height = 'auto'
    const max = MAX_TEXTAREA_LINES * LINE_HEIGHT_PX
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [draft, resizeTextarea])

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
      <div className="mx-auto max-w-3xl px-3 pb-3 pt-2.5">
        <div className="mb-2 flex items-center justify-end px-0.5">
          {onLimpar ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-[11px] text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => onMenuOpenChange(!menuOpen)}
              >
                Mais opções
                <span className="sr-only"> — abrir menu</span>
              </button>
              {menuOpen ? (
                <div
                  className="absolute bottom-full right-0 z-10 mb-1 min-w-[14rem] rounded-lg border border-line bg-surface py-1 shadow-lg"
                  role="menu"
                >
                  {onMemoryCrossChatToggle ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-[12px] text-fg-dim hover:bg-white/[0.06]"
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
                      className="w-full px-3 py-2 text-left text-[12px] text-fg-dim hover:bg-white/[0.06]"
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
                      className="w-full px-3 py-2 text-left text-[12px] text-fg-dim hover:bg-white/[0.06]"
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
                      className="w-full px-3 py-2 text-left text-[12px] text-fg-dim hover:bg-white/[0.06]"
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
                  {onShowShortcutsHelp ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-[12px] text-fg-dim hover:bg-white/[0.06]"
                      onClick={() => {
                        onShowShortcutsHelp()
                        onMenuOpenChange(false)
                      }}
                    >
                      Atalhos de teclado (?)
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-3 py-2 text-left text-[12px] text-fg-dim hover:bg-white/[0.06]"
                    onClick={() => {
                      onLimpar()
                      onMenuOpenChange(false)
                    }}
                  >
                    Apagar esta conversa
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          className={promptWell}
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
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent/60 bg-accent/10 text-ui font-medium text-accent">
              Largar imagens aqui
            </div>
          ) : null}
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

          {attachedImages.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachedImages.map((im) => (
                <div
                  key={im.id}
                  className="flex max-w-[11rem] items-center gap-1 rounded-lg border border-line bg-sidebar/80 py-0.5 pl-0.5 pr-1"
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
                    className="shrink-0 rounded p-0.5 text-fg-muted hover:bg-white/[0.08] hover:text-fg"
                    aria-label={`Remover ${im.name}`}
                    onClick={() => removeAttachment(im.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            id="msg-input"
            rows={1}
            placeholder={
              ideMode
                ? 'Digite aqui… @ficheiro @Terminal @Git @Regras — Enter envia.'
                : 'Digite aqui… Cole ou anexe imagens (até 5). Enter envia, Shift+Enter nova linha.'
            }
            value={draft}
            disabled={composerBusy}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={handlePaste}
            className="min-h-[4.75rem] w-full resize-none overflow-y-auto bg-transparent px-0.5 py-1 text-body leading-relaxed text-fg placeholder:text-fg-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                disabled={composerBusy || attachedImages.length >= MAX_IMAGES}
                onClick={() => fileRef.current?.click()}
                title="Anexar imagem (Lunar Vision gera a descrição para o chat)"
                aria-label="Anexar imagem"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-fg-muted transition-colors hover:border-accent/35 hover:bg-white/[0.04] hover:text-fg disabled:opacity-40"
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] text-fg-muted">
                  Chat: {BRAND_APP_NAME}
                </p>
                <p className="truncate text-[9px] text-fg-muted/90">
                  Imagens → Lunar Vision → descrição para o chat
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={!canSend}
              onClick={onSend}
              title={
                composerBusy
                  ? 'Aguardando resposta…'
                  : canSend
                    ? 'Enviar mensagem'
                    : 'Escreva algo ou anexe uma imagem'
              }
              aria-label="Enviar mensagem"
              aria-busy={composerBusy}
              className="flex size-[36px] shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg transition-[filter,opacity] hover:brightness-110 active:brightness-95 disabled:pointer-events-none disabled:opacity-[0.32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-composer-well"
            >
              {composerBusy ? (
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
                  <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              ) : (
                <SendArrowIcon />
              )}
            </button>
          </div>
        </div>

        <p
          className="mt-2 min-h-[1rem] text-ui text-fg-muted"
          aria-live="polite"
        >
          {composerBusy ? 'A aguardar resposta…' : null}
        </p>
      </div>
    </footer>
  )
}

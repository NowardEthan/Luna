/** Velocidade legada (modo carácter). */
export const DEFAULT_STREAM_CHARS_PER_SECOND = 52

/** ~4 palavras/s — ritmo mais calmo (bolha + raciocínio). */
export const DEFAULT_STREAM_WORDS_PER_SECOND = 4

/** Evita um único “bloco” gigante (URL, markdown sem espaços). */
export const MAX_WORD_REVEAL_CHARS = 48

export type SmoothStreamMode = 'char' | 'word'

export type SmoothStreamPlayerOptions = {
  mode?: SmoothStreamMode
  /** chars/s (char) ou palavras/s (word) */
  rate?: number
}

export type SmoothStreamPlayer = {
  pushTarget: (text: string, opts?: { silent?: boolean }) => void
  setSilent: (silent: boolean) => void
  finish: () => Promise<void>
  cancel: () => void
  snapToEnd: () => void
}

/** Próximo limite: palavra (+ espaços) ou fatia se a palavra for enorme. */
export function nextWordRevealIndex(text: string, from: number): number {
  if (from >= text.length) return text.length
  let i = from
  while (i < text.length && /\s/.test(text[i]!)) i++
  if (i >= text.length) return text.length
  const wordStart = i
  while (i < text.length && !/\s/.test(text[i]!)) i++
  if (i - wordStart > MAX_WORD_REVEAL_CHARS) {
    return wordStart + MAX_WORD_REVEAL_CHARS
  }
  while (i < text.length && /\s/.test(text[i]!)) i++
  return i
}

function advanceChars(text: string, from: number, count: number): number {
  return Math.min(text.length, from + count)
}

export function createSmoothStreamPlayer(
  onDisplay: (visible: string) => void,
  rateOrOpts: number | SmoothStreamPlayerOptions = DEFAULT_STREAM_WORDS_PER_SECOND,
): SmoothStreamPlayer {
  const opts: SmoothStreamPlayerOptions =
    typeof rateOrOpts === 'number' ? { rate: rateOrOpts } : rateOrOpts
  const mode = opts.mode ?? 'word'
  const rate =
    opts.rate ??
    (mode === 'word' ? DEFAULT_STREAM_WORDS_PER_SECOND : DEFAULT_STREAM_CHARS_PER_SECOND)

  let target = ''
  let visibleLen = 0
  let rafId = 0
  let lastTs = 0
  let active = false
  let catchUp = false
  let silent = false

  const emit = () => {
    if (silent) return
    onDisplay(target.slice(0, visibleLen))
  }

  const advanceOnce = (): boolean => {
    if (visibleLen >= target.length) return false
    if (mode === 'word') {
      const next = nextWordRevealIndex(target, visibleLen)
      if (next > visibleLen) {
        visibleLen = next
        return true
      }
      return false
    }
    visibleLen = advanceChars(target, visibleLen, 1)
    return true
  }

  const tick = (now: number) => {
    rafId = 0
    if (!active || silent) return

    const dt = lastTs > 0 ? now - lastTs : 16
    lastTs = now

    const boost = catchUp ? 1.35 : 1
    const budget = Math.max(1, Math.round((dt / 1000) * rate * boost))

    let moved = false
    for (let i = 0; i < budget; i++) {
      if (!advanceOnce()) break
      moved = true
    }

    if (moved) emit()

    if (visibleLen < target.length) {
      rafId = requestAnimationFrame(tick)
    }
  }

  const ensurePlaying = () => {
    if (!active || silent || rafId || visibleLen >= target.length) return
    lastTs = 0
    rafId = requestAnimationFrame(tick)
  }

  const revealFirstChunk = () => {
    if (silent || visibleLen > 0 || target.length === 0) return
    advanceOnce()
    emit()
  }

  return {
    pushTarget(text: string, pushOpts?: { silent?: boolean }) {
      if (text.length < target.length) {
        visibleLen = Math.min(visibleLen, text.length)
      }
      target = text
      active = true
      if (pushOpts?.silent !== undefined) {
        silent = pushOpts.silent
      }
      if (!silent) {
        revealFirstChunk()
        ensurePlaying()
      }
    },

    setSilent(nextSilent: boolean) {
      const wasSilent = silent
      silent = nextSilent
      if (wasSilent && !nextSilent) {
        visibleLen = 0
        emit()
        ensurePlaying()
      }
    },

    finish() {
      catchUp = true
      active = true
      silent = false
      ensurePlaying()

      return new Promise<void>((resolve) => {
        const deadline = Date.now() + 45_000

        const wait = () => {
          if (visibleLen >= target.length) {
            emit()
            if (rafId) {
              cancelAnimationFrame(rafId)
              rafId = 0
            }
            active = false
            catchUp = false
            resolve()
            return
          }
          if (Date.now() > deadline) {
            visibleLen = target.length
            emit()
            if (rafId) {
              cancelAnimationFrame(rafId)
              rafId = 0
            }
            active = false
            catchUp = false
            resolve()
            return
          }
          ensurePlaying()
          requestAnimationFrame(wait)
        }
        wait()
      })
    },

    cancel() {
      active = false
      catchUp = false
      silent = false
      visibleLen = 0
      target = ''
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    },

    snapToEnd() {
      visibleLen = target.length
      emit()
    },
  }
}

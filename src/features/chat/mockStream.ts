/** Resposta fixa até ligarmos provedores de IA. */
export const DEMO_ASSISTANT_REPLY =
  'Olá! Isto é uma resposta de demonstração em **streaming**. ' +
  'O chat foi simplificado para validar a interface — em breve voltamos a ligar modelos e ferramentas. ' +
  'Enquanto isso, podes enviar mensagens e ver o texto aparecer palavra a palavra, como no Cursor.'

/** Intervalo entre blocos de texto (ms). */
const DEFAULT_MS_PER_CHUNK = 6
/** Caracteres por bloco — menos updates, sensação mais fluida. */
const CHARS_PER_CHUNK = 6

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

export async function streamDemoText(
  fullText: string,
  onPartial: (text: string) => void,
  options?: { msPerChunk?: number; charsPerChunk?: number; signal?: AbortSignal },
): Promise<void> {
  const delay = options?.msPerChunk ?? DEFAULT_MS_PER_CHUNK
  const step = Math.max(1, options?.charsPerChunk ?? CHARS_PER_CHUNK)
  const signal = options?.signal
  let out = ''

  for (let i = 0; i < fullText.length; i += step) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    out += fullText.slice(i, i + step)
    onPartial(out)
    if (i + step < fullText.length) await sleep(delay, signal)
  }
}

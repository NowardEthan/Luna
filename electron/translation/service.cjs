/**
 * Motor de tradução (processo principal).
 * @see https://github.com/franciscop/translate
 */

const MAX_CHUNK = 4500

/** @type {import('translate').default | null} */
let translateFn = null
let configurePromise = null

function configureEngine() {
  if (configurePromise) return configurePromise

  configurePromise = import('translate').then((mod) => {
    const translate = mod.default ?? mod
    const engine = (process.env.TRANSLATE_ENGINE || 'google').trim().toLowerCase()
    translate.engine = engine

    const key =
      process.env.DEEPL_API_KEY?.trim() ||
      process.env.TRANSLATE_API_KEY?.trim() ||
      process.env.LIBRETRANSLATE_API_KEY?.trim() ||
      process.env.YANDEX_TRANSLATE_KEY?.trim() ||
      ''

    if (key) translate.key = key

    const libreUrl = process.env.LIBRETRANSLATE_URL?.trim()
    if (libreUrl && engine === 'libre') {
      translate.url = libreUrl.replace(/\/$/, '')
    }

    translateFn = translate
    return translate
  })

  return configurePromise
}

function splitForTranslation(text) {
  if (text.length <= MAX_CHUNK) return [text]

  const parts = []
  let rest = text
  while (rest.length > MAX_CHUNK) {
    let cut = rest.lastIndexOf('\n\n', MAX_CHUNK)
    if (cut < MAX_CHUNK * 0.4) cut = rest.lastIndexOf('\n', MAX_CHUNK)
    if (cut < MAX_CHUNK * 0.4) cut = rest.lastIndexOf(' ', MAX_CHUNK)
    if (cut < 1) cut = MAX_CHUNK
    parts.push(rest.slice(0, cut))
    rest = rest.slice(cut).trimStart()
  }
  if (rest) parts.push(rest)
  return parts
}

/** Luna `pt` → motor `pt-BR` (evita português de Portugal). */
function googleTarget(lang) {
  const m = (typeof lang === 'string' ? lang : 'pt').trim().toLowerCase()
  if (m === 'pt') return 'pt-BR'
  if (m === 'zh') return 'zh-CN'
  return m
}

/**
 * @param {string} text
 * @param {{ to: string, from?: string }} opts
 */
async function translateText(text, opts) {
  await configureEngine()
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) return { ok: true, text: '' }

  const to = googleTarget(typeof opts?.to === 'string' ? opts.to : 'pt')
  const from =
    typeof opts?.from === 'string' && opts.from.trim()
      ? googleTarget(opts.from)
      : undefined

  try {
    const chunks = splitForTranslation(trimmed)
    const out = []
    for (const chunk of chunks) {
      const callOpts = from ? { to, from } : { to }
      const piece = await translateFn(chunk, callOpts)
      out.push(typeof piece === 'string' ? piece : String(piece ?? ''))
    }
    const result = out.join('\n\n').trim()
    if (!result) {
      return { ok: false, error: 'Tradução vazia.' }
    }
    return { ok: true, text: result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg || 'Falha na tradução.' }
  }
}

module.exports = { translateText }

const fs = require('fs')
const path = require('path')
const { llmEmbed } = require('./llmHandlers.cjs')

const EMBED_BATCH = Number(process.env.CHAT_MEMORY_EMBED_BATCH || 24)
const TOP_K = Number(process.env.CHAT_MEMORY_TOP_K || 8)
const MAX_BLOCK_CHARS = Number(process.env.CHAT_MEMORY_MAX_CHARS || 2800)
const MSG_CHUNK_CHARS = 1000

/** @type {import('sql.js').Database | null} */
let db = null
/** @type {string} */
let dbPath = ''

/**
 * @param {number[]} a
 * @param {number[]} b
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

function persistDb() {
  if (!db || !dbPath) return
  const data = db.export()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  fs.writeFileSync(dbPath, Buffer.from(data))
}

/**
 * @param {import('electron').App} electronApp
 */
async function init(electronApp) {
  const initSqlJs = require('sql.js')
  const SQL = await initSqlJs({
    locateFile: (file) =>
      path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
  })

  dbPath = path.join(electronApp.getPath('userData'), 'conversation-memory.sqlite')

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS conv_chunks (
      chunk_key TEXT PRIMARY KEY,
      conv_id TEXT NOT NULL,
      conv_title TEXT NOT NULL,
      kind TEXT NOT NULL,
      message_id TEXT,
      text TEXT NOT NULL,
      embedding TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_conv_chunks_conv ON conv_chunks(conv_id);
  `)
}

function getStatus() {
  if (!db) {
    return { ok: false, error: 'Índice de conversas não inicializado.', chunkCount: 0 }
  }
  const row = db.exec('SELECT COUNT(*) AS c FROM conv_chunks')
  const count =
    row[0]?.values[0]?.[0] != null ? Number(row[0].values[0][0]) : 0
  return { ok: true, chunkCount: count }
}

/**
 * @param {{ text: string, visionDescription?: string }} m
 */
function messagePlainText(m) {
  let t = typeof m.text === 'string' ? m.text : ''
  const vd =
    typeof m.visionDescription === 'string' ? m.visionDescription.trim() : ''
  if (vd) {
    t = `${t}\n\n[Descrição visual]\n${vd}`
  }
  return t.replace(/\s+/g, ' ').trim()
}

/**
 * @param {string} s
 * @param {number} max
 */
function splitLongText(s, max) {
  if (s.length <= max) return [s]
  const parts = []
  for (let i = 0; i < s.length; i += max) {
    parts.push(s.slice(i, i + max))
  }
  return parts
}

/**
 * @param {unknown} raw
 * @returns {{ key: string, conv_id: string, conv_title: string, kind: string, message_id: string | null, text: string }[]}
 */
function buildDesiredChunks(raw) {
  if (!raw || typeof raw !== 'object') return []
  const payload = /** @type {{ conversations?: unknown }} */ (raw)
  const list = payload.conversations
  if (!Array.isArray(list)) return []

  /** @type {{ key: string, conv_id: string, conv_title: string, kind: string, message_id: string | null, text: string }[]} */
  const out = []

  for (const c of list) {
    if (!c || typeof c !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (c)
    const id = typeof o.id === 'string' ? o.id : ''
    if (!id) continue
    const title =
      typeof o.title === 'string' && o.title.trim()
        ? o.title.trim().slice(0, 200)
        : 'Conversa'

    const mem = o.memory
    if (mem && typeof mem === 'object') {
      const roll = /** @type {Record<string, unknown>} */ (mem).rollingSummary
      if (typeof roll === 'string' && roll.trim()) {
        const text = `[${title}] Resumo da conversa:\n${roll.trim()}`
        out.push({
          key: `${id}::__summary__`,
          conv_id: id,
          conv_title: title,
          kind: 'summary',
          message_id: null,
          text,
        })
      }
    }

    const messages = o.messages
    if (!Array.isArray(messages)) continue
    for (const m of messages) {
      if (!m || typeof m !== 'object') continue
      const mo = /** @type {Record<string, unknown>} */ (m)
      const role = mo.role
      if (role !== 'user' && role !== 'assistant') continue
      const mid = typeof mo.id === 'string' ? mo.id : ''
      if (!mid) continue
      const msgText = typeof mo.text === 'string' ? mo.text : ''
      const msgVision =
        typeof mo.visionDescription === 'string'
          ? mo.visionDescription.trim()
          : ''
      const flat = messagePlainText({
        text: msgText,
        visionDescription: msgVision || undefined,
      })
      if (!flat.length || flat === 'Pensando…') continue
      if (msgText.trim() === '(imagem anexada)' && !msgVision) continue
      const rolePt = role === 'user' ? 'Pessoa' : 'Luna'
      const prefix = `[${title}] (${rolePt})`
      const pieces = splitLongText(flat, MSG_CHUNK_CHARS)
      pieces.forEach((piece, idx) => {
        const key =
          pieces.length > 1
            ? `${id}::msg::${mid}::p${idx}`
            : `${id}::msg::${mid}`
        out.push({
          key,
          conv_id: id,
          conv_title: title,
          kind: 'message',
          message_id: mid,
          text: `${prefix}\n${piece}`,
        })
      })
    }
  }
  return out
}

/**
 * @param {unknown} raw
 */
async function syncFromPayload(raw) {
  if (!db) {
    return { ok: false, error: 'Índice de conversas não inicializado.' }
  }

  const desired = buildDesiredChunks(raw)
  const desiredKeys = new Set(desired.map((d) => d.key))

  /** @type {Map<string, string>} */
  const existing = new Map()
  const er = db.exec('SELECT chunk_key, text FROM conv_chunks')
  if (er[0]?.values?.length) {
    for (const row of er[0].values) {
      existing.set(String(row[0]), String(row[1]))
    }
  }

  const toRemove = [...existing.keys()].filter((k) => !desiredKeys.has(k))

  /** @type {typeof desired} */
  const toEmbed = []
  for (const d of desired) {
    if (existing.get(d.key) === d.text) continue
    toEmbed.push(d)
  }

  for (const k of toRemove) {
    db.run('DELETE FROM conv_chunks WHERE chunk_key = ?', [k])
  }

  for (const d of toEmbed) {
    db.run('DELETE FROM conv_chunks WHERE chunk_key = ?', [d.key])
  }

  for (let i = 0; i < toEmbed.length; i += EMBED_BATCH) {
    const batch = toEmbed.slice(i, i + EMBED_BATCH)
    const texts = batch.map((b) => b.text)
    const emb = await llmEmbed(texts)
    if (!emb.ok) {
      persistDb()
      return {
        ok: false,
        error: emb.error,
        added: i,
        removed: toRemove.length,
      }
    }
    if (emb.vectors.length !== batch.length) {
      persistDb()
      return {
        ok: false,
        error: 'Número de embeddings inesperado.',
        added: i,
        removed: toRemove.length,
      }
    }
    for (let j = 0; j < batch.length; j++) {
      const row = batch[j]
      const vecJson = JSON.stringify(emb.vectors[j])
      db.run(
        `INSERT INTO conv_chunks (chunk_key, conv_id, conv_title, kind, message_id, text, embedding) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          row.key,
          row.conv_id,
          row.conv_title,
          row.kind,
          row.message_id,
          row.text,
          vecJson,
        ],
      )
    }
  }

  persistDb()
  return {
    ok: true,
    chunksTotal: desired.length,
    reEmbedded: toEmbed.length,
    removed: toRemove.length,
  }
}

/**
 * @param {string} queryText
 */
async function retrieve(queryText) {
  if (!db) {
    return { ok: false, error: 'Índice não inicializado.', text: '' }
  }

  const trimmed = queryText.trim()
  if (!trimmed) {
    return { ok: true, text: '' }
  }

  const countRow = db.exec('SELECT COUNT(*) AS c FROM conv_chunks')
  const n =
    countRow[0]?.values[0]?.[0] != null ? Number(countRow[0].values[0][0]) : 0
  if (n === 0) {
    return { ok: true, text: '' }
  }

  const qEmb = await llmEmbed(trimmed)
  if (!qEmb.ok) {
    return { ok: false, error: qEmb.error, text: '' }
  }
  const queryVec = qEmb.vectors[0]
  if (!queryVec || !queryVec.length) {
    return { ok: false, error: 'Embedding da consulta vazio.', text: '' }
  }

  const rows = db.exec(
    'SELECT conv_title, text, embedding FROM conv_chunks',
  )
  if (!rows[0]?.values?.length) {
    return { ok: true, text: '' }
  }

  /** @type {{ score: number, title: string, text: string }[]} */
  const scored = []
  for (const row of rows[0].values) {
    const title = String(row[0])
    const text = String(row[1])
    let vec
    try {
      vec = JSON.parse(String(row[2]))
    } catch {
      continue
    }
    if (!Array.isArray(vec)) continue
    const score = cosineSimilarity(
      queryVec,
      vec.map((x) => Number(x)),
    )
    scored.push({ score, title, text })
  }

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, TOP_K)

  let body = ''
  let used = 0
  for (let i = 0; i < top.length; i++) {
    const item = top[i]
    const sim = item.score.toFixed(3)
    const line = `\n[${item.title}] (sim ${sim})\n${item.text}\n`
    if (used + line.length > MAX_BLOCK_CHARS) {
      const room = MAX_BLOCK_CHARS - used - 40
      if (room < 120) break
      const clipped = item.text.slice(0, room) + '…'
      body += `\n[${item.title}] (sim ${sim})\n${clipped}\n`
      break
    }
    body += line
    used += line.length
  }

  return { ok: true, text: body.trim() }
}

function clearIndex() {
  if (!db) return { ok: false, error: 'Índice não inicializado.' }
  db.run('DELETE FROM conv_chunks')
  persistDb()
  return { ok: true }
}

module.exports = {
  init,
  getStatus,
  syncFromPayload,
  retrieve,
  clearIndex,
}

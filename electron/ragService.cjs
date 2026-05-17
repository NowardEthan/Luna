const fs = require('fs')
const path = require('path')
const { llmEmbed } = require('./llmHandlers.cjs')

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '__pycache__',
  '.venv',
  'venv',
])
/** Texto / código legível como UTF-8 (sem PDF binário aqui) */
const EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.less',
  '.csv',
  '.log',
  '.py',
  '.rs',
  '.go',
  '.yaml',
  '.yml',
  '.xml',
  '.sql',
  '.sh',
  '.env',
])

const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 120
const EMBED_BATCH = Number(process.env.RAG_EMBED_BATCH || 32)
const TOP_K = Number(process.env.RAG_TOP_K || 6)
const MAX_CONTEXT_CHARS = Number(process.env.RAG_MAX_CONTEXT_CHARS || 4500)

/** @type {import('sql.js').Database | null} */
let db = null
/** @type {string} */
let dbPath = ''

/**
 * @param {string} dir
 * @param {string[]} out
 */
function collectFiles(dir, out) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue
      collectFiles(full, out)
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase()
      if (EXTENSIONS.has(ext)) out.push(full)
    }
  }
}

/**
 * @param {string} text
 */
function chunkText(text) {
  const chunks = []
  const step = CHUNK_SIZE - CHUNK_OVERLAP
  const normalized = text.replace(/\r\n/g, '\n')
  for (let i = 0; i < normalized.length; i += step) {
    const piece = normalized.slice(i, i + CHUNK_SIZE).trim()
    if (piece.length > 0) chunks.push(piece)
    if (i + CHUNK_SIZE >= normalized.length) break
  }
  return chunks
}

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

  dbPath = path.join(electronApp.getPath('userData'), 'rag.sqlite')

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_path TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      embedding TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source_path);
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS rag_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

function getStatus() {
  if (!db) {
    return { ok: false, error: 'Índice de documentos não inicializado.', chunkCount: 0 }
  }
  const row = db.exec('SELECT COUNT(*) AS c FROM chunks')
  const count =
    row[0]?.values[0]?.[0] != null ? Number(row[0].values[0][0]) : 0
  let indexedFolder = ''
  let indexedAt = ''
  try {
    const m = db.exec(`SELECT value FROM rag_meta WHERE key = 'indexed_folder'`)
    indexedFolder =
      m[0]?.values[0]?.[0] != null ? String(m[0].values[0][0]) : ''
    const m2 = db.exec(`SELECT value FROM rag_meta WHERE key = 'indexed_at'`)
    indexedAt = m2[0]?.values[0]?.[0] != null ? String(m2[0].values[0][0]) : ''
  } catch {
    /* ignore */
  }
  return {
    ok: true,
    chunkCount: count,
    indexedFolder,
    indexedAt,
  }
}

function setMeta(key, value) {
  if (!db) return
  db.run(`DELETE FROM rag_meta WHERE key = ?`, [key])
  db.run(`INSERT INTO rag_meta (key, value) VALUES (?, ?)`, [key, value])
}

function humanExtensionList() {
  const list = [...EXTENSIONS].sort()
  return list.join(', ')
}

/**
 * @param {{ source_path: string, chunk_index: number, text: string }[]} flatChunks
 * @param {string} metaFolder valor em rag_meta indexed_folder (vazio = só arquivos avulsos)
 * @param {number} filesScanned
 */
async function embedAndPersistChunks(flatChunks, metaFolder, filesScanned) {
  if (!db) {
    return { ok: false, error: 'Índice de documentos não inicializado.', indexed: 0 }
  }
  db.run('DELETE FROM chunks')

  for (let i = 0; i < flatChunks.length; i += EMBED_BATCH) {
    const batch = flatChunks.slice(i, i + EMBED_BATCH)
    const texts = batch.map((b) => b.text)
    const emb = await llmEmbed(texts)
    if (!emb.ok) {
      return { ok: false, error: emb.error, indexed: i }
    }
    if (emb.vectors.length !== batch.length) {
      return {
        ok: false,
        error: 'Número de embeddings diferente do número de trechos.',
        indexed: i,
      }
    }
    for (let j = 0; j < batch.length; j++) {
      const row = batch[j]
      const vecJson = JSON.stringify(emb.vectors[j])
      db.run(
        `INSERT INTO chunks (source_path, chunk_index, text, embedding) VALUES (?, ?, ?, ?)`,
        [row.source_path, row.chunk_index, row.text, vecJson],
      )
    }
  }

  setMeta('indexed_folder', metaFolder)
  setMeta('indexed_at', new Date().toISOString())
  persistDb()

  return {
    ok: true,
    filesScanned,
    chunksIndexed: flatChunks.length,
    folder: metaFolder,
  }
}

function clearIndex() {
  if (!db) return { ok: false, error: 'Índice de documentos não inicializado.' }
  db.run('DELETE FROM chunks')
  db.run(`DELETE FROM rag_meta`)
  persistDb()
  return { ok: true }
}

/**
 * @param {string} folderPath
 */
async function indexFolder(folderPath) {
  if (!db) return { ok: false, error: 'Índice de documentos não inicializado.' }
  const resolved = path.resolve(folderPath)
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return { ok: false, error: 'Pasta inválida ou inexistente.' }
  }

  const files = []
  collectFiles(resolved, files)

  /** @type {{ path: string, chunks: string[] }[]} */
  const work = []
  for (const fp of files) {
    let raw
    try {
      raw = fs.readFileSync(fp, 'utf8')
    } catch {
      continue
    }
    const parts = chunkText(raw)
    if (parts.length === 0) continue
    work.push({ path: fp, chunks: parts })
  }

  const flatChunks = []
  for (const w of work) {
    w.chunks.forEach((t, i) => {
      flatChunks.push({ source_path: w.path, chunk_index: i, text: t })
    })
  }

  if (flatChunks.length === 0) {
    const exts = humanExtensionList()
    const msg =
      files.length === 0
        ? `Nenhum arquivo com extensão suportada nesta pasta. Formatos: ${exts}.`
        : `Nenhum trecho foi gerado (arquivos vazios ou só com extensões não suportadas). Formatos: ${exts}.`
    return { ok: false, error: msg }
  }

  return embedAndPersistChunks(flatChunks, resolved, work.length)
}

/**
 * Indexa uma lista explícita de arquivos (multi-seleção no diálogo).
 * @param {string[]} paths
 */
async function indexFilePaths(paths) {
  if (!db) return { ok: false, error: 'Índice de documentos não inicializado.' }
  if (!Array.isArray(paths) || paths.length === 0) {
    return { ok: false, error: 'Nenhum arquivo selecionado.' }
  }

  const seen = new Set()
  const work = []
  for (const p of paths) {
    if (typeof p !== 'string') continue
    let resolved
    try {
      resolved = path.resolve(p.trim())
    } catch {
      continue
    }
    if (!resolved || seen.has(resolved)) continue
    seen.add(resolved)
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) continue
    const ext = path.extname(resolved).toLowerCase()
    if (!EXTENSIONS.has(ext)) continue
    let raw
    try {
      raw = fs.readFileSync(resolved, 'utf8')
    } catch {
      continue
    }
    const parts = chunkText(raw)
    if (parts.length === 0) continue
    work.push({ path: resolved, chunks: parts })
  }

  const flatChunks = []
  for (const w of work) {
    w.chunks.forEach((t, i) => {
      flatChunks.push({ source_path: w.path, chunk_index: i, text: t })
    })
  }

  if (flatChunks.length === 0) {
    const exts = humanExtensionList()
    return {
      ok: false,
      error: `Nenhum arquivo compatível ou com texto para indexar. Formatos aceitos: ${exts}.`,
    }
  }

  return embedAndPersistChunks(flatChunks, '', work.length)
}

/**
 * @param {string} queryText
 */
async function retrieve(queryText) {
  if (!db) {
    return { ok: false, error: 'Índice de documentos não inicializado.', context: '', citations: [] }
  }

  const trimmed = queryText.trim()
  if (!trimmed) {
    return { ok: true, context: '', citations: [] }
  }

  const countRow = db.exec('SELECT COUNT(*) AS c FROM chunks')
  const n =
    countRow[0]?.values[0]?.[0] != null ? Number(countRow[0].values[0][0]) : 0
  if (n === 0) {
    return { ok: true, context: '', citations: [] }
  }

  const qEmb = await llmEmbed(trimmed)
  if (!qEmb.ok) {
    return { ok: false, error: qEmb.error, context: '', citations: [] }
  }
  const queryVec = qEmb.vectors[0]
  if (!queryVec || !queryVec.length) {
    return { ok: false, error: 'Não foi possível processar a consulta (embedding vazio).', context: '', citations: [] }
  }

  const rows = db.exec(
    'SELECT id, source_path, chunk_index, text, embedding FROM chunks',
  )
  if (!rows[0]?.values?.length) {
    return { ok: true, context: '', citations: [] }
  }

  /** @type {{ score: number, source_path: string, text: string }[]} */
  const scored = []
  for (const row of rows[0].values) {
    const id = row[0]
    const source_path = String(row[1])
    const text = String(row[3])
    let vec
    try {
      vec = JSON.parse(String(row[4]))
    } catch {
      continue
    }
    if (!Array.isArray(vec)) continue
    const score = cosineSimilarity(
      queryVec,
      vec.map((x) => Number(x)),
    )
    scored.push({ score, source_path, text })
  }

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, TOP_K)

  /** @type {string[]} */
  const parts = []
  /** @type {{ path: string; preview: string }[]} */
  const citations = []
  let total = 0

  for (let i = 0; i < top.length; i++) {
    const item = top[i]
    const header = `--- Trecho ${i + 1} (${item.source_path}) ---`
    const block = `${header}\n${item.text}`
    if (total + block.length > MAX_CONTEXT_CHARS) {
      const remaining = MAX_CONTEXT_CHARS - total - header.length - 20
      if (remaining < 80) break
      const clipped = item.text.slice(0, remaining) + '…'
      parts.push(`${header}\n${clipped}`)
      citations.push({
        path: item.source_path,
        preview: clipped.slice(0, 160),
      })
      break
    }
    parts.push(block)
    total += block.length + 2
    citations.push({
      path: item.source_path,
      preview: item.text.slice(0, 160),
    })
  }

  const context = parts.join('\n\n')
  return { ok: true, context, citations }
}

module.exports = {
  init,
  getStatus,
  clearIndex,
  indexFolder,
  indexFilePaths,
  retrieve,
}

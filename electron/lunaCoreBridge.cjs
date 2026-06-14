/**
 * Bridge Orbit → Luna Core (I2 import nativo + I4 sessões/memória).
 */
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')
const { resolvePipelineConfig } = require('./byokHandlers.cjs')

const DEFAULT_LUNA_CORE_PATH = path.join(
  'C:',
  'Users',
  'ethan',
  'Documents',
  'Core',
  'Luna',
  'src',
  'luna-core',
)

/** @type {Map<string, Promise<object>>} */
const moduleCache = new Map()

function resolveLunaCorePath() {
  if (process.env.LUNA_CORE_PATH?.trim()) {
    return path.resolve(process.env.LUNA_CORE_PATH.trim())
  }
  try {
    const { app } = require('electron')
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'luna-core')
    }
  } catch {
    /* fora do processo Electron */
  }
  return path.resolve(DEFAULT_LUNA_CORE_PATH)
}

function resolveEntryFile(lunaCorePath) {
  const distEntry = path.join(lunaCorePath, 'dist', 'entry-desktop.js')
  if (fs.existsSync(distEntry)) return distEntry
  throw new Error(
    `Luna Core não compilado em "${distEntry}". ` +
      `Execute: npm run luna-core:build`,
  )
}

async function loadLunaCoreModule(lunaCorePath) {
  const cached = moduleCache.get(lunaCorePath)
  if (cached) return cached

  const entry = resolveEntryFile(lunaCorePath)
  const promise = import(pathToFileURL(entry).href).then((mod) => {
    if (typeof mod.executarPipelineCompleto !== 'function') {
      throw new Error('entry-desktop.js não exporta executarPipelineCompleto')
    }
    return mod
  })

  moduleCache.set(lunaCorePath, promise)
  return promise
}

/**
 * @template T
 * @param {(mod: object) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withLunaCore(fn) {
  const lunaCorePath = resolveLunaCorePath()
  const prevCwd = process.cwd()
  const prevNodePath = process.env.NODE_PATH
  const extraNodePath = path.join(lunaCorePath, 'node_modules')
  process.env.NODE_PATH = prevNodePath
    ? `${extraNodePath}${path.delimiter}${prevNodePath}`
    : extraNodePath
  try {
    process.chdir(lunaCorePath)
    const mod = await loadLunaCoreModule(lunaCorePath)
    return await fn(mod)
  } finally {
    process.chdir(prevCwd)
    if (prevNodePath === undefined) {
      delete process.env.NODE_PATH
    } else {
      process.env.NODE_PATH = prevNodePath
    }
  }
}

function normalizeSessaoId(sessaoId) {
  if (!sessaoId || sessaoId === 'undefined' || sessaoId === 'null') return undefined
  return sessaoId
}

function readDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {}
  /** @type {Record<string, string>} */
  const out = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function isProvedorLocalUrl(baseUrl) {
  if (!baseUrl) return false
  try {
    const host = new URL(baseUrl.includes('://') ? baseUrl : `http://${baseUrl}`)
      .hostname
      .toLowerCase()
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host.endsWith('.local')
    )
  } catch {
    return /localhost|127\.0\.0\.1/i.test(baseUrl)
  }
}

function isLunaCoreLocal(lunaCorePath) {
  const env = readDotEnv(path.join(lunaCorePath, '.env'))
  return isProvedorLocalUrl(env.LUNA_API_BASE || '')
}

/**
 * @param {string} lunaCorePath
 * @returns {import('../../Core/Luna/src/luna-core/dist/providers/tipos').ConfigLuna | null}
 */
function buildLocalFallbackConfig(lunaCorePath) {
  const coreEnv = readDotEnv(path.join(lunaCorePath, '.env'))
  const orbitEnv = readDotEnv(path.join(process.cwd(), '.env'))
  const baseUrl =
    orbitEnv.OLLAMA_BASE_URL ||
    coreEnv.LUNA_API_BASE ||
    'http://localhost:1234/v1'
  const apiKey = coreEnv.LUNA_API_KEY || orbitEnv.LUNA_API_KEY || 'lm-studio'
  const modeloMaior =
    orbitEnv.OLLAMA_MODEL ||
    coreEnv.LUNA_MODELO_MAIOR ||
    coreEnv.LUNA_MODELO_MENOR ||
    'local'
  const modeloMenor = coreEnv.LUNA_MODELO_MENOR || modeloMaior

  return {
    apiKey,
    baseUrl,
    modeloMenor,
    modeloMaior,
    temperaturaMenor: 0,
    temperaturaMaior: Number(coreEnv.LUNA_TEMPERATURA_MAIOR ?? 0.85),
    apiKeyMenor: coreEnv.LUNA_API_KEY_MENOR || undefined,
    baseUrlMenor: coreEnv.LUNA_API_BASE_MENOR || undefined,
  }
}

/**
 * @param {{ planId?: string, usedTurns?: number, turnQuota?: number | null } | undefined} billing
 * @param {boolean} isCoreLocal
 */
function shouldBillCloudTurn(billing, isCoreLocal, forceLocal) {
  if (forceLocal || isCoreLocal) return false
  if (!billing) return false
  if (billing.planId === 'byok') return false
  if (billing.turnQuota === null || billing.turnQuota === undefined) return false
  return true
}

/**
 * @param {{ planId?: string, usedTurns?: number, turnQuota?: number | null } | undefined} billing
 */
function isQuotaExceeded(billing) {
  if (!billing) return false
  if (billing.turnQuota === null || billing.turnQuota === undefined) return false
  const used = typeof billing.usedTurns === 'number' ? billing.usedTurns : 0
  return used >= billing.turnQuota
}

/**
 * @param {string} mensagem
 * @param {string | undefined} sessaoId
 * @param {{ contexto_ide?: string, forceLocal?: boolean, billing?: object } | undefined} opcoes
 * @returns {Promise<object>}
 */
async function executarPipeline(mensagem, sessaoId, opcoes) {
  const trimmed = (mensagem || '').trim()
  if (!trimmed) return { error: 'Mensagem vazia' }

  const sid = normalizeSessaoId(sessaoId)
  const contextoIde =
    opcoes && typeof opcoes.contexto_ide === 'string'
      ? opcoes.contexto_ide.trim()
      : ''

  const lunaCorePath = resolveLunaCorePath()
  const isCoreLocal = isLunaCoreLocal(lunaCorePath)
  const billing = opcoes?.billing
  let forceLocal = Boolean(opcoes?.forceLocal)
  let quotaFallbackLocal = false
  let byokMissing = false

  if (
    shouldBillCloudTurn(billing, isCoreLocal, forceLocal) &&
    isQuotaExceeded(billing)
  ) {
    forceLocal = true
    quotaFallbackLocal = true
  }

  const byokUid = opcoes?.byokUid ? String(opcoes.byokUid) : ''
  const byokMeta = opcoes?.byokMeta
  let byokConfig = null
  if (billing?.planId === 'byok' && byokUid && byokMeta) {
    byokConfig = resolvePipelineConfig(byokUid, byokMeta)
    if (!byokConfig) {
      byokMissing = true
      forceLocal = true
    }
  }

  try {
    return await withLunaCore(async (mod) => {
      if (sid && typeof mod.prepararSessaoOrbit === 'function') {
        mod.prepararSessaoOrbit(sid)
      }

      let cross = []
      if (sid && typeof mod.buscarContextoOutrasSessoes === 'function') {
        cross = mod.buscarContextoOutrasSessoes(trimmed, sid)
      }

      /** @type {Record<string, unknown>} */
      const pipelineOpts = {
        sessaoId: sid,
        // V2.3 — superfície vem do renderer (presença no Core); deriva de `forge`
        // como fallback para chamadas antigas sem `ambiente` explícito.
        ambiente: opcoes?.ambiente ?? (opcoes?.forge ? 'forge' : 'desktop'),
        contexto_cross_sessao: cross,
        ...(opcoes?.detalhe_ambiente
          ? { detalhe_ambiente: opcoes.detalhe_ambiente }
          : {}),
        ...(contextoIde ? { contexto_ide: contextoIde } : {}),
      }

      if (byokConfig) {
        pipelineOpts.config = byokConfig
      } else if (forceLocal) {
        const localConfig = buildLocalFallbackConfig(lunaCorePath)
        if (localConfig) {
          pipelineOpts.config = localConfig
        }
      }

      const resultado = await mod.executarPipelineCompleto(trimmed, pipelineOpts)

      const usedCloud =
        billing?.planId === 'byok'
          ? Boolean(byokConfig)
          : shouldBillCloudTurn(billing, isCoreLocal, forceLocal) && !quotaFallbackLocal

      return {
        ...resultado,
        billingMeta: {
          isCoreLocal: byokConfig ? false : isCoreLocal,
          quotaFallbackLocal,
          byokMissing,
          usedCloud,
        },
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[lunaCoreBridge] pipeline falhou:', message)
    return { error: message }
  }
}

/**
 * @param {string} sessaoId
 * @returns {Promise<object>}
 */
async function prepararSessao(sessaoId) {
  const sid = normalizeSessaoId(sessaoId)
  if (!sid) return { ok: false, error: 'sessaoId inválido' }
  try {
    return await withLunaCore(async (mod) => {
      const sessao = mod.prepararSessaoOrbit(sid)
      return { ok: true, sessaoId: sessao.id }
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * @param {string} sessaoId
 * @returns {Promise<object>}
 */
async function refletirSessao(sessaoId) {
  const sid = normalizeSessaoId(sessaoId)
  if (!sid) return { ok: false, error: 'sessaoId inválido' }
  try {
    return await withLunaCore(async (mod) => {
      if (typeof mod.executarReflexaoSessao !== 'function') {
        return { ok: false, error: 'executarReflexaoSessao indisponível' }
      }
      return mod.executarReflexaoSessao(sid)
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * @param {number} [limit]
 * @returns {Promise<object>}
 */
async function listarMemoriaLonga(limit = 80) {
  try {
    return await withLunaCore(async (mod) => {
      if (typeof mod.listarMemoriaLongaResumo !== 'function') {
        return { ok: false, fatos: [], error: 'listarMemoriaLongaResumo indisponível' }
      }
      const fatos = mod.listarMemoriaLongaResumo(limit)
      return { ok: true, fatos }
    })
  } catch (err) {
    return {
      ok: false,
      fatos: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Tool executor para o pipeline agêntico ──────────────────────────────────

const { spawnSync } = require('child_process')

/**
 * Cria o toolExecutor que delega para agentTools do Electron main.
 * @param {object} agentTools
 * @returns {(nome: string, args: Record<string, unknown>) => Promise<string>}
 */
function criarToolExecutor(agentTools) {
  const workspaceRoot = agentTools.getWorkspaceRoot?.() || ''

  return async function toolExecutor(nome, args) {
    switch (nome) {
      case 'read_file': {
        const r = agentTools.readFile(String(args.path ?? ''), 48000)
        if (!r.ok) throw new Error(r.error || 'Erro ao ler arquivo')
        return (r.content || '') + (r.truncated ? '\n…(truncado)' : '')
      }

      case 'write_file': {
        const r = agentTools.writeFile(String(args.path ?? ''), String(args.content ?? ''))
        if (!r.ok) throw new Error(r.error || 'Erro ao escrever arquivo')
        return `Arquivo escrito: ${r.path}`
      }

      case 'apply_patch': {
        const patch = String(args.patch ?? '')
        const cwd = workspaceRoot || '.'
        const r = spawnSync('git', ['apply', '-'], {
          input: patch,
          cwd,
          encoding: 'utf8',
          timeout: 30_000,
          windowsHide: true,
        })
        if (r.status !== 0) {
          throw new Error(`git apply falhou (exit ${r.status}): ${r.stderr || 'sem saída'}`)
        }
        return `Patch aplicado em ${args.path ?? 'arquivo'}`
      }

      case 'list_directory': {
        const r = agentTools.listDirectory(String(args.path ?? workspaceRoot))
        if (!r.ok) throw new Error(r.error || 'Erro ao listar diretório')
        const linhas = r.entries.map(
          (e) => `${e.type === 'directory' ? 'd' : '-'} ${e.name}`,
        )
        return linhas.join('\n') || '(vazio)'
      }

      case 'glob': {
        const r = agentTools.glob(String(args.pattern ?? ''), String(args.cwd ?? workspaceRoot))
        if (!r.ok) throw new Error(r.error || 'Erro no glob')
        return r.paths.map((p) => p.relative || p.path).join('\n') || 'Nenhum arquivo encontrado.'
      }

      case 'grep': {
        const r = agentTools.grep(
          String(args.pattern ?? ''),
          String(args.path ?? workspaceRoot),
          { case_sensitive: args.case_sensitive === 'true' },
        )
        if (!r.ok) throw new Error(r.error || 'Erro no grep')
        return (
          r.matches.map((m) => `${m.path}:${m.line}: ${m.text}`).join('\n') ||
          'Nenhum resultado.'
        )
      }

      case 'run_terminal_command': {
        const r = agentTools.runCommand(
          String(args.command ?? ''),
          String(args.cwd ?? workspaceRoot),
        )
        if (!r.ok) throw new Error(r.error || 'Erro ao executar comando')
        return [
          `Exit code: ${r.exit_code}`,
          r.stdout ? `STDOUT:\n${r.stdout}` : '',
          r.stderr ? `STDERR:\n${r.stderr}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      }

      case 'git_status': {
        const r = agentTools.gitStatus(workspaceRoot)
        if (!r.ok) throw new Error(r.error || 'Erro no git status')
        return r.output || 'Repositório limpo.'
      }

      case 'git_diff': {
        const r = agentTools.gitDiff(workspaceRoot, args.staged === 'true')
        if (r.ok === false) throw new Error(r.error || 'Erro no git diff')
        return r.diff || 'Sem diferenças.'
      }

      case 'git_commit': {
        const msg = String(args.message ?? '').slice(0, 500)
        if (!msg.trim()) throw new Error('Mensagem de commit vazia')
        // Stage all before committing
        spawnSync('git', ['add', '-A'], {
          cwd: workspaceRoot,
          encoding: 'utf8',
          timeout: 30_000,
          windowsHide: true,
        })
        const r = agentTools.gitCommit(workspaceRoot, msg)
        if (!r.ok) throw new Error(`Commit falhou: ${r.stderr || r.output || 'erro desconhecido'}`)
        return `Commit criado: "${msg}"`
      }

      case 'search_codebase': {
        // Fallback: grep semântico no workspace
        const r = agentTools.grep(String(args.query ?? ''), workspaceRoot, {
          case_sensitive: false,
        })
        if (!r.ok) return 'Busca no codebase indisponível.'
        return (
          r.matches
            .slice(0, 20)
            .map((m) => `${m.path}:${m.line}: ${m.text}`)
            .join('\n') || 'Nenhum resultado.'
        )
      }

      default:
        throw new Error(`Ferramenta desconhecida: ${nome}`)
    }
  }
}

/**
 * Pipeline agêntico PAIA — tálamo → planejador → executor → avaliador.
 * @param {Electron.IpcMainInvokeEvent} event
 * @param {string} mensagem
 * @param {{ sessaoId?: string, snapshotWorkspace?: object, forceLocal?: boolean, byokUid?: string, byokMeta?: object }} opcoes
 * @param {object} agentTools
 */
async function executarAgenteIde(event, mensagem, opcoes, agentTools) {
  const trimmed = (mensagem || '').trim()
  if (!trimmed) return { error: 'Mensagem vazia' }

  const sid = normalizeSessaoId(opcoes?.sessaoId)
  const snapshot = opcoes?.snapshotWorkspace ?? {
    workspaceRoot: agentTools?.getWorkspaceRoot?.() ?? '',
    arquivosAbertos: [],
  }

  const lunaCorePath = resolveLunaCorePath()

  const byokUid = opcoes?.byokUid ? String(opcoes.byokUid) : ''
  const byokMeta = opcoes?.byokMeta
  const { resolvePipelineConfig } = require('./byokHandlers.cjs')
  let byokConfig = null
  if (byokUid && byokMeta) {
    byokConfig = resolvePipelineConfig(byokUid, byokMeta)
  }

  const sender = event?.sender
  const notificar = (canal, payload) => {
    try {
      if (sender && !sender.isDestroyed()) sender.send(canal, payload)
    } catch {
      /* ignora se janela fechou */
    }
  }

  const toolExecutor = agentTools ? criarToolExecutor(agentTools) : async () => 'ferramentas indisponíveis'

  try {
    return await withLunaCore(async (mod) => {
      if (typeof mod.executarAgenteIde !== 'function') {
        return {
          error: 'executarAgenteIde não exportado — execute npm run luna-core:build',
        }
      }

      const pipelineOpts = {
        sessaoId: sid,
        // V2.3 — o agente vive sempre no Forge; alimenta o EstadoPresenca do Core.
        ambiente: 'forge',
        ...(opcoes?.detalhe_ambiente
          ? { detalhe_ambiente: opcoes.detalhe_ambiente }
          : {}),
        snapshotWorkspace: snapshot,
        toolExecutor,
        onStatusHint: (hint) => notificar('forge:statusHint', hint),
        onToolCallStart: (nome, args, rodada) =>
          notificar('forge:toolCallStart', { nome, args, rodada }),
        onToolCallComplete: (passo) => notificar('forge:toolCallComplete', passo),
      }

      if (byokConfig) {
        pipelineOpts.config = byokConfig
      } else if (opcoes?.forceLocal || isLunaCoreLocal(lunaCorePath)) {
        const localConfig = buildLocalFallbackConfig(lunaCorePath)
        if (localConfig) pipelineOpts.config = localConfig
      }

      return await mod.executarAgenteIde(trimmed, pipelineOpts)
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[lunaCoreBridge] executarAgenteIde falhou:', message)
    return { error: message }
  }
}

module.exports = {
  executarPipeline,
  executarAgenteIde,
  prepararSessao,
  refletirSessao,
  listarMemoriaLonga,
  resolveLunaCorePath,
  loadLunaCoreModule,
  withLunaCore,
  isLunaCoreLocal,
  readDotEnv,
}

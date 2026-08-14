const { createRequestLogger, log } = require('./logger.cjs')
const { getRecentLogs, getRecentLogsText } = require('./logBuffer.cjs')
const { logHttpResult } = require('./httpLog.cjs')
const path = require('path')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/**
 * @param {import('http').IncomingMessage} req
 */
async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('JSON inválido no corpo do pedido.')
  }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    ...CORS,
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(payload)
}

/**
 * @param {import('http').ServerResponse} res
 * @param {(emit: (msg: Record<string, unknown>) => void) => Promise<unknown>} run
 */
async function sendSse(res, run) {
  res.writeHead(200, {
    ...CORS,
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  const emit = (msg) => {
    res.write(`data: ${JSON.stringify(msg)}\n\n`)
  }

  try {
    const result = await run(emit)
        if (result && typeof result === 'object' && result.ok === false) {
      const err = String(result.error || 'stream falhou')
      log('error', 'llm', `stream falhou — ${err.slice(0, 300)}`, {
        attempts: result.attemptErrors?.length,
      })
      if (Array.isArray(result.attemptErrors)) {
        for (const line of result.attemptErrors.slice(0, 12)) {
          log('error', 'llm', String(line).replace(/^•\s*/, 'tentativa: '))
        }
      }
    }
    emit({ type: 'done', result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    emit({ type: 'error', error: msg })
  }
  res.end()
}

/**
 * @param {Awaited<ReturnType<import('../electron/bootstrap.cjs').createLunaServices>>} services
 */
function createApp(services) {
  const {
    dataDir,
    rag,
    chatMemory,
    agentTools,
    llmChat,
    llmChatStream,
    llmVisionDescribe,
    listLunaModels,
    translateText,
  } = services

  return async function handleRequest(req, res) {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`)
    const method = req.method || 'GET'
    const pathname = url.pathname

    if (method === 'OPTIONS') {
      res.writeHead(204, CORS)
      res.end()
      return
    }

    const isHealthProbe =
      pathname === '/health' && (method === 'GET' || method === 'HEAD')
    const rl = isHealthProbe ? null : createRequestLogger(method, pathname)

    try {
      if (isHealthProbe) {
        if (method === 'HEAD') {
          res.writeHead(200, CORS)
          res.end()
        } else {
          sendJson(res, 200, {
            ok: true,
            service: 'luna-server',
            dataDir,
            time: new Date().toISOString(),
          })
        }
        return
      }

      if (method === 'GET' && pathname === '/v1/diagnostics/logs') {
        const limit = Math.min(
          400,
          Math.max(10, Number(url.searchParams.get('limit') || 120)),
        )
        const entries = getRecentLogs(limit)
        sendJson(res, 200, {
          ok: true,
          lines: entries,
          text: getRecentLogsText(limit),
        })
        rl?.ok({ count: entries.length })
        return
      }

      if (method === 'GET' && pathname === '/v1/diagnostics/llm-runtime') {
        const { getLlmRuntimeInfo } = require('../electron/llmRuntimeInfo.cjs')
        const info = getLlmRuntimeInfo({
          orbitRoot: path.join(__dirname, '..'),
        })
        sendJson(res, 200, info)
        rl?.ok({ mode: info.detectedMode })
        return
      }

      if (method === 'GET' && pathname === '/v1/diagnostics/local-models') {
        const { listLocalModels } = require('../electron/localModelDiscovery.cjs')
        const baseUrl = url.searchParams.get('baseUrl') || 'http://127.0.0.1:1234/v1'
        const apiKey = url.searchParams.get('apiKey') || 'lm-studio'
        const result = await listLocalModels(baseUrl, apiKey)
        sendJson(res, 200, result)
        rl?.ok({ count: result.models?.length ?? 0 })
        return
      }

      if (method === 'GET' && pathname === '/v1/diagnostics/local-models/test') {
        const { testLocalLlm } = require('../electron/localModelDiscovery.cjs')
        const result = await testLocalLlm({
          baseUrl: url.searchParams.get('baseUrl') || 'http://127.0.0.1:1234/v1',
          apiKey: url.searchParams.get('apiKey') || 'lm-studio',
          modeloMaior: url.searchParams.get('modeloMaior') || '',
        })
        sendJson(res, 200, result)
        rl?.ok({ ok: result.ok })
        return
      }

      if (method === 'POST' && pathname === '/v1/diagnostics/local-profile/apply') {
        const { applyLocalProfileToEnv } = require('../electron/applyLocalProfile.cjs')
        const body = await readJsonBody(req)
        const result = applyLocalProfileToEnv(body, path.join(__dirname, '..'))
        sendJson(res, result.ok ? 200 : 400, result)
        rl?.ok({ ok: result.ok })
        return
      }

      if (method === 'GET' && pathname === '/v1/models') {
        const models = listLunaModels()
        sendJson(res, 200, models)
        rl.ok({
          count: models.ok ? models.models?.length : 0,
        })
        return
      }

      if (method === 'POST' && pathname === '/v1/llm/chat') {
        const body = await readJsonBody(req)
        rl.info('llm:chat', {
          provider: body.llm_provider,
          model: body.llm_model,
        })
        const result = await llmChat(body)
        if (!result.ok) {
          log('error', 'llm', 'chat falhou', {
            id: rl.id,
            error: String(result.error || '').slice(0, 800),
            attempts: result.attemptErrors,
          })
        }
        sendJson(res, result.ok ? 200 : 502, result)
        if (result.ok) rl.ok({ provider: body.llm_provider, model: body.llm_model })
        else
          rl.warn('llm chat', {
            error: String(result.error || '').slice(0, 400),
          })
        return
      }

      if (method === 'POST' && pathname === '/v1/llm/chat/stream') {
        const body = await readJsonBody(req)
        rl.info('llm:chatStream', {
          provider: body.llm_provider,
          model: body.llm_model,
        })
        await sendSse(res, (emit) => llmChatStream(body, emit))
        rl.ok({ stream: true })
        return
      }

      if (method === 'POST' && pathname === '/v1/llm/vision') {
        const body = await readJsonBody(req)
        const n = Array.isArray(body.images) ? body.images.length : 0
        rl.info('llm:vision', { images: n })
        const result = await llmVisionDescribe(body)
        sendJson(res, result.ok ? 200 : 502, result)
        if (result.ok) rl.ok({ images: n })
        else
          log('error', 'llm', 'vision falhou', {
            id: rl.id,
            error: String(result.error || '').slice(0, 500),
          })
        return
      }

      if (method === 'POST' && pathname === '/v1/translate') {
        const body = await readJsonBody(req)
        const result = await translateText(body.text ?? '', {
          to: body.to ?? 'pt',
          ...(body.from ? { from: body.from } : {}),
        })
        sendJson(res, result.ok ? 200 : 502, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'GET' && pathname === '/v1/rag/status') {
        sendJson(res, 200, rag.getStatus())
        rl.ok()
        return
      }

      if (method === 'DELETE' && pathname === '/v1/rag') {
        sendJson(res, 200, rag.clearIndex())
        rl.ok()
        return
      }

      if (method === 'POST' && pathname === '/v1/rag/index/folder') {
        const body = await readJsonBody(req)
        const folder = String(body.folderPath ?? body.path ?? '').trim()
        rl.info('rag:indexFolder', { folder })
        const result = await rag.indexFolder(folder)
        sendJson(res, result.ok ? 200 : 400, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/rag/index/files') {
        const body = await readJsonBody(req)
        const paths = Array.isArray(body.filePaths)
          ? body.filePaths.filter((p) => typeof p === 'string')
          : []
        rl.info('rag:indexFiles', { count: paths.length })
        const result = await rag.indexFilePaths(paths)
        sendJson(res, result.ok ? 200 : 400, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/rag/retrieve') {
        const body = await readJsonBody(req)
        const query = String(body.query ?? '').trim()
        const result = await rag.retrieve(query)
        sendJson(res, result.ok ? 200 : 400, result)
        if (result.ok) rl.ok({ citations: result.citations?.length, query })
        else logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/memory/sync') {
        const body = await readJsonBody(req)
        rl.info('memory:sync', {
          conversations: body.conversations?.length,
        })
        const result = await chatMemory.syncFromPayload(body)
        if (!result.ok) {
          const err = String(result.error || '')
          const embedOnly =
            /embed|embedding|Ollama embed|OpenRouter embeddings|Groq embeddings|Together embeddings/i.test(
              err,
            )
          if (embedOnly) rl.info('memory sync: embeddings indisponíveis', { error: err.slice(0, 200) })
          else rl.warn('memory sync parcial', result)
        }
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/memory/retrieve') {
        const body = await readJsonBody(req)
        const result = await chatMemory.retrieve(String(body.query ?? ''))
        sendJson(res, 200, result)
        rl.ok()
        return
      }

      if (method === 'GET' && pathname === '/v1/memory/status') {
        sendJson(res, 200, chatMemory.getStatus())
        rl.ok()
        return
      }

      if (method === 'DELETE' && pathname === '/v1/memory') {
        sendJson(res, 200, chatMemory.clearIndex())
        rl.ok()
        return
      }

      if (method === 'POST' && pathname === '/v1/tools/list-directory') {
        const body = await readJsonBody(req)
        const result = agentTools.listDirectory(String(body.path ?? ''))
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/tools/read-file') {
        const body = await readJsonBody(req)
        const result = agentTools.readFile(
          String(body.path ?? ''),
          body.max_chars,
        )
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/tools/web-search') {
        const body = await readJsonBody(req)
        rl.info('tools:webSearch', { query: body.query })
        const result = await agentTools.webSearch(String(body.query ?? ''))
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/tools/set-workspace-root') {
        const body = await readJsonBody(req)
        const result = agentTools.setWorkspaceRoot(
          body.path ? String(body.path) : '',
        )
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/tools/set-workspace-roots') {
        const body = await readJsonBody(req)
        const paths = Array.isArray(body.paths)
          ? body.paths.map((p) => String(p ?? ''))
          : []
        const result = agentTools.setWorkspaceRoots(paths)
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/tools/write-file') {
        const body = await readJsonBody(req)
        const result = agentTools.writeFile(
          String(body.path ?? ''),
          String(body.content ?? ''),
        )
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/tools/grep') {
        const body = await readJsonBody(req)
        const result = agentTools.grep(
          String(body.pattern ?? body.query ?? ''),
          body.path ? String(body.path) : undefined,
          { case_sensitive: body.case_sensitive === true },
        )
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/tools/glob') {
        const body = await readJsonBody(req)
        const result = agentTools.glob(
          String(body.pattern ?? ''),
          body.path ? String(body.path) : undefined,
        )
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/tools/run-command') {
        const body = await readJsonBody(req)
        const result = agentTools.runCommand(
          String(body.command ?? ''),
          body.cwd ? String(body.cwd) : undefined,
          { gui: body.gui === true },
        )
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/tools/git-status') {
        const body = await readJsonBody(req)
        const result = agentTools.gitStatus(
          body.path ? String(body.path) : undefined,
        )
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/tools/git-diff') {
        const body = await readJsonBody(req)
        const result = agentTools.gitDiff(
          body.path ? String(body.path) : undefined,
          body.staged === true,
        )
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      if (method === 'POST' && pathname === '/v1/tools/git-commit') {
        const body = await readJsonBody(req)
        const result = agentTools.gitCommit(
          body.path ? String(body.path) : undefined,
          String(body.message ?? ''),
        )
        sendJson(res, 200, result)
        logHttpResult(rl, body, result)
        return
      }

      sendJson(res, 404, { ok: false, error: 'Rota não encontrada.' })
      rl?.fail(404)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (err instanceof Error && err.stack) {
        log('error', 'stack', err.stack)
      }
      sendJson(res, 500, { ok: false, error: msg })
      rl?.fail(500, { error: msg })
    }
  }
}

module.exports = { createApp }

const path = require('path')

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
})

const http = require('http')
const { createLunaServices } = require('../electron/bootstrap.cjs')
const { createApp } = require('./app.cjs')
const { log } = require('./logger.cjs')

const PORT = Number(process.env.LUNA_SERVER_PORT || 39281)
const HOST = process.env.LUNA_SERVER_HOST || '127.0.0.1'

async function main() {
  log('info', 'boot', 'A iniciar serviços Luna…')
  const services = await createLunaServices()
  log('info', 'boot', `Dados em ${services.dataDir}`)

  const handle = createApp(services)
  const server = http.createServer((req, res) => {
    void handle(req, res)
  })

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      log(
        'error',
        'boot',
        `Porta ${PORT} já em uso — o servidor Luna já está a correr.`,
      )
      log(
        'info',
        'boot',
        'Não executes `node server/index.cjs` outra vez. Usa só `npm run dev` (já inclui o servidor) ou fecha o processo anterior.',
      )
      log('info', 'boot', `Teste: curl http://${HOST}:${PORT}/health`)
      log(
        'info',
        'boot',
        'Windows: netstat -ano | findstr :39281  depois  taskkill /PID <pid> /F',
      )
      process.exit(1)
      return
    }
    log('error', 'boot', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })

  server.listen(PORT, HOST, () => {
    log('ok', 'boot', `Luna server em http://${HOST}:${PORT}`)
    log('info', 'boot', 'Endpoints: GET /health · POST /v1/llm/chat · POST /v1/llm/chat/stream · …')
    log(
      'info',
      'boot',
      'Falhas de tools/LLM aparecem em vermelho [error] com mensagem, path e detalhe (não só ok:false).',
    )
  })

  const shutdown = () => {
    log('warn', 'boot', 'A encerrar servidor…')
    server.close(() => process.exit(0))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  log('error', 'boot', err instanceof Error ? err.message : String(err))
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
})

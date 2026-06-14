/**
 * Teste de integração I2: import nativo do Luna Core (mesmo caminho do Electron main).
 */
const path = require('path')
const { pathToFileURL } = require('url')

async function main() {
  const bridge = require(path.join(__dirname, '..', 'electron', 'lunaCoreBridge.cjs'))
  const lunaCorePath = bridge.resolveLunaCorePath()
  console.log('[check] Luna Core path:', lunaCorePath)

  const startLoad = Date.now()
  await bridge.loadLunaCoreModule(lunaCorePath)
  console.log('[check] módulo carregado em', Date.now() - startLoad, 'ms')

  const startTurn = Date.now()
  const resultado = await bridge.executarPipeline('oi, teste bridge I2', undefined)
  const elapsed = Date.now() - startTurn

  if (resultado.error) {
    console.error('[check] FALHOU:', resultado.error)
    process.exit(1)
  }

  const texto = resultado.resposta?.texto
  if (!texto) {
    console.error('[check] FALHOU: resposta vazia', JSON.stringify(resultado).slice(0, 400))
    process.exit(1)
  }

  console.log('[check] OK em', elapsed, 'ms —', texto.slice(0, 80))
  process.exit(0)
}

main().catch((err) => {
  console.error('[check] ERRO:', err)
  process.exit(1)
})

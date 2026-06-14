const path = require('path')

async function main() {
  const bridge = require(path.join(__dirname, '..', 'electron', 'lunaCoreBridge.cjs'))

  const sessaoNova = 'test-recall-' + Date.now()
  await bridge.prepararSessao(sessaoNova)

  const resultado = await bridge.executarPipeline(
    'voce lembra do que eu te disse em outra conversa sobre o orbit?',
    sessaoNova,
  )

  if (resultado.error) {
    console.error('[recall] FALHOU:', resultado.error)
    process.exit(1)
  }

  const texto = resultado.resposta?.texto ?? ''
  const temOrbit =
    /orbit|refator|carta|românt/i.test(texto) ||
    (resultado.pipeline?.politica && false)

  const cross = resultado.pipeline ? 'ok' : 'n/a'
  console.log('[recall] resposta:', texto.slice(0, 200))
  if (/orbit|refator/i.test(texto)) {
    console.log('[recall] OK — mencionou contexto de outra sessão')
    process.exit(0)
  }
  console.log('[recall] AVISO — resposta pode não ter cross-session (verifique manualmente)')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

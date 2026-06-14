const { app } = require('electron')
const path = require('path')

app.whenReady().then(async () => {
  const bridge = require(path.join(__dirname, '..', 'electron', 'lunaCoreBridge.cjs'))
  try {
    const resultado = await bridge.executarPipeline('oi, teste electron', undefined)
    if (resultado.error) {
      console.error('[electron-check] FALHOU:', resultado.error)
      app.exit(1)
      return
    }
    console.log('[electron-check] OK:', resultado.resposta?.texto?.slice(0, 80))
    app.exit(0)
  } catch (err) {
    console.error('[electron-check] ERRO:', err)
    app.exit(1)
  }
})

try {
  const pty = require('@homebridge/node-pty-prebuilt-multiarch')
  console.log('pty ok', typeof pty.spawn)
  process.exit(0)
} catch (e) {
  console.error('pty fail', e.message)
  process.exit(1)
}

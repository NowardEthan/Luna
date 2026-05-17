/**
 * Garante que o Vite está acessível antes de abrir o Electron em dev.
 */
const http = require('http')

const VITE_URL = 'http://127.0.0.1:5173'
const TIMEOUT_MS = 120_000
const INTERVAL_MS = 1000

function probe() {
  return new Promise((resolve) => {
    const req = http.get(VITE_URL, { timeout: 2000 }, (res) => {
      res.resume()
      resolve(res.statusCode >= 200 && res.statusCode < 500)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function main() {
  const start = Date.now()
  process.stdout.write(`A aguardar Vite em ${VITE_URL} ...`)

  while (Date.now() - start < TIMEOUT_MS) {
    if (await probe()) {
      process.stdout.write(' OK\n')
      return
    }
    process.stdout.write('.')
    await new Promise((r) => setTimeout(r, INTERVAL_MS))
  }

  console.error(`
\n[ERRO] Vite nao responde em ${VITE_URL}

O Electron precisa do Vite em desenvolvimento.

  Opcao A (recomendado):  npm run dev
                          ou duplo-clique em dev.bat

  Opcao B (2 terminais):
    Terminal 1:  npm run dev:web
    Terminal 2:  npm run dev:electron
`)
  process.exit(1)
}

main()

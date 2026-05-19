/**
 * Login Google no Electron via navegador do sistema (mesmo fluxo do projeto Luna).
 * Evita COOP, loops de redirect e oauth-bridge no Chromium embutido.
 */
const http = require('http')
const crypto = require('crypto')
const { URL } = require('url')
const { shell } = require('electron')

const OAUTH_PORT = 5167
/** Web client OAuth do Firebase (projeto luna-8787d) — sobrescrever com .env */
const DEFAULT_GOOGLE_WEB_CLIENT_ID =
  '529601808898-nmlorgto19a1smpagh6vj33mn4b1g2qi.apps.googleusercontent.com'

const AUTH_LANDING_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Luna</title></head>
<body><p>A concluir login…</p>
<script>
  const hash = window.location.hash.substring(1);
  window.location.href = '/callback?' + new URLSearchParams(hash).toString();
</script></body></html>`

const CALLBACK_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Luna — Login</title>
<style>
  body { font-family: system-ui, sans-serif; background: #161618; color: #e8e8ea;
    display: grid; place-items: center; min-height: 100vh; margin: 0; }
</style></head>
<body><p>Login concluído. Podes fechar esta aba e voltar à Luna.</p></body></html>`

function readGoogleClientId() {
  const fromEnv = process.env.GOOGLE_OAUTH_WEB_CLIENT_ID?.trim()
  return fromEnv || DEFAULT_GOOGLE_WEB_CLIENT_ID
}

/**
 * @returns {Promise<{ ok: true, idToken: string, accessToken?: string } | { ok: false, error: string }>}
 */
function startGoogleLogin() {
  const clientId = readGoogleClientId()
  if (!clientId) {
    return Promise.resolve({
      ok: false,
      error: 'Define GOOGLE_OAUTH_WEB_CLIENT_ID no .env (OAuth Web client do Firebase).',
    })
  }

  return new Promise((resolve) => {
    let settled = false
    /** @type {import('http').Server | null} */
    let server = null

    const finish = (payload) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      try {
        server?.close()
      } catch {
        /* ignore */
      }
      resolve(payload)
    }

    const timeout = setTimeout(
      () => finish({ ok: false, error: 'Tempo esgotado (5 min). Tenta outra vez.' }),
      5 * 60 * 1000,
    )

    server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url || '/', `http://127.0.0.1:${OAUTH_PORT}`)

        if (reqUrl.pathname === '/auth-landing') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(AUTH_LANDING_HTML)
          return
        }

        if (reqUrl.pathname === '/callback') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(CALLBACK_HTML)

          const idToken = reqUrl.searchParams.get('id_token')
          const accessToken = reqUrl.searchParams.get('access_token')

          if (idToken) {
            console.log('[Luna OAuth] Tokens recebidos.')
            finish({
              ok: true,
              idToken,
              accessToken: accessToken || undefined,
            })
          } else {
            const err = reqUrl.searchParams.get('error_description') ||
              reqUrl.searchParams.get('error') ||
              'Sem id_token no callback.'
            finish({ ok: false, error: String(err) })
          }
        }
      } catch (err) {
        console.error('[Luna OAuth]', err)
        res.writeHead(500)
        res.end('Erro')
        finish({
          ok: false,
          error: err instanceof Error ? err.message : 'Erro no servidor OAuth.',
        })
      }
    })

    server.on('error', (err) => {
      finish({ ok: false, error: err.message })
    })

    server.listen(OAUTH_PORT, '127.0.0.1', () => {
      const redirectUri = `http://127.0.0.1:${OAUTH_PORT}/auth-landing`
      const state = crypto.randomBytes(16).toString('hex')
      const nonce = crypto.randomBytes(16).toString('hex')

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'id_token token')
      authUrl.searchParams.set('scope', 'openid email profile')
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('nonce', nonce)
      authUrl.searchParams.set('prompt', 'select_account')

      console.log('[Luna OAuth] A abrir browser do sistema:', redirectUri)
      void shell.openExternal(authUrl.toString())
    })
  })
}

/** @param {import('electron').IpcMain} ipcMain */
function registerGoogleOAuth(ipcMain) {
  ipcMain.handle('auth:googleSignIn', () => startGoogleLogin())
}

module.exports = { registerGoogleOAuth, startGoogleLogin, OAUTH_PORT }

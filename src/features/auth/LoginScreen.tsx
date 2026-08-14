/**
 * LoginScreen — versão standalone do legacy.
 *
 * Design system legacy (Tailwind v4):
 *   canvas    #1e1e1e   surface    #252526   raised    #2d2d2d
 *   line      #3c3c3c   line-subtle #2a2a2a
 *   fg        #d4d4d4   fg-dim     #9d9d9d    fg-muted  #6e6e6e
 *   accent    #8b7cf8   accent-muted #1c1829  accent-fg #ffffff
 *   danger    #f87171   warning    #fbbf24
 */
import { useEffect, useState, type ReactNode } from 'react'

export type LoginMode = 'entrar' | 'criar'

export interface LoginScreenProps {
  defaultMode?: LoginMode
  onModeChange?: (mode: LoginMode) => void
  onSubmit?: (data: {
    mode: LoginMode
    email: string
    password: string
    name?: string
  }) => void | Promise<void>
  onGoogle?: () => void | Promise<void>
  error?: string
  loading?: boolean
}

// ── Field + inline SVG icons (sem dependência de lucide-react) ─────────
function Field({
  label,
  placeholder,
  value,
  onChange,
  icon,
  type = 'text',
  rightSlot,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  icon?: ReactNode
  type?: string
  rightSlot?: ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors"
        style={{ color: focused ? 'var(--color-accent)' : 'var(--color-fg-muted)' }}
      >
        {label}
      </label>
      <div
        className="flex items-center gap-2.5 rounded-xl px-3 transition-all duration-150"
        style={{
          backgroundColor: 'var(--color-canvas)',
          border: `1px solid ${focused ? 'var(--color-accent)' : 'var(--color-line)'}`,
          minHeight: 44,
          boxShadow: focused ? '0 0 0 1px var(--color-accent)' : 'none',
        }}
      >
        {icon && (
          <span
            className="transition-colors"
            style={{ color: focused ? 'var(--color-accent)' : 'var(--color-fg-muted)' }}
          >
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-body placeholder:opacity-50 focus:outline-none"
          style={{ color: 'var(--color-fg)' }}
        />
        {rightSlot}
      </div>
    </div>
  )
}

export function LoginScreen({
  defaultMode = 'entrar',
  onModeChange,
  onSubmit,
  onGoogle,
  error,
  loading,
}: LoginScreenProps) {
  const [mode, setMode] = useState<LoginMode>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const isLoading = loading ?? false

  useEffect(() => {
    onModeChange?.(mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || (mode === 'criar' && !name)) return
    void onSubmit?.({
      mode,
      email,
      password,
      name: mode === 'criar' ? name : undefined,
    })
  }

  const switchMode = () => {
    setMode((m) => {
      const next: LoginMode = m === 'entrar' ? 'criar' : 'entrar'
      onModeChange?.(next)
      return next
    })
    setName('')
  }

  const handleForgotPassword = () => {
    if (email) {
      void window.alert(
        `Se houver uma conta vinculada a ${email}, enviaremos um link de redefinição.`,
      )
    } else {
      window.alert('Informe o email primeiro.')
    }
  }

  return (
    <div className="w-full">
      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-xl p-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-line-subtle)',
        }}
      >
        {mode === 'criar' && (
          <Field
            label="Nome"
            placeholder="Como a Luna te chama"
            value={name}
            onChange={setName}
            icon={<UserIcon />}
            type="text"
          />
        )}

        <Field
          label="Email"
          placeholder="voce@email.com"
          value={email}
          onChange={setEmail}
          icon={<MailIcon />}
          type="email"
        />

        <Field
          label="Senha"
          placeholder={mode === 'criar' ? 'Mínimo 8 caracteres' : 'Sua senha'}
          value={password}
          onChange={setPassword}
          icon={<LockIcon />}
          type={showPassword ? 'text' : 'password'}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="flex size-6 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-raised hover:text-fg-dim focus-visible:outline-none"
              aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
        />

        {mode === 'entrar' && (
          <div className="flex justify-end -mt-1">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="rounded-md px-1 text-[11px] font-medium text-accent transition-colors hover:text-accent/80 focus-visible:outline-none focus-visible:underline"
            >
              Esqueci a senha
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !email || !password || (mode === 'criar' && !name)}
          className="luna-btn-primary h-9 w-full px-4 text-[12px] font-semibold disabled:!cursor-not-allowed disabled:!opacity-40"
        >
          {isLoading ? (
            <div
              className="size-3.5 animate-spin rounded-full border-2"
              style={{
                borderColor: 'rgba(255,255,255,0.35)',
                borderTopColor: 'var(--color-accent-fg)',
              }}
            />
          ) : (
            <span>{mode === 'criar' ? 'Criar conta' : 'Entrar'}</span>
          )}
        </button>

        {error && (
          <div className="luna-callout-danger text-ui" role="alert">
            {error}
          </div>
        )}

        {/* Google OAuth */}
        <button
          type="button"
          onClick={() => void onGoogle?.()}
          disabled={isLoading}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-[12px] font-medium text-[#1f2937] transition-all hover:bg-white/95 active:scale-[0.98] disabled:!cursor-not-allowed disabled:!opacity-40"
        >
          <GoogleGlyph />
          <span>Google</span>
        </button>
      </form>

      {/* Toggle mode */}
      <div className="mt-3 text-center text-[11px]">
        <span className="text-fg-muted">
          {mode === 'entrar' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
        </span>
        <button
          type="button"
          onClick={switchMode}
          className="font-medium text-accent transition-colors hover:text-accent/80 focus-visible:outline-none focus-visible:underline"
        >
          {mode === 'entrar' ? 'Criar' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}

// ── Google "G" multicolorido (igual à web) ─────────────────────────────
function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2 14.1-5.4l-6.5-5.5C29.5 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.5 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4 5.7l6.5 5.5c-.5.5 6.7-4.9 6.7-15.2 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

// ── Inline SVG icons (sem dependência de lucide-react) ─────────────────
function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}
import { useTranslation } from 'react-i18next'

export function AppBootSkeleton() {
  const { t } = useTranslation()

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-canvas"
      aria-busy
      aria-label={t('boot.loading')}
    >
      <div className="h-9 shrink-0 border-b border-line bg-sidebar" />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-11 shrink-0 flex-col items-center gap-2 border-r border-line bg-sidebar py-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="size-9 animate-pulse rounded-md bg-raised" />
          ))}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-line px-4 py-3">
            <div className="mx-auto max-w-3xl space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-raised" />
              <div className="h-8 w-full max-w-md animate-pulse rounded-lg bg-raised" />
            </div>
          </header>
          <div className="flex-1 space-y-4 px-4 py-6">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="ml-auto h-16 w-2/3 animate-pulse rounded-2xl bg-raised" />
              <div className="h-24 w-4/5 animate-pulse rounded-2xl bg-raised" />
              <div className="ml-auto h-12 w-1/2 animate-pulse rounded-2xl bg-raised" />
            </div>
          </div>
          <footer className="shrink-0 border-t border-line px-4 py-3">
            <div className="mx-auto h-28 max-w-3xl animate-pulse rounded-2xl bg-composer-well" />
          </footer>
        </div>
      </div>
    </div>
  )
}

import { useTranslation } from 'react-i18next'

export function ForgeDebugPanel() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-[12px] font-medium text-fg-dim">
        {t('forge.debug.title')}
      </p>
      <p className="max-w-md text-[11px] text-fg-muted">
        {t('forge.debug.placeholder')}
      </p>
    </div>
  )
}

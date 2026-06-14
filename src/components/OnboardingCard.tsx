import { Trans, useTranslation } from 'react-i18next'

const STORAGE_KEY = 'luna-onboarding-v1'

type Props = {
  onDismiss: () => void
}

export function readOnboardingDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissOnboarding(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function OnboardingCard({ onDismiss }: Props) {
  const { t } = useTranslation()

  return (
    <li className="luna-card-vivid px-5 py-4">
      <h3 className="text-body font-semibold tracking-tight text-fg">{t('onboarding.title')}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-ui text-fg-dim">
        <li>
          <Trans
            i18nKey="onboarding.bullet_chat"
            components={{ strong: <strong className="text-fg" /> }}
          />
        </li>
        <li>
          <Trans
            i18nKey="onboarding.bullet_mentions"
            components={{ code: <code className="rounded bg-raised px-1" /> }}
          />
        </li>
        <li>
          <Trans
            i18nKey="onboarding.bullet_model"
            components={{ kbd: <kbd className="rounded bg-raised px-1" /> }}
          />
        </li>
      </ul>
      <button
        type="button"
        className="luna-btn-primary mt-4"
        onClick={onDismiss}
      >
        {t('onboarding.dismiss')}
      </button>
    </li>
  )
}

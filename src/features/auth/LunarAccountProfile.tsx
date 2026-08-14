import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BRAND_APP_NAME } from '../../brand'
import { formatBytes } from '../../lib/formatBytes'
import { lunaStatusDotClass } from '../../lib/lunaVisual'
import { isRealLunarUser } from '../../lib/lunarAccount'
import { readLunaCloudConfig } from '../../lib/lunaCloud'
import { cloudSyncService } from '../sync/cloudSyncService'
import { useCloudSyncTick } from '../sync/useCloudSyncTick'
import { useLunaAuth } from './AuthProvider'
import { CloudStorageQuotaBar } from './CloudStorageQuotaBar'
import { useLunarAccountStats } from './useLunarAccountStats'

type Props = {
  onClose?: () => void
}

function UserAvatar({
  name,
  email,
  photoUrl,
}: {
  name: string
  email?: string | null
  photoUrl?: string | null
}) {
  const initial = (name || email || '?').trim().charAt(0).toUpperCase()
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className="size-14 shrink-0 rounded-full object-cover ring-2 ring-line"
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xl font-semibold text-accent ring-2 ring-line">
      {initial}
    </span>
  )
}

function MetricRow({
  label,
  local,
  remote,
}: {
  label: string
  local: string
  remote?: string
}) {
  return (
    <div className="grid grid-cols-[6rem_1fr_1fr] items-baseline gap-x-3 gap-y-0 text-ui">
      <span className="text-fg-muted">{label}</span>
      <span className="font-medium text-fg">{local}</span>
      <span className="font-medium text-fg-dim">{remote ?? '—'}</span>
    </div>
  )
}

export function LunarAccountProfile({ onClose }: Props) {
  const { t, i18n } = useTranslation()
  const auth = useLunaAuth()
  const cloud = useMemo(() => readLunaCloudConfig(), [])
  const signedIn = isRealLunarUser(auth.user)
  const cloudActive = auth.isLunarConnected
  const showRemote = cloudActive && cloud.syncEnabled
  const { local, remote, remoteLoading, remoteError, storage, storageLoading } =
    useLunarAccountStats(showRemote, auth.plan)
  useCloudSyncTick()
  const sync = cloudSyncService.getStatus()
  const [syncing, setSyncing] = useState(false)

  const displayName =
    auth.user?.displayName ||
    auth.user?.email?.split('@')[0] ||
    t('lunarAccount.profile.defaultName')
  const email = auth.user?.email ?? null

  const syncLabel = sync.lastSyncAt
    ? new Date(sync.lastSyncAt).toLocaleString(i18n.language, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : t('lunarAccount.profile.syncNever')

  const remoteConv = remoteLoading
    ? '…'
    : remoteError
      ? '—'
      : remote
        ? String(remote.conversationCount)
        : '—'

  const remoteSize = remoteLoading
    ? '…'
    : remoteError
      ? '—'
      : remote
        ? formatBytes(remote.estimatedBytes)
        : '—'

  const handleSync = async () => {
    setSyncing(true)
    try {
      await cloudSyncService.pullFromCloud()
    } finally {
      setSyncing(false)
    }
  }

  const handleSignOut = async () => {
    // signOutUser já abre o gate de login — não fechar aqui.
    await auth.signOut()
  }

  const handleDeleteAccount = async () => {
    try {
      // deleteAccount → onAuthStateChanged dispara com user=null → gate abre
      await auth.deleteAccount()
    } catch (err) {
      // erro já foi setado em auth.error pelo provider
      console.warn('[Luna] Apagar conta:', err)
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-start">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={displayName}
            email={email}
            photoUrl={auth.user?.photoURL}
          />
          <div className="min-w-0">
            <h2
              id="lunar-account-title"
              className="truncate text-title font-semibold text-fg"
            >
              {displayName}
            </h2>
            {email ? (
              <p className="truncate text-ui text-fg-muted">{email}</p>
            ) : null}
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[10px] font-medium text-fg-dim">
              <span
                className={lunaStatusDotClass(cloudActive ? 'success' : 'warning')}
                aria-hidden
              />
              {cloudActive
                ? t('lunarAccount.profile.statusCloud', { appName: BRAND_APP_NAME })
                : t('lunarAccount.profile.statusNoSession')}
            </p>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          {cloudActive && cloud.syncEnabled ? (
            <button
              type="button"
              className="luna-btn-primary w-full px-4 py-2.5"
              disabled={syncing || sync.pushing}
              onClick={() => void handleSync()}
            >
              {syncing || sync.pushing
                ? t('lunarAccount.profile.syncing')
                : t('lunarAccount.profile.syncNow')}
            </button>
          ) : null}

          <div className="flex gap-2">
            {signedIn ? (
              <>
                <button
                  type="button"
                  className="luna-btn-secondary flex-1 px-3 py-2 text-ui text-danger"
                  onClick={() => void handleSignOut()}
                >
                  {t('lunarAccount.profile.signOut')}
                </button>
                <button
                  type="button"
                  className="luna-btn-secondary px-3 py-2 text-ui text-danger"
                  aria-label="Apagar conta"
                  disabled={auth.auraBusy}
                  onClick={() => {
                    if (typeof window !== 'undefined' && !window.confirm('Apagar a conta? Esta ação não pode ser desfeita.')) {
                      return
                    }
                    void handleDeleteAccount()
                  }}
                >
                  {t('lunarAccount.profile.deleteAccount') ?? 'Apagar'}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {auth.error ? (
          <p className="luna-callout-danger text-ui" role="alert">
            {auth.error}
          </p>
        ) : null}
      </div>

      <div className="luna-card flex flex-col gap-4 !p-4">
        {storage ? (
          <CloudStorageQuotaBar quota={storage.quota} loading={storageLoading} />
        ) : null}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
            {t('lunarAccount.profile.cloudSummary')}
          </p>
          {showRemote ? <RemoteStatsHeader t={t} /> : null}
          <div className="mt-3 space-y-2">
            <MetricRow
              label={t('lunarAccount.profile.metricConversations')}
              local={`${local.conversationsInCloud}${local.conversationsTotal > local.conversationsInCloud ? ` / ${local.conversationsTotal}` : ''}`}
              remote={showRemote ? remoteConv : undefined}
            />
            <MetricRow
              label={t('lunarAccount.profile.metricFolders')}
              local={`${local.foldersInCloud}${local.foldersTotal > local.foldersInCloud ? ` / ${local.foldersTotal}` : ''}`}
            />
            <MetricRow
              label={t('lunarAccount.profile.metricMessages')}
              local={String(local.messagesInCloud)}
            />
            <MetricRow
              label={t('lunarAccount.profile.metricSize')}
              local={formatBytes(local.estimatedBytes)}
              remote={showRemote ? remoteSize : undefined}
            />
          </div>
          {showRemote && remoteError ? (
            <p className="luna-callout-danger mt-2">{remoteError}</p>
          ) : null}
          {cloudActive ? (
            <p className="mt-3 border-t border-line-subtle pt-2.5 text-[11px] text-fg-muted">
              {t('lunarAccount.profile.lastSync', {
                date: syncLabel,
                errorSuffix: sync.lastError ? ` · ${sync.lastError}` : '',
              })}
            </p>
          ) : (
            <p className="mt-3 text-[11px] text-fg-muted">
              {t('lunarAccount.profile.cloudHint')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function RemoteStatsHeader({ t }: { t: (key: string) => string }) {
  return (
    <div className="mt-2 grid grid-cols-[6rem_1fr_1fr] gap-x-3 text-[9px] font-medium uppercase tracking-wide text-fg-muted">
      <span />
      <span>{t('lunarAccount.profile.colThisPc')}</span>
      <span>{t('lunarAccount.profile.colFirestore')}</span>
    </div>
  )
}

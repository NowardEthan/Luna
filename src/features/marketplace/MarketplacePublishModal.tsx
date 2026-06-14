import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MARKETPLACE_CATEGORY_IDS,
  marketplaceCategoryLabel,
  type MarketplaceCategoryId,
} from '../../lib/marketplaceCatalog'
import {
  applyLunaAccountToPublishDrafts,
  type LunaPublisherAccount,
} from '../../lib/marketplacePublisherAccount'
import { LunaFilePickerField } from '../../components/files/LunaFilePickerField'
import {
  MARKETPLACE_ZIP_MAX_BYTES,
  MARKETPLACE_ZIP_MAX_MB,
} from '../../lib/marketplaceLimits'
import {
  applyInspectToListing,
  defaultListingDraft,
  defaultProfileDraft,
  fetchMyMarketplacePublications,
  inspectMarketplaceZip,
  MARKETPLACE_PUBLISH_PERMISSIONS,
  publishMarketplaceAddon,
  type MarketplaceMyPublication,
} from '../../lib/marketplacePublish'

type Props = {
  open: boolean
  serverReady: boolean
  needsSignIn: boolean
  accountAllowed: boolean
  lunarAccount: LunaPublisherAccount | null
  onClose: () => void
  onSignIn: () => void
  onPublished: (catalogUrl: string) => void
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="border-t border-line-subtle pt-5 first:border-0 first:pt-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
        {title}
      </h3>
      {hint ? <p className="mt-0.5 text-[11px] text-fg-muted">{hint}</p> : null}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-medium text-fg-dim">{children}</label>
  )
}

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-ui text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'

export function MarketplacePublishModal({
  open,
  serverReady,
  needsSignIn,
  accountAllowed,
  lunarAccount,
  onClose,
  onSignIn,
  onPublished,
}: Props) {
  const { t } = useTranslation()
  const canUseForm = serverReady && !needsSignIn && accountAllowed
  const [listing, setListing] = useState(defaultListingDraft)
  const [profile, setProfile] = useState(defaultProfileDraft)
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [inspected, setInspected] = useState(false)
  const [myPublications, setMyPublications] = useState<MarketplaceMyPublication[]>([])

  const reset = useCallback(() => {
    setListing(defaultListingDraft())
    setProfile(defaultProfileDraft())
    setZipFile(null)
    setBannerFile(null)
    setScreenshots([])
    setError(null)
    setSuccess(null)
    setInspected(false)
    setMyPublications([])
  }, [])

  const loadMyPublications = useCallback(async () => {
    if (!lunarAccount || !serverReady) return
    try {
      const items = await fetchMyMarketplacePublications()
      setMyPublications(items)
    } catch {
      setMyPublications([])
    }
  }, [lunarAccount, serverReady])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    if (lunarAccount) {
      const drafts = applyLunaAccountToPublishDrafts(lunarAccount)
      setListing(drafts.listing)
      setProfile(drafts.profile)
      void loadMyPublications()
    }
  }, [open, lunarAccount, reset, loadMyPublications])

  async function handleInspect(file: File) {
    setBusy(true)
    setError(null)
    try {
      const result = await inspectMarketplaceZip(file)
      setListing((prev) => applyInspectToListing(prev, result))
      setInspected(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('marketplace.publish.errorReadPackage'))
      setInspected(false)
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish() {
    if (!zipFile) {
      setError(t('marketplace.publish.errorZipRequired'))
      return
    }
    if (!listing.pluginId.trim()) {
      setError(t('marketplace.publish.errorInspectFirst'))
      return
    }
    if (!listing.name.trim() || !listing.description.trim()) {
      setError(t('marketplace.publish.errorNameDesc'))
      return
    }

    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await publishMarketplaceAddon({
        zipFile,
        listing,
        profile,
        bannerFile,
        screenshotFiles: screenshots,
      })
      setSuccess(
        t('marketplace.publish.success', {
          name: result.listing.name ?? listing.name,
          version: result.version,
        }),
      )
      onPublished(result.catalogUrl)
      void loadMyPublications()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('marketplace.publish.errorPublish'))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="luna-overlay-scrim fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
      role="presentation"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="marketplace-publish-title"
        className="luna-dialog luna-marketplace-modal flex max-h-[min(92vh,52rem)] w-full max-w-2xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              {t('marketplace.page.storeBadge')}
            </p>
            <h2 id="marketplace-publish-title" className="text-lg font-semibold text-fg">
              {t('marketplace.publish.title')}
            </h2>
            <p className="mt-1 text-[11px] text-fg-muted">
              {t('marketplace.publish.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="luna-modal-close shrink-0 disabled:opacity-50"
            aria-label={t('marketplace.publish.closeAria')}
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {needsSignIn ? (
            <div className="rounded-xl border border-line-subtle bg-surface px-4 py-6 text-center">
              <p className="text-ui text-fg-dim">
                {t('marketplace.publish.signInPrompt')}
              </p>
              <button
                type="button"
                className="luna-btn-primary mt-4 px-4 py-2 text-ui"
                onClick={onSignIn}
              >
                {t('marketplace.publish.signIn')}
              </button>
            </div>
          ) : !serverReady ? (
            <div className="rounded-xl border border-warning bg-warning-muted px-4 py-4 text-[12px] leading-relaxed text-fg-dim">
              {t('marketplace.publish.serverRequired')}
            </div>
          ) : !accountAllowed ? (
            <div className="rounded-xl border border-warning bg-warning-muted px-4 py-4 text-[12px] leading-relaxed text-fg-dim">
              {t('marketplace.publish.notAllowed')}
            </div>
          ) : (
            <div className="space-y-0">
              {lunarAccount ? (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-line-subtle bg-surface px-3 py-2.5">
                  {lunarAccount.photoURL ? (
                    <img
                      src={lunarAccount.photoURL}
                      alt=""
                      className="size-11 shrink-0 rounded-full object-cover ring-1 ring-line"
                    />
                  ) : (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent">
                      {lunarAccount.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                      {t('marketplace.publish.publishingAs')}
                    </p>
                    <p className="truncate text-ui font-semibold text-fg">
                      {lunarAccount.displayName}
                    </p>
                    <p className="truncate text-[11px] text-fg-muted">
                      {lunarAccount.handle}
                      {lunarAccount.email ? ` · ${lunarAccount.email}` : ''}
                    </p>
                  </div>
                </div>
              ) : null}

              {myPublications.length > 0 ? (
                <section className="mb-5 rounded-xl border border-line-subtle bg-raised/40 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                    {t('marketplace.publish.myPublications')}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {myPublications.map((pub) => (
                      <li
                        key={pub.id}
                        className="flex flex-wrap items-center gap-2 text-[11px] text-fg-dim"
                      >
                        <span className="font-medium text-fg">{pub.name}</span>
                        <span className="text-fg-muted">v{pub.version}</span>
                        {pub.updatedAt ? (
                          <span className="text-fg-muted">· {pub.updatedAt.slice(0, 10)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <Section
                title={t('marketplace.publish.sectionPackage')}
                hint={t('marketplace.publish.sectionPackageHint', { maxMb: MARKETPLACE_ZIP_MAX_MB })}
              >
                <LunaFilePickerField
                  label={t('marketplace.publish.packageLabel')}
                  accept={{
                    extensions: ['.zip'],
                    maxBytesPerFile: MARKETPLACE_ZIP_MAX_BYTES,
                  }}
                  disabled={busy}
                  valueLabel={
                    zipFile
                      ? `${inspected ? '✓' : '…'} ${zipFile.name}${listing.pluginId ? ` — ${listing.pluginId}` : ''}`
                      : null
                  }
                  onSelect={(files) => {
                    const file = files[0] ?? null
                    setZipFile(file)
                    setInspected(false)
                    if (file) void handleInspect(file)
                  }}
                />
              </Section>

              <Section title={t('marketplace.publish.sectionListing')}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>{t('marketplace.publish.pluginId')}</FieldLabel>
                    <input
                      className={inputClass + ' opacity-70'}
                      value={listing.pluginId}
                      readOnly
                      placeholder={t('marketplace.publish.pluginIdPlaceholder')}
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('marketplace.publish.version')}</FieldLabel>
                    <input
                      className={inputClass}
                      value={listing.version}
                      onChange={(e) =>
                        setListing((s) => ({ ...s, version: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>{t('marketplace.publish.name')}</FieldLabel>
                  <input
                    className={inputClass}
                    value={listing.name}
                    onChange={(e) => setListing((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel>{t('marketplace.publish.shortDescription')}</FieldLabel>
                  <textarea
                    className={inputClass + ' min-h-[4rem] resize-y'}
                    value={listing.description}
                    onChange={(e) =>
                      setListing((s) => ({ ...s, description: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>{t('marketplace.publish.author')}</FieldLabel>
                    <input
                      className={inputClass}
                      value={listing.author}
                      onChange={(e) => setListing((s) => ({ ...s, author: e.target.value }))}
                      placeholder={t('marketplace.publish.authorPlaceholder')}
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('marketplace.publish.category')}</FieldLabel>
                    <select
                      className={inputClass}
                      value={listing.category}
                      onChange={(e) =>
                        setListing((s) => ({
                          ...s,
                          category: e.target.value as MarketplaceCategoryId,
                        }))
                      }
                    >
                      {MARKETPLACE_CATEGORY_IDS.map((id) => (
                          <option key={id} value={id}>
                            {marketplaceCategoryLabel(id)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div>
                  <FieldLabel>{t('marketplace.publish.tags')}</FieldLabel>
                  <input
                    className={inputClass}
                    value={listing.tags}
                    onChange={(e) => setListing((s) => ({ ...s, tags: e.target.value }))}
                    placeholder={t('marketplace.publish.tagsPlaceholder')}
                  />
                </div>
                <div>
                  <FieldLabel>{t('marketplace.publish.permissions')}</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {MARKETPLACE_PUBLISH_PERMISSIONS.map((perm) => {
                      const on = listing.permissions.includes(perm)
                      return (
                        <label
                          key={perm}
                          className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-mono ring-1 ${
                            on
                              ? 'bg-accent-muted text-accent ring-accent/40'
                              : 'bg-raised text-fg-dim ring-line'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            onChange={() =>
                              setListing((s) => ({
                                ...s,
                                permissions: on
                                  ? s.permissions.filter((p) => p !== perm)
                                  : [...s.permissions, perm],
                              }))
                            }
                          />
                          {perm}
                        </label>
                      )
                    })}
                  </div>
                </div>
              </Section>

              <Section
                title={t('marketplace.publish.sectionProfile')}
                hint={t('marketplace.publish.profileHint')}
              >
                <div>
                  <FieldLabel>{t('marketplace.publish.longDescription')}</FieldLabel>
                  <textarea
                    className={inputClass + ' min-h-[6rem] resize-y font-mono text-[11px]'}
                    value={profile.longDescription}
                    onChange={(e) =>
                      setProfile((s) => ({ ...s, longDescription: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <FieldLabel>{t('marketplace.publish.publisher')}</FieldLabel>
                    <input
                      className={inputClass}
                      value={profile.publisherName}
                      onChange={(e) =>
                        setProfile((s) => ({ ...s, publisherName: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('marketplace.publish.handle')}</FieldLabel>
                    <input
                      className={inputClass}
                      value={profile.publisherHandle}
                      onChange={(e) =>
                        setProfile((s) => ({ ...s, publisherHandle: e.target.value }))
                      }
                      placeholder={t('marketplace.publish.handlePlaceholder')}
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('marketplace.publish.url')}</FieldLabel>
                    <input
                      className={inputClass}
                      value={profile.publisherUrl}
                      onChange={(e) =>
                        setProfile((s) => ({ ...s, publisherUrl: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>{t('marketplace.publish.highlights')}</FieldLabel>
                  <textarea
                    className={inputClass + ' min-h-[4rem] resize-y'}
                    value={profile.highlightsText}
                    onChange={(e) =>
                      setProfile((s) => ({ ...s, highlightsText: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <FieldLabel>{t('marketplace.publish.requirements')}</FieldLabel>
                  <textarea
                    className={inputClass + ' min-h-[3rem] resize-y'}
                    value={profile.requirementsText}
                    onChange={(e) =>
                      setProfile((s) => ({ ...s, requirementsText: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>{t('marketplace.publish.features')}</FieldLabel>
                  {profile.features.map((f, i) => (
                    <div
                      key={i}
                      className="grid gap-2 rounded-lg border border-line-subtle p-2 sm:grid-cols-2"
                    >
                      <input
                        className={inputClass}
                        placeholder={t('marketplace.publish.featureTitlePlaceholder')}
                        value={f.title}
                        onChange={(e) =>
                          setProfile((s) => {
                            const next = [...s.features]
                            next[i] = { ...next[i], title: e.target.value }
                            return { ...s, features: next }
                          })
                        }
                      />
                      <input
                        className={inputClass}
                        placeholder={t('marketplace.publish.featureDescPlaceholder')}
                        value={f.description}
                        onChange={(e) =>
                          setProfile((s) => {
                            const next = [...s.features]
                            next[i] = { ...next[i], description: e.target.value }
                            return { ...s, features: next }
                          })
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-[11px] text-accent hover:underline"
                    onClick={() =>
                      setProfile((s) => ({
                        ...s,
                        features: [...s.features, { title: '', description: '' }],
                      }))
                    }
                  >
                    {t('marketplace.publish.addFeature')}
                  </button>
                </div>
                <div className="space-y-2">
                  <FieldLabel>{t('marketplace.publish.examples')}</FieldLabel>
                  {profile.examples.map((ex, i) => (
                    <div key={i} className="space-y-2 rounded-lg border border-line-subtle p-2">
                      <input
                        className={inputClass}
                        placeholder={t('marketplace.publish.featureTitlePlaceholder')}
                        value={ex.title}
                        onChange={(e) =>
                          setProfile((s) => {
                            const next = [...s.examples]
                            next[i] = { ...next[i], title: e.target.value }
                            return { ...s, examples: next }
                          })
                        }
                      />
                      <textarea
                        className={inputClass + ' min-h-[3rem] font-mono text-[11px]'}
                        placeholder={t('marketplace.publish.examplePromptPlaceholder')}
                        value={ex.code}
                        onChange={(e) =>
                          setProfile((s) => {
                            const next = [...s.examples]
                            next[i] = { ...next[i], code: e.target.value }
                            return { ...s, examples: next }
                          })
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-[11px] text-accent hover:underline"
                    onClick={() =>
                      setProfile((s) => ({
                        ...s,
                        examples: [...s.examples, { title: '', description: '', code: '' }],
                      }))
                    }
                  >
                    {t('marketplace.publish.addExample')}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>{t('marketplace.publish.minLuna')}</FieldLabel>
                    <input
                      className={inputClass}
                      value={profile.minLunaVersion}
                      onChange={(e) =>
                        setProfile((s) => ({ ...s, minLunaVersion: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('marketplace.publish.releaseDate')}</FieldLabel>
                    <input
                      type="date"
                      className={inputClass}
                      value={profile.releasedAt}
                      onChange={(e) =>
                        setProfile((s) => ({ ...s, releasedAt: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </Section>

              <Section title={t('marketplace.publish.sectionMedia')}>
                <LunaFilePickerField
                  label={t('marketplace.publish.banner')}
                  hint={t('marketplace.publish.bannerHint')}
                  accept={{ extensions: ['.png', '.jpg', '.jpeg', '.webp'], maxBytesPerFile: 8 * 1024 * 1024 }}
                  disabled={busy}
                  valueLabel={bannerFile?.name ?? null}
                  onSelect={(files) => setBannerFile(files[0] ?? null)}
                />
                <LunaFilePickerField
                  label={t('marketplace.publish.screenshots')}
                  accept={{ extensions: ['.png', '.jpg', '.jpeg', '.webp'], maxFiles: 3 }}
                  multiple
                  disabled={busy}
                  valueLabel={
                    screenshots.length
                      ? screenshots.map((f) => f.name).join(', ')
                      : null
                  }
                  onSelect={(files) => setScreenshots(files.slice(0, 3))}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>{t('marketplace.publish.site')}</FieldLabel>
                    <input
                      className={inputClass}
                      value={listing.homepageUrl}
                      onChange={(e) =>
                        setListing((s) => ({ ...s, homepageUrl: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('marketplace.publish.repository')}</FieldLabel>
                    <input
                      className={inputClass}
                      value={listing.repositoryUrl}
                      onChange={(e) =>
                        setListing((s) => ({ ...s, repositoryUrl: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>{t('marketplace.publish.documentation')}</FieldLabel>
                  <input
                    className={inputClass}
                    value={profile.documentationUrl}
                    onChange={(e) =>
                      setProfile((s) => ({ ...s, documentationUrl: e.target.value }))
                    }
                  />
                </div>
              </Section>
            </div>
          )}

          {error ? (
            <p className="mt-4 rounded-lg border border-danger bg-danger-muted px-3 py-2 text-ui text-danger">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-4 rounded-lg border border-success bg-success-muted px-3 py-2 text-ui text-success">
              {success}
            </p>
          ) : null}
        </div>

        <footer className="flex shrink-0 flex-col gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            className="luna-btn-secondary order-2 w-full py-2.5 text-ui sm:order-1 sm:w-auto"
            disabled={busy}
            onClick={onClose}
          >
            {t('marketplace.publish.cancel')}
          </button>
          {canUseForm ? (
            <button
              type="button"
              className="luna-btn-primary order-1 w-full py-2.5 text-ui sm:order-2 sm:min-w-[10rem]"
              disabled={busy || !zipFile || !inspected}
              onClick={() => void handlePublish()}
            >
              {busy ? t('marketplace.publish.publishing') : t('marketplace.publish.submit')}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  )
}

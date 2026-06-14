import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AssistantMarkdown } from '../../components/AssistantMarkdown'
import type { MarketplaceListing } from '../../lib/marketplaceCatalog'
import type {
  MarketplaceListingProfile,
  MarketplacePublisher,
} from '../../lib/marketplaceProfile'

type Props = {
  item: MarketplaceListing
  profile: MarketplaceListingProfile
}

function ProfileSection({
  title,
  hint,
  children,
  className = '',
}: {
  title: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`border-t border-line-subtle pt-5 first:border-0 first:pt-0 ${className}`}>
      <div className="mb-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
          {title}
        </h3>
        {hint ? <p className="mt-0.5 text-[11px] text-fg-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-raised px-2.5 py-1 text-[11px] ring-1 ring-line-subtle">
      <span className="text-fg-muted">{label}</span>
      <span className="font-medium text-fg-dim">{value}</span>
    </span>
  )
}

export function MarketplacePublisherRow({
  profile,
  fallbackAuthor,
}: {
  profile?: MarketplacePublisher
  fallbackAuthor: string
}) {
  const { t } = useTranslation()
  const pub = profile ?? { name: fallbackAuthor }
  const initial = pub.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="luna-card flex items-center gap-3 !p-3">
      {pub.avatarUrl ? (
        <img
          src={pub.avatarUrl}
          alt=""
          className="size-11 shrink-0 rounded-full object-cover ring-1 ring-line"
        />
      ) : (
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent"
          aria-hidden
        >
          {initial}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {pub.url ? (
          <a
            href={pub.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ui font-semibold text-fg hover:text-accent"
          >
            {pub.name}
          </a>
        ) : (
          <p className="text-ui font-semibold text-fg">{pub.name}</p>
        )}
        {pub.handle ? (
          <p className="text-[11px] text-fg-muted">{pub.handle}</p>
        ) : (
          <p className="text-[11px] text-fg-muted">
            {t('marketplace.profile.publisherFallback')}
          </p>
        )}
      </div>
    </div>
  )
}

export function MarketplaceListingProfileView({ item, profile }: Props) {
  const { t } = useTranslation()
  const hasMeta =
    profile.releasedAt || profile.profileUpdatedAt || profile.minLunaVersion

  return (
    <div className="mt-5 space-y-0">
      <MarketplacePublisherRow profile={profile.publisher} fallbackAuthor={item.author} />

      {hasMeta ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.releasedAt ? (
            <MetaChip label={t('marketplace.profile.released')} value={profile.releasedAt} />
          ) : null}
          {profile.minLunaVersion ? (
            <MetaChip
              label={t('marketplace.profile.minLuna')}
              value={`v${profile.minLunaVersion}`}
            />
          ) : null}
          <MetaChip
            label={t('marketplace.profile.currentVersion')}
            value={`v${item.version}`}
          />
        </div>
      ) : null}

      {profile.highlights && profile.highlights.length > 0 ? (
        <ProfileSection
          title={t('marketplace.profile.highlightsTitle')}
          hint={t('marketplace.profile.highlightsHint')}
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {profile.highlights.map((line) => (
              <li
                key={line}
                className="luna-card flex gap-2 !p-3 text-[12px] leading-snug text-fg-dim"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </ProfileSection>
      ) : null}

      {profile.longDescription ? (
        <ProfileSection title={t('marketplace.profile.aboutTitle')}>
          <div className="text-ui leading-relaxed text-fg-dim [&_p]:mb-2 [&_p:last-child]:mb-0">
            <AssistantMarkdown content={profile.longDescription} variant="compact" />
          </div>
        </ProfileSection>
      ) : null}

      {profile.screenshots && profile.screenshots.length > 0 ? (
        <ProfileSection title={t('marketplace.profile.screenshotsTitle')}>
          <div className="space-y-4">
            {profile.screenshots.map((shot, i) => (
              <figure
                key={shot.url + i}
                className="luna-card overflow-hidden !p-0"
              >
                <img
                  src={shot.url}
                  alt={shot.caption ?? t('marketplace.profile.screenshotAlt')}
                  className="w-full object-contain object-top"
                  loading="lazy"
                />
                {shot.caption ? (
                  <figcaption className="border-t border-line-subtle bg-canvas px-3 py-2 text-[11px] leading-snug text-fg-muted">
                    {shot.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </ProfileSection>
      ) : null}

      {profile.features && profile.features.length > 0 ? (
        <ProfileSection title={t('marketplace.profile.featuresTitle')}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {profile.features.map((f) => (
              <li
                key={f.title}
                className="luna-card !p-3"
              >
                <p className="text-ui font-medium text-fg">{f.title}</p>
                {f.description ? (
                  <p className="mt-1 text-[11px] leading-snug text-fg-muted">{f.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </ProfileSection>
      ) : null}

      {profile.examples && profile.examples.length > 0 ? (
        <ProfileSection
          title={t('marketplace.profile.examplesTitle')}
          hint={t('marketplace.profile.examplesHint')}
        >
          <div className="space-y-3">
            {profile.examples.map((ex) => (
              <div
                key={ex.title}
                className="luna-card overflow-hidden !p-0"
              >
                <div className="border-b border-line-subtle px-3 py-2">
                  <p className="text-ui font-medium text-fg">{ex.title}</p>
                  {ex.description ? (
                    <p className="mt-0.5 text-[11px] text-fg-muted">{ex.description}</p>
                  ) : null}
                </div>
                {ex.code ? (
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words bg-raised px-3 py-2.5 text-[11px] leading-relaxed text-fg-dim">
                    {ex.code}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        </ProfileSection>
      ) : null}

      {profile.requirements && profile.requirements.length > 0 ? (
        <ProfileSection title={t('marketplace.profile.requirementsTitle')}>
          <ul className="space-y-1.5 text-ui text-fg-dim">
            {profile.requirements.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-fg-muted" aria-hidden>
                  •
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </ProfileSection>
      ) : null}

      {(profile.documentationUrl || (profile.docs && profile.docs.length > 0)) ? (
        <ProfileSection title={t('marketplace.profile.docsTitle')}>
          <div className="luna-card flex flex-col gap-2 !p-3">
            {profile.documentationUrl ? (
              <a
                href={profile.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ui text-accent hover:underline"
              >
                {t('marketplace.profile.docsMain')}
              </a>
            ) : null}
            {profile.docs?.map((doc) => (
              <a
                key={doc.url}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ui text-fg-dim hover:text-accent"
              >
                {doc.label} →
              </a>
            ))}
          </div>
        </ProfileSection>
      ) : null}

      {profile.changelog && profile.changelog.length > 0 ? (
        <ProfileSection title={t('marketplace.profile.changelogTitle')}>
          <ol className="space-y-2">
            {profile.changelog.map((entry) => (
              <li
                key={entry.version}
                className="luna-card !p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-accent-muted px-2 py-0.5 text-[11px] font-semibold text-accent">
                    v{entry.version}
                  </span>
                  {entry.version === item.version ? (
                    <span className="text-[10px] font-medium text-success">
                      {t('marketplace.profile.changelogCurrent')}
                    </span>
                  ) : null}
                  {entry.date ? (
                    <span className="text-[10px] text-fg-muted">{entry.date}</span>
                  ) : null}
                </div>
                {entry.notes ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-fg-dim">{entry.notes}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </ProfileSection>
      ) : null}
    </div>
  )
}

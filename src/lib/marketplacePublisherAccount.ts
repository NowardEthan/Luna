import type { User } from 'firebase/auth'
import type {
  MarketplacePublishListingDraft,
  MarketplacePublishProfileDraft,
} from './marketplacePublish'
import { defaultListingDraft, defaultProfileDraft } from './marketplacePublish'

export type LunaPublisherAccount = {
  uid: string
  displayName: string
  email: string | null
  photoURL: string | null
  handle: string
}

export function lunaPublisherFromUser(user: User): LunaPublisherAccount {
  const email = user.email?.trim() || null
  const displayName =
    user.displayName?.trim() ||
    (email ? email.split('@')[0] : '') ||
    'Conta Luna'
  const handle = email ? `@${email.split('@')[0]}` : `@${user.uid.slice(0, 8)}`

  return {
    uid: user.uid,
    displayName,
    email,
    photoURL: user.photoURL,
    handle,
  }
}

export function applyLunaAccountToPublishDrafts(
  account: LunaPublisherAccount,
): {
  listing: MarketplacePublishListingDraft
  profile: MarketplacePublishProfileDraft
} {
  const listing = defaultListingDraft()
  listing.author = account.displayName

  const profile = defaultProfileDraft()
  profile.publisherName = account.displayName
  profile.publisherHandle = account.handle
  if (account.photoURL) {
    // avatarUrl no perfil vem do servidor se não enviado; opcional no cliente
  }

  return { listing, profile }
}

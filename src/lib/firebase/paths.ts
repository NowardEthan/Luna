/** Caminhos Firestore — alinhados com regras em `firestore.rules`. */

export const LUNA_FS = {
  users: 'users',
  marketplaceCatalog: 'marketplaceCatalog',
  marketplaceListings: 'listings',
  conversations: 'conversations',
  memoryNotes: 'memoryNotes',
  settings: 'settings',
  pluginInstalls: 'pluginInstalls',
} as const

export function userDoc(uid: string): string {
  return `${LUNA_FS.users}/${uid}`
}

export function userConversationDoc(uid: string, conversationId: string): string {
  return `${userDoc(uid)}/${LUNA_FS.conversations}/${conversationId}`
}

export function userConversationMessageDoc(
  uid: string,
  conversationId: string,
  messageId: string,
): string {
  return `${userConversationDoc(uid, conversationId)}/messages/${messageId}`
}

export function userSettingsDoc(uid: string): string {
  return `${userDoc(uid)}/${LUNA_FS.settings}/app`
}

export function marketplaceListingDoc(listingId: string): string {
  return `${LUNA_FS.marketplaceCatalog}/${LUNA_FS.marketplaceListings}/${listingId}`
}

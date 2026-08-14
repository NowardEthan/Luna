/** Caminhos Firestore — alinhados com regras em `firestore.rules`. */

export const LUNA_FS = {
  users: 'users',
  marketplaceCatalog: 'marketplaceCatalog',
  marketplaceListings: 'listings',
  conversations: 'conversations',
  memoryNotes: 'memoryNotes',
  settings: 'settings',
  pluginInstalls: 'pluginInstalls',
  financeAccounts: 'financeAccounts',
  financeCategories: 'financeCategories',
  financeTransactions: 'financeTransactions',
  financeBudgets: 'financeBudgets',
  financeGoals: 'financeGoals',
  financeRecurring: 'financeRecurring',
  financeBills: 'financeBills',
  financeCreditCards: 'financeCreditCards',
  financePiggyBanks: 'financePiggyBanks',
  financePiggyBankTx: 'financePiggyBankTx',
  financeTags: 'financeTags',
  financeNotifications: 'financeNotifications',
  financeMeta: 'financeMeta',
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

/** Path da subcoleção `messages` (sem message id) — usado em collection()/getDocs(). */
export function userConversationMessageCol(
  uid: string,
  conversationId: string,
): string {
  return `${userConversationDoc(uid, conversationId)}/messages`
}

export function userSettingsDoc(uid: string): string {
  return `${userDoc(uid)}/${LUNA_FS.settings}/app`
}

export function marketplaceListingDoc(listingId: string): string {
  return `${LUNA_FS.marketplaceCatalog}/${LUNA_FS.marketplaceListings}/${listingId}`
}

export function userUsageDoc(uid: string, monthKey: string): string {
  return `${userDoc(uid)}/usage/${monthKey}`
}

/** Metadados BYOK (sem chaves — segredos no cofre local Electron). */
export function userByokConfigDoc(uid: string): string {
  return `${userDoc(uid)}/byok/config`
}

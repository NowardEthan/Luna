export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit'
  | 'cash'
  | 'investment'
  | 'other'

export type CategoryKind = 'income' | 'expense'

export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment'

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly'

export type BillStatus = 'pending' | 'paid'

export type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'other'

export type CardStatus = 'active' | 'blocked' | 'cancelled'

export type PiggyTxType = 'deposit' | 'withdrawal'

export type NotificationType =
  | 'budget_limit'
  | 'overdue_bill'
  | 'card_due'
  | 'low_balance'
  | 'recurring_pending'

export type NotificationPriority = 'critical' | 'warning' | 'info'

export type FinanceAccount = {
  id: string
  name: string
  type: AccountType
  currency: string
  initialBalance: number
  color?: string
  archived?: boolean
  updatedAt: string
}

export type FinanceCategory = {
  id: string
  name: string
  kind: CategoryKind
  icon?: string
  parentId?: string
  updatedAt: string
}

export type FinanceTransaction = {
  id: string
  accountId: string
  categoryId?: string
  amount: number
  type: TransactionType
  date: string
  description: string
  tags?: string[]
  transferPairId?: string
  recurringId?: string
  creditCardId?: string
  installmentTotal?: number
  installmentCurrent?: number
  installmentGroupId?: string
  updatedAt: string
}

export type FinanceBudget = {
  id: string
  categoryId: string
  month: string
  limitAmount: number
  updatedAt: string
}

export type FinanceGoal = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: string
  color?: string
  updatedAt: string
}

export type FinanceRecurring = {
  id: string
  accountId: string
  categoryId: string
  amount: number
  type: TransactionType
  frequency: RecurringFrequency
  nextDueDate: string
  active: boolean
  description: string
  creditCardId?: string
  updatedAt: string
}

export type FinanceBill = {
  id: string
  description: string
  amount: number
  dueDate: string
  categoryId?: string
  notes?: string
  status: BillStatus
  paidAt?: string
  transactionId?: string
  updatedAt: string
}

export type FinanceCreditCard = {
  id: string
  name: string
  limit: number
  dueDay: number
  closingDay: number
  lastFour?: string
  brand: CardBrand
  color?: string
  notes?: string
  status: CardStatus
  updatedAt: string
}

export type FinancePiggyBank = {
  id: string
  name: string
  description?: string
  targetAmount?: number
  currentAmount: number
  color?: string
  icon?: string
  goalId?: string
  updatedAt: string
}

export type FinancePiggyBankTx = {
  id: string
  piggyBankId: string
  amount: number
  type: PiggyTxType
  description?: string
  date: string
  updatedAt: string
}

export type FinanceTag = {
  id: string
  label: string
  color: string
  updatedAt: string
}

export type FinanceNotification = {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  date: string
  read: boolean
  linkTab?: FinancesTab
  updatedAt: string
}

/** id → ISO deletedAt — impede que o pull ressuscite itens apagados localmente. */
export type FinanceTombstones = Partial<{
  accounts: Record<string, string>
  categories: Record<string, string>
  transactions: Record<string, string>
  budgets: Record<string, string>
  goals: Record<string, string>
  recurring: Record<string, string>
  bills: Record<string, string>
  creditCards: Record<string, string>
  piggyBanks: Record<string, string>
  piggyBankTx: Record<string, string>
  tags: Record<string, string>
  notifications: Record<string, string>
}>

export type FinanceMeta = {
  defaultCurrency: string
  lastSyncAt?: string
  schemaVersion: number
  tombstones?: FinanceTombstones
}

export type FinancesState = {
  meta: FinanceMeta
  accounts: FinanceAccount[]
  categories: FinanceCategory[]
  transactions: FinanceTransaction[]
  budgets: FinanceBudget[]
  goals: FinanceGoal[]
  recurring: FinanceRecurring[]
  bills: FinanceBill[]
  creditCards: FinanceCreditCard[]
  piggyBanks: FinancePiggyBank[]
  piggyBankTx: FinancePiggyBankTx[]
  tags: FinanceTag[]
  notifications: FinanceNotification[]
}

export type FinancesTab =
  | 'dashboard'
  | 'accounts'
  | 'transactions'
  | 'budgets'
  | 'goals'
  | 'recurring'
  | 'bills'
  | 'cards'
  | 'piggy'
  | 'reports'
  | 'analytics'
  | 'notifications'

export const FINANCES_SCHEMA_VERSION = 2

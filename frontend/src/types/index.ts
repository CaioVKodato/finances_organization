export interface CardDependent {
  id: number
  cardId: number
  name: string
  sortOrder: number | null
}

export interface Card {
  id: number
  name: string
  lastFourDigits: string | null
  colorHex: string
  invoiceClosingDay: number | null
  /** ISO-8601 instant; última importação de fatura (CSV) concluída */
  lastStatementImportAt?: string | null
  dependents: CardDependent[]
}

export interface StatementPreviewLine {
  lineHash: string
  expenseDate: string
  amount: number
  description: string
}

export interface StatementPreviewResponse {
  lastStatementImportAt: string | null
  skippedAlreadyImported: number
  lines: StatementPreviewLine[]
}

export interface Expense {
  id: number
  cardId: number
  cardName: string
  cardColorHex: string
  amount: number
  description: string
  expenseDate: string
  spentBySelf: boolean
  dependentPersonId: number | null
  dependentPersonName: string | null
  notes: string | null
  installmentGroupId: string | null
  installmentIndex: number | null
  installmentCount: number | null
  totalPurchaseAmount: number | null
  splitGroupId: string | null
  splitPartIndex: number | null
  splitPartCount: number | null
}

export interface DashboardSummary {
  totalAll: number
  byCard: { cardId: number; cardName: string; colorHex: string; total: number }[]
  bySpentBy: Record<string, number>
  monthlyIncome: number
  spentSelfInCurrentCalendarMonth: number
  spentAllInCurrentCalendarMonth: number
  remainingBudget: number
  cardInvoices: {
    cardId: number
    cardName: string
    colorHex: string
    invoicePeriodStart: string
    invoicePeriodEnd: string
    invoiceTotal: number
  }[]
}

export interface Settings {
  monthlyIncome: number
}

/** Chaves em bySpentBy: "SELF" ou "dep:&lt;id&gt;" */
export function labelForSpentKey(key: string, cards: Card[]): string {
  if (key === 'SELF') return 'Eu'
  if (key.startsWith('dep:')) {
    const id = Number(key.slice(4))
    if (Number.isNaN(id)) return key
    for (const c of cards) {
      const d = c.dependents.find((x) => x.id === id)
      if (d) return d.name
    }
    return `Pessoa #${id}`
  }
  return key
}

const BADGE_ROT = [
  'bg-rose-500/20 text-rose-300 ring-rose-500/30',
  'bg-amber-500/20 text-amber-200 ring-amber-500/30',
  'bg-sky-500/20 text-sky-200 ring-sky-500/30',
  'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
  'bg-orange-500/20 text-orange-200 ring-orange-500/30',
]

export function badgeClassForSpentKey(key: string): string {
  if (key === 'SELF') return 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30'
  const h = key.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return BADGE_ROT[h % BADGE_ROT.length]!
}

export function badgeClassForExpense(ex: Expense): string {
  if (ex.spentBySelf) return 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30'
  const name = ex.dependentPersonName ?? ''
  const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return BADGE_ROT[h % BADGE_ROT.length]!
}

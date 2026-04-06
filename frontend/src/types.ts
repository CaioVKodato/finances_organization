export type SpentBy = 'SELF' | 'GIRLFRIEND' | 'MOTHER' | 'OTHER'

export interface Card {
  id: number
  name: string
  lastFourDigits: string | null
  colorHex: string
  /** 1–28: dia de fechamento; sem valor = fatura pelo mês civil */
  invoiceClosingDay: number | null
}

export interface Expense {
  id: number
  cardId: number
  cardName: string
  cardColorHex: string
  amount: number
  description: string
  expenseDate: string
  spentBy: SpentBy
  notes: string | null
  installmentGroupId: string | null
  installmentIndex: number | null
  installmentCount: number | null
  totalPurchaseAmount: number | null
}

export interface DashboardSummary {
  totalAll: number
  byCard: { cardId: number; cardName: string; colorHex: string; total: number }[]
  bySpentBy: Record<string, number>
  monthlyIncome: number
  /** Só gastos marcados como Eu — usados no "ainda pode gastar" */
  spentSelfInCurrentCalendarMonth: number
  /** Todos os gastos no mês (referência) */
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

export const SPENT_BY_LABEL: Record<SpentBy, string> = {
  SELF: 'Eu',
  GIRLFRIEND: 'Namorada',
  MOTHER: 'Mãe',
  OTHER: 'Outro',
}

export const SPENT_BY_BADGE: Record<SpentBy, string> = {
  SELF: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
  GIRLFRIEND: 'bg-rose-500/20 text-rose-300 ring-rose-500/30',
  MOTHER: 'bg-amber-500/20 text-amber-200 ring-amber-500/30',
  OTHER: 'bg-slate-500/25 text-slate-300 ring-slate-500/35',
}

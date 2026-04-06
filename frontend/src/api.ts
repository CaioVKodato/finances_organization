import { coerceMoney } from './format'
import type { Card, DashboardSummary, Expense, Settings, SpentBy } from './types'

const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = res.statusText
    try {
      const j = await res.json()
      if (j && typeof j.error === 'string') msg = j.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function url(path: string) {
  return `${base}${path}`
}

export async function fetchCards(): Promise<Card[]> {
  return handle(await fetch(url('/api/cards')))
}

export async function createCard(body: {
  name: string
  lastFourDigits: string | null
  colorHex: string
  invoiceClosingDay: number | null
}): Promise<Card> {
  return handle(
    await fetch(url('/api/cards'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function updateCard(
  id: number,
  body: {
    name: string
    lastFourDigits: string | null
    colorHex: string
    invoiceClosingDay: number | null
  },
): Promise<Card> {
  return handle(
    await fetch(url(`/api/cards/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function deleteCard(id: number): Promise<void> {
  await handle(await fetch(url(`/api/cards/${id}`), { method: 'DELETE' }))
}

export async function fetchExpenses(cardId?: number | null): Promise<Expense[]> {
  const q = cardId != null ? `?cardId=${cardId}` : ''
  return handle(await fetch(url(`/api/expenses${q}`)))
}

export async function createExpense(body: {
  cardId: number
  amount: number
  description: string
  expenseDate: string
  spentBy: SpentBy
  notes: string | null
  installmentCount: number
}): Promise<Expense[]> {
  return handle(
    await fetch(url('/api/expenses'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function updateExpense(
  id: number,
  body: {
    cardId: number
    amount: number
    description: string
    expenseDate: string
    spentBy: SpentBy
    notes: string | null
  },
): Promise<Expense> {
  return handle(
    await fetch(url(`/api/expenses/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function deleteExpense(id: number, deleteGroup = false): Promise<void> {
  const q = deleteGroup ? '?deleteGroup=true' : ''
  await handle(await fetch(url(`/api/expenses/${id}${q}`), { method: 'DELETE' }))
}

function normalizeDashboardSummary(raw: DashboardSummary): DashboardSummary {
  const bySpent = raw.bySpentBy ?? {}
  return {
    ...raw,
    totalAll: coerceMoney(raw.totalAll),
    monthlyIncome: coerceMoney(raw.monthlyIncome),
    spentSelfInCurrentCalendarMonth: coerceMoney(raw.spentSelfInCurrentCalendarMonth),
    spentAllInCurrentCalendarMonth: coerceMoney(raw.spentAllInCurrentCalendarMonth),
    remainingBudget: coerceMoney(raw.remainingBudget),
    bySpentBy: Object.fromEntries(
      Object.entries(bySpent).map(([k, v]) => [k, coerceMoney(v)]),
    ),
    byCard: (raw.byCard ?? []).map((c) => ({
      ...c,
      total: coerceMoney(c.total),
    })),
    cardInvoices: (raw.cardInvoices ?? []).map((inv) => ({
      ...inv,
      invoiceTotal: coerceMoney(inv.invoiceTotal),
    })),
  }
}

export async function fetchDashboard(): Promise<DashboardSummary> {
  const raw = await handle<DashboardSummary>(await fetch(url('/api/dashboard/summary')))
  return normalizeDashboardSummary(raw)
}

export async function fetchSettings(): Promise<Settings> {
  return handle(await fetch(url('/api/settings')))
}

export async function updateSettings(monthlyIncome: number): Promise<Settings> {
  return handle(
    await fetch(url('/api/settings'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyIncome }),
    }),
  )
}

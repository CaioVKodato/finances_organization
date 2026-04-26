import { clearToken, getToken, setToken } from './authStorage'
import { coerceMoney } from '../utils/format'
import type {
  Card,
  CardDependent,
  DashboardSummary,
  Expense,
  Settings,
  StatementPreviewResponse,
} from '../types'

const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearToken()
  }
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

function authHeaders(): HeadersInit {
  const t = getToken()
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (t) h.Authorization = `Bearer ${t}`
  return h
}

function authHeadersMultipart(): HeadersInit {
  const t = getToken()
  const h: Record<string, string> = {}
  if (t) h.Authorization = `Bearer ${t}`
  return h
}

function url(path: string) {
  return `${base}${path}`
}

export async function register(email: string, password: string): Promise<{ token: string; email: string }> {
  const res = await fetch(url('/api/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await handle<{ token: string; email: string }>(res)
  setToken(data.token)
  return data
}

export async function login(email: string, password: string): Promise<{ token: string; email: string }> {
  const res = await fetch(url('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await handle<{ token: string; email: string }>(res)
  setToken(data.token)
  return data
}

export function logout(): void {
  clearToken()
}

export async function fetchCards(): Promise<Card[]> {
  return handle(await fetch(url('/api/cards'), { headers: authHeaders() }))
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
      headers: authHeaders(),
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
      headers: authHeaders(),
      body: JSON.stringify(body),
    }),
  )
}

export async function deleteCard(id: number): Promise<void> {
  await handle(await fetch(url(`/api/cards/${id}`), { method: 'DELETE', headers: authHeaders() }))
}

export async function previewStatementImport(cardId: number, file: File): Promise<StatementPreviewResponse> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(url(`/api/cards/${cardId}/statement/preview`), {
    method: 'POST',
    headers: authHeadersMultipart(),
    body: fd,
  })
  const data = await handle<StatementPreviewResponse>(res)
  return {
    ...data,
    lines: (data.lines ?? []).map((l) => ({
      ...l,
      amount: coerceMoney(l.amount),
    })),
  }
}

export async function commitStatementImport(
  cardId: number,
  lines: Array<{
    lineHash: string
    expenseDate: string
    amount: number
    description: string
    spentBySelf?: boolean
    dependentPersonId?: number | null
    splits?: Array<{
      spentBySelf: boolean
      dependentPersonId: number | null
      amount: number
    }>
  }>,
): Promise<{
  imported: number
  skippedDuplicates: number
  totalImportedAmount: number
  importedStatementLines: number
}> {
  const raw = await handle<{
    imported: number
    skippedDuplicates: number
    totalImportedAmount: number
    importedStatementLines: number
  }>(
    await fetch(url(`/api/cards/${cardId}/statement/commit`), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ lines }),
    }),
  )
  return {
    ...raw,
    totalImportedAmount: coerceMoney(raw.totalImportedAmount),
  }
}

export async function createDependent(cardId: number, name: string): Promise<CardDependent> {
  return handle(
    await fetch(url(`/api/cards/${cardId}/dependents`), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    }),
  )
}

export async function deleteDependent(cardId: number, dependentId: number): Promise<void> {
  await handle(
    await fetch(url(`/api/cards/${cardId}/dependents/${dependentId}`), {
      method: 'DELETE',
      headers: authHeaders(),
    }),
  )
}

export async function fetchExpenses(cardId?: number | null): Promise<Expense[]> {
  const q = cardId != null ? `?cardId=${cardId}` : ''
  return handle(await fetch(url(`/api/expenses${q}`), { headers: authHeaders() }))
}

export async function createExpense(body: {
  cardId: number
  amount: number
  description: string
  expenseDate: string
  spentBySelf: boolean
  dependentPersonId: number | null
  notes: string | null
  installmentCount: number
  splits?: Array<{ spentBySelf: boolean; dependentPersonId: number | null; amount: number }>
}): Promise<Expense[]> {
  return handle(
    await fetch(url('/api/expenses'), {
      method: 'POST',
      headers: authHeaders(),
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
    spentBySelf: boolean
    dependentPersonId: number | null
    notes: string | null
    installmentCount?: number
    splits?: Array<{ spentBySelf: boolean; dependentPersonId: number | null; amount: number }>
  },
): Promise<Expense> {
  return handle(
    await fetch(url(`/api/expenses/${id}`), {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }),
  )
}

export async function deleteExpense(id: number, deleteGroup = false): Promise<void> {
  const q = deleteGroup ? '?deleteGroup=true' : ''
  await handle(await fetch(url(`/api/expenses/${id}${q}`), { method: 'DELETE', headers: authHeaders() }))
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
    bySpentBy: Object.fromEntries(Object.entries(bySpent).map(([k, v]) => [k, coerceMoney(v)])),
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
  const raw = await handle<DashboardSummary>(await fetch(url('/api/dashboard/summary'), { headers: authHeaders() }))
  return normalizeDashboardSummary(raw)
}

export async function fetchSettings(): Promise<Settings> {
  return handle(await fetch(url('/api/settings'), { headers: authHeaders() }))
}

export async function updateSettings(monthlyIncome: number): Promise<Settings> {
  return handle(
    await fetch(url('/api/settings'), {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ monthlyIncome }),
    }),
  )
}

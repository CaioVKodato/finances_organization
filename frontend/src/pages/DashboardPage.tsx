import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  Users,
  RefreshCw,
  Filter,
  Receipt,
  PiggyBank,
  TrendingDown,
  Upload,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  createCard,
  createDependent,
  createExpense,
  deleteCard,
  deleteDependent,
  deleteExpense,
  fetchCards,
  fetchDashboard,
  fetchExpenses,
  fetchSettings,
  commitStatementImport,
  logout,
  previewStatementImport,
  updateCard,
  updateExpense,
  updateSettings,
} from '../services/api'
import { getToken } from '../services/authStorage'
import { brl, coerceMoney, formatDate } from '../utils/format'
import { Modal } from '../components/Modal'
import type { Card, Expense, StatementPreviewResponse } from '../types'
import { badgeClassForExpense, labelForSpentKey } from '../types'

const PRESET_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#22c55e', '#3b82f6']

function formatPeriod(isoStart: string, isoEnd: string): string {
  return `${formatDate(isoStart)} — ${formatDate(isoEnd)}`
}

function formatDateTime(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

function previewInstallmentParts(total: number, n: number): string {
  if (n <= 1 || Number.isNaN(total)) return ''
  const per = Math.floor((total * 100) / n) / 100
  const last = Math.round((total - per * (n - 1)) * 100) / 100
  return n > 1 ? `${brl(per)} × ${n - 1} + ${brl(last)}` : ''
}

/** Centavos distribuídos em n partes (soma exata). */
function equalPartsAmountStrings(total: number, n: number): string[] {
  if (n < 1 || Number.isNaN(total)) return []
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / n)
  const rem = cents - base * n
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const c = base + (i < rem ? 1 : 0)
    out.push((c / 100).toFixed(2))
  }
  return out
}

/** Valor do <select> alinhado às options em string (evita React/HTML não aplicar a opção correta). */
function dependentSelectValue(spentBySelf: boolean, dependentPersonId: number | null): string {
  return spentBySelf ? 'self' : String(dependentPersonId ?? '')
}

/** Ao trocar o cartão, mantém partes válidas e corrige IDs de dependentes que não existem no novo cartão. */
function fixSplitPartsForNewCard(
  parts: Array<{ spentBySelf: boolean; dependentPersonId: number | null; amount: string }>,
  cardId: number,
  cardList: Card[],
): Array<{ spentBySelf: boolean; dependentPersonId: number | null; amount: string }> {
  const deps = cardList.find((c) => c.id === cardId)?.dependents ?? []
  const depIds = new Set(deps.map((d) => d.id))
  return parts.map((p) => {
    if (p.spentBySelf) {
      return { ...p, dependentPersonId: null }
    }
    if (p.dependentPersonId != null && depIds.has(p.dependentPersonId)) {
      return p
    }
    const d0 = deps[0]
    if (d0) {
      return { spentBySelf: false, dependentPersonId: d0.id, amount: p.amount }
    }
    return { spentBySelf: true, dependentPersonId: null, amount: p.amount }
  })
}

function stripSplitNotesSuffix(notes: string | null | undefined): string {
  if (notes == null || notes === '') return ''
  return notes.replace(/\s*— Divisão \d+\/\d+$/, '').trim()
}

type StatementLineChoice =
  | { mode: 'single'; spentBySelf: boolean; dependentPersonId: number | null }
  | {
      mode: 'split'
      parts: Array<{ spentBySelf: boolean; dependentPersonId: number | null; amount: string }>
    }

export default function DashboardPage() {
  const navigate = useNavigate()
  const [cards, setCards] = useState<Card[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchDashboard>> | null>(null)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  type GastosModalState = { mode: 'card'; card: Card } | { mode: 'all' }
  const [gastosModal, setGastosModal] = useState<GastosModalState | null>(null)
  const [gastosPersonFilter, setGastosPersonFilter] = useState<string>('ALL')

  const [cardModal, setCardModal] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [cardForm, setCardForm] = useState({
    name: '',
    lastFour: '',
    colorHex: PRESET_COLORS[0]!,
    invoiceClosingDay: '' as string,
  })
  const [newDependentName, setNewDependentName] = useState('')

  const [settingsModal, setSettingsModal] = useState(false)
  const [incomeInput, setIncomeInput] = useState('')

  const cardsCarouselRef = useRef<HTMLDivElement>(null)
  const cardSlideRefs = useRef<(HTMLDivElement | null)[]>([])
  const [carouselIndex, setCarouselIndex] = useState(0)

  const [statementImportCard, setStatementImportCard] = useState<Card | null>(null)
  const [statementPreview, setStatementPreview] = useState<StatementPreviewResponse | null>(null)
  const [statementLineChoices, setStatementLineChoices] = useState<Record<string, StatementLineChoice>>({})
  /** Hashes das linhas do preview que o usuário não quer registrar (ex.: ajustes da fatura). */
  const [statementExcludedLineHashes, setStatementExcludedLineHashes] = useState<string[]>([])
  const [statementImportBusy, setStatementImportBusy] = useState(false)
  const [statementImportResult, setStatementImportResult] = useState<{
    imported: number
    skippedDuplicates: number
    totalImportedAmount: number
    importedStatementLines: number
  } | null>(null)
  const [statementQuickDependentName, setStatementQuickDependentName] = useState('')
  const statementFileInputRef = useRef<HTMLInputElement>(null)

  const [expenseModal, setExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseForm, setExpenseForm] = useState({
    cardId: 0,
    amount: '',
    description: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    spentBySelf: true,
    dependentPersonId: null as number | null,
    notes: '',
    installmentCount: 1,
    splitMode: false,
    splitParts: [
      { spentBySelf: true, dependentPersonId: null as number | null, amount: '' },
      { spentBySelf: true, dependentPersonId: null as number | null, amount: '' },
    ] as Array<{ spentBySelf: boolean; dependentPersonId: number | null; amount: string }>,
  })

  const refresh = useCallback(async () => {
    if (!getToken()) {
      navigate('/login', { replace: true })
      return
    }
    setError(null)
    setLoading(true)
    try {
      const [c, e, d, s] = await Promise.all([
        fetchCards(),
        fetchExpenses(),
        fetchDashboard(),
        fetchSettings(),
      ])
      setCards(c)
      setExpenses(e)
      setSummary(d)
      setMonthlyIncome(s.monthlyIncome)
      setIncomeInput(String(s.monthlyIncome))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (carouselIndex >= cards.length && cards.length > 0) {
      setCarouselIndex(0)
    }
  }, [cards.length, carouselIndex])

  useEffect(() => {
    const root = cardsCarouselRef.current
    if (!root || cards.length === 0) return

    const updateIndex = () => {
      const rect = root.getBoundingClientRect()
      const mid = rect.left + rect.width / 2
      let best = 0
      let bestDist = Infinity
      cardSlideRefs.current.forEach((slide, i) => {
        if (!slide) return
        const r = slide.getBoundingClientRect()
        const c = r.left + r.width / 2
        const d = Math.abs(c - mid)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      })
      setCarouselIndex(best)
    }

    root.addEventListener('scroll', updateIndex, { passive: true })
    updateIndex()
    return () => root.removeEventListener('scroll', updateIndex)
  }, [cards])

  const scrollCardTo = useCallback((index: number) => {
    const slide = cardSlideRefs.current[index]
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [])

  const gastosModalList = useMemo(() => {
    let list = expenses
    if (gastosModal?.mode === 'card') {
      list = list.filter((x) => x.cardId === gastosModal.card.id)
    }
    if (gastosPersonFilter !== 'ALL') {
      if (gastosPersonFilter === 'SELF') {
        list = list.filter((x) => x.spentBySelf)
      } else if (gastosPersonFilter.startsWith('dep:')) {
        const id = Number(gastosPersonFilter.slice(4))
        list = list.filter((x) => !x.spentBySelf && x.dependentPersonId === id)
      }
    }
    return list
  }, [expenses, gastosModal, gastosPersonFilter])

  const gastosModalTotal = useMemo(
    () => gastosModalList.reduce((s, x) => s + x.amount, 0),
    [gastosModalList],
  )

  /** Sempre renda − "Seus gastos (Eu)". */
  const remainingBudgetDisplay = useMemo(() => {
    if (!summary) return null
    const income = coerceMoney(summary.monthlyIncome)
    const self = coerceMoney(summary.spentSelfInCurrentCalendarMonth)
    return Math.round((income - self) * 100) / 100
  }, [summary])

  function openGastosModalForCard(card: Card) {
    setGastosPersonFilter('ALL')
    setGastosModal({ mode: 'card', card })
  }

  function openGastosModalAll() {
    setGastosPersonFilter('ALL')
    setGastosModal({ mode: 'all' })
  }

  function closeGastosModal() {
    setGastosModal(null)
  }

  function openStatementImport(card: Card) {
    setStatementImportCard(card)
    setStatementPreview(null)
    setStatementLineChoices({})
    setStatementExcludedLineHashes([])
    setStatementImportBusy(false)
    setStatementImportResult(null)
    setStatementQuickDependentName('')
    if (statementFileInputRef.current) statementFileInputRef.current.value = ''
  }

  function closeStatementImport() {
    setStatementImportCard(null)
    setStatementPreview(null)
    setStatementLineChoices({})
    setStatementExcludedLineHashes([])
    setStatementImportBusy(false)
    setStatementImportResult(null)
    setStatementQuickDependentName('')
    if (statementFileInputRef.current) statementFileInputRef.current.value = ''
  }

  async function handleStatementFile(file: File | undefined) {
    if (!file || !statementImportCard) return
    setStatementImportBusy(true)
    setError(null)
    try {
      const prev = await previewStatementImport(statementImportCard.id, file)
      setStatementPreview(prev)
      setStatementImportResult(null)
      const init: Record<string, StatementLineChoice> = {}
      for (const line of prev.lines) {
        init[line.lineHash] = { mode: 'single', spentBySelf: true, dependentPersonId: null }
      }
      setStatementLineChoices(init)
      setStatementExcludedLineHashes([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ler a fatura')
    } finally {
      setStatementImportBusy(false)
    }
  }

  const statementExcludedSet = useMemo(() => new Set(statementExcludedLineHashes), [statementExcludedLineHashes])

  const statementIncludedLines = useMemo(() => {
    if (!statementPreview?.lines.length) return []
    return statementPreview.lines.filter((l) => !statementExcludedSet.has(l.lineHash))
  }, [statementPreview, statementExcludedSet])

  const statementCommitReady = useMemo(() => {
    if (!statementPreview || statementPreview.lines.length === 0) return false
    if (statementIncludedLines.length === 0) return false
    return statementIncludedLines.every((line) => {
      const ch = statementLineChoices[line.lineHash]
      if (!ch) return false
      if (ch.mode === 'single') {
        if (ch.spentBySelf) return true
        return ch.dependentPersonId != null
      }
      if (ch.parts.length < 2) return false
      if (ch.parts.every((p) => p.spentBySelf)) return false
      const totalLine = line.amount
      let sum = 0
      for (const p of ch.parts) {
        const a = Number.parseFloat(p.amount.replace(',', '.'))
        if (Number.isNaN(a) || a <= 0) return false
        if (!p.spentBySelf && (p.dependentPersonId == null || p.dependentPersonId <= 0)) return false
        sum += a
      }
      return Math.abs(sum - totalLine) <= 0.021
    })
  }, [statementPreview, statementLineChoices, statementIncludedLines])

  const statementLinesTotal = useMemo(() => {
    if (!statementIncludedLines.length) return 0
    return statementIncludedLines.reduce((s, l) => s + l.amount, 0)
  }, [statementIncludedLines])

  const statementExcludedLines = useMemo(() => {
    if (!statementPreview?.lines.length) return []
    return statementPreview.lines.filter((l) => statementExcludedSet.has(l.lineHash))
  }, [statementPreview, statementExcludedSet])

  useEffect(() => {
    setStatementImportCard((prev) => {
      if (!prev) return prev
      const updated = cards.find((c) => c.id === prev.id)
      return updated ?? prev
    })
  }, [cards])

  async function registerQuickDependentOnStatementCard() {
    if (!statementImportCard || !statementQuickDependentName.trim()) return
    setStatementImportBusy(true)
    setError(null)
    try {
      await createDependent(statementImportCard.id, statementQuickDependentName.trim())
      setStatementQuickDependentName('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar pessoa')
    } finally {
      setStatementImportBusy(false)
    }
  }

  async function submitStatementImport() {
    if (!statementImportCard || !statementPreview || !statementCommitReady || statementIncludedLines.length === 0)
      return
    setStatementImportBusy(true)
    setError(null)
    try {
      const result = await commitStatementImport(
        statementImportCard.id,
        statementIncludedLines.map((line) => {
          const ch = statementLineChoices[line.lineHash]!
          if (ch.mode === 'single') {
            return {
              lineHash: line.lineHash,
              expenseDate: line.expenseDate,
              amount: line.amount,
              description: line.description,
              spentBySelf: ch.spentBySelf,
              dependentPersonId: ch.spentBySelf ? null : ch.dependentPersonId,
            }
          }
          return {
            lineHash: line.lineHash,
            expenseDate: line.expenseDate,
            amount: line.amount,
            description: line.description,
            splits: ch.parts.map((p) => ({
              spentBySelf: p.spentBySelf,
              dependentPersonId: p.spentBySelf ? null : p.dependentPersonId,
              amount: Number.parseFloat(p.amount.replace(',', '.')),
            })),
          }
        }),
      )
      await refresh()
      setStatementImportResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar os gastos')
    } finally {
      setStatementImportBusy(false)
    }
  }

  function openSettings() {
    setIncomeInput(String(monthlyIncome))
    setSettingsModal(true)
  }

  async function submitIncome(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const v = Number.parseFloat(incomeInput.replace(',', '.'))
    if (Number.isNaN(v) || v < 0) {
      setError('Informe uma renda válida')
      return
    }
    try {
      const s = await updateSettings(v)
      setMonthlyIncome(s.monthlyIncome)
      setSettingsModal(false)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar renda')
    }
  }

  function openNewCard() {
    setEditingCard(null)
    setNewDependentName('')
    setCardForm({ name: '', lastFour: '', colorHex: PRESET_COLORS[0]!, invoiceClosingDay: '' })
    setCardModal(true)
  }

  function openEditCard(c: Card) {
    setNewDependentName('')
    setEditingCard(c)
    setCardForm({
      name: c.name,
      lastFour: c.lastFourDigits ?? '',
      colorHex: c.colorHex,
      invoiceClosingDay: c.invoiceClosingDay != null ? String(c.invoiceClosingDay) : '',
    })
    setCardModal(true)
  }

  async function submitCard(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const lastFour = cardForm.lastFour.trim()
    const closingRaw = cardForm.invoiceClosingDay.trim()
    let invoiceClosingDay: number | null = null
    if (closingRaw !== '') {
      const d = Number.parseInt(closingRaw, 10)
      if (Number.isNaN(d) || d < 1 || d > 28) {
        setError('Dia de fechamento deve ser entre 1 e 28 (ou vazio)')
        return
      }
      invoiceClosingDay = d
    }
    const body = {
      name: cardForm.name.trim(),
      lastFourDigits: lastFour === '' ? null : lastFour,
      colorHex: cardForm.colorHex,
      invoiceClosingDay,
    }
    try {
      if (editingCard) await updateCard(editingCard.id, body)
      else await createCard(body)
      setCardModal(false)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cartão')
    }
  }

  async function addDependentToCard() {
    if (!editingCard || !newDependentName.trim()) return
    setError(null)
    try {
      await createDependent(editingCard.id, newDependentName.trim())
      setNewDependentName('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar pessoa')
    }
  }

  async function removeDependentPerson(depId: number) {
    if (!editingCard) return
    if (!confirm('Remover esta pessoa do cartão?')) return
    setError(null)
    try {
      await deleteDependent(editingCard.id, depId)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover')
    }
  }

  async function removeCard(c: Card) {
    if (!confirm(`Excluir o cartão "${c.name}" e todos os gastos vinculados?`)) return
    setError(null)
    try {
      await deleteCard(c.id)
      if (gastosModal?.mode === 'card' && gastosModal.card.id === c.id) setGastosModal(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  function openNewExpense() {
    setEditingExpense(null)
    const first = cards[0]?.id ?? 0
    setExpenseForm({
      cardId: first,
      amount: '',
      description: '',
      expenseDate: new Date().toISOString().slice(0, 10),
      spentBySelf: true,
      dependentPersonId: null,
      notes: '',
      installmentCount: 1,
      splitMode: false,
      splitParts: [
        { spentBySelf: true, dependentPersonId: null, amount: '' },
        { spentBySelf: true, dependentPersonId: null, amount: '' },
      ],
    })
    setExpenseModal(true)
  }

  function openEditExpense(ex: Expense) {
    setEditingExpense(ex)
    const inst = ex.installmentCount ?? 1
    const isSplit =
      inst <= 1 && ex.splitGroupId != null && ex.splitGroupId !== '' && (ex.splitPartCount ?? 1) > 1

    if (isSplit) {
      const parts = expenses
        .filter((e) => e.splitGroupId === ex.splitGroupId)
        .sort((a, b) => (a.splitPartIndex ?? 0) - (b.splitPartIndex ?? 0))
      const total =
        ex.totalPurchaseAmount != null && !Number.isNaN(ex.totalPurchaseAmount)
          ? ex.totalPurchaseAmount
          : parts.reduce((s, p) => s + p.amount, 0)
      const baseNotes = stripSplitNotesSuffix(parts[0]?.notes ?? ex.notes)
      setExpenseForm({
        cardId: ex.cardId,
        amount: String(total),
        description: ex.description,
        expenseDate: ex.expenseDate,
        spentBySelf: true,
        dependentPersonId: null,
        notes: baseNotes,
        installmentCount: 1,
        splitMode: true,
        splitParts: parts.map((p) => ({
          spentBySelf: p.spentBySelf,
          dependentPersonId: p.dependentPersonId,
          amount: String(p.amount),
        })),
      })
    } else {
      setExpenseForm({
        cardId: ex.cardId,
        amount: String(ex.amount),
        description: ex.description,
        expenseDate: ex.expenseDate,
        spentBySelf: ex.spentBySelf,
        dependentPersonId: ex.dependentPersonId,
        notes: ex.notes ?? '',
        installmentCount: ex.installmentCount ?? 1,
        splitMode: false,
        splitParts: [
          { spentBySelf: true, dependentPersonId: null, amount: '' },
          { spentBySelf: true, dependentPersonId: null, amount: '' },
        ],
      })
    }
    setExpenseModal(true)
  }

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amount = Number.parseFloat(expenseForm.amount.replace(',', '.'))
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Informe um valor válido')
      return
    }
    const notes = expenseForm.notes.trim()
    const instNew = Math.max(1, Math.min(120, expenseForm.installmentCount || 1))

    if (editingExpense) {
      const instEd = editingExpense.installmentCount ?? 1
      if (instEd > 1) {
        if (!expenseForm.spentBySelf && (expenseForm.dependentPersonId == null || expenseForm.dependentPersonId <= 0)) {
          setError('Selecione quem gastou ou marque como Eu')
          return
        }
        try {
          await updateExpense(editingExpense.id, {
            cardId: expenseForm.cardId,
            amount,
            description: expenseForm.description.trim(),
            expenseDate: expenseForm.expenseDate,
            spentBySelf: expenseForm.spentBySelf,
            dependentPersonId: expenseForm.spentBySelf ? null : expenseForm.dependentPersonId,
            notes: notes === '' ? null : notes,
          })
          setExpenseModal(false)
          await refresh()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao salvar gasto')
        }
        return
      }

      if (expenseForm.splitMode) {
        if (expenseForm.splitParts.length < 2) {
          setError('Inclua ao menos duas partes para dividir')
          return
        }
        let sum = 0
        const splits: { spentBySelf: boolean; dependentPersonId: number | null; amount: number }[] = []
        for (const p of expenseForm.splitParts) {
          const pa = Number.parseFloat(p.amount.replace(',', '.'))
          if (Number.isNaN(pa) || pa <= 0) {
            setError('Cada parte precisa de um valor válido')
            return
          }
          if (!p.spentBySelf && (p.dependentPersonId == null || p.dependentPersonId <= 0)) {
            setError('Selecione a pessoa em cada parte ou marque Eu')
            return
          }
          sum += pa
          splits.push({
            spentBySelf: p.spentBySelf,
            dependentPersonId: p.spentBySelf ? null : p.dependentPersonId,
            amount: pa,
          })
        }
        if (Math.abs(sum - amount) > 0.021) {
          setError('A soma das partes deve fechar com o valor total')
          return
        }
        if (!splits.some((p) => !p.spentBySelf)) {
          setError(
            'Em um gasto dividido, ao menos uma parte deve ser de outra pessoa cadastrada neste cartão. Se só você pagou, desmarque a divisão.',
          )
          return
        }
        try {
          await updateExpense(editingExpense.id, {
            cardId: expenseForm.cardId,
            amount,
            description: expenseForm.description.trim(),
            expenseDate: expenseForm.expenseDate,
            spentBySelf: true,
            dependentPersonId: null,
            notes: notes === '' ? null : notes,
            installmentCount: 1,
            splits,
          })
          setExpenseModal(false)
          await refresh()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao salvar gasto')
        }
        return
      }

      if (!expenseForm.spentBySelf && (expenseForm.dependentPersonId == null || expenseForm.dependentPersonId <= 0)) {
        setError('Selecione quem gastou ou marque como Eu')
        return
      }
      try {
        await updateExpense(editingExpense.id, {
          cardId: expenseForm.cardId,
          amount,
          description: expenseForm.description.trim(),
          expenseDate: expenseForm.expenseDate,
          spentBySelf: expenseForm.spentBySelf,
          dependentPersonId: expenseForm.spentBySelf ? null : expenseForm.dependentPersonId,
          notes: notes === '' ? null : notes,
          installmentCount: 1,
        })
        setExpenseModal(false)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao salvar gasto')
      }
      return
    }

    if (instNew > 1 && amount / instNew < 0.01) {
      setError('Valor por parcela muito baixo')
      return
    }
    if (expenseForm.splitMode) {
      if (instNew > 1) {
        setError('Desative parcelas ou desative a divisão entre pessoas')
        return
      }
      if (expenseForm.splitParts.length < 2) {
        setError('Inclua ao menos duas partes para dividir')
        return
      }
      let sum = 0
      const splits: { spentBySelf: boolean; dependentPersonId: number | null; amount: number }[] = []
      for (const p of expenseForm.splitParts) {
        const pa = Number.parseFloat(p.amount.replace(',', '.'))
        if (Number.isNaN(pa) || pa <= 0) {
          setError('Cada parte precisa de um valor válido')
          return
        }
        if (!p.spentBySelf && (p.dependentPersonId == null || p.dependentPersonId <= 0)) {
          setError('Selecione a pessoa em cada parte ou marque Eu')
          return
        }
        sum += pa
        splits.push({
          spentBySelf: p.spentBySelf,
          dependentPersonId: p.spentBySelf ? null : p.dependentPersonId,
          amount: pa,
        })
      }
      if (Math.abs(sum - amount) > 0.021) {
        setError('A soma das partes deve fechar com o valor total')
        return
      }
      if (!splits.some((p) => !p.spentBySelf)) {
        setError(
          'Em um gasto dividido, ao menos uma parte deve ser de outra pessoa cadastrada neste cartão. Se só você pagou, desmarque a divisão e use um único lançamento em "Eu".',
        )
        return
      }
      try {
        await createExpense({
          cardId: expenseForm.cardId,
          amount,
          description: expenseForm.description.trim(),
          expenseDate: expenseForm.expenseDate,
          spentBySelf: true,
          dependentPersonId: null,
          notes: notes === '' ? null : notes,
          installmentCount: 1,
          splits,
        })
        setExpenseModal(false)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao salvar gasto')
      }
      return
    }
    if (!expenseForm.spentBySelf && (expenseForm.dependentPersonId == null || expenseForm.dependentPersonId <= 0)) {
      setError('Selecione quem gastou ou marque como Eu')
      return
    }
    try {
      await createExpense({
        cardId: expenseForm.cardId,
        amount,
        description: expenseForm.description.trim(),
        expenseDate: expenseForm.expenseDate,
        spentBySelf: expenseForm.spentBySelf,
        dependentPersonId: expenseForm.spentBySelf ? null : expenseForm.dependentPersonId,
        notes: notes === '' ? null : notes,
        installmentCount: instNew,
      })
      setExpenseModal(false)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar gasto')
    }
  }

  async function removeExpense(ex: Expense) {
    const hasGroup =
      (ex.installmentCount ?? 1) > 1 && ex.installmentGroupId != null && ex.installmentGroupId !== ''
    const hasSplitGroup =
      (ex.splitPartCount ?? 1) > 1 && ex.splitGroupId != null && ex.splitGroupId !== ''

    let deleteGroup = false
    if (hasGroup) {
      if (
        confirm(
          `Excluir todas as ${ex.installmentCount} parcelas desta compra?\n\nOK = todas\nCancelar = perguntar só uma parcela`,
        )
      ) {
        deleteGroup = true
      } else if (!confirm('Excluir apenas esta parcela?')) {
        return
      }
    } else if (hasSplitGroup) {
      if (
        confirm(
          `Excluir todas as ${ex.splitPartCount} partes deste gasto dividido?\n\nOK = todas\nCancelar = excluir só esta linha`,
        )
      ) {
        deleteGroup = true
      } else if (!confirm('Excluir apenas esta parte?')) {
        return
      }
    } else if (!confirm('Excluir este gasto?')) {
      return
    }

    setError(null)
    try {
      await deleteExpense(ex.id, deleteGroup)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  const totalVal = Number.parseFloat(expenseForm.amount.replace(',', '.'))
  const instPreview =
    !editingExpense && expenseForm.installmentCount > 1 && !Number.isNaN(totalVal) && totalVal > 0
      ? previewInstallmentParts(totalVal, expenseForm.installmentCount)
      : ''

  return (
    <div className="relative mx-auto min-h-dvh max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      {/* Canto superior direito da tela — só ícones */}
      <div
        className="fixed right-3 top-3 z-50 flex items-center gap-1 sm:right-5 sm:top-4"
        role="toolbar"
        aria-label="Conta e sincronização"
      >
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          title="Atualizar dados"
          aria-label="Atualizar dados"
          className="rounded-xl border border-white/10 bg-zinc-900/90 p-2.5 text-zinc-200 shadow-lg backdrop-blur-md transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          title="Sair"
          aria-label="Sair da conta"
          className="rounded-xl border border-white/10 bg-zinc-900/90 p-2.5 text-zinc-400 shadow-lg backdrop-blur-md transition hover:border-red-500/30 hover:bg-red-950/40 hover:text-red-200"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      <header className="mb-10 pr-2 sm:pr-0">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-xl pr-16 sm:pr-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-300 ring-1 ring-violet-500/25">
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              Controle por cartão e por pessoa
            </div>
            <h1 className="bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              Suas finanças
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Registre compras à vista ou parceladas, acompanhe a fatura de cada cartão e o quanto ainda pode gastar no
              mês.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-start gap-1.5 sm:justify-end">
            <button
              type="button"
              onClick={openSettings}
              title="Renda mensal"
              aria-label="Renda mensal"
              className="rounded-xl border border-emerald-500/25 bg-emerald-600/15 p-2.5 text-emerald-200/90 transition hover:border-emerald-500/40 hover:bg-emerald-600/25"
            >
              <PiggyBank className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={openNewCard}
              title="Novo cartão"
              aria-label="Novo cartão"
              className="rounded-xl border border-violet-500/35 bg-violet-600/20 p-2.5 text-violet-100 transition hover:border-violet-400/50 hover:bg-violet-600/35"
            >
              <CreditCard className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={openNewExpense}
              disabled={cards.length === 0}
              title="Novo gasto"
              aria-label="Novo gasto"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-2.5 text-white shadow-lg shadow-violet-900/35 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div
          className="mb-6 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Orçamento do mês */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          <PiggyBank className="h-4 w-4" />
          Orçamento do mês (calendário)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
            <p className="text-xs font-medium text-zinc-500">Renda mensal cadastrada</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-300">
              {summary ? brl(summary.monthlyIncome) : '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
            <p className="text-xs font-medium text-zinc-500">Seus gastos no mês (Eu)</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-amber-200">
              {summary ? brl(summary.spentSelfInCurrentCalendarMonth) : '—'}
            </p>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">
              Só entram gastos em &quot;Eu&quot;. Outra pessoa? Edite o lançamento.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
            <p className="text-xs font-medium text-zinc-500">Total no mês (todas as pessoas)</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-300">
              {summary ? brl(summary.spentAllInCurrentCalendarMonth) : '—'}
            </p>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">
              Soma de todo mundo — só referência.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
            <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <TrendingDown className="h-3.5 w-3.5" />
              Ainda pode gastar (estimativa)
            </p>
            <p
              className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                remainingBudgetDisplay != null && remainingBudgetDisplay >= 0 ? 'text-white' : 'text-red-400'
              }`}
            >
              {remainingBudgetDisplay != null ? brl(remainingBudgetDisplay) : '—'}
            </p>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">
              Renda menos seus gastos &quot;Eu&quot;. Ajuste em &quot;Renda mensal&quot;.
            </p>
          </div>
        </div>
      </section>

      {/* Resumo */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          <LayoutDashboard className="h-4 w-4" />
          Resumo geral
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
            <p className="text-xs font-medium text-zinc-500">Total geral (histórico)</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">
              {summary ? brl(summary.totalAll) : '—'}
            </p>
          </div>
          {summary &&
            Object.keys(summary.bySpentBy)
              .sort((a, b) => {
                if (a === 'SELF') return -1
                if (b === 'SELF') return 1
                return a.localeCompare(b)
              })
              .map((key) => (
                <div
                  key={key}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm"
                >
                  <p className="text-xs font-medium text-zinc-500">{labelForSpentKey(key, cards)}</p>
                  <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-white">
                    {brl(summary.bySpentBy[key] ?? 0)}
                  </p>
                </div>
              ))}
        </div>
      </section>

      {/* Cartões — carrossel */}
      <section className="mb-10">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            <CreditCard className="h-4 w-4" />
            Cartões e fatura atual
          </h2>
          {cards.length > 0 && (
            <p className="text-xs text-zinc-500">
              {cards.length > 1
                ? 'Um cartão por vez — deslize ou use as setas. Toque no cartão para ver os gastos.'
                : 'Toque no cartão para ver todos os gastos deste cartão.'}
            </p>
          )}
        </div>
        {cards.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center text-zinc-500">
            Nenhum cartão ainda. Adicione um para começar a registrar gastos.
          </div>
        ) : (
          <div className="relative overflow-hidden">
            {cards.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Cartão anterior"
                  disabled={carouselIndex <= 0}
                  onClick={() => scrollCardTo(Math.max(0, carouselIndex - 1))}
                  className="absolute left-1 top-[45%] z-10 flex -translate-y-1/2 rounded-full border border-white/15 bg-zinc-900/95 p-2 text-white shadow-lg backdrop-blur-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 sm:left-2 sm:p-2.5"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Próximo cartão"
                  disabled={carouselIndex >= cards.length - 1}
                  onClick={() => scrollCardTo(Math.min(cards.length - 1, carouselIndex + 1))}
                  className="absolute right-1 top-[45%] z-10 flex -translate-y-1/2 rounded-full border border-white/15 bg-zinc-900/95 p-2 text-white shadow-lg backdrop-blur-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 sm:right-2 sm:p-2.5"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <div
              ref={cardsCarouselRef}
              className="flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {cards.map((c, slideIdx) => {
                const total = summary?.byCard.find((x) => x.cardId === c.id)?.total ?? 0
                const inv = summary?.cardInvoices.find((x) => x.cardId === c.id)
                return (
                  <div
                    key={c.id}
                    ref={(el) => {
                      cardSlideRefs.current[slideIdx] = el
                    }}
                    className="box-border flex min-w-full shrink-0 basis-full snap-center snap-always justify-center px-4 sm:px-14"
                  >
                    <div className="group relative w-full max-w-lg">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openGastosModalForCard(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openGastosModalForCard(c)
                        }
                      }}
                      className="relative h-full cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent p-5 text-left backdrop-blur-sm transition hover:border-violet-500/40 hover:ring-1 hover:ring-violet-500/25"
                    >
                      <div
                        className="absolute right-0 top-0 h-28 w-28 rounded-full opacity-20 blur-2xl"
                        style={{ background: c.colorHex }}
                      />
                      <div className="relative flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-12 w-12 rounded-xl ring-2 ring-white/20"
                            style={{ background: c.colorHex }}
                          />
                          <div>
                            <p className="text-lg font-semibold text-white">{c.name}</p>
                            {c.lastFourDigits && (
                              <p className="font-mono text-xs text-zinc-500">•••• {c.lastFourDigits}</p>
                            )}
                            {c.invoiceClosingDay != null && (
                              <p className="text-xs text-zinc-500">Fechamento dia {c.invoiceClosingDay}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openStatementImport(c)
                            }}
                            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-violet-300"
                            aria-label="Importar fatura (CSV)"
                            title="Importar fatura (CSV)"
                          >
                            <Upload className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditCard(c)
                            }}
                            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                            aria-label="Editar cartão"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void removeCard(c)
                            }}
                            className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/20 hover:text-red-300"
                            aria-label="Excluir cartão"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="relative mt-5 space-y-2 border-t border-white/10 pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-medium text-zinc-400">Fatura atual (ciclo)</span>
                          <Receipt className="h-4 w-4 shrink-0 text-violet-400" />
                        </div>
                        <p className="font-mono text-2xl font-semibold tabular-nums text-violet-200">
                          {inv ? brl(inv.invoiceTotal) : '—'}
                        </p>
                        {inv && (
                          <p className="text-[11px] leading-relaxed text-zinc-500">
                            {formatPeriod(inv.invoicePeriodStart, inv.invoicePeriodEnd)}
                            {c.invoiceClosingDay == null ? ' · mês civil' : ''}
                          </p>
                        )}
                        <p className="text-xs text-zinc-600">Total histórico: {brl(total)}</p>
                        <p className="text-[11px] text-zinc-600">
                          Última importação CSV: {formatDateTime(c.lastStatementImportAt ?? null)}
                        </p>
                      </div>
                    </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {cards.length > 1 && (
              <div
                className="mt-3 flex justify-center gap-2"
                role="tablist"
                aria-label="Selecionar cartão"
              >
                {cards.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={carouselIndex === i}
                    aria-label={`Ir para ${c.name}`}
                    onClick={() => scrollCardTo(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      carouselIndex === i
                        ? 'w-8 bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.5)]'
                        : 'w-2 bg-zinc-600 hover:bg-zinc-500'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Gastos — abrir pelo cartão ou atalho */}
      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Gastos por cartão</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Toque no cartão acima para ver tudo que foi gasto nele. Você pode filtrar por pessoa dentro da janela.
              </p>
            </div>
          </div>
          {cards.length > 0 && (
            <button
              type="button"
              onClick={() => openGastosModalAll()}
              className="shrink-0 self-start rounded-xl border border-violet-500/35 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-100 transition hover:bg-violet-600/35"
            >
              Ver todos os gastos
            </button>
          )}
        </div>
      </section>

      <Modal
        open={gastosModal != null}
        onClose={closeGastosModal}
        title={
          gastosModal?.mode === 'card'
            ? `Gastos — ${gastosModal.card.name}`
            : 'Todos os gastos'
        }
        panelClassName="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <label htmlFor="gastos-person-filter" className="text-xs text-zinc-500">
              Pessoa
            </label>
            <select
              id="gastos-person-filter"
              value={gastosPersonFilter}
              onChange={(e) => setGastosPersonFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="ALL">Todas</option>
              <option value="SELF">Eu</option>
              {cards.flatMap((c) =>
                c.dependents.map((d) => (
                  <option key={d.id} value={`dep:${d.id}`}>
                    {d.name} ({c.name})
                  </option>
                )),
              )}
            </select>
          </div>

          {gastosModalList.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 py-10 text-center text-sm text-zinc-500">
              Nenhum gasto com esse filtro.
            </p>
          ) : (
            <div className="max-h-[min(60vh,520px)] overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-[1] bg-[oklch(0.19_0.025_280)]">
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-3 py-2.5 font-medium">Data</th>
                    <th className="px-3 py-2.5 font-medium">Descrição</th>
                    {gastosModal?.mode === 'all' && (
                      <th className="px-3 py-2.5 font-medium">Cartão</th>
                    )}
                    <th className="px-3 py-2.5 font-medium">Quem gastou</th>
                    <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                    <th className="w-20 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {gastosModalList.map((ex) => (
                    <tr key={ex.id} className="border-b border-white/5 transition hover:bg-white/[0.04]">
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-zinc-400">
                        {formatDate(ex.expenseDate)}
                      </td>
                      <td className="max-w-[180px] px-3 py-2.5 sm:max-w-xs">
                        <span className="text-zinc-200">{ex.description}</span>
                        {(ex.installmentCount ?? 1) > 1 && (
                          <span className="ml-1 inline-flex rounded-md bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300 ring-1 ring-fuchsia-500/30">
                            {ex.installmentIndex}/{ex.installmentCount}
                          </span>
                        )}
                        {(ex.splitPartCount ?? 1) > 1 && (
                          <span className="ml-1 inline-flex rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-200 ring-1 ring-cyan-500/30">
                            Div. {ex.splitPartIndex}/{ex.splitPartCount}
                          </span>
                        )}
                        {ex.notes && (
                          <span className="mt-0.5 block truncate text-xs text-zinc-500">{ex.notes}</span>
                        )}
                      </td>
                      {gastosModal?.mode === 'all' && (
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center gap-2 rounded-lg px-2 py-0.5 text-xs font-medium text-zinc-300 ring-1 ring-white/10"
                            style={{
                              background: `${ex.cardColorHex}22`,
                              borderLeft: `3px solid ${ex.cardColorHex}`,
                            }}
                          >
                            {ex.cardName}
                          </span>
                        </td>
                      )}
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badgeClassForExpense(ex)}`}
                        >
                          {ex.spentBySelf ? 'Eu' : ex.dependentPersonName ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-white">
                        {brl(ex.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            openEditExpense(ex)
                            closeGastosModal()
                          }}
                          className="mr-1 rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeExpense(ex)}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/20 hover:text-red-300"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {gastosModalList.length > 0 && (
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-xs text-zinc-500">Total com filtro atual</span>
              <span className="font-mono text-lg font-semibold tabular-nums text-violet-200">
                {brl(gastosModalTotal)}
              </span>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={statementImportCard != null}
        onClose={() => {
          if (!statementImportBusy) closeStatementImport()
        }}
        title={statementImportCard ? `Importar fatura — ${statementImportCard.name}` : 'Importar fatura'}
        panelClassName="max-w-3xl"
      >
        {statementImportCard && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Envie um CSV da fatura (exportação do banco ou planilha com colunas de <strong className="text-zinc-300">data</strong>,{' '}
              <strong className="text-zinc-300">descrição</strong> e <strong className="text-zinc-300">valor</strong>). Linhas já
              importadas neste cartão são ignoradas automaticamente.
            </p>
            <p className="text-xs text-zinc-500">
              Última importação concluída:{' '}
              <span className="font-mono text-zinc-400">
                {formatDateTime(statementImportCard.lastStatementImportAt ?? null)}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={statementFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => void handleStatementFile(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={statementImportBusy}
                onClick={() => statementFileInputRef.current?.click()}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
              >
                Escolher arquivo CSV
              </button>
              {statementImportBusy && !statementPreview && (
                <span className="text-xs text-zinc-500">Lendo arquivo…</span>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3">
              <p className="mb-2 text-xs font-medium text-zinc-400">Pessoas neste cartão (cadastro rápido)</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={statementQuickDependentName}
                  onChange={(e) => setStatementQuickDependentName(e.target.value)}
                  placeholder="Nome da pessoa responsável…"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
                />
                <button
                  type="button"
                  disabled={statementImportBusy || !statementQuickDependentName.trim()}
                  onClick={() => void registerQuickDependentOnStatementCard()}
                  className="shrink-0 rounded-lg border border-violet-500/40 bg-violet-600/25 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-600/40 disabled:opacity-40"
                >
                  Adicionar pessoa
                </button>
              </div>
            </div>

            {statementImportResult && (
              <div className="space-y-3 rounded-xl border border-emerald-500/35 bg-emerald-950/25 p-4 ring-1 ring-emerald-500/20">
                <p className="text-sm font-semibold text-emerald-100">Importação concluída</p>
                <ul className="space-y-1 text-sm text-zinc-300">
                  <li>
                    <span className="text-zinc-500">Total importado (soma das linhas): </span>
                    <span className="font-mono font-semibold text-white">{brl(statementImportResult.totalImportedAmount)}</span>
                  </li>
                  <li>
                    <span className="text-zinc-500">Linhas da fatura registradas: </span>
                    <span className="font-mono text-white">{statementImportResult.importedStatementLines}</span>
                  </li>
                  <li>
                    <span className="text-zinc-500">Gastos criados no cartão: </span>
                    <span className="font-mono text-white">{statementImportResult.imported}</span>
                    {statementImportResult.imported !== statementImportResult.importedStatementLines && (
                      <span className="ml-1 text-xs text-zinc-500">(inclui partes de valores divididos)</span>
                    )}
                  </li>
                  {statementImportResult.skippedDuplicates > 0 && (
                    <li className="text-amber-200/90">
                      Duplicados ignorados neste envio: {statementImportResult.skippedDuplicates}
                    </li>
                  )}
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={statementImportBusy}
                    onClick={() => {
                      setStatementImportResult(null)
                      setStatementPreview(null)
                      setStatementLineChoices({})
                      setStatementExcludedLineHashes([])
                      if (statementFileInputRef.current) statementFileInputRef.current.value = ''
                    }}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
                  >
                    Importar outro arquivo
                  </button>
                  <button
                    type="button"
                    onClick={() => closeStatementImport()}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {statementPreview && !statementImportResult && (
              <>
                {statementPreview.skippedAlreadyImported > 0 && (
                  <p className="text-xs text-amber-400/90">
                    {statementPreview.skippedAlreadyImported} linha(s) já estavam registradas e foram ignoradas.
                  </p>
                )}
                {statementPreview.lines.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 py-8 text-center text-sm text-zinc-500">
                    Nenhuma linha nova para importar. Todas já constam no sistema ou o arquivo não tinha lançamentos válidos.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-violet-500/25 bg-violet-950/20 px-3 py-2.5">
                      <div>
                        <p className="text-xs font-medium text-violet-200/90">Total a importar (linhas selecionadas)</p>
                        <p className="font-mono text-lg font-semibold tabular-nums text-white">{brl(statementLinesTotal)}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {statementIncludedLines.length} de {statementPreview.lines.length} linha(s) no arquivo
                          {statementExcludedLines.length > 0 && (
                            <span className="text-amber-200/80"> — {statementExcludedLines.length} ignorada(s)</span>
                          )}
                        </p>
                      </div>
                      <p className="max-w-sm text-xs text-zinc-500">
                        Remova lançamentos que não são gastos da fatura (ex.: valores pendentes ou recebidos). Atribua
                        cada linha restante ou divida o valor entre pessoas.
                      </p>
                    </div>
                    {statementIncludedLines.length === 0 && statementPreview.lines.length > 0 && (
                      <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
                        Todas as linhas estão fora da importação. Restaure ao menos uma linha na lista abaixo ou
                        escolha outro arquivo.
                      </p>
                    )}
                    <div className="max-h-[min(50vh,400px)] overflow-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 z-[1] bg-[oklch(0.19_0.025_280)]">
                          <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                            <th className="px-3 py-2.5 font-medium">Data</th>
                            <th className="px-3 py-2.5 font-medium">Descrição</th>
                            <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                            <th className="min-w-[200px] px-3 py-2.5 font-medium">Responsáveis</th>
                            <th className="w-12 px-2 py-2.5" />
                          </tr>
                        </thead>
                        <tbody>
                          {statementIncludedLines.map((line) => {
                            const ch: StatementLineChoice = statementLineChoices[line.lineHash] ?? {
                              mode: 'single',
                              spentBySelf: true,
                              dependentPersonId: null,
                            }
                            const deps = statementImportCard.dependents
                            return (
                              <tr key={line.lineHash} className="border-b border-white/5 align-top">
                                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-zinc-400">
                                  {formatDate(line.expenseDate)}
                                </td>
                                <td className="max-w-[200px] px-3 py-2.5 text-zinc-200 sm:max-w-xs">{line.description}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-white">
                                  {brl(line.amount)}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex flex-col gap-2">
                                    <select
                                      value={ch.mode}
                                      onChange={(e) => {
                                        const mode = e.target.value as 'single' | 'split'
                                        if (mode === 'single') {
                                          setStatementLineChoices((prev) => ({
                                            ...prev,
                                            [line.lineHash]: {
                                              mode: 'single',
                                              spentBySelf: true,
                                              dependentPersonId: null,
                                            },
                                          }))
                                        } else {
                                          const firstDep = deps[0]?.id ?? null
                                          setStatementLineChoices((prev) => ({
                                            ...prev,
                                            [line.lineHash]: {
                                              mode: 'split',
                                              parts: [
                                                { spentBySelf: true, dependentPersonId: null, amount: '' },
                                                {
                                                  spentBySelf: firstDep == null,
                                                  dependentPersonId: firstDep,
                                                  amount: '',
                                                },
                                              ],
                                            },
                                          }))
                                        }
                                      }}
                                      className="w-full rounded-lg border border-white/10 bg-zinc-900/80 px-2 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-violet-500/50"
                                    >
                                      <option value="single">Uma pessoa</option>
                                      <option value="split">Dividir valor</option>
                                    </select>
                                    {ch.mode === 'single' ? (
                                      <select
                                        value={dependentSelectValue(ch.spentBySelf, ch.dependentPersonId)}
                                        onChange={(e) => {
                                          const v = e.target.value
                                          setStatementLineChoices((prev) => ({
                                            ...prev,
                                            [line.lineHash]:
                                              v === 'self'
                                                ? { mode: 'single', spentBySelf: true, dependentPersonId: null }
                                                : {
                                                    mode: 'single',
                                                    spentBySelf: false,
                                                    dependentPersonId: Number.parseInt(v, 10),
                                                  },
                                          }))
                                        }}
                                        className="w-full min-w-[140px] rounded-lg border border-white/10 bg-zinc-900/80 px-2 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-violet-500/50"
                                      >
                                        <option value="self">Eu (titular)</option>
                                        {deps.map((d) => (
                                          <option key={d.id} value={String(d.id)}>
                                            {d.name}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-2">
                                        {ch.parts.map((part, idx) => (
                                          <div
                                            key={`${line.lineHash}-${idx}-${dependentSelectValue(part.spentBySelf, part.dependentPersonId)}`}
                                            className="flex flex-wrap items-center gap-2"
                                          >
                                            <select
                                              value={dependentSelectValue(part.spentBySelf, part.dependentPersonId)}
                                              onChange={(e) => {
                                                const v = e.target.value
                                                setStatementLineChoices((prev) => {
                                                  const cur = prev[line.lineHash]
                                                  if (!cur || cur.mode !== 'split') return prev
                                                  const nextParts = cur.parts.map((p, j) =>
                                                    j === idx
                                                      ? v === 'self'
                                                        ? { ...p, spentBySelf: true, dependentPersonId: null }
                                                        : { ...p, spentBySelf: false, dependentPersonId: Number.parseInt(v, 10) }
                                                      : p,
                                                  )
                                                  return { ...prev, [line.lineHash]: { mode: 'split', parts: nextParts } }
                                                })
                                              }}
                                              className="min-w-[120px] flex-1 rounded border border-white/10 bg-zinc-900/80 px-2 py-1 text-xs text-white"
                                            >
                                              <option value="self">Eu</option>
                                              {deps.map((d) => (
                                                <option key={d.id} value={String(d.id)}>
                                                  {d.name}
                                                </option>
                                              ))}
                                            </select>
                                            <input
                                              value={part.amount}
                                              onChange={(e) => {
                                                const val = e.target.value
                                                setStatementLineChoices((prev) => {
                                                  const cur = prev[line.lineHash]
                                                  if (!cur || cur.mode !== 'split') return prev
                                                  const nextParts = cur.parts.map((p, j) =>
                                                    j === idx ? { ...p, amount: val } : p,
                                                  )
                                                  return { ...prev, [line.lineHash]: { mode: 'split', parts: nextParts } }
                                                })
                                              }}
                                              inputMode="decimal"
                                              placeholder="R$"
                                              className="w-24 rounded border border-white/10 bg-zinc-900/80 px-2 py-1 font-mono text-xs text-white"
                                            />
                                            {ch.parts.length > 2 && (
                                              <button
                                                type="button"
                                                className="text-xs text-red-400 hover:text-red-300"
                                                onClick={() =>
                                                  setStatementLineChoices((prev) => {
                                                    const cur = prev[line.lineHash]
                                                    if (!cur || cur.mode !== 'split' || cur.parts.length <= 2)
                                                      return prev
                                                    return {
                                                      ...prev,
                                                      [line.lineHash]: {
                                                        mode: 'split',
                                                        parts: cur.parts.filter((_, j) => j !== idx),
                                                      },
                                                    }
                                                  })
                                                }
                                              >
                                                Remover
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                        <div className="flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            className="text-xs text-violet-300 hover:text-violet-200"
                                            onClick={() =>
                                              setStatementLineChoices((prev) => {
                                                const cur = prev[line.lineHash]
                                                if (!cur || cur.mode !== 'split') return prev
                                                return {
                                                  ...prev,
                                                  [line.lineHash]: {
                                                    mode: 'split',
                                                    parts: [
                                                      ...cur.parts,
                                                      { spentBySelf: true, dependentPersonId: null, amount: '' },
                                                    ],
                                                  },
                                                }
                                              })
                                            }
                                          >
                                            + Parte
                                          </button>
                                          <button
                                            type="button"
                                            className="text-xs text-zinc-400 hover:text-zinc-200"
                                            onClick={() => {
                                              const n = ch.parts.length
                                              if (n < 1) return
                                              const amounts = equalPartsAmountStrings(line.amount, n)
                                              setStatementLineChoices((prev) => {
                                                const cur = prev[line.lineHash]
                                                if (!cur || cur.mode !== 'split') return prev
                                                return {
                                                  ...prev,
                                                  [line.lineHash]: {
                                                    mode: 'split',
                                                    parts: cur.parts.map((p, i) => ({ ...p, amount: amounts[i] ?? '' })),
                                                  },
                                                }
                                              })
                                            }}
                                          >
                                            Dividir igualmente
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="align-top px-2 py-2.5">
                                  <button
                                    type="button"
                                    title="Não importar esta linha"
                                    aria-label="Não importar esta linha"
                                    onClick={() =>
                                      setStatementExcludedLineHashes((prev) =>
                                        prev.includes(line.lineHash) ? prev : [...prev, line.lineHash],
                                      )
                                    }
                                    className="rounded-lg p-2 text-zinc-500 hover:bg-amber-500/15 hover:text-amber-200"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {statementExcludedLines.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
                        <p className="mb-2 text-xs font-medium text-zinc-400">
                          Fora da importação ({statementExcludedLines.length}) — não serão salvas no cartão
                        </p>
                        <ul className="space-y-2">
                          {statementExcludedLines.map((line) => (
                            <li
                              key={line.lineHash}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-mono text-xs text-zinc-500">{formatDate(line.expenseDate)}</span>
                                <span className="ml-2 text-zinc-300">{line.description}</span>
                                <span className="ml-2 font-mono text-zinc-200">{brl(line.amount)}</span>
                              </div>
                              <button
                                type="button"
                                className="shrink-0 text-xs font-medium text-violet-300 hover:text-violet-200"
                                onClick={() =>
                                  setStatementExcludedLineHashes((prev) =>
                                    prev.filter((h) => h !== line.lineHash),
                                  )
                                }
                              >
                                Voltar à importação
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={
                        !statementCommitReady || statementImportBusy || statementIncludedLines.length === 0
                      }
                      onClick={() => void submitStatementImport()}
                      className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {statementImportBusy ? 'Salvando…' : 'Registrar gastos'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal open={settingsModal} onClose={() => setSettingsModal(false)} title="Renda mensal">
        <form onSubmit={(e) => void submitIncome(e)} className="space-y-4">
          <p className="text-sm text-zinc-400">
            Usada para calcular quanto você ainda pode gastar no mês. Só entram gastos marcados como &quot;Eu&quot;
            no mês civil atual; gastos de outras pessoas não reduzem esse valor.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Renda (R$)</label>
            <input
              required
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30"
          >
            Salvar
          </button>
        </form>
      </Modal>

      <Modal
        open={cardModal}
        onClose={() => setCardModal(false)}
        title={editingCard ? 'Editar cartão' : 'Novo cartão'}
      >
        <form onSubmit={(e) => void submitCard(e)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Nome</label>
            <input
              required
              value={cardForm.name}
              onChange={(e) => setCardForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Nubank, Inter…"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/50 placeholder:text-zinc-600 focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Últimos 4 dígitos (opcional)</label>
            <input
              value={cardForm.lastFour}
              onChange={(e) =>
                setCardForm((f) => ({ ...f, lastFour: e.target.value.replace(/\D/g, '').slice(0, 4) }))
              }
              placeholder="1234"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Dia de fechamento da fatura (opcional, 1–28)
            </label>
            <input
              value={cardForm.invoiceClosingDay}
              onChange={(e) =>
                setCardForm((f) => ({ ...f, invoiceClosingDay: e.target.value.replace(/\D/g, '').slice(0, 2) }))
              }
              placeholder="Vazio = mês civil"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Define o ciclo da &quot;fatura atual&quot;. Se vazio, usa o mês civil completo.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Cor</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCardForm((f) => ({ ...f, colorHex: c }))}
                  className={`h-9 w-9 rounded-lg ring-2 transition ${
                    cardForm.colorHex === c ? 'ring-white' : 'ring-transparent hover:ring-white/30'
                  }`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
            <input
              type="text"
              value={cardForm.colorHex}
              onChange={(e) => setCardForm((f) => ({ ...f, colorHex: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          {editingCard && (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
              <p className="mb-2 text-xs font-medium text-zinc-400">
                Pessoas que podem gastar neste cartão (além de você)
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={newDependentName}
                  onChange={(e) => setNewDependentName(e.target.value)}
                  placeholder="Ex: Mãe, filho…"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
                />
                <button
                  type="button"
                  onClick={() => void addDependentToCard()}
                  className="shrink-0 rounded-xl border border-violet-500/40 bg-violet-600/25 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-600/40"
                >
                  Adicionar
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {(cards.find((cc) => cc.id === editingCard.id)?.dependents ?? []).map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-200">{d.name}</span>
                    <button
                      type="button"
                      onClick={() => void removeDependentPerson(d.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30"
          >
            Salvar
          </button>
        </form>
      </Modal>

      <Modal
        open={expenseModal}
        onClose={() => setExpenseModal(false)}
        title={
          editingExpense ? (expenseForm.splitMode ? 'Editar gasto dividido' : 'Editar gasto') : 'Novo gasto'
        }
      >
        <form onSubmit={(e) => void submitExpense(e)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Cartão</label>
            <select
              required
              value={expenseForm.cardId || ''}
              onChange={(e) => {
                const newCardId = Number(e.target.value)
                setExpenseForm((f) => ({
                  ...f,
                  cardId: newCardId,
                  splitParts: f.splitMode ? fixSplitPartsForNewCard(f.splitParts, newCardId, cards) : f.splitParts,
                }))
              }}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              {cards.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {!editingExpense && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Parcelas</label>
              <input
                type="number"
                min={1}
                max={120}
                value={expenseForm.installmentCount}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(120, Number.parseInt(e.target.value, 10) || 1))
                  setExpenseForm((f) => ({
                    ...f,
                    installmentCount: n,
                    splitMode: n > 1 ? false : f.splitMode,
                  }))
                }}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
              />
              <p className="mt-1 text-xs text-zinc-500">
                1 = à vista. Maior que 1: o valor abaixo é o <strong className="text-zinc-300">total</strong> da compra;
                o sistema divide e lança uma parcela por mês a partir da data da 1ª.
              </p>
            </div>
          )}
          {editingExpense && (editingExpense.installmentCount ?? 1) > 1 && (
            <p className="rounded-lg bg-fuchsia-500/10 px-3 py-2 text-xs text-fuchsia-200 ring-1 ring-fuchsia-500/25">
              Compra parcelada: você está editando apenas esta linha (parcela {editingExpense.installmentIndex}/
              {editingExpense.installmentCount}). Para remover tudo, use excluir e escolha apagar todas as parcelas.
            </p>
          )}
          {editingExpense &&
            (editingExpense.splitPartCount ?? 1) > 1 &&
            expenseForm.splitMode && (
              <p className="rounded-lg bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 ring-1 ring-cyan-500/25">
                As {editingExpense.splitPartCount} partes desta divisão aparecem abaixo. Ao salvar, o grupo inteiro é
                substituído pelos valores e responsáveis que você definir.
              </p>
            )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                {editingExpense || expenseForm.installmentCount <= 1 ? 'Valor (R$)' : 'Valor total (R$)'}
              </label>
              <input
                required
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                inputMode="decimal"
                placeholder="0,00"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                {editingExpense ? 'Data' : '1ª parcela (data)'}
              </label>
              <input
                required
                type="date"
                value={expenseForm.expenseDate}
                onChange={(e) => setExpenseForm((f) => ({ ...f, expenseDate: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
          </div>
          {instPreview && (
            <p className="text-xs text-zinc-400">
              Divisão aproximada: <span className="font-mono text-zinc-200">{instPreview}</span>
            </p>
          )}
          {(!editingExpense || (editingExpense.installmentCount ?? 1) <= 1) && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-zinc-900/40 p-3">
              <input
                type="checkbox"
                checked={expenseForm.splitMode}
                disabled={
                  (!!editingExpense && (editingExpense.installmentCount ?? 1) > 1) ||
                  (!editingExpense && expenseForm.installmentCount > 1)
                }
                onChange={(e) =>
                  setExpenseForm((f) => {
                    if (!e.target.checked) return { ...f, splitMode: false }
                    const d0 = (cards.find((c) => c.id === f.cardId)?.dependents ?? [])[0]
                    const second = d0
                      ? { spentBySelf: false, dependentPersonId: d0.id, amount: '' }
                      : { spentBySelf: true, dependentPersonId: null, amount: '' }
                    return {
                      ...f,
                      splitMode: true,
                      splitParts: [{ spentBySelf: true, dependentPersonId: null, amount: '' }, second],
                    }
                  })
                }
                className="mt-1 rounded border-white/20"
              />
              <span>
                <span className="block text-sm font-medium text-zinc-200">Dividir entre duas ou mais pessoas</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Cada parte vira um lançamento no cartão (mesma data). Ao editar, você pode ativar ou desativar a
                  divisão (exceto em compras parceladas por mês). Ao menos uma parte deve ser de outra pessoa
                  cadastrada neste cartão. Incompatível com parcelamento em meses diferentes.
                </span>
              </span>
            </label>
          )}
          {!expenseForm.splitMode ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Quem gastou</label>
              <select
                value={dependentSelectValue(expenseForm.spentBySelf, expenseForm.dependentPersonId)}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'self') {
                    setExpenseForm((f) => ({ ...f, spentBySelf: true, dependentPersonId: null }))
                  } else {
                    setExpenseForm((f) => ({
                      ...f,
                      spentBySelf: false,
                      dependentPersonId: Number.parseInt(v, 10),
                    }))
                  }
                }}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="self">Eu (titular)</option>
                {(cards.find((c) => c.id === expenseForm.cardId)?.dependents ?? []).map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
              {(cards.find((c) => c.id === expenseForm.cardId)?.dependents ?? []).length === 0 && (
                <p className="mt-1 text-xs text-amber-400/90">
                  Cadastre pessoas no cartão (editar cartão) para atribuir gasto a alguém além de você.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3 ring-1 ring-cyan-500/15">
              <p className="mb-2 text-xs font-medium text-cyan-200/90">Partes do valor (deve fechar com o total)</p>
              <div className="space-y-2">
                {expenseForm.splitParts.map((part, idx) => {
                  const deps = cards.find((c) => c.id === expenseForm.cardId)?.dependents ?? []
                  return (
                    <div
                      key={`${idx}-${dependentSelectValue(part.spentBySelf, part.dependentPersonId)}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <select
                        value={dependentSelectValue(part.spentBySelf, part.dependentPersonId)}
                        onChange={(e) => {
                          const v = e.target.value
                          setExpenseForm((f) => ({
                            ...f,
                            splitParts: f.splitParts.map((p, j) =>
                              j === idx
                                ? v === 'self'
                                  ? { ...p, spentBySelf: true, dependentPersonId: null }
                                  : { ...p, spentBySelf: false, dependentPersonId: Number.parseInt(v, 10) }
                                : p,
                            ),
                          }))
                        }}
                        className="min-w-[130px] flex-1 rounded-lg border border-white/10 bg-zinc-900/80 px-2 py-2 text-sm text-white"
                      >
                        <option value="self">Eu</option>
                        {deps.map((d) => (
                          <option key={d.id} value={String(d.id)}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <input
                        value={part.amount}
                        onChange={(e) =>
                          setExpenseForm((f) => ({
                            ...f,
                            splitParts: f.splitParts.map((p, j) => (j === idx ? { ...p, amount: e.target.value } : p)),
                          }))
                        }
                        inputMode="decimal"
                        placeholder="Valor R$"
                        className="w-28 rounded-lg border border-white/10 bg-zinc-900/80 px-2 py-2 font-mono text-sm text-white"
                      />
                      {expenseForm.splitParts.length > 2 && (
                        <button
                          type="button"
                          className="text-xs text-red-400 hover:text-red-300"
                          onClick={() =>
                            setExpenseForm((f) =>
                              f.splitParts.length <= 2
                                ? f
                                : { ...f, splitParts: f.splitParts.filter((_, j) => j !== idx) },
                            )
                          }
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-xs text-cyan-300 hover:text-cyan-200"
                  onClick={() =>
                    setExpenseForm((f) => ({
                      ...f,
                      splitParts: [...f.splitParts, { spentBySelf: true, dependentPersonId: null, amount: '' }],
                    }))
                  }
                >
                  + Parte
                </button>
                <button
                  type="button"
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                  onClick={() => {
                    const totalVal = Number.parseFloat(expenseForm.amount.replace(',', '.'))
                    if (Number.isNaN(totalVal) || totalVal <= 0) return
                    const n = expenseForm.splitParts.length
                    const amounts = equalPartsAmountStrings(totalVal, n)
                    setExpenseForm((f) => ({
                      ...f,
                      splitParts: f.splitParts.map((p, i) => ({ ...p, amount: amounts[i] ?? '' })),
                    }))
                  }}
                >
                  Dividir igualmente
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Descrição</label>
            <input
              required
              value={expenseForm.description}
              onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Supermercado, TV…"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Observações (opcional)</label>
            <textarea
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30"
          >
            Salvar
          </button>
        </form>
      </Modal>
    </div>
  )
}

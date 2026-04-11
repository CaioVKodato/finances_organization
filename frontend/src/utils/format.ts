/** Valor numérico seguro para cálculos (API pode omitir campos ou mandar string). */
export function coerceMoney(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback
  const n = Number.parseFloat(String(v).trim().replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}

export function brl(n: string | number | null | undefined): string {
  if (n === null || n === undefined || n === '') return '—'
  const v =
    typeof n === 'string'
      ? Number.parseFloat(n.trim().replace(/\s/g, '').replace(',', '.'))
      : Number(n)
  if (!Number.isFinite(v)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(v)
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

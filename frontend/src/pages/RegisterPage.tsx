import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/api'
import { Wallet } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }
    setLoading(true)
    try {
      await register(email.trim(), password)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_#1e1b4b_0%,_#0a0a0f_55%)] px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-violet-300">
        <Wallet className="h-8 w-8" />
        <span className="text-xl font-semibold tracking-tight">Finanças</span>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-white">Criar conta</h1>
        <p className="mt-1 text-sm text-zinc-500">Senha com no mínimo 8 caracteres.</p>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">E-mail</label>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Senha</label>
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 disabled:opacity-60"
          >
            {loading ? 'Criando…' : 'Cadastrar'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-500">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-violet-400 hover:text-violet-300">
            Entrar
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link to="/" className="text-sm text-zinc-500 transition hover:text-zinc-300">
            ← Voltar à página inicial
          </Link>
        </p>
      </div>
    </div>
  )
}

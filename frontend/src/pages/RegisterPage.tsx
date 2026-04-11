import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/api'
import { Wallet } from 'lucide-react'
import { analyzePasswordStrength, passwordRegistrationError } from '../utils/passwordStrength'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const strength = useMemo(() => analyzePasswordStrength(password), [password])
  const submitBlocked = password.length > 0 && !strength.meetsMinimum

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const pwdErr = passwordRegistrationError(password)
    if (pwdErr) {
      setError(pwdErr)
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            {password.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => {
                    const active =
                      strength.level === 'strong'
                        ? i <= 2
                        : strength.level === 'medium'
                          ? i <= 1
                          : strength.level === 'weak'
                            ? i === 0
                            : false
                    const color =
                      strength.level === 'strong'
                        ? 'bg-emerald-500'
                        : strength.level === 'medium'
                          ? 'bg-amber-500'
                          : strength.level === 'weak'
                            ? 'bg-red-500'
                            : 'bg-zinc-700'
                    return (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${active ? color : 'bg-zinc-700'}`}
                      />
                    )
                  })}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Força da senha</span>
                  {strength.level !== 'none' && (
                    <span
                      className={
                        strength.level === 'strong'
                          ? 'font-medium text-emerald-400'
                          : strength.level === 'medium'
                            ? 'font-medium text-amber-400'
                            : 'font-medium text-red-400'
                      }
                    >
                      {strength.label}
                    </span>
                  )}
                </div>
                <ul className="grid gap-1 text-[11px] text-zinc-500">
                  <li className={strength.hasLetter ? 'text-zinc-400' : ''}>
                    {strength.hasLetter ? '✓' : '○'} Letras
                  </li>
                  <li className={strength.hasNumber ? 'text-zinc-400' : ''}>
                    {strength.hasNumber ? '✓' : '○'} Números
                  </li>
                  <li className={strength.hasSymbol ? 'text-zinc-400' : ''}>
                    {strength.hasSymbol ? '✓' : '○'} Símbolo (! @ # …)
                  </li>
                  <li className={password.length >= 8 ? 'text-zinc-400' : ''}>
                    {password.length >= 8 ? '✓' : '○'} Mínimo 8 caracteres
                  </li>
                </ul>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || submitBlocked}
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

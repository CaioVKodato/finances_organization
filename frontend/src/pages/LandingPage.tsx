import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CreditCard,
  PieChart,
  Shield,
  Sparkles,
  Upload,
  Users,
  Wallet,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-white">
            <Wallet className="h-8 w-8 text-violet-400" />
            <span>Finanças</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:bg-violet-500"
            >
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.25),transparent)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              Controle de cartões e gastos em um só lugar
            </p>
            <h1 className="text-balance bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
              Organize suas finanças por cartão e por pessoa
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-zinc-400">
              Cadastre cartões, acompanhe a fatura do ciclo, registre quem gastou o quê e importe lançamentos em lote a
              partir de um CSV da fatura — sem perder o controle do orçamento.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-violet-900/40 transition hover:from-violet-500 hover:to-fuchsia-500"
              >
                Começar grátis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-8 py-3.5 text-base font-medium text-zinc-200 transition hover:bg-white/10"
              >
                Já tenho conta
              </Link>
            </div>
            <p className="mt-8 text-sm text-zinc-500">
              Depois do login você acessa o{' '}
              <Link to="/app" className="font-medium text-violet-400 underline-offset-4 hover:text-violet-300 hover:underline">
                painel principal
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="border-t border-white/10 bg-white/[0.02] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">O que você pode fazer</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-400">
              Pensado para quem usa vários cartões e divide gastos com família — com visão clara do mês e da fatura.
            </p>
            <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <li className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm">
                <CreditCard className="mb-4 h-10 w-10 text-violet-400" />
                <h3 className="text-lg font-semibold text-white">Vários cartões</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Cadastre nome, cor e fechamento da fatura. Veja o total do ciclo e o histórico em um carrossel objetivo.
                </p>
              </li>
              <li className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm">
                <Users className="mb-4 h-10 w-10 text-fuchsia-400" />
                <h3 className="text-lg font-semibold text-white">Quem gastou</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Marque cada lançamento como titular ou dependente do cartão. Filtre gastos por pessoa quando precisar.
                </p>
              </li>
              <li className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm">
                <Upload className="mb-4 h-10 w-10 text-teal-400" />
                <h3 className="text-lg font-semibold text-white">Importação de fatura</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Envie um CSV, atribua responsável por linha e evite duplicar o que já foi importado antes.
                </p>
              </li>
              <li className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm">
                <PieChart className="mb-4 h-10 w-10 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Orçamento e renda</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Informe sua renda mensal e acompanhe quanto ainda “sobra” no mês civil com base nos seus gastos como
                  titular.
                </p>
              </li>
              <li className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
                <Shield className="mb-4 h-10 w-10 text-emerald-400" />
                <h3 className="text-lg font-semibold text-white">Conta segura</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Login com e-mail e senha; sessão protegida com token. Seus dados ficam vinculados à sua conta.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-950/50 to-fuchsia-950/30 p-10 text-center">
            <h2 className="text-2xl font-bold text-white">Pronto para organizar?</h2>
            <p className="mt-3 text-zinc-300">
              Crie sua conta em segundos ou entre se já tiver cadastro.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3 font-semibold text-violet-900 transition hover:bg-zinc-100"
              >
                Criar conta
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 px-8 py-3 font-medium text-white transition hover:bg-white/10"
              >
                Entrar
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-zinc-500">
        Finanças — organização de cartões e gastos. Uso local ou servidor próprio com API Spring Boot.
      </footer>
    </div>
  )
}

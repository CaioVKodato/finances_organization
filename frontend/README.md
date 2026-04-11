# Frontend — finances_organization

Interface em React + Vite + TypeScript + Tailwind. Documentação geral: veja [`../README.md`](../README.md).

## Estrutura de pastas (`src/`)

| Pasta | Função |
|-------|--------|
| `assets/` | Imagens, ícones e fontes locais |
| `components/` | Componentes reutilizáveis (ex.: modal) |
| `pages/` | Telas completas (landing, login, registro, painel) |
| `services/` | Chamadas HTTP e persistência do token (`api.ts`, `authStorage.ts`) |
| `hooks/` | Custom hooks (React) |
| `context/` | Context API (estado global, se necessário) |
| `routes/` | Definição de rotas (`AppRoutes.tsx`) |
| `styles/` | CSS global (Tailwind + tema) |
| `types/` | Tipos TypeScript compartilhados |
| `utils/` | Funções utilitárias (ex.: `format.ts`) |
| `App.tsx` | Raiz da árvore React (delega rotas) |
| `main.tsx` | Ponto de entrada (ReactDOM) |

No **Vite**, o `index.html` fica na **raiz do projeto frontend** (não em `public/`). Arquivos em `public/` são copiados para a raiz do build.

## Rotas

- `/` — Landing page (apresentação do app)
- `/login`, `/register` — Autenticação
- `/app/*` — Painel logado (dashboard)

## Comandos

```bash
npm install
npm run dev    # desenvolvimento
npm run build  # produção → dist/
```

Variável opcional: `VITE_API_URL` (URL base da API, sem barra no final).

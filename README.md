# finances_organization

Organização financeira pessoal: cartões, gastos por pessoa (Eu, Namorada, Mãe, Outro), parcelas, renda mensal, fatura por ciclo e orçamento do mês (apenas gastos marcados como **Eu** reduzem o valor disponível).

## Estrutura

| Pasta | Descrição |
|-------|-----------|
| `backend/` | API REST — Spring Boot 3, Java 17, JPA, H2 |
| `frontend/` | Interface — React, Vite, TypeScript, Tailwind CSS |

## Pré-requisitos

- JDK 17+
- Maven 3.9+ (ou cópia local em `tools/maven`, ignorada pelo Git)
- Node.js 20+

## Executar

**Backend** (porta `8080`):

```bash
cd backend
mvn spring-boot:run
```

**Frontend** (desenvolvimento):

```bash
cd frontend
npm install
npm run dev
```

Se a API não estiver em `http://localhost:8080`, defina `VITE_API_URL` (por exemplo em `.env` no frontend).

## Licença

Uso pessoal / projeto privado.

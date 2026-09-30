# Agente Financeiro

MVP web para gestão financeira pessoal com autenticação, pagamentos, status, prioridade e visão mensal.

## Stack
- Next.js 16 + React 19 + TypeScript
- Route Handlers do Next.js como backend
- Prisma ORM
- SQLite no desenvolvimento; PostgreSQL recomendado em produção
- Sessão via cookie HTTP-only assinado com JWT
- bcrypt para hash de senha

## Rodar localmente
1. `cp .env.example .env`
2. Troque `SESSION_SECRET` por uma chave forte.
3. `npm install`
4. `npx prisma generate`
5. `npx prisma db push`
6. `npm run dev`
7. Acesse `http://localhost:3000`

## Produção
Para produção, altere o provider do Prisma para `postgresql`, configure `DATABASE_URL` com um Postgres gerenciado (ex.: Neon/Vercel Postgres), rode migrações e publique na Vercel.

## Entregue neste MVP
- Cadastro e login de usuário
- Isolamento dos dados por usuário
- Dashboard financeiro
- Cadastro de contas
- Status: A pagar, Próximo, Atrasado, Pago e Parcial
- Prioridade: Essencial, Alta, Média e Baixa
- Recorrência mensal/anual
- Marcar e reabrir pagamento
- Filtros por status
- Estrutura de receitas, cartões e relatórios pronta para expansão

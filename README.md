# sinal vivo

App romântico privado, com portão de disfarce, login para 2 usuários fixos e
um botão de sinal em tempo real (via Supabase Realtime). Check-in diário e
compartilhamento de updates entram na próxima leva.

## Setup

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Project Settings > API**, copie a `Project URL`, a `anon public key`
   e a `service_role key`.

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — do passo acima.
- `SECRET_GATE_CODE` — a palavra/frase que libera o acesso a partir da busca
  disfarçada em `/`.
- `SESSION_SECRET` — segredo aleatório forte (ex: `openssl rand -base64 32`).
- `AUTH_USER_1_ID` / `AUTH_USER_1_NAME` / `AUTH_USER_1_PASSWORD_HASH` e o
  mesmo para `AUTH_USER_2_*` — os dois usuários fixos.

Para gerar o hash bcrypt de cada senha:

```bash
npm run hash-password -- "senha da pessoa 1"
```

Cole o resultado em `AUTH_USER_1_PASSWORD_HASH` (e repita para o usuário 2).
Nunca coloque a senha em texto puro no `.env`.

### 3. Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) — você verá a busca
disfarçada. Digite o `SECRET_GATE_CODE` pra chegar em `/login`.

## Como funciona o portão de disfarce

- `/` é uma busca neutra. A validação do código secreto acontece inteiramente
  no servidor (`src/app/actions.ts`), nunca no bundle do client.
- Texto errado → redireciona pra busca de imagens do Google com o que foi
  digitado (disfarce completo, sem indício de erro).
- Texto certo → seta um cookie httpOnly de curta duração (10 min) e manda
  pra `/login`.
- Há rate limit simples por IP (`src/lib/rate-limit.ts`, em memória — trocar
  por Upstash se o app crescer além de uma instância serverless única).

## Estrutura

- `src/app/page.tsx` + `actions.ts` — portão de disfarce.
- `src/app/login/` — seleção de usuário + senha (bcrypt), só acessível com o
  cookie do portão.
- `src/app/app/` — área logada: botão de sinal em tempo real.
- `src/middleware.ts` — protege `/login` e `/app/*` verificando os cookies
  assinados (JWT via `jose`).
- `src/lib/supabase/admin.ts` — client com a service role key, usado só em
  Server Actions. Toda autorização é feita pela sessão da aplicação, não
  pelo Supabase Auth.
- `src/lib/supabase/client.ts` — client anon, usado no browser só pra
  subscrever o Realtime da tabela `signals`.

## Deploy

Deploy padrão na Vercel — configure as mesmas variáveis de ambiente do
`.env.local` no dashboard do projeto.

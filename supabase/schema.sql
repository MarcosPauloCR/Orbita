-- Sinal Vivo — schema Supabase
-- Rodar no SQL Editor do projeto Supabase (ou via `supabase db push`).

create extension if not exists "pgcrypto";

-- Usuários fixos do app (login próprio, não Supabase Auth). Gravados via
-- `npm run set-user -- <id> <senha> ["Nome"]` — ver scripts/set-user.mjs.
create table if not exists users (
  id text primary key,
  name text not null,
  password_hash text not null,
  created_at timestamptz default now()
);

alter table users enable row level security;

-- Sem policies para anon/authenticated: login e troca de senha passam
-- pela service role no backend (Server Actions), mesmo padrão das demais
-- tabelas.

-- Inscrições de Web Push (uma por dispositivo/navegador instalado).
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null references users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

-- Sem policies para anon/authenticated: só a service role grava (ao ativar
-- notificações) e lê (ao enviar um sinal) essa tabela.

create table if not exists signals (
  id uuid default gen_random_uuid() primary key,
  from_user text not null,
  created_at timestamptz default now()
);

-- "sos" é uma variante urgente do sinal normal — não entra no streak nem
-- no contador do dia a dia, só aparece marcada no histórico.
alter table signals add column if not exists type text not null default 'normal';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'signals_type_check'
  ) then
    alter table signals add constraint signals_type_check
      check (type in ('normal', 'sos'));
  end if;
end $$;

create table if not exists checkins (
  id uuid default gen_random_uuid() primary key,
  from_user text not null,
  mood int not null check (mood between 1 and 5),
  note text,
  created_at timestamptz default now()
);

-- Termômetro de humor: escala fina de 1 a 10 (era 1 a 5).
alter table checkins drop constraint if exists checkins_mood_check;
alter table checkins add constraint checkins_mood_check check (mood between 1 and 10);

-- um check-in por usuário por dia
create unique index if not exists checkins_one_per_user_per_day
  on checkins (from_user, ((created_at at time zone 'utc')::date));

create table if not exists updates (
  id uuid default gen_random_uuid() primary key,
  from_user text not null,
  type text not null check (type in ('text', 'photo')),
  content text,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- "some depois de vista": se true, a foto (linha + arquivo no storage) é
-- apagada assim que quem recebeu terminar de visualizar.
alter table updates add column if not exists disappearing boolean not null default false;

-- Chat (mensagens de texto entre os dois usuários). Fica de fora da
-- publication do Realtime de propósito: o conteúdo é privado, então a
-- entrega em tempo real é feita via Broadcast (efêmero, não lê a tabela)
-- disparado pelo próprio client depois que o Server Action confirma a
-- escrita — nunca por uma subscription direta com a anon key.
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  from_user text not null,
  content text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Fotos inline no chat: content vira opcional, foto vira um caminho no
-- mesmo bucket privado das outras fotos do app.
alter table messages alter column content drop not null;
alter table messages add column if not exists photo_path text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'messages_has_content'
  ) then
    alter table messages add constraint messages_has_content
      check (content is not null or photo_path is not null);
  end if;
end $$;

alter table messages enable row level security;

-- Sem policies para anon/authenticated: histórico é lido via Server
-- Component autenticado (service role); a entrega ao vivo é só Broadcast.

-- Apagar mensagem exige o "sim" da outra pessoa: quem quer apagar só marca
-- o pedido aqui; a linha só é removida de verdade em approveDeleteMessage,
-- chamado por quem NÃO fez o pedido.
alter table messages add column if not exists delete_requested_by text references users (id);

-- Cápsula do tempo: mensagem/foto que só pode ser aberta a partir de
-- `unlock_at`. De propósito não tem coluna nem policy que permita UPDATE de
-- conteúdo ou DELETE pelo client — a trava é estrutural, não só de UI: quem
-- manda não tem como apagar depois, e ninguém (nem quem mandou) lê o
-- conteúdo antes da data, reforçado nas Server Actions.
create table if not exists capsules (
  id uuid default gen_random_uuid() primary key,
  from_user text not null,
  message text,
  photo_path text,
  unlock_at timestamptz not null,
  opened_at timestamptz,
  created_at timestamptz default now(),
  constraint capsules_has_content check (message is not null or photo_path is not null)
);

-- Quem efetivamente clicou em "abrir" (pode ser diferente de quem enviou,
-- já que hoje qualquer um dos dois pode abrir depois do prazo).
alter table capsules add column if not exists opened_by text references users (id);

-- Cápsula-relâmpago: em vez de uma data fixa, abre na próxima vez que quem
-- vai receber ficar online. unlock_at fica null até isso acontecer — quem
-- "dispara" a virada é a própria Server Action de listagem, rodando pro
-- destinatário quando ele abre a aba de cápsulas.
alter table capsules alter column unlock_at drop not null;
alter table capsules add column if not exists unlock_on_next_online boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'capsules_unlock_defined'
  ) then
    alter table capsules add constraint capsules_unlock_defined
      check (unlock_at is not null or unlock_on_next_online);
  end if;
end $$;

alter table capsules enable row level security;

-- Sem policies para anon/authenticated: só a service role lê/grava, e as
-- Server Actions nunca expõem um caminho de "delete" pra essa tabela.

-- Pergunta do dia: a pergunta em si não fica no banco (é escolhida por
-- data a partir de uma lista fixa no código, igual pros dois). Só a
-- resposta de cada um fica aqui, uma por pessoa por dia — e a Server
-- Action só revela a resposta do outro depois que os dois responderem.
create table if not exists daily_answers (
  id uuid default gen_random_uuid() primary key,
  from_user text not null references users (id),
  question_date date not null,
  answer text not null,
  created_at timestamptz default now(),
  unique (from_user, question_date)
);

-- Segunda trilha de pergunta ("imagina se", mais lúdica) além da reflexiva
-- padrão — mesma mecânica, categorias diferentes, uma resposta por
-- categoria por dia.
alter table daily_answers add column if not exists category text not null default 'reflective';
alter table daily_answers drop constraint if exists daily_answers_from_user_question_date_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'daily_answers_unique_per_category'
  ) then
    alter table daily_answers add constraint daily_answers_unique_per_category
      unique (from_user, question_date, category);
  end if;
end $$;

alter table daily_answers enable row level security;

-- Sem policies para anon/authenticated: só a service role lê/grava.

-- Jogo da forca assíncrono. A palavra fica visível só pra quem criou —
-- quem está adivinhando só recebe a palavra mascarada, calculada na
-- Server Action, nunca a coluna `word` direto.
create table if not exists hangman_games (
  id uuid default gen_random_uuid() primary key,
  created_by text not null references users (id),
  word text not null,
  guessed_letters text not null default '',
  wrong_guesses int not null default 0,
  max_wrong_guesses int not null default 6,
  status text not null default 'playing' check (status in ('playing', 'won', 'lost')),
  created_at timestamptz default now(),
  finished_at timestamptz
);

-- Tema escolhido por quem cria (ex: "filmes", "comida") — aparece pra
-- quem vai adivinhar, junto com quantidade de letras e chances restantes.
alter table hangman_games add column if not exists theme text;

-- Convite: quem cria já topa por definição; só falta a outra pessoa
-- aceitar antes de qualquer palpite valer.
alter table hangman_games add column if not exists accepted boolean not null default false;

alter table hangman_games enable row level security;

-- Sem policies para anon/authenticated: só a service role lê/grava, e a
-- palavra nunca é enviada pro client de quem está adivinhando.

-- Jogo da velha.
create table if not exists tictactoe_games (
  id uuid default gen_random_uuid() primary key,
  player_x text not null references users (id),
  player_o text not null references users (id),
  board text not null default '---------', -- 9 posições: X, O ou -
  turn text not null default 'X' check (turn in ('X', 'O')),
  status text not null default 'playing' check (status in ('playing', 'won_x', 'won_o', 'draw')),
  created_at timestamptz default now()
);

alter table tictactoe_games add column if not exists accepted boolean not null default false;

alter table tictactoe_games enable row level security;

-- Batalha naval simplificada: grade 4x4, 3 navios de 1 célula cada.
create table if not exists battleship_games (
  id uuid default gen_random_uuid() primary key,
  player_a text not null references users (id),
  player_b text not null references users (id),
  ships_a text, -- células (0-15) separadas por vírgula, null até colocar os navios
  ships_b text,
  shots_a text not null default '', -- células que "a" já atirou no tabuleiro de "b"
  shots_b text not null default '',
  turn text not null default 'a' check (turn in ('a', 'b')),
  status text not null default 'setup' check (status in ('setup', 'playing', 'won_a', 'won_b')),
  created_at timestamptz default now()
);

alter table battleship_games add column if not exists accepted boolean not null default false;

alter table battleship_games enable row level security;

-- Jogo da memória (4x4, 8 pares de símbolos temáticos de lua/espaço).
create table if not exists memory_games (
  id uuid default gen_random_uuid() primary key,
  player_a text not null references users (id),
  player_b text not null references users (id),
  board text not null, -- 16 símbolos separados por vírgula, ordem embaralhada
  matched text not null default '', -- índices (0-15) já casados, separados por vírgula
  flipped text not null default '', -- 0, 1 ou 2 índices virados no momento
  turn text not null references users (id),
  score_a int not null default 0,
  score_b int not null default 0,
  status text not null default 'playing' check (status in ('playing', 'finished')),
  created_at timestamptz default now()
);

alter table memory_games add column if not exists accepted boolean not null default false;

alter table memory_games enable row level security;

-- Motor unificado de "pergunta -> resposta -> revelar", usado por três
-- brincadeiras diferentes (categoria muda o rótulo e o fluxo na UI):
-- trivia = "quanto você me conhece", emoji = charadas de emoji,
-- dare = verdade ou desafio.
create table if not exists duo_games (
  id uuid default gen_random_uuid() primary key,
  category text not null check (category in ('trivia', 'emoji', 'dare')),
  created_by text not null references users (id),
  responder text not null references users (id),
  prompt text not null,
  creator_answer text, -- só em 'trivia': a resposta verdadeira de quem criou
  response text, -- o palpite (trivia/emoji) ou a resposta/confirmação (dare)
  judged_correct boolean, -- só em trivia/emoji, autoavaliado por quem criou
  status text not null default 'awaiting_response'
    check (status in ('awaiting_response', 'awaiting_judgment', 'done')),
  created_at timestamptz default now()
);

alter table duo_games enable row level security;

-- Continue a história: linhas alternadas entre os dois, sem fim definido.
create table if not exists story_lines (
  id uuid default gen_random_uuid() primary key,
  from_user text not null references users (id),
  content text not null,
  created_at timestamptz default now()
);

alter table story_lines enable row level security;

-- Caça-palavras, dois modos: "coop" (grade única, achar marca pros dois)
-- e "race" (cada um com sua própria lista de achadas, compara o tempo).
create table if not exists wordsearch_games (
  id uuid default gen_random_uuid() primary key,
  mode text not null check (mode in ('coop', 'race')),
  theme text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  grid_size int not null,
  grid text not null, -- todas as letras da grade, linha a linha, sem separador
  words text not null, -- palavras da rodada, separadas por vírgula
  player_a text not null references users (id),
  player_b text not null references users (id),
  found_a text not null default '', -- coop: lista compartilhada; race: só as de "a"
  found_b text not null default '', -- coop: espelho de found_a; race: só as de "b"
  finished_at_a timestamptz, -- só usado no modo race
  finished_at_b timestamptz,
  status text not null default 'playing' check (status in ('playing', 'finished')),
  created_at timestamptz default now()
);

alter table wordsearch_games add column if not exists accepted boolean not null default false;

alter table wordsearch_games enable row level security;

-- Sem policies para anon/authenticated em nenhum jogo novo: só a service
-- role lê/grava, mesmo padrão de tudo mais no app.

-- Compartilhamento de vídeo de comida (ex: achou um vídeo interessante no
-- Instagram e quer sugerir pra fazer junto). Quem recebe aprova/reprova,
-- dá uma nota de 0 a 10 e, opcionalmente, sugere uma data pra fazer.
-- Mesmo padrão de "updates": nada de postgres_changes, entrega ao vivo é
-- via Broadcast disparado pelo client depois que a Server Action confirma.
create table if not exists food_shares (
  id uuid default gen_random_uuid() primary key,
  from_user text not null references users (id),
  url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rating int check (rating between 0 and 10),
  suggested_date date,
  decided_at timestamptz,
  created_at timestamptz default now()
);

-- Nome curto pra identificar o vídeo (ex: "brigadeiro gourmet") — sem
-- isso, o link sozinho não dizia nada quando aparecia escolhido na Agenda.
alter table food_shares add column if not exists title text;

alter table food_shares enable row level security;

-- Sem policies para anon/authenticated: só a service role lê/grava.

-- Cardápio da semana: um prato pra cozinhar em casa, com link de receita
-- opcional, podendo vir digitado por alguém ou sorteado pelo app. Aprovar
-- exige escolher o dia (scheduled_day) — isso é o que vira a "agenda" da
-- semana. made_at marca quando o prato realmente foi feito.
create table if not exists menu_items (
  id uuid default gen_random_uuid() primary key,
  from_user text not null references users (id),
  dish text not null,
  recipe_url text,
  suggested_by_app boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  scheduled_day date,
  made_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz default now()
);

alter table menu_items enable row level security;

-- Sem policies para anon/authenticated: só a service role lê/grava.

-- Filmes/séries pra assistir: mesma mecânica de aprovar/reprovar + nota de
-- 0 a 10 dos vídeos de comida, mas sem sugestão de data. watched_at marca
-- "já assistido" (também usado pra não repetir sugestão do app).
create table if not exists movie_shares (
  id uuid default gen_random_uuid() primary key,
  from_user text not null references users (id),
  title text not null,
  link_url text,
  suggested_by_app boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rating int check (rating between 0 and 10),
  watched_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz default now()
);

alter table movie_shares enable row level security;

-- Sem policies para anon/authenticated: só a service role lê/grava.

-- Agenda: roteiro do dia (hora + atividade), um dia pode ter vários itens
-- (ex: cozinhar de noite E ver um filme depois). Os 3 links são opcionais e
-- mutuamente exclusivos na prática (só um preenchido por vez, dependendo de
-- activity_type) — validado na Server Action, não aqui.
-- auto_created marca itens que o próprio app criou sozinho (ao aprovar um
-- vídeo de comida com data sugerida, ou um prato do cardápio — que sempre
-- tem dia), pra distinguir de item adicionado manualmente na Agenda.
create table if not exists agenda_items (
  id uuid default gen_random_uuid() primary key,
  day date not null,
  meeting_time time,
  activity_type text not null check (activity_type in ('sair', 'filme', 'cozinhar', 'dormir')),
  description text,
  movie_share_id uuid references movie_shares (id) on delete set null,
  food_share_id uuid references food_shares (id) on delete set null,
  menu_item_id uuid references menu_items (id) on delete set null,
  created_by text not null references users (id),
  auto_created boolean not null default false,
  created_at timestamptz default now()
);

-- Modo surpresa: quem cria pode marcar o item pra ficar escondido de quem
-- não criou até o dia/hora combinada — a trava é reforçada na Server
-- Action (getAgendaItems nunca manda os detalhes de quem não pode ver
-- ainda), mesmo espírito da cápsula do tempo.
alter table agenda_items add column if not exists is_surprise boolean not null default false;

-- Retrospectiva rápida depois que o dia passa ("como foi?"), fecha o ciclo
-- do que foi planejado.
alter table agenda_items add column if not exists recap text;

alter table agenda_items enable row level security;

-- Sem policies para anon/authenticated: só a service role lê/grava.

-- Desafios a dois: a lista dos ~100 desafios em si vive fixa no código
-- (lib/challenges.ts), igual à pergunta do dia — aqui só guarda quais
-- IDs já foram marcados como feitos, à mão, por qualquer um dos dois.
create table if not exists challenge_completions (
  challenge_id text primary key,
  completed_by text not null references users (id),
  completed_at timestamptz default now()
);

alter table challenge_completions enable row level security;

-- Sem policies para anon/authenticated: só a service role lê/grava.

-- Realtime (idempotente: ALTER PUBLICATION não tem IF NOT EXISTS)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'signals'
  ) then
    alter publication supabase_realtime add table signals;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'updates'
  ) then
    alter publication supabase_realtime add table updates;
  end if;
end $$;

-- Row Level Security
-- O app usa a service role key no servidor (Server Actions / Route Handlers),
-- nunca a anon key diretamente com escrita — então RLS aqui é uma segunda
-- camada de proteção, não o único controle de acesso.
alter table signals enable row level security;
alter table checkins enable row level security;
alter table updates enable row level security;

-- Nenhuma policy de INSERT/UPDATE/DELETE para anon/authenticated: toda
-- escrita passa pela service role no backend Next.js (Server Actions),
-- já autenticado via cookie de sessão próprio da aplicação.
--
-- `signals` tem uma policy de SELECT para o client (role anon) porque o
-- botão de sinal precisa de uma subscription Realtime direto do browser,
-- e o conteúdo da linha (from_user + timestamp) não é sensível.
-- `checkins` e `updates` guardam texto/humor/fotos privados, então não
-- ganham policy de leitura pública — são lidos via Server Component
-- autenticado (service role) e nunca subscritos direto pelo browser.
drop policy if exists "signals são públicas para leitura (realtime)" on signals;
create policy "signals são públicas para leitura (realtime)"
  on signals for select
  to anon
  using (true);

-- Storage: bucket privado para fotos dos updates
insert into storage.buckets (id, name, public)
values ('updates-media', 'updates-media', false)
on conflict (id) do nothing;

-- Sem policies de storage para anon/authenticated pelo mesmo motivo acima:
-- upload e leitura de fotos passam pela service role no servidor, que
-- gera signed URLs de curta duração para o client exibir a imagem.

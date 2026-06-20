-- ══════════════════════════════════════════════════════════
-- 차트게임 Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 전체 실행
-- ══════════════════════════════════════════════════════════

-- ── 0. 확장 ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. users ─────────────────────────────────────────────
-- auth.users 와 1:1 연결
-- 로그인 시 트리거가 자동 생성
create table if not exists public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- 로그인 시 자동으로 users 테이블에 upsert 하는 트리거
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email        = excluded.email,
    display_name = excluded.display_name,
    avatar_url   = excluded.avatar_url;
  return new;
end;
$$;

-- 트리거 등록 (중복 방지)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. game_sessions ─────────────────────────────────────
create table if not exists public.game_sessions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users (id) on delete cascade,
  market       text not null,            -- 'KOSPI' | 'QQQ'
  ticker       text not null,
  ticker_name  text not null,
  interval     text not null,            -- '1wk' | '1mo'
  mission      text,                     -- null = 자유 모드
  init_cash    bigint not null,
  final_asset  bigint not null,
  return_pct   numeric(8,2) not null,
  follow_score int not null default 0,   -- 추세추종 점수 (0-100)
  total_trades int not null default 0,
  played_at    timestamptz not null default now()
);

create index if not exists idx_game_sessions_user_id   on public.game_sessions (user_id);
create index if not exists idx_game_sessions_played_at on public.game_sessions (played_at desc);

-- ── 3. trade_logs ────────────────────────────────────────
create table if not exists public.trade_logs (
  id         uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.game_sessions (id) on delete cascade,
  turn       int not null,
  type       text not null check (type in ('매수', '매도')),
  qty        int not null,
  krw_price  bigint not null,
  score      int not null default 0,
  snap_json  jsonb,                      -- MA 상태 스냅샷
  created_at timestamptz not null default now()
);

create index if not exists idx_trade_logs_session_id on public.trade_logs (session_id);

-- ── 4. feedbacks ─────────────────────────────────────────
create table if not exists public.feedbacks (
  id         uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.game_sessions (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  difficulty text check (difficulty in ('쉬움', '보통', '어려움')),
  comment    text,
  created_at timestamptz not null default now()
);

-- ── 5. RLS (Row Level Security) ──────────────────────────
-- users: 본인만 읽기/수정
alter table public.users enable row level security;
create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id);

-- game_sessions: 본인만 CRUD, 리더보드용 전체 읽기는 SELECT만 허용
alter table public.game_sessions enable row level security;
create policy "sessions_select_all"  on public.game_sessions for select using (true);
create policy "sessions_insert_own"  on public.game_sessions for insert with check (auth.uid() = user_id);
create policy "sessions_delete_own"  on public.game_sessions for delete using (auth.uid() = user_id);

-- trade_logs: 세션 소유자만 접근
alter table public.trade_logs enable row level security;
create policy "trade_logs_select_own" on public.trade_logs for select using (
  exists (select 1 from public.game_sessions s where s.id = session_id and s.user_id = auth.uid())
);
create policy "trade_logs_insert_own" on public.trade_logs for insert with check (
  exists (select 1 from public.game_sessions s where s.id = session_id and s.user_id = auth.uid())
);

-- feedbacks: 본인 삽입, 전체 읽기
alter table public.feedbacks enable row level security;
create policy "feedbacks_select_all" on public.feedbacks for select using (true);
create policy "feedbacks_insert_own" on public.feedbacks for insert with check (auth.uid() = user_id);
create policy "feedbacks_delete_own" on public.feedbacks for delete using (auth.uid() = user_id);

-- ── 6. 리더보드 뷰 (선택) ────────────────────────────────
create or replace view public.leaderboard as
select
  gs.id,
  gs.user_id,
  u.display_name,
  u.avatar_url,
  gs.market,
  gs.ticker_name,
  gs.interval,
  gs.mission,
  gs.return_pct,
  gs.follow_score,
  gs.total_trades,
  gs.played_at
from public.game_sessions gs
join public.users u on u.id = gs.user_id
order by gs.return_pct desc;

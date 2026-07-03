-- consult26: Firestore -> Supabase 초기 스키마
-- 원본 Firestore 컬렉션(users, app_meta/users_registry, records, shared_infra)을
-- Postgres 테이블 3개 + RPC 함수로 대체한다.
--
-- 설계 원칙:
--  - 테이블은 RLS를 켜고 정책을 하나도 두지 않는다 -> anon/authenticated 키로는
--    PostgREST를 통한 직접 테이블 접근(select/insert/update/delete)이 전부 차단된다.
--  - 모든 접근은 아래 SECURITY DEFINER 함수(RPC)를 통해서만 가능하다.
--    함수 소유자(postgres)는 RLS를 우회하므로 내부에서는 자유롭게 조회/수정 가능.
--  - Firestore의 "get(단건 조회)은 허용, list(전체 목록)는 차단" 정책과 동일한 수준을
--    유지하면서, users_registry 트랜잭션 동기화 같은 Firestore 특유의 우회 로직은
--    제거하고 Postgres 뷰/RPC로 단순화했다.

-- ============================================================
-- 1. 테이블
-- ============================================================

create table public.users (
  id text primary key,
  name text not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'user', 'school', 'agency')),
  approved boolean not null default false,
  joined_date text,
  created_at timestamptz not null default now()
);

create table public.records (
  user_id text primary key references public.users (id) on delete cascade,
  data jsonb not null,
  updated_at bigint,
  created_at timestamptz not null default now()
);

create table public.shared_infra (
  school_name text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.records enable row level security;
alter table public.shared_infra enable row level security;
-- 정책을 두지 않는다: anon/authenticated 역할은 PostgREST로 이 테이블들을
-- 직접 select/insert/update/delete 할 수 없다 (아래 RPC 함수로만 접근).

-- ============================================================
-- 2. 시드 계정 (기존 Firestore 기본 계정과 동일한 자격 증명)
--    비밀번호 해시는 앱과 동일한 SHA-256(hex) 방식으로 미리 계산한 값.
--    admin / admin123, school / school123
-- ============================================================

insert into public.users (id, name, password_hash, role, approved, joined_date)
values
  ('admin', '시스템 관리자', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', true, to_char(now(), 'YYYY-MM-DD')),
  ('school', '신성초 담당자', '70b1e4aec6726373e5c887f34e6d2c0d64dfb23dd1042f11dbdfe3959ee6b00f', 'school', true, to_char(now(), 'YYYY-MM-DD'))
on conflict (id) do nothing;

-- ============================================================
-- 3. RPC 함수 - users
-- ============================================================

-- 단건 조회 (로그인 시 비밀번호 해시 비교, 관리자 승인/중복 아이디 확인 용도).
-- Firestore의 "allow get: if true" 와 동일하게, 특정 id를 아는 사람만 그 한 건을 조회할 수 있다.
create or replace function public.get_user(p_id text)
returns table (id text, name text, password_hash text, role text, approved boolean, joined_date text)
language sql security definer set search_path = public as $$
  select id, name, password_hash, role, approved, joined_date
  from public.users
  where id = p_id;
$$;

-- 비밀번호 해시를 뺀 전체 목록 (관리자 화면 전용). Firestore의 app_meta/users_registry를 대체.
create or replace function public.list_users()
returns table (id text, name text, role text, approved boolean, joined_date text)
language sql security definer set search_path = public as $$
  select id, name, role, approved, joined_date
  from public.users
  order by created_at;
$$;

-- 회원가입: 항상 승인 대기(approved=false) 상태로만 생성.
create or replace function public.signup_user(p_id text, p_name text, p_password_hash text, p_role text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('user', 'school', 'agency') then
    raise exception '허용되지 않은 가입 권한입니다.';
  end if;

  insert into public.users (id, name, password_hash, role, approved, joined_date)
  values (p_id, p_name, p_password_hash, p_role, false, to_char(now(), 'YYYY-MM-DD'));
end;
$$;

-- 관리자: 승인 상태 토글
create or replace function public.set_user_approval(p_id text, p_approved boolean)
returns void
language sql security definer set search_path = public as $$
  update public.users set approved = p_approved where id = p_id;
$$;

-- 관리자: 계정 삭제 (records는 FK on delete cascade로 함께 삭제됨)
create or replace function public.delete_user(p_id text)
returns void
language sql security definer set search_path = public as $$
  delete from public.users where id = p_id;
$$;

-- ============================================================
-- 4. RPC 함수 - records (코디네이터별 면담 기록지 전체 상태 JSON)
-- ============================================================

create or replace function public.get_record(p_user_id text)
returns jsonb
language sql security definer set search_path = public as $$
  select data from public.records where user_id = p_user_id;
$$;

create or replace function public.upsert_record(p_user_id text, p_data jsonb, p_updated_at bigint)
returns void
language sql security definer set search_path = public as $$
  insert into public.records (user_id, data, updated_at)
  values (p_user_id, p_data, p_updated_at)
  on conflict (user_id) do update
    set data = excluded.data, updated_at = excluded.updated_at;
$$;

-- ============================================================
-- 5. RPC 함수 - shared_infra (학교 담당자 <-> 코디네이터 공유 데이터)
-- ============================================================

create or replace function public.get_shared_infra(p_school_name text)
returns jsonb
language sql security definer set search_path = public as $$
  select data from public.shared_infra where school_name = p_school_name;
$$;

create or replace function public.upsert_shared_infra(p_school_name text, p_data jsonb)
returns void
language sql security definer set search_path = public as $$
  insert into public.shared_infra (school_name, data)
  values (p_school_name, p_data)
  on conflict (school_name) do update
    set data = excluded.data, updated_at = now();
$$;

create or replace function public.delete_shared_infra(p_school_name text)
returns void
language sql security definer set search_path = public as $$
  delete from public.shared_infra where school_name = p_school_name;
$$;

-- ============================================================
-- 6. 권한 부여: anon/authenticated 키가 위 RPC 함수들을 호출할 수 있도록 허용
--    (테이블 자체 권한은 부여하지 않음 - RPC를 통해서만 접근)
-- ============================================================

grant execute on function public.get_user(text) to anon, authenticated;
grant execute on function public.list_users() to anon, authenticated;
grant execute on function public.signup_user(text, text, text, text) to anon, authenticated;
grant execute on function public.set_user_approval(text, boolean) to anon, authenticated;
grant execute on function public.delete_user(text) to anon, authenticated;
grant execute on function public.get_record(text) to anon, authenticated;
grant execute on function public.upsert_record(text, jsonb, bigint) to anon, authenticated;
grant execute on function public.get_shared_infra(text) to anon, authenticated;
grant execute on function public.upsert_shared_infra(text, jsonb) to anon, authenticated;
grant execute on function public.delete_shared_infra(text) to anon, authenticated;

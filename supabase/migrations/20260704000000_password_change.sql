-- 비밀번호 수정 기능: 본인 변경(현재 비밀번호 확인 필요) + 관리자의 타인 비밀번호 재설정.

-- 본인 비밀번호 변경: 현재 비밀번호 해시가 일치할 때만 새 해시로 갱신.
-- 일치 여부(true/false)를 반환해 호출부에서 "현재 비밀번호 불일치" 메시지를 보여줄 수 있게 한다.
create or replace function public.change_password(p_id text, p_current_password_hash text, p_new_password_hash text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_row_count int;
begin
  update public.users
  set password_hash = p_new_password_hash
  where id = p_id and password_hash = p_current_password_hash;

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

-- 관리자의 비밀번호 재설정: 현재 비밀번호 확인 없이 강제로 새 값 설정 (비밀번호 분실 구제용).
-- 기존 "관리자 승인/삭제는 무조건 허용" 정책과 동일한 신뢰 수준.
create or replace function public.admin_reset_password(p_id text, p_new_password_hash text)
returns void
language sql security definer set search_path = public as $$
  update public.users set password_hash = p_new_password_hash where id = p_id;
$$;

grant execute on function public.change_password(text, text, text) to anon, authenticated;
grant execute on function public.admin_reset_password(text, text) to anon, authenticated;

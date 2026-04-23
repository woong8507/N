begin;

-- 홈 화면 선수 카드(이름/아바타) 노출을 위해
-- 로그인 사용자(authenticated)에게 member 프로필 읽기를 허용한다.
-- 기존 "본인 또는 admin" 정책은 유지하고, member + 미삭제 행만 추가 허용한다.
drop policy if exists "profiles select member active for authenticated" on public.profiles;

create policy "profiles select member active for authenticated"
on public.profiles
for select
to authenticated
using (
  role = 'member'
  and coalesce(is_deleted, false) = false
);

commit;

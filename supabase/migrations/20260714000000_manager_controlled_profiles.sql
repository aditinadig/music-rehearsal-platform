-- Performer profiles are created by the invite-group-member Edge Function.
-- Public sign-up remains available only for managers.

alter table public.users add column if not exists email text;

update public.users as profile
set email = lower(auth_user.email)
from auth.users as auth_user
where profile.user_id = auth_user.id
  and profile.email is null;

create unique index if not exists users_email_unique
  on public.users (lower(email))
  where email is not null;

-- Every public Auth sign-up starts as a manager. The privileged invite function
-- changes invited accounts to singer or musician after creating them.
create or replace function public.create_manager_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (user_id, name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Manager'),
    lower(new.email),
    'manager'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_manager_profile_after_signup on auth.users;
create trigger create_manager_profile_after_signup
after insert on auth.users
for each row execute function public.create_manager_profile_for_auth_user();

create or replace function public.enforce_manager_self_registration()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Service-role operations have no end-user uid and are used by the invite function.
  if auth.uid() is not null and new.user_id = auth.uid() then
    if tg_op = 'INSERT' then
      new.role := 'manager';
      new.email := lower(coalesce(new.email, auth.jwt() ->> 'email'));
    elsif old.role is distinct from new.role then
      raise exception 'Profile roles can only be changed by the invitation service';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_manager_self_registration on public.users;
create trigger enforce_manager_self_registration
before insert or update on public.users
for each row execute function public.enforce_manager_self_registration();

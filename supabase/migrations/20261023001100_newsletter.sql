-- Newsletter sign-ups from the site footer. The list is private: visitors can
-- only add themselves through subscribe_newsletter(), never read it.

create table public.newsletter_subscribers (
  email text primary key check (email = lower(email) and char_length(email) <= 254),
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;

create function public.subscribe_newsletter(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cleaned text := lower(trim(coalesce(p_email, '')));
begin
  if char_length(cleaned) > 254
     or cleaned !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '23514';
  end if;
  insert into public.newsletter_subscribers (email) values (cleaned)
  on conflict (email) do nothing;
end;
$$;

revoke all on function public.subscribe_newsletter(text) from public;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;

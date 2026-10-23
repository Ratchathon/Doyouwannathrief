-- Shop applications: social links for vetting, admin review, and resubmitting
-- 15 days after a rejection.

-- ---------------------------------------------------------------------------
-- Social links (Instagram, TikTok, Facebook) so the admin can judge style.
-- Keep the allowed hosts in sync with SOCIAL_HOSTS in src/lib/shops/application.ts.
-- ---------------------------------------------------------------------------

create function public.valid_social_links(links text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(
    link ~ '^https://(www\.|m\.)?(instagram|tiktok|facebook)\.com/[^\s]+$'
  ), true)
  from unnest(links) as link;
$$;

alter table public.shops
  add column social_links text[] not null default '{}'
    check (cardinality(social_links) <= 3 and public.valid_social_links(social_links)),
  add column submitted_at timestamptz not null default now(),
  add column rejected_at timestamptz;

grant insert (social_links) on public.shops to authenticated;
grant update (social_links) on public.shops to authenticated;

-- Applications from the browser must include at least one link. (Rows written
-- by the system, such as seeds, are not held to this.)
drop policy "Users apply for a shop as themselves" on public.shops;
create policy "Users apply for a shop as themselves"
  on public.shops for insert to authenticated
  with check (owner_id = auth.uid() and cardinality(social_links) >= 1);

-- ---------------------------------------------------------------------------
-- Admin review
-- ---------------------------------------------------------------------------

create function public.admin_review_shop(p_shop_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  current_status public.shop_status;
begin
  if not public.is_admin() then
    raise exception 'Only admins can review shops' using errcode = 'insufficient_privilege';
  end if;

  select status into current_status from public.shops where id = p_shop_id for update;
  if current_status is distinct from 'pending' then
    raise exception 'This shop is not waiting for review' using errcode = 'check_violation';
  end if;

  if p_approve then
    update public.shops
      set status = 'approved', approved_at = now(), rejected_at = null, rejection_reason = null
      where id = p_shop_id;
  else
    if nullif(trim(p_reason), '') is null then
      raise exception 'A reason is required to reject a shop' using errcode = 'check_violation';
    end if;
    update public.shops
      set status = 'rejected', rejected_at = now(), approved_at = null, rejection_reason = trim(p_reason)
      where id = p_shop_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Resubmitting after a rejection, once 15 days have passed
-- ---------------------------------------------------------------------------

create function public.resubmit_shop(p_shop_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  target record;
begin
  select owner_id, status, rejected_at into target from public.shops where id = p_shop_id for update;

  if target.owner_id is distinct from auth.uid() then
    raise exception 'Only the shop owner can resubmit' using errcode = 'insufficient_privilege';
  end if;
  if target.status <> 'rejected' then
    raise exception 'Only a rejected shop can be resubmitted' using errcode = 'check_violation';
  end if;
  if target.rejected_at > now() - interval '15 days' then
    raise exception 'You can resubmit on %', (target.rejected_at + interval '15 days')::date
      using errcode = 'check_violation';
  end if;

  update public.shops
    set status = 'pending', submitted_at = now(), rejected_at = null, rejection_reason = null
    where id = p_shop_id;
end;
$$;

revoke execute on function public.admin_review_shop(uuid, boolean, text) from public, anon;
revoke execute on function public.resubmit_shop(uuid) from public, anon;
grant execute on function public.admin_review_shop(uuid, boolean, text) to authenticated;
grant execute on function public.resubmit_shop(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Applying: the shop and its styles are saved together or not at all.
-- SECURITY INVOKER, so the caller's own row level security rules apply.
-- ---------------------------------------------------------------------------

create function public.apply_for_shop(
  p_slug text,
  p_display_name text,
  p_province text,
  p_bio text,
  p_social_links text[],
  p_style_slugs text[]
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  new_shop_id uuid;
  style_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'Sign in to apply' using errcode = 'insufficient_privilege';
  end if;
  if cardinality(p_style_slugs) not between 1 and 3 then
    raise exception 'Choose 1 to 3 styles' using errcode = 'check_violation';
  end if;

  select array_agg(id) into style_ids from public.styles where slug = any (p_style_slugs);
  if coalesce(cardinality(style_ids), 0) <> cardinality(p_style_slugs) then
    raise exception 'Unknown or repeated style' using errcode = 'check_violation';
  end if;

  insert into public.shops (owner_id, slug, display_name, province, bio, social_links)
    values (auth.uid(), p_slug, p_display_name, p_province, coalesce(p_bio, ''), p_social_links)
    returning id into new_shop_id;

  insert into public.shop_styles (shop_id, style_id)
    select new_shop_id, unnest(style_ids);

  return new_shop_id;
end;
$$;

revoke execute on function public.apply_for_shop(text, text, text, text, text[], text[]) from public, anon;
grant execute on function public.apply_for_shop(text, text, text, text, text[], text[]) to authenticated;

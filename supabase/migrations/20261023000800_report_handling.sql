-- Report handling: sensible reasons per target, a per-person rate limit,
-- and an admin function to work through the queue.
-- Reasons mirror REPORT_REASONS in src/lib/reports/report.ts.

alter table public.reports add constraint reason_fits_target check (
  (target_type = 'product' and reason in ('counterfeit', 'not_as_described', 'prohibited_item', 'other'))
  or (target_type = 'shop' and reason in ('shop_behavior', 'counterfeit', 'other'))
  or (target_type = 'website' and reason in ('bug', 'other'))
);

-- At most 5 reports per person per hour, so reports cannot be used to flood
-- the queue or harass a shop.
create function public.limit_report_rate() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (
    select count(*) from public.reports
    where reporter_id = new.reporter_id and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Too many reports in the last hour' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.limit_report_rate();

create function public.admin_update_report(
  p_report_id uuid,
  p_status public.report_status,
  p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can handle reports' using errcode = 'insufficient_privilege';
  end if;

  update public.reports set
    status = p_status,
    admin_note = coalesce(nullif(trim(p_note), ''), admin_note),
    resolved_at = case when p_status = 'closed' then now() else null end
  where id = p_report_id;
end;
$$;

revoke execute on function public.admin_update_report(uuid, public.report_status, text) from public, anon;
grant execute on function public.admin_update_report(uuid, public.report_status, text) to authenticated;

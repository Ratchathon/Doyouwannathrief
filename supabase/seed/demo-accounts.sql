-- Demo accounts for the "TRY THE DEMO" buttons on /login. Run once in the
-- Supabase SQL editor after sample-shops.sql, replacing __DEMO_PASSWORD__
-- with the same value you put in the DEMO_PASSWORD environment variable.
-- Never commit the real password.
--   demo-buyer@example.com  an ordinary buyer
--   demo-shop@example.com   owns the sample shop TUEKDAENG VINTAGE
--   demo-admin@example.com  admin (approves shops, handles reports, resets the demo)
begin;
do $$
declare
  acct record;
begin
  for acct in select * from (values ('demo-buyer@example.com'), ('demo-shop@example.com'), ('demo-admin@example.com')) as t(email) loop
    if not exists (select 1 from auth.users where email = acct.email) then
      with u as (
        insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change_token_new, email_change)
        values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          acct.email, extensions.crypt('__DEMO_PASSWORD__', extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"],"demo":true}', '{}', now(), now(), '', '', '', '')
        returning id, email
      )
      insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
      select gen_random_uuid(), u.id, u.id::text, 'email',
        jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
      from u;
    else
      update auth.users set encrypted_password = extensions.crypt('__DEMO_PASSWORD__', extensions.gen_salt('bf'))
      where email = acct.email;
    end if;
  end loop;

  update public.profiles set role = 'admin'
  where id = (select id from auth.users where email = 'demo-admin@example.com');

  update public.shops set owner_id = (select id from auth.users where email = 'demo-shop@example.com')
  where slug = 'tuekdaeng'
    and not exists (select 1 from public.shops s join auth.users u on u.id = s.owner_id where u.email = 'demo-shop@example.com');
end;
$$;
commit;

-- Cross-tenant and ageing test for Galmee Wholesale. Run with Supabase `execute_sql`.
-- It raises an exception at the end so everything rolls back; the message is the result.

do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; ca uuid; cb uuid; n int; r text := ''; a record; s record;
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','wh-rls-a@test.invalid'),
    (ub,'authenticated','authenticated','wh-rls-b@test.invalid');
  insert into public.tenants(name, vertical) values ('WH RLS A','wholesale') returning id into ta;
  insert into public.tenants(name, vertical) values ('WH RLS B','wholesale') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values
    (ua, ta, 'A owner','owner'), (ub, tb, 'B owner','owner');
  insert into public.customers(tenant_id, name) values (ta,'Cust A') returning id into ca;
  insert into public.customers(tenant_id, name) values (tb,'Cust B') returning id into cb;

  -- A: debts of 100 (70 days), 50 (40 days), 30 (today); repaid 120 settles the 100 and 20 of the 50.
  insert into public.credit_ledger(tenant_id, customer_id, type, amount, created_at) values
    (ta, ca, 'debt', 100, now() - interval '70 days'),
    (ta, ca, 'debt', 50, now() - interval '40 days'),
    (ta, ca, 'debt', 30, now()),
    (ta, ca, 'repayment', 120, now());
  insert into public.credit_ledger(tenant_id, customer_id, type, amount) values (tb, cb, 'debt', 999);

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);

  select count(*) into n from public.wh_customer_ageing;
  r := r || 'A sees ageing rows=' || n || ' (expect 1); ';
  select count(*) into n from public.wh_customer_ageing where customer_id = cb;
  r := r || 'A sees B ageing=' || n || ' (expect 0); ';
  select * into a from public.wh_customer_ageing where customer_id = ca;
  r := r || format('buckets=%s/%s/%s total=%s (expect 30/30/0 total 60); ',
    a.days_0_30::int, a.days_31_60::int, a.days_over_60::int, a.total::int);
  select * into s from public.wh_owed_summary();
  r := r || format('summary=%s/%s (expect 60/1); ', s.total_owed::int, s.debtors);
  select * into s from public.wh_ageing_totals();
  r := r || format('totals=%s/%s/%s (expect 30/30/0); ', s.days_0_30::int, s.days_31_60::int, s.days_over_60::int);

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  select * into s from public.wh_owed_summary();
  r := r || format('B summary=%s/%s (expect 999/1); ', s.total_owed::int, s.debtors);

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin select count(*) into n from public.wh_customer_ageing; exception when others then n := -1; end;
  r := r || 'anon ageing=' || n || ' (expect -1); ';
  begin select count(*) into n from public.wh_owed_summary(); exception when others then n := -1; end;
  r := r || 'anon summary=' || n || ' (expect -1); ';

  raise exception 'WH_RLS_RESULTS (rolled back): %', r;
end $$;

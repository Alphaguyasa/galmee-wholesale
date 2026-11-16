-- Daily cash report test for Galmee Wholesale. Run with Supabase `execute_sql`.
-- It raises an exception at the end so everything rolls back; the message is the result.

do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; ca uuid; cb uuid; sa uuid; n int; r text := ''; c record;
  today date := (now() at time zone 'Africa/Addis_Ababa')::date;
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','wh-cash-a@test.invalid'),
    (ub,'authenticated','authenticated','wh-cash-b@test.invalid');
  insert into public.tenants(name, vertical) values ('WH CASH A','wholesale') returning id into ta;
  insert into public.tenants(name, vertical) values ('WH CASH B','wholesale') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values
    (ua, ta, 'A owner','owner'), (ub, tb, 'B owner','owner');
  insert into public.customers(tenant_id, name) values (ta,'Shop A') returning id into ca;
  insert into public.customers(tenant_id, name) values (tb,'Shop B') returning id into cb;

  -- A today: a 500 credit sale with 200 cash down, a 300 Telebirr sale paid in full,
  -- a 150 cash repayment. Yesterday: a 1000 cash sale (must not count today).
  insert into public.sales(tenant_id, customer_id, staff_id, total, paid, method) values
    (ta, ca, ua, 500, 200, 'cash') returning id into sa;
  insert into public.payments(tenant_id, customer_id, amount, method, ref_table, ref_id) values
    (ta, ca, 200, 'cash', 'sales', sa);
  insert into public.sales(tenant_id, customer_id, staff_id, total, paid, method) values
    (ta, ca, ua, 300, 300, 'telebirr') returning id into sa;
  insert into public.payments(tenant_id, customer_id, amount, method, ref_table, ref_id) values
    (ta, ca, 300, 'telebirr', 'sales', sa);
  insert into public.payments(tenant_id, customer_id, amount, method) values (ta, ca, 150, 'cash');
  insert into public.sales(tenant_id, customer_id, staff_id, total, paid, method, created_at) values
    (ta, ca, ua, 1000, 1000, 'cash', now() - interval '1 day') returning id into sa;
  insert into public.payments(tenant_id, customer_id, amount, method, ref_table, ref_id, created_at) values
    (ta, ca, 1000, 'cash', 'sales', sa, now() - interval '1 day');
  -- B today: a 777 cash sale (A must never see it).
  insert into public.sales(tenant_id, customer_id, staff_id, total, paid, method) values
    (tb, cb, ub, 777, 777, 'cash') returning id into sa;
  insert into public.payments(tenant_id, customer_id, amount, method, ref_table, ref_id) values
    (tb, cb, 777, 'cash', 'sales', sa);

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);

  select * into c from public.wh_daily_cash(today) where method = 'cash';
  r := r || format('A cash: sales=%s collected=%s repaid=%s/%s (expect 0 200 150/1); ',
    c.sales_count, c.sales_collected::int, c.repayments::int, c.repayment_count);
  select * into c from public.wh_daily_cash(today) where method = 'credit';
  r := r || format('A credit: sales=%s total=%s given=%s (expect 1 500 300); ',
    c.sales_count, c.sales_total::int, c.credit_given::int);
  select * into c from public.wh_daily_cash(today) where method = 'telebirr';
  r := r || format('A telebirr: sales=%s collected=%s (expect 1 300); ', c.sales_count, c.sales_collected::int);
  select sum(sales_collected + repayments)::int as t_in into c from public.wh_daily_cash(today);
  r := r || 'A total in=' || c.t_in || ' (expect 650); ';
  select sum(sales_collected)::int as y into c from public.wh_daily_cash(today - 1);
  r := r || 'A yesterday=' || c.y || ' (expect 1000); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  select sum(sales_collected + repayments)::int as t_in into c from public.wh_daily_cash(today);
  r := r || 'B total in=' || c.t_in || ' (expect 777); ';

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin select count(*) into n from public.wh_daily_cash(today); exception when others then n := -1; end;
  r := r || 'anon=' || n || ' (expect -1); ';

  raise exception 'WH_CASH_RESULTS (rolled back): %', r;
end $$;

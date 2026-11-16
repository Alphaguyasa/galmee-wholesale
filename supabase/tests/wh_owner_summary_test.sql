-- Owner summary contract test for Galmee Wholesale. Run with Supabase `execute_sql`.
-- It raises an exception at the end so everything rolls back; the message is the result.

do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; ca uuid; cb uuid; sa uuid; ia uuid; n int; r text := ''; v record; cols text;
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','wh-sum-a@test.invalid'),
    (ub,'authenticated','authenticated','wh-sum-b@test.invalid');
  insert into public.tenants(name, vertical) values ('WH SUM A','wholesale') returning id into ta;
  insert into public.tenants(name, vertical) values ('WH SUM B','wholesale') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values
    (ua, ta, 'A owner','owner'), (ub, tb, 'B owner','owner');
  insert into public.customers(tenant_id, name) values (ta,'Shop A') returning id into ca;
  insert into public.customers(tenant_id, name) values (tb,'Shop B') returning id into cb;
  insert into public.items(tenant_id, name_en, unit, reorder_level) values (ta, 'Soap', 'carton', 5) returning id into ia;
  insert into public.stock_batches(tenant_id, item_id, qty, cost) values (ta, ia, 3, 100);

  -- A today: 500 sale with 200 cash down (300 on credit), 100 Telebirr repayment.
  -- A's book: 300 debt today + 180 from 70 days ago; the 100 repayment settles the oldest first.
  insert into public.sales(tenant_id, customer_id, staff_id, total, paid, method) values
    (ta, ca, ua, 500, 200, 'cash') returning id into sa;
  insert into public.payments(tenant_id, customer_id, amount, method, ref_table, ref_id) values
    (ta, ca, 200, 'cash', 'sales', sa);
  insert into public.payments(tenant_id, customer_id, amount, method) values (ta, ca, 100, 'telebirr');
  insert into public.credit_ledger(tenant_id, customer_id, type, amount, created_at) values
    (ta, ca, 'debt', 300, now()), (ta, ca, 'debt', 180, now() - interval '70 days'),
    (ta, ca, 'repayment', 100, now());
  insert into public.credit_ledger(tenant_id, customer_id, type, amount) values (tb, cb, 'debt', 999);

  select string_agg(column_name, ',' order by ordinal_position) into cols
    from information_schema.columns where table_schema = 'public' and table_name = 'wh_owner_summary';
  r := r || 'columns=' || cols || '; ';

  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  select count(*) into n from public.wh_owner_summary;
  r := r || 'A rows=' || n || ' (expect 1); ';
  select count(*) into n from public.wh_owner_summary where tenant_id = tb;
  r := r || 'A sees B=' || n || ' (expect 0); ';
  select * into v from public.wh_owner_summary;
  r := r || format('A tx=%s sales=%s cash=%s credit=%s owed=%s attention=%s (expect 1 500 200 300 380 1); ',
    v.tx_count, v.sales_total::int, v.cash_total::int, v.credit_total::int, v.owed_total::int, v.attention_count);
  r := r || format('extra telebirr=%s repaid=%s over60=%s low=%s debtors=%s (expect 100 100 80 1 1); ',
    v.extra->>'telebirr_total', v.extra->>'repaid_total', v.extra->>'over_60_total', v.extra->>'low_stock_count', v.extra->>'debtors');

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  select * into v from public.wh_owner_summary;
  r := r || format('B owed=%s (expect 999); ', v.owed_total::int);

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin select count(*) into n from public.wh_owner_summary; exception when others then n := -1; end;
  r := r || 'anon=' || n || ' (expect -1); ';

  raise exception 'WH_SUMMARY_RESULTS (rolled back): %', r;
end $$;

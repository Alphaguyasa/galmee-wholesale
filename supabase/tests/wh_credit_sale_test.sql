-- Credit-limit and override test for wh_record_credit_sale. Run with Supabase `execute_sql`.
-- It raises an exception at the end so everything rolls back; the message is the result.

-- The non-owner is a manager: core RLS on stock_batches lets only owners and managers take stock out.
do $$
declare uo uuid := gen_random_uuid(); us uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; ca uuid; cn uuid; cb uuid; it uuid; v uuid; v2 uuid; n int; r text := ''; lines jsonb;
begin
  insert into auth.users(id, aud, role, email) values
    (uo,'authenticated','authenticated','wh-cs-owner@test.invalid'),
    (us,'authenticated','authenticated','wh-cs-manager@test.invalid'),
    (ub,'authenticated','authenticated','wh-cs-b@test.invalid');
  insert into public.tenants(name, vertical) values ('WH CS A','wholesale') returning id into ta;
  insert into public.tenants(name, vertical) values ('WH CS B','wholesale') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values
    (uo, ta, 'A owner','owner'), (us, ta, 'A manager','manager'), (ub, tb, 'B owner','owner');
  insert into public.customers(tenant_id, name, credit_limit) values (ta,'Limited', 500) returning id into ca;
  insert into public.customers(tenant_id, name) values (ta,'No limit') returning id into cn;
  insert into public.customers(tenant_id, name) values (tb,'Cust B') returning id into cb;
  insert into public.items(tenant_id, name_en, price) values (ta, 'Sugar 50kg', 100) returning id into it;
  insert into public.stock_batches(tenant_id, item_id, qty) values (ta, it, 100);
  insert into public.credit_ledger(tenant_id, customer_id, type, amount) values (ta, ca, 'debt', 300);

  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);

  -- Manager: 2 x 100 unpaid takes 300 to 500, exactly the limit: allowed.
  lines := jsonb_build_array(jsonb_build_object('item_id', it, 'qty', 2, 'price', 100));
  v := public.wh_record_credit_sale(lines, ca, 0, 'cash', 'cs-1');
  r := r || 'at limit ok=' || (v is not null) || '; ';
  v2 := public.wh_record_credit_sale(lines, ca, 0, 'cash', 'cs-1');
  r := r || 'retry same id=' || (v = v2) || ' (expect true); ';

  begin perform public.wh_record_credit_sale(lines, ca, 150, 'cash', 'cs-2'); r := r || 'over limit=allowed; ';
  exception when others then r := r || 'over limit=' || sqlerrm || '; '; end;
  begin perform public.wh_record_credit_sale(lines, ca, 0, 'cash', 'cs-3', null, true, 'trusted');
    r := r || 'manager override=allowed; ';
  exception when others then r := r || 'manager override=' || sqlerrm || '; '; end;
  begin perform public.wh_record_credit_sale(lines, ca, 300, 'cash', 'cs-4'); r := r || 'overpaid=allowed; ';
  exception when others then r := r || 'overpaid=' || sqlerrm || '; '; end;
  -- Fully paid sale needs no credit room.
  perform public.wh_record_credit_sale(lines, ca, 200, 'cash', 'cs-5');
  r := r || 'paid in full ok; ';
  perform public.wh_record_credit_sale(lines, cn, 0, 'cash', 'cs-6');
  r := r || 'no limit ok; ';
  select count(*) into n from public.wh_credit_overrides;
  r := r || 'manager sees overrides=' || n || ' (expect 0); ';
  begin insert into public.wh_credit_overrides(sale_id, customer_id, credit_limit, balance_before, new_debt)
    values (v, ca, 500, 500, 1); r := r || 'manager direct insert=allowed; ';
  exception when others then r := r || 'manager direct insert=denied; '; end;

  -- Owner overrides with a reason: logged.
  perform set_config('request.jwt.claims', json_build_object('sub', uo, 'role','authenticated')::text, true);
  perform public.wh_record_credit_sale(lines, ca, 50, 'cash', 'cs-7', null, true, '  pays Friday  ');
  select count(*) into n from public.wh_credit_overrides
    where customer_id = ca and balance_before = 500 and new_debt = 150 and reason = 'pays Friday' and approved_by = uo;
  r := r || 'override logged=' || n || ' (expect 1); ';
  select balance::int into n from public.customer_balances where customer_id = ca;
  r := r || 'balance=' || n || ' (expect 650); ';

  -- Tenant B cannot sell to A's customer or see A's overrides.
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  begin perform public.wh_record_credit_sale(lines, ca, 0, 'cash', 'cs-b'); r := r || 'B sells to A=allowed; ';
  exception when others then r := r || 'B sells to A=' || sqlerrm || '; '; end;
  select count(*) into n from public.wh_credit_overrides;
  r := r || 'B sees overrides=' || n || ' (expect 0); ';

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin perform public.wh_record_credit_sale(lines, ca, 0); r := r || 'anon=allowed; ';
  exception when others then r := r || 'anon=denied; '; end;
  begin select count(*) into n from public.wh_credit_overrides; r := r || 'anon read=' || n || '; ';
  exception when others then r := r || 'anon read=denied; '; end;

  raise exception 'WH_CREDIT_SALE_RESULTS (rolled back): %', r;
end $$;

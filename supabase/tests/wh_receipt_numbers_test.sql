-- Test for wh_receipt_numbers. Run after the migration (or paste the migration at the top of this block to try it
-- before it is applied). Raises RESULTS at the end so everything rolls back.
do $t$
declare ua uuid := gen_random_uuid(); us uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; ca uuid; cb uuid; s1 uuid; s2 uuid; s0 uuid; p1 uuid; psale uuid; pb uuid;
  r text := ''; msg text; n int;
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','wh-rn-a@test.invalid'),
    (us,'authenticated','authenticated','wh-rn-s@test.invalid'),
    (ub,'authenticated','authenticated','wh-rn-b@test.invalid');
  insert into public.tenants(name, vertical) values ('WH RN A','wholesale') returning id into ta;
  insert into public.tenants(name, vertical) values ('WH RN B','wholesale') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values
    (ua, ta, 'A owner','owner'), (us, ta, 'A staff','staff'), (ub, tb, 'B owner','owner');
  insert into public.customers(tenant_id, name) values (ta,'Shop A') returning id into ca;
  insert into public.customers(tenant_id, name) values (tb,'Shop B') returning id into cb;
  insert into public.sales(tenant_id, customer_id, total, paid) values (ta, ca, 500, 0) returning id into s1;
  insert into public.sales(tenant_id, customer_id, total, paid) values (ta, ca, 300, 100) returning id into s2;
  insert into public.sales(tenant_id, customer_id, total, paid) values (ta, null, 50, 50) returning id into s0;
  insert into public.payments(tenant_id, customer_id, amount) values (ta, ca, 200) returning id into p1;
  insert into public.payments(tenant_id, customer_id, amount, ref_table, ref_id) values (ta, ca, 100, 'sales', s2) returning id into psale;
  insert into public.payments(tenant_id, customer_id, amount) values (tb, cb, 70) returning id into pb;

  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role','authenticated')::text, true);
  r := r || 'staff sale1=' || public.wh_receipt_no('sale', s1) || ' (expect WS-000001); ';
  r := r || 'again=' || public.wh_receipt_no('sale', s1) || ' (expect WS-000001); ';
  r := r || 'sale2=' || public.wh_receipt_no('sale', s2) || ' (expect WS-000002); ';
  r := r || 'repay=' || public.wh_receipt_no('repayment', p1) || ' (expect WR-000001); ';
  begin perform public.wh_receipt_no('sale', s0); msg := 'ran'; exception when others then msg := sqlerrm; end;
  r := r || 'walk-in sale=' || msg || ' (expect not_found); ';
  begin perform public.wh_receipt_no('repayment', psale); msg := 'ran'; exception when others then msg := sqlerrm; end;
  r := r || 'sale payment as repayment=' || msg || ' (expect not_found); ';
  begin perform public.wh_receipt_no('repayment', pb); msg := 'ran'; exception when others then msg := sqlerrm; end;
  r := r || 'other tenant payment=' || msg || ' (expect not_found); ';
  begin perform public.wh_receipt_no('fee', p1); msg := 'ran'; exception when others then msg := sqlerrm; end;
  r := r || 'bad kind=' || msg || ' (expect bad_kind); ';
  begin perform private.wh_next_receipt_no('ws'); msg := 'ran'; exception when insufficient_privilege then msg := 'denied'; end;
  r := r || 'client draw=' || msg || ' (expect denied); ';
  begin insert into public.wh_receipts(ref_table, ref_id, receipt_no) values ('sales', s0, 'WS-000099'); msg := 'ran';
    exception when insufficient_privilege then msg := 'denied'; end;
  r := r || 'client insert=' || msg || ' (expect denied); ';
  begin update public.wh_receipt_counters set next_no = 1; msg := 'ran'; exception when insufficient_privilege then msg := 'denied'; end;
  r := r || 'client counter update=' || msg || ' (expect denied); ';
  select count(*) into n from public.wh_receipts; r := r || 'staff sees receipts=' || n || ' (expect 3); ';
  select count(*) into n from public.wh_receipt_counters; r := r || 'staff sees counters=' || n || ' (expect 0); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  select count(*) into n from public.wh_receipt_counters; r := r || 'owner sees counters=' || n || ' (expect 2); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  r := r || 'B first repay=' || public.wh_receipt_no('repayment', pb) || ' (expect WR-000001); ';
  select count(*) into n from public.wh_receipts; r := r || 'B sees receipts=' || n || ' (expect 1); ';

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  begin perform public.wh_receipt_no('sale', s1); msg := 'ran'; exception when insufficient_privilege then msg := 'denied'; end;
  r := r || 'anon=' || msg || ' (expect denied); ';
  raise exception 'RESULTS: %', r;
end $t$;

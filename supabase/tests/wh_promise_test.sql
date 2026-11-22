-- Promise-to-pay test for Galmee Wholesale. Run with Supabase `execute_sql`.
-- It raises an exception at the end so everything rolls back; the message is the result.

do $$
declare ua uuid := gen_random_uuid(); us uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; ca uuid; ca2 uuid; ca0 uuid; cb uuid; p1 uuid; p2 uuid; n numeric;
  today date := (now() at time zone 'Africa/Addis_Ababa')::date; r text := ''; msg text;
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','wh-pr-a@test.invalid'),
    (us,'authenticated','authenticated','wh-pr-s@test.invalid'),
    (ub,'authenticated','authenticated','wh-pr-b@test.invalid');
  insert into public.tenants(name, vertical) values ('WH PR A','wholesale') returning id into ta;
  insert into public.tenants(name, vertical) values ('WH PR B','wholesale') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values
    (ua, ta, 'A owner','owner'), (us, ta, 'A staff','staff'), (ub, tb, 'B owner','owner');
  insert into public.customers(tenant_id, name) values (ta,'Shop A') returning id into ca;
  insert into public.customers(tenant_id, name) values (ta,'Shop A2') returning id into ca2;
  insert into public.customers(tenant_id, name) values (ta,'Shop A0') returning id into ca0;
  insert into public.customers(tenant_id, name) values (tb,'Shop B') returning id into cb;
  insert into public.credit_ledger(tenant_id, customer_id, type, amount) values
    (ta, ca, 'debt', 1000), (ta, ca2, 'debt', 400), (tb, cb, 'debt', 999);

  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role','authenticated')::text, true);
  p1 := public.wh_log_promise(ca, today + 3, 300, 'after market day');
  r := r || 'staff logs=' || (p1 is not null) || ' (expect true); ';
  select state into msg from public.wh_promise_status where id = p1;
  r := r || 'state=' || msg || ' (expect waiting); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  p2 := public.wh_log_promise(ca, today, null, null);
  select count(*) into n from public.wh_payment_promises where customer_id = ca and status = 'open';
  r := r || 'open after replace=' || n || ' (expect 1); ';
  select status into msg from public.wh_payment_promises where id = p1;
  r := r || 'old=' || msg || ' (expect replaced); ';
  select state || '/' || owed_at_promise::int into msg from public.wh_promise_status where id = p2;
  r := r || 'new=' || msg || ' (expect due_today/1000); ';

  begin perform public.wh_log_promise(ca, today - 1); msg := 'ok'; exception when others then msg := sqlerrm; end;
  r := r || 'past=' || msg || ' (expect bad_date); ';
  begin perform public.wh_log_promise(ca, today + 91); msg := 'ok'; exception when others then msg := sqlerrm; end;
  r := r || '+91=' || msg || ' (expect bad_date); ';
  begin perform public.wh_log_promise(ca, today + 1, 1001); msg := 'ok'; exception when others then msg := sqlerrm; end;
  r := r || 'too much=' || msg || ' (expect bad_amount); ';
  begin perform public.wh_log_promise(ca, today + 1, 0.001); msg := 'ok'; exception when others then msg := sqlerrm; end;
  r := r || 'fraction=' || msg || ' (expect bad_amount); ';
  begin perform public.wh_log_promise(ca0, today + 1); msg := 'ok'; exception when others then msg := sqlerrm; end;
  r := r || 'owes nothing=' || msg || ' (expect nothing_owed); ';
  begin perform public.wh_log_promise(cb, today + 1); msg := 'ok'; exception when others then msg := sqlerrm; end;
  r := r || 'other tenant customer=' || msg || ' (expect customer_not_found); ';
  begin update public.wh_payment_promises set amount = 1 where id = p2; msg := 'ok'; exception when others then msg := 'denied'; end;
  r := r || 'edit amount=' || msg || ' (expect denied); ';

  -- A promise with a named amount is kept once that much is repaid after it.
  perform public.wh_log_promise(ca2, today + 2, 150);
  perform public.record_repayment(ca2, 100, 'cash', null);
  select state into msg from public.wh_promise_status where customer_id = ca2 and status = 'open';
  r := r || 'paid 100 of 150=' || msg || ' (expect waiting); ';
  perform public.record_repayment(ca2, 50, 'cash', null);
  select state || '/' || paid_since::int into msg from public.wh_promise_status where customer_id = ca2 and status = 'open';
  r := r || 'paid 150=' || msg || ' (expect kept/150); ';

  -- An unkept promise whose date has passed is broken (move the date back as the table owner).
  perform set_config('role','postgres', true);
  update public.wh_payment_promises set promised_on = today - 2 where id = p2;
  perform set_config('role','authenticated', true);
  select state || '/' || days_late into msg from public.wh_promise_status where id = p2;
  r := r || 'late=' || msg || ' (expect broken/2); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  select count(*) into n from public.wh_promise_status;
  r := r || 'B sees=' || n || ' (expect 0); ';
  select count(*) into n from public.wh_payment_promises;
  r := r || 'B table=' || n || ' (expect 0); ';
  begin perform public.wh_log_promise(ca, today + 1); msg := 'ok'; exception when others then msg := sqlerrm; end;
  r := r || 'B on A customer=' || msg || ' (expect customer_not_found); ';

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin perform public.wh_log_promise(ca, today + 1); msg := 'ok'; exception when others then msg := 'denied'; end;
  r := r || 'anon log=' || msg || ' (expect denied); ';
  begin select count(*) into n from public.wh_promise_status; msg := n::text; exception when others then msg := 'denied'; end;
  r := r || 'anon view=' || msg || ' (expect denied)';

  raise exception 'WH_PROMISE_RESULTS (rolled back): %', r;
end $$;

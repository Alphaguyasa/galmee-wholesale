-- Stock-out test for Galmee Wholesale. Run with Supabase `execute_sql`.
-- It raises an exception at the end so everything rolls back; the message is the result.

do $$
declare ua uuid := gen_random_uuid(); um uuid := gen_random_uuid(); us uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; ia uuid; ib uuid; b1 uuid; b2 uuid; n numeric; r text := ''; msg text;
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','wh-out-a@test.invalid'),
    (um,'authenticated','authenticated','wh-out-m@test.invalid'),
    (us,'authenticated','authenticated','wh-out-s@test.invalid'),
    (ub,'authenticated','authenticated','wh-out-b@test.invalid');
  insert into public.tenants(name, vertical) values ('WH OUT A','wholesale') returning id into ta;
  insert into public.tenants(name, vertical) values ('WH OUT B','wholesale') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values
    (ua, ta, 'A owner','owner'), (um, ta, 'A manager','manager'), (us, ta, 'A staff','staff'), (ub, tb, 'B owner','owner');
  insert into public.items(tenant_id, name_en, unit) values (ta, 'Sugar 50kg', 'sack') returning id into ia;
  insert into public.items(tenant_id, name_en, unit) values (tb, 'Oil 20L', 'jerrycan') returning id into ib;
  -- Older batch of 10 and newer batch of 5: stock out takes from the older one first.
  insert into public.stock_batches(tenant_id, item_id, qty, cost, received_at) values
    (ta, ia, 10, 100, now() - interval '10 days') returning id into b1;
  insert into public.stock_batches(tenant_id, item_id, qty, cost, received_at) values
    (ta, ia, 5, 110, now()) returning id into b2;
  insert into public.stock_batches(tenant_id, item_id, qty, cost) values (tb, ib, 7, 900);

  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  n := public.wh_stock_out(ia, 12, 'damaged');
  r := r || 'owner out 12 left=' || n || ' (expect 3); ';
  select string_agg(qty::int::text, '/' order by received_at) into msg from public.stock_batches where item_id = ia;
  r := r || 'batches=' || msg || ' (expect 0/3); ';
  select count(*) into n from public.stock_movements where item_id = ia and reason = 'out:damaged';
  r := r || 'movements=' || n || ' (expect 2); ';
  select -sum(qty) into n from public.stock_movements where item_id = ia and reason = 'out:damaged';
  r := r || 'moved=' || n || ' (expect 12); ';
  begin perform public.wh_stock_out(ia, 4, 'count'); msg := 'ok'; exception when others then msg := sqlerrm; end;
  r := r || 'too many=' || msg || ' (expect insufficient_stock); ';
  begin perform public.wh_stock_out(ia, -1, 'count'); msg := 'ok'; exception when others then msg := sqlerrm; end;
  r := r || 'negative=' || msg || ' (expect bad_qty); ';
  begin perform public.wh_stock_out(ia, 1, 'gift'); msg := 'ok'; exception when others then msg := sqlerrm; end;
  r := r || 'bad reason=' || msg || ' (expect bad_reason); ';
  begin perform public.wh_stock_out(ib, 1, 'damaged'); msg := 'ok'; exception when others then msg := sqlerrm; end;
  r := r || 'A takes B item=' || msg || ' (expect item_not_found); ';

  perform set_config('request.jwt.claims', json_build_object('sub', um, 'role','authenticated')::text, true);
  n := public.wh_stock_out(ia, 1, 'own_use');
  r := r || 'manager out 1 left=' || n || ' (expect 2); ';

  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role','authenticated')::text, true);
  begin perform public.wh_stock_out(ia, 1, 'damaged'); msg := 'ok'; exception when others then msg := sqlerrm; end;
  r := r || 'staff=' || msg || ' (expect not_allowed); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  select coalesce(sum(qty), 0) into n from public.stock_batches where item_id = ib;
  r := r || 'B stock untouched=' || n || ' (expect 7); ';

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin perform public.wh_stock_out(ia, 1, 'damaged'); msg := 'ok'; exception when others then msg := 'denied'; end;
  r := r || 'anon=' || msg || ' (expect denied); ';

  raise exception 'WH_STOCK_OUT_RESULTS (rolled back): %', r;
end $$;

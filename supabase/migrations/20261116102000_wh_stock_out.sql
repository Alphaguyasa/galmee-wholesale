-- Stock out: take goods off the shelf that left without a sale (damaged, expired, own use,
-- returned to the supplier, or a count that came up short). Owner or manager only.
-- Takes from the batches that expire first (then the oldest received), through core
-- adjust_stock so every batch change is written to stock_movements with its reason.
-- Returns what is left on hand for the item.
create or replace function public.wh_stock_out(p_item uuid, p_qty numeric, p_reason text)
returns numeric
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_tenant uuid := private.current_tenant();
  v_left numeric := p_qty;
  v_on_hand numeric;
  v_take numeric;
  b record;
begin
  if v_tenant is null or private.current_app_role() is null
     or private.current_app_role() not in ('owner', 'manager') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_qty is null or p_qty <= 0 or p_qty > 10000000 or p_qty <> round(p_qty, 3) then
    raise exception 'bad_qty' using errcode = '22023';
  end if;
  if p_reason is null or p_reason not in ('damaged', 'expired', 'own_use', 'returned', 'count') then
    raise exception 'bad_reason' using errcode = '22023';
  end if;
  if not exists (select 1 from public.items where id = p_item and tenant_id = v_tenant) then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;

  -- One stock-out per item at a time, so two phones cannot take the same units twice.
  perform pg_advisory_xact_lock(hashtextextended('wh_stock_out:' || p_item::text, 0));

  select coalesce(sum(qty), 0) into v_on_hand
    from public.stock_batches where item_id = p_item and tenant_id = v_tenant and qty > 0;
  if v_on_hand < p_qty then
    raise exception 'insufficient_stock' using errcode = 'P0001';
  end if;

  for b in
    select id, qty from public.stock_batches
    where item_id = p_item and tenant_id = v_tenant and qty > 0
    order by expiry_date nulls last, received_at, id
  loop
    exit when v_left <= 0;
    v_take := least(b.qty, v_left);
    perform public.adjust_stock(b.id, b.qty - v_take, 'out:' || p_reason);
    v_left := v_left - v_take;
  end loop;

  return v_on_hand - p_qty;
end $$;

revoke all on function public.wh_stock_out(uuid, numeric, text) from public, anon;
grant execute on function public.wh_stock_out(uuid, numeric, text) to authenticated;

-- Credit sales that respect each customer's credit limit.
-- A sale that would push the customer's balance above credit_limit is refused
-- unless the owner overrides it; every override is logged in wh_credit_overrides.

create table public.wh_credit_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  credit_limit numeric(14,2) not null,
  balance_before numeric(14,2) not null,
  new_debt numeric(14,2) not null check (new_debt > 0),
  reason text check (char_length(reason) <= 300),
  approved_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create index wh_credit_overrides_tenant_created_idx on public.wh_credit_overrides (tenant_id, created_at desc);
create index wh_credit_overrides_customer_idx on public.wh_credit_overrides (customer_id);
create index wh_credit_overrides_sale_idx on public.wh_credit_overrides (sale_id);

alter table public.wh_credit_overrides enable row level security;

create policy wh_credit_overrides_select on public.wh_credit_overrides
  for select to authenticated
  using (tenant_id = (select private.current_tenant())
         and (select private.current_app_role()) in ('owner', 'manager'));

create policy wh_credit_overrides_insert on public.wh_credit_overrides
  for insert to authenticated
  with check (tenant_id = (select private.current_tenant())
              and (select private.current_app_role()) = 'owner'
              and approved_by = (select auth.uid()));

revoke all on public.wh_credit_overrides from anon;
grant select, insert on public.wh_credit_overrides to authenticated;

create function public.wh_record_credit_sale(
  p_lines jsonb,
  p_customer uuid,
  p_paid numeric default 0,
  p_method public.pay_method default 'cash',
  p_client_ref text default null,
  p_due date default null,
  p_override boolean default false,
  p_reason text default null
) returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_sale uuid;
  v_total numeric := 0;
  v_limit numeric;
  v_balance numeric;
  v_new_debt numeric;
  v_over boolean := false;
  l jsonb;
begin
  if p_customer is null then raise exception 'customer_required'; end if;
  if p_paid is null or p_paid < 0 then raise exception 'invalid_paid'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'lines_required';
  end if;

  -- Offline retry of a sale that was already recorded: return it unchanged.
  if p_client_ref is not null then
    select id into v_sale from sales where tenant_id = current_tenant() and client_ref = p_client_ref;
    if found then return v_sale; end if;
  end if;

  select credit_limit into v_limit from customers where id = p_customer;
  if not found then raise exception 'customer_not_found'; end if;

  for l in select * from jsonb_array_elements(p_lines) loop
    if (l->>'qty')::numeric <= 0 or (l->>'price')::numeric < 0 then
      raise exception 'invalid_line';
    end if;
    v_total := v_total + (l->>'qty')::numeric * (l->>'price')::numeric;
  end loop;
  if p_paid > v_total then raise exception 'paid_exceeds_total'; end if;

  v_new_debt := v_total - p_paid;
  if v_new_debt > 0 and v_limit is not null then
    -- Serialise credit sales per customer so two tills cannot both pass the check.
    perform pg_advisory_xact_lock(hashtextextended('wh_credit:' || p_customer::text, 0));
    select coalesce(balance, 0) into v_balance from customer_balances where customer_id = p_customer;
    v_balance := coalesce(v_balance, 0);
    if v_balance + v_new_debt > v_limit then
      if not p_override then raise exception 'credit_limit_exceeded'; end if;
      if current_app_role() is distinct from 'owner' then raise exception 'override_not_allowed'; end if;
      v_over := true;
    end if;
  end if;

  v_sale := record_sale(p_lines, p_customer, p_paid, p_method, p_client_ref, p_due);

  if v_over then
    insert into wh_credit_overrides (sale_id, customer_id, credit_limit, balance_before, new_debt, reason)
    values (v_sale, p_customer, v_limit, v_balance, v_new_debt, nullif(btrim(p_reason), ''));
  end if;

  return v_sale;
end $$;

revoke all on function public.wh_record_credit_sale(jsonb, uuid, numeric, public.pay_method, text, date, boolean, text) from public, anon;
grant execute on function public.wh_record_credit_sale(jsonb, uuid, numeric, public.pay_method, text, date, boolean, text) to authenticated;

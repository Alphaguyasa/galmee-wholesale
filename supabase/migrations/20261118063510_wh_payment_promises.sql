-- Promise to pay: a shop says "I will pay on Thursday" and the promise is written on its debt.
-- One open promise per customer; a new promise replaces the old one (kept as history).
-- The state (waiting / due today / kept / broken) is worked out from real repayments in the
-- view below, so nobody has to remember to tick a promise off.

create table if not exists public.wh_payment_promises (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  promised_on date not null,
  amount numeric(14, 2) check (amount is null or amount > 0),
  -- What the shop owed when it promised: the target when no amount was named.
  owed_at_promise numeric(14, 2) not null check (owed_at_promise > 0),
  note text check (note is null or char_length(note) <= 200),
  status text not null default 'open' check (status in ('open', 'replaced')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create unique index if not exists wh_payment_promises_one_open
  on public.wh_payment_promises (customer_id) where status = 'open';
create index if not exists wh_payment_promises_tenant_customer
  on public.wh_payment_promises (tenant_id, customer_id, created_at desc);

alter table public.wh_payment_promises enable row level security;

create policy wh_payment_promises_select on public.wh_payment_promises
  for select to authenticated
  using (tenant_id = (select private.current_tenant()));

-- Writes go through wh_log_promise (security invoker), which needs these two policies.
create policy wh_payment_promises_insert on public.wh_payment_promises
  for insert to authenticated
  with check (
    tenant_id = (select private.current_tenant())
    and (select private.current_app_role()) is not null
    and created_by = (select auth.uid())
    and exists (select 1 from public.customers c where c.id = customer_id and c.tenant_id = (select private.current_tenant()))
  );

create policy wh_payment_promises_update on public.wh_payment_promises
  for update to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) is not null)
  with check (tenant_id = (select private.current_tenant()));

revoke all on public.wh_payment_promises from anon, authenticated;
grant select on public.wh_payment_promises to authenticated;
grant insert (customer_id, promised_on, amount, owed_at_promise, note) on public.wh_payment_promises to authenticated;
-- Only the status can change (open -> replaced); the date and amount of a promise are history.
grant update (status) on public.wh_payment_promises to authenticated;

-- Log a promise. Any member of the business may (staff collect too). Returns the promise id.
create or replace function public.wh_log_promise(p_customer uuid, p_promised_on date, p_amount numeric default null, p_note text default null)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_tenant uuid := private.current_tenant();
  v_today date := (now() at time zone 'Africa/Addis_Ababa')::date;
  v_owed numeric;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_id uuid;
begin
  if v_tenant is null or private.current_app_role() is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.customers where id = p_customer and tenant_id = v_tenant) then
    raise exception 'customer_not_found' using errcode = 'P0002';
  end if;
  if p_promised_on is null or p_promised_on < v_today or p_promised_on > v_today + 90 then
    raise exception 'bad_date' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'bad_note' using errcode = '22023';
  end if;

  -- One promise change per customer at a time.
  perform pg_advisory_xact_lock(hashtextextended('wh_promise:' || p_customer::text, 0));

  select coalesce(balance, 0) into v_owed from public.customer_balances
    where customer_id = p_customer and tenant_id = v_tenant;
  if coalesce(v_owed, 0) <= 0 then
    raise exception 'nothing_owed' using errcode = 'P0001';
  end if;
  if p_amount is not null and (p_amount <= 0 or p_amount <> round(p_amount, 2) or p_amount > v_owed) then
    raise exception 'bad_amount' using errcode = '22023';
  end if;

  update public.wh_payment_promises set status = 'replaced'
    where customer_id = p_customer and tenant_id = v_tenant and status = 'open';

  insert into public.wh_payment_promises (customer_id, promised_on, amount, owed_at_promise, note)
    values (p_customer, p_promised_on, p_amount, v_owed, v_note)
    returning id into v_id;
  return v_id;
end $$;

revoke all on function public.wh_log_promise(uuid, date, numeric, text) from public, anon;
grant execute on function public.wh_log_promise(uuid, date, numeric, text) to authenticated;

-- Every promise with how much was paid since it was made and its state:
-- kept      paid at least the promised amount (or everything owed when no amount was named),
--           or the shop owes nothing now;
-- broken    the date has passed (Addis Ababa day) and it was not kept;
-- due_today the date is today; waiting: the date is still ahead.
-- A replaced promise that was not kept shows as replaced.
create or replace view public.wh_promise_status
with (security_invoker = true)
as
select p.id,
       p.tenant_id,
       p.customer_id,
       c.name,
       c.phone,
       p.promised_on,
       p.amount,
       p.owed_at_promise,
       p.note,
       p.status,
       p.created_at,
       coalesce(paid.total, 0)::numeric(14, 2) as paid_since,
       coalesce(b.balance, 0)::numeric(14, 2) as owed_now,
       case
         when coalesce(paid.total, 0) >= coalesce(p.amount, p.owed_at_promise) or coalesce(b.balance, 0) <= 0 then 'kept'
         when p.status = 'replaced' then 'replaced'
         when p.promised_on < (now() at time zone 'Africa/Addis_Ababa')::date then 'broken'
         when p.promised_on = (now() at time zone 'Africa/Addis_Ababa')::date then 'due_today'
         else 'waiting'
       end as state,
       greatest((now() at time zone 'Africa/Addis_Ababa')::date - p.promised_on, 0) as days_late
from public.wh_payment_promises p
join public.customers c on c.id = p.customer_id and c.tenant_id = p.tenant_id
left join public.customer_balances b on b.customer_id = p.customer_id and b.tenant_id = p.tenant_id
left join lateral (
  select sum(pay.amount) as total
  from public.payments pay
  where pay.customer_id = p.customer_id and pay.tenant_id = p.tenant_id
    and pay.created_at >= p.created_at
    and (pay.ref_table is distinct from 'sales')
) paid on true;

revoke all on public.wh_promise_status from anon, authenticated;
grant select on public.wh_promise_status to authenticated;

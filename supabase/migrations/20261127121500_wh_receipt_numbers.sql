-- Receipt numbers for credit sales ("WS-000001") and repayments ("WR-000001"): one gapless series per
-- business each (receipt kit template, prefix wh). A record gets its number the first time its receipt
-- is shown or printed (repayments go straight from the browser to core record_repayment, and old records
-- get numbers on reprint), and keeps it forever. Numbers are never drawn twice for the same record.

create table if not exists public.wh_receipt_counters (
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  series text not null check (series ~ '^[a-z]{1,4}$'),
  next_no bigint not null default 1 check (next_no >= 1),
  primary key (tenant_id, series)
);
alter table public.wh_receipt_counters enable row level security;
revoke all on public.wh_receipt_counters from anon;
revoke insert, update, delete, truncate on public.wh_receipt_counters from authenticated;
grant select on public.wh_receipt_counters to authenticated;
create policy wh_receipt_counters_read on public.wh_receipt_counters for select to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role())::text in ('owner','manager'));

create table if not exists public.wh_receipts (
  ref_table text not null check (ref_table in ('sales','payments')),
  ref_id uuid not null,
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  receipt_no text not null check (receipt_no ~ '^[A-Z]{1,4}-[0-9]{6,}$'),
  created_at timestamptz not null default now(),
  primary key (ref_table, ref_id),
  unique (tenant_id, receipt_no)
);
alter table public.wh_receipts enable row level security;
revoke all on public.wh_receipts from anon;
revoke insert, update, delete, truncate on public.wh_receipts from authenticated;
grant select on public.wh_receipts to authenticated;
-- Every role of the business reads its numbers (staff reprint receipts).
create policy wh_receipts_read on public.wh_receipts for select to authenticated
  using (tenant_id = (select private.current_tenant()));

-- Kit template with prefix wh. Not callable by clients.
create or replace function private.wh_next_receipt_no(p_series text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.core_require_tenant(); v_no bigint;
begin
  if p_series is null or p_series !~ '^[a-z]{1,4}$' then raise exception 'bad_series' using errcode = '22023'; end if;
  insert into public.wh_receipt_counters(tenant_id, series) values (v_tenant, p_series) on conflict do nothing;
  update public.wh_receipt_counters set next_no = next_no + 1
    where tenant_id = v_tenant and series = p_series
    returning next_no - 1 into v_no;
  return upper(p_series) || '-' || lpad(v_no::text, 6, '0');
end $$;
revoke all on function private.wh_next_receipt_no(text) from public, anon, authenticated;

-- The record's receipt number: the stored one, else a new one. Only for a credit sale (a sale with a
-- customer) or a repayment (a payment from a customer that is not part of a sale) of the caller's own
-- business. The private schema is not exposed over the API; clients call public.wh_receipt_no.
create or replace function private.wh_issue_receipt(p_kind text, p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.core_require_tenant(); v_no text; v_table text; v_series text;
begin
  if p_kind = 'sale' then
    v_table := 'sales'; v_series := 'ws';
    perform 1 from public.sales s where s.id = p_id and s.tenant_id = v_tenant and s.customer_id is not null;
  elsif p_kind = 'repayment' then
    v_table := 'payments'; v_series := 'wr';
    perform 1 from public.payments p
      where p.id = p_id and p.tenant_id = v_tenant and p.customer_id is not null and p.ref_table is null;
  else
    raise exception 'bad_kind' using errcode = '22023';
  end if;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended('wh_receipt:' || p_id::text, 0));
  -- Look the record up before drawing, so a second view never burns a number.
  select r.receipt_no into v_no from public.wh_receipts r where r.ref_table = v_table and r.ref_id = p_id;
  if v_no is not null then return v_no; end if;
  v_no := private.wh_next_receipt_no(v_series);
  insert into public.wh_receipts(ref_table, ref_id, tenant_id, receipt_no) values (v_table, p_id, v_tenant, v_no);
  return v_no;
end $$;
revoke all on function private.wh_issue_receipt(text, uuid) from public, anon;
grant execute on function private.wh_issue_receipt(text, uuid) to authenticated;

create or replace function public.wh_receipt_no(p_kind text, p_id uuid)
returns text language sql security invoker set search_path = '' as $$
  select private.wh_issue_receipt(p_kind, p_id);
$$;
revoke all on function public.wh_receipt_no(text, uuid) from public, anon;
grant execute on function public.wh_receipt_no(text, uuid) to authenticated;

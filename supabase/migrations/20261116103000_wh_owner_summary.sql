-- Owner summary for the Galmee Telegram bot (/today) and the owner app: one row per wholesale
-- business for today (Addis Ababa), in the shared contract columns. Security invoker, so RLS on
-- the core tables keeps each business to its own row.
-- attention_count: shops with debt older than 60 days. extra: the per-method split, what shops
-- paid back today, the over-60-days amount, items at or below their warning level, and today's
-- credit-limit overrides (owners and managers only, by RLS on wh_credit_overrides).
create or replace view public.wh_owner_summary with (security_invoker = true) as
with bounds as (
  select d as day,
         (d::timestamp at time zone 'Africa/Addis_Ababa') as t0,
         ((d + 1)::timestamp at time zone 'Africa/Addis_Ababa') as t1
  from (select (now() at time zone 'Africa/Addis_Ababa')::date as d) x
)
select
  t.id as tenant_id,
  b.day,
  coalesce(s.n, 0)::integer as tx_count,
  coalesce(s.total, 0)::numeric(14,2) as sales_total,
  coalesce(p.cash, 0)::numeric(14,2) as cash_total,
  coalesce(s.credit, 0)::numeric(14,2) as credit_total,
  coalesce(o.owed, 0)::numeric(14,2) as owed_total,
  coalesce(a.late, 0)::integer as attention_count,
  jsonb_build_object(
    'telebirr_total', coalesce(p.telebirr, 0)::numeric(14,2),
    'other_total', coalesce(p.other, 0)::numeric(14,2),
    'repaid_total', coalesce(p.repaid, 0)::numeric(14,2),
    'debtors', coalesce(o.debtors, 0),
    'over_60_total', coalesce(a.late_total, 0)::numeric(14,2),
    'low_stock_count', coalesce(st.low, 0),
    'override_count', coalesce(ov.n, 0)
  ) as extra
from public.tenants t
cross join bounds b
left join lateral (
  select count(*) as n, sum(sa.total) as total, sum(greatest(sa.total - sa.paid, 0)) as credit
  from public.sales sa
  where sa.tenant_id = t.id and sa.created_at >= b.t0 and sa.created_at < b.t1
) s on true
left join lateral (
  select sum(pa.amount) filter (where pa.method = 'cash') as cash,
         sum(pa.amount) filter (where pa.method = 'telebirr') as telebirr,
         sum(pa.amount) filter (where pa.method not in ('cash', 'telebirr')) as other,
         sum(pa.amount) filter (where pa.ref_table is null) as repaid
  from public.payments pa
  where pa.tenant_id = t.id and pa.created_at >= b.t0 and pa.created_at < b.t1
    and (pa.ref_table = 'sales' or (pa.ref_table is null and pa.customer_id is not null))
) p on true
left join lateral (
  select sum(cb.balance) filter (where cb.balance > 0) as owed,
         count(*) filter (where cb.balance > 0) as debtors
  from public.customer_balances cb
  where cb.tenant_id = t.id
) o on true
left join lateral (
  select count(*) filter (where ag.days_over_60 > 0) as late, sum(ag.days_over_60) as late_total
  from public.wh_customer_ageing ag
  where ag.tenant_id = t.id
) a on true
left join lateral (
  select count(*) filter (where ist.qty_on_hand <= ist.reorder_level) as low
  from public.item_stock ist
  where ist.tenant_id = t.id
) st on true
left join lateral (
  select count(*) as n
  from public.wh_credit_overrides co
  where co.tenant_id = t.id and co.created_at >= b.t0 and co.created_at < b.t1
) ov on true
where t.vertical = 'wholesale';

revoke all on public.wh_owner_summary from public, anon;
grant select on public.wh_owner_summary to authenticated;

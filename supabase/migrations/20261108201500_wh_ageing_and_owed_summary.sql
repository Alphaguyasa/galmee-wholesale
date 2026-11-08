-- Ageing buckets per customer and tenant-wide totals for Galmee Wholesale.
-- Repayments settle the oldest debts first, so the buckets reflect what is still unpaid.

create view public.wh_customer_ageing
with (security_invoker = true) as
with debts as (
  select
    l.tenant_id,
    l.customer_id,
    l.amount,
    (timezone('Africa/Addis_Ababa', now())::date
      - timezone('Africa/Addis_Ababa', l.created_at)::date) as age_days,
    sum(l.amount) over (
      partition by l.customer_id
      order by l.created_at, l.id
    ) as running_debt
  from public.credit_ledger l
  where l.type = 'debt'
),
repaid as (
  select l.customer_id, sum(l.amount) as total
  from public.credit_ledger l
  where l.type <> 'debt'
  group by l.customer_id
),
open_debts as (
  select
    d.tenant_id,
    d.customer_id,
    d.age_days,
    greatest(0, least(d.amount, d.running_debt - coalesce(r.total, 0))) as outstanding
  from debts d
  left join repaid r on r.customer_id = d.customer_id
)
select
  o.tenant_id,
  o.customer_id,
  c.name,
  c.phone,
  coalesce(sum(o.outstanding) filter (where o.age_days <= 30), 0) as days_0_30,
  coalesce(sum(o.outstanding) filter (where o.age_days between 31 and 60), 0) as days_31_60,
  coalesce(sum(o.outstanding) filter (where o.age_days > 60), 0) as days_over_60,
  sum(o.outstanding) as total,
  max(o.age_days) filter (where o.outstanding > 0) as oldest_days
from open_debts o
join public.customers c on c.id = o.customer_id
group by o.tenant_id, o.customer_id, c.name, c.phone
having sum(o.outstanding) > 0;

revoke all on public.wh_customer_ageing from public, anon;
grant select on public.wh_customer_ageing to authenticated;

create function public.wh_owed_summary()
returns table (total_owed numeric, debtors integer)
language sql
stable
security invoker
set search_path = public, private
as $$
  select
    coalesce(sum(b.balance) filter (where b.balance > 0), 0),
    (count(*) filter (where b.balance > 0))::integer
  from public.customer_balances b;
$$;

create function public.wh_ageing_totals()
returns table (days_0_30 numeric, days_31_60 numeric, days_over_60 numeric)
language sql
stable
security invoker
set search_path = public, private
as $$
  select
    coalesce(sum(a.days_0_30), 0),
    coalesce(sum(a.days_31_60), 0),
    coalesce(sum(a.days_over_60), 0)
  from public.wh_customer_ageing a;
$$;

revoke all on function public.wh_owed_summary() from public, anon;
revoke all on function public.wh_ageing_totals() from public, anon;
grant execute on function public.wh_owed_summary() to authenticated;
grant execute on function public.wh_ageing_totals() to authenticated;

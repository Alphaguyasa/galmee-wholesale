-- Statement rows carry the sale or payment they came from, so a receipt can be reprinted from the statement.
-- Columns are appended; the view stays security_invoker so credit_ledger RLS still applies.

create or replace view public.wh_customer_statement
with (security_invoker = true) as
select
  l.id,
  l.tenant_id,
  l.customer_id,
  l.type,
  l.amount,
  l.note,
  l.due_date,
  l.created_at,
  sum(case when l.type = 'debt' then l.amount else -l.amount end) over (
    partition by l.customer_id
    order by l.created_at, l.id
  ) as balance_after,
  l.ref_table,
  l.ref_id
from public.credit_ledger l;

revoke all on public.wh_customer_statement from public, anon;
grant select on public.wh_customer_statement to authenticated;

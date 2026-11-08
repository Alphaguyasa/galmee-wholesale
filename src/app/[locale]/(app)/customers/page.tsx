import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus, Search } from "lucide-react";
import { OwedBar } from "@/components/owed-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatBirr } from "@/lib/money";
import { getOwedSummary, listCustomers } from "@/server/dal/customers";
import { searchParam } from "@/server/validation";

export default async function CustomersPage({ params, searchParams }: PageProps<"/[locale]/customers">) {
  const [{ locale: rawLocale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;

  const parsed = searchParam.safeParse(typeof sp.q === "string" ? sp.q : "");
  const query = parsed.success ? parsed.data : "";

  const [t, customers, summary] = await Promise.all([
    getTranslations("Customers"),
    listCustomers(query),
    getOwedSummary(),
  ]);
  const biggest = customers.reduce((m, c) => Math.max(m, c.balance), 0);

  return (
    <div>
      <section className="bg-jerrycan px-4 py-5 text-ink md:rounded-md">
        <h1 className="text-base font-bold">{t("totalOwed")}</h1>
        <p className="money mt-1 text-[2.5rem] leading-none break-words">{formatBirr(summary.totalOwed, locale)}</p>
        <p className="mt-2">{t("debtors", { count: summary.debtors })}</p>
      </section>

      <form method="get" role="search" className="relative px-4 pt-4 md:px-0">
        <label htmlFor="q" className="sr-only">
          {t("search")}
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-7 mt-2 size-5 -translate-y-1/2 text-muted-foreground md:left-3" aria-hidden />
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t("search")}
          autoComplete="off"
          className="h-12 bg-card pl-10 text-base"
        />
      </form>

      {customers.length === 0 ? (
        <div className="grid justify-items-start gap-3 px-4 py-8 md:px-0">
          <p>{query ? t("noMatch", { query }) : t("empty")}</p>
          {query ? null : (
            <Button asChild>
              <Link href="/customers/new">{t("add")}</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/customers/${c.id}`}
                className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-4 py-3 hover:bg-accent md:px-2"
              >
                <span className="truncate font-bold">{c.name}</span>
                <span className={`money whitespace-nowrap ${c.balance > 0 ? "text-owed" : ""}`}>{formatBirr(c.balance, locale)}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {c.balance > 0 && c.daysOwing !== null ? t("sinceDays", { days: c.daysOwing }) : c.phone ?? t("settled")}
                </span>
                <span />
                <OwedBar value={c.balance} max={biggest} className="col-span-2 mt-2" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="fixed right-4 bottom-20 z-30 md:static md:mt-6 md:flex md:justify-end">
        <Button asChild size="lg" className="shadow-md md:shadow-none">
          <Link href="/customers/new">
            <Plus aria-hidden />
            {t("add")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

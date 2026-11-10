import { getTranslations, setRequestLocale } from "next-intl/server";
import { PackagePlus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatBirr, formatQty } from "@/lib/money";
import { listItems } from "@/server/dal/items";
import { searchParam, uuidParam } from "@/server/validation";

export default async function ItemsPage({ params, searchParams }: PageProps<"/[locale]/items">) {
  const [{ locale: rawLocale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;

  const parsed = searchParam.safeParse(typeof sp.q === "string" ? sp.q : "");
  const query = parsed.success ? parsed.data : "";
  const receivedId = uuidParam.safeParse(sp.received);

  const [t, items] = await Promise.all([getTranslations("Items"), listItems(query, locale)]);
  const low = items.filter((i) => i.onHand <= i.reorderLevel).length;
  const received = receivedId.success ? items.find((i) => i.id === receivedId.data) : undefined;

  return (
    <div>
      <section className="bg-jerrycan px-4 py-5 text-ink md:rounded-md">
        <h1 className="text-base font-bold">{t("title")}</h1>
        <p className="money mt-1 text-[2.5rem] leading-none">{formatQty(items.length)}</p>
        <p className="mt-2">{t("lowCount", { count: low })}</p>
      </section>

      {received ? (
        <p role="status" className="mx-4 mt-4 rounded-md border border-tarp bg-card px-3 py-2 md:mx-0">
          {t("received", { name: received.name, qty: formatQty(received.onHand), unit: received.unit })}
        </p>
      ) : null}

      <form method="get" role="search" className="relative px-4 pt-4 md:px-0">
        <label htmlFor="q" className="sr-only">
          {t("search")}
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-7 mt-2 size-5 -translate-y-1/2 text-muted-foreground md:left-3" aria-hidden />
        <Input id="q" name="q" type="search" defaultValue={query} placeholder={t("search")} autoComplete="off" className="h-12 bg-card pl-10 text-base" />
      </form>

      {items.length === 0 ? (
        <p className="px-4 py-8 md:px-0">{query ? t("noMatch", { query }) : t("empty")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {items.map((i) => {
            const isLow = i.onHand <= i.reorderLevel;
            return (
              <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 md:px-2">
                <div className="grid min-w-0 gap-0.5">
                  <span className="truncate font-bold">{i.name}</span>
                  <span className={`money text-sm ${isLow ? "font-bold text-owed" : "text-muted-foreground"}`}>
                    {t("onHand", { qty: formatQty(i.onHand), unit: i.unit })}
                    {isLow ? ` · ${t("low")}` : ""}
                  </span>
                  <span className="money truncate text-sm text-muted-foreground">{t("pricePer", { price: formatBirr(i.price, locale), unit: i.unit })}</span>
                </div>
                <Link
                  href={`/items/${i.id}/receive`}
                  aria-label={t("receiveFor", { name: i.name })}
                  className="inline-flex min-h-12 items-center gap-2 rounded-md border border-input bg-card px-3 font-bold text-tarp hover:bg-accent"
                >
                  <PackagePlus className="size-5" aria-hidden />
                  <span>{t("receiveShort")}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

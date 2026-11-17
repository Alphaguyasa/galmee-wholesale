import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download } from "lucide-react";
import { ListSheet } from "@/components/galmee/list-row";
import { EXPORT_KINDS } from "@/lib/csv";
import { getSession } from "@/server/dal/session";

export default async function ExportPage({ params }: PageProps<"/[locale]/export">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, session] = await Promise.all([getTranslations("Export"), getSession()]);
  const allowed = session.profile.role === "owner" || session.profile.role === "manager";

  return (
    <div className="grid gap-4 px-4 pt-4 pb-6 md:max-w-2xl md:px-0 md:pt-0">
      <div className="grid gap-1">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>

      {allowed ? (
        <>
          <ListSheet>
            {EXPORT_KINDS.map((kind) => (
              <li key={kind}>
                <a
                  href={`/api/export/${kind}`}
                  download
                  className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                >
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="font-semibold break-words">{t(`kinds.${kind}.title`)}</span>
                    <span className="text-sm text-muted-foreground">{t(`kinds.${kind}.sub`)}</span>
                  </span>
                  <Download className="size-5 shrink-0 text-tarp" aria-hidden />
                </a>
              </li>
            ))}
          </ListSheet>
          <p className="text-sm text-muted-foreground">{t("hint")}</p>
        </>
      ) : (
        <p role="status" className="rounded-md border bg-card p-3">
          {t("notAllowed")}
        </p>
      )}
    </div>
  );
}

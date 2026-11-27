"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ExportCsvButton } from "@/components/galmee/export-csv-button";
import { ReportScreen } from "@/components/galmee/report-screen";
import { SummaryPrintButton } from "@/components/galmee/summary-print-button";
import { createReportFetcher, ROW_CAP } from "@/lib/galmee/report";
import { ageingRow, repaymentRow, runnerClient, saleRow, SOURCES, WHOLESALE_REPORTS, type SourceRunner } from "@/lib/reports";
import { createClient } from "@/lib/supabase/client";

const fail = (message: string) => ({ data: null, error: { message } });

/**
 * The reports screen: credit sales, repayments and the ageing snapshot over the Galmee
 * period picker. Rows come straight from Supabase with the user's session (RLS keeps them
 * to this business); offline, the last loaded copy shows with a "saved copy" badge.
 */
export function ReportsView({
  lang,
  today,
  canExport,
  tenantName,
}: {
  lang: string;
  today: string;
  canExport: boolean;
  tenantName: string;
}) {
  const t = useTranslations("Reports");
  const tc = useTranslations("Cash");
  const fetcher = useMemo(() => {
    const supabase = createClient();
    const runners: Record<string, SourceRunner> = {
      [SOURCES.sales]: async (range, limit) => {
        if (!range) return fail("range_required");
        const { data, error } = await supabase
          .from("sales")
          .select("id, created_at, total, paid, customers(name)")
          .gte("created_at", range.from)
          .lt("created_at", range.to)
          .order("created_at")
          .limit(limit);
        return error ? fail(error.message) : { data: data.map(saleRow), error: null };
      },
      [SOURCES.repayments]: async (range, limit) => {
        if (!range) return fail("range_required");
        // A repayment is a payment from a shop that is not part of a sale (same rule as the cash report).
        const { data, error } = await supabase
          .from("payments")
          .select("id, created_at, amount, method, reference, customers(name)")
          .is("ref_table", null)
          .not("customer_id", "is", null)
          .gte("created_at", range.from)
          .lt("created_at", range.to)
          .order("created_at")
          .limit(limit);
        return error ? fail(error.message) : { data: data.map((r) => repaymentRow(r, (m) => (tc.has(`methods.${m}`) ? tc(`methods.${m}`) : m))), error: null };
      },
      // The ageing view is "who owes right now": the period does not apply to it.
      [SOURCES.ageing]: async (_range, limit) => {
        const { data, error } = await supabase
          .from("wh_customer_ageing")
          .select("customer_id, name, phone, total, days_0_30, days_31_60, days_over_60, oldest_days")
          .gt("total", 0)
          .order("total", { ascending: false })
          .limit(Math.min(limit, ROW_CAP + 1));
        return error ? fail(error.message) : { data: data.map(ageingRow), error: null };
      },
    };
    return createReportFetcher(runnerClient(runners));
  }, [tc]);

  return (
    <ReportScreen
      defs={WHOLESALE_REPORTS}
      lang={lang}
      today={today}
      fetcher={fetcher}
      actions={({ def, period, rows }) => (
        <>
          {def.key === "ageing" ? <span className="self-center text-sm text-muted-foreground">{t("ageingNow")}</span> : null}
          {rows.length > 0 ? <SummaryPrintButton def={def} period={period} rows={rows} lang={lang} tenant={{ name: tenantName }} /> : null}
          {canExport ? <ExportCsvButton def={def} period={period} rows={rows} lang={lang} filenameBase="galmee-wholesale" /> : null}
        </>
      )}
    />
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { QueueSheet } from "@/components/galmee/queue-sheet";
import { SyncChip } from "@/components/galmee/sync-chip";
import type { QueueEntry } from "@/lib/galmee/offline-queue";
import { useQueueEntries, useSyncState, useSyncTriggers } from "@/lib/galmee/use-sync-state";
import type { AppLocale } from "@/i18n/routing";
import { formatBirr } from "@/lib/money";
import { getOffline } from "@/lib/offline";

/** Header chip for money waiting on this phone; tap opens the list. Replays on reconnect and refreshes the screen. */
export function OfflineSync({ role }: { role: string }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Offline");
  const router = useRouter();
  const [{ queue, engine }] = useState(getOffline);
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState(0);
  const state = useSyncState(engine);
  const entries = useQueueEntries(queue, engine, open);
  useSyncTriggers(
    engine,
    useCallback(() => router.refresh(), [router]),
  );

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const summarize = (e: QueueEntry) => {
    const amount = Number(e.args.p_amount ?? e.args.p_paid ?? 0);
    return e.rpc === "record_repayment"
      ? t("queuedRepayment", { amount: formatBirr(amount, locale) })
      : t("queuedSale", { count: Array.isArray(e.args.p_lines) ? e.args.p_lines.length : 0 });
  };
  const describeError = (message: string) => {
    for (const code of ["customer_not_found", "bad_amount", "credit_limit_exceeded", "insufficient_stock", "item_not_found"]) {
      if (message.includes(code)) return t(`error_${code}`);
    }
    return t("error_other");
  };

  return (
    <>
      <SyncChip
        state={state}
        lang={locale}
        onOpen={() => {
          setNow(Date.now());
          setOpen(true);
        }}
      />
      <QueueSheet
        open={open}
        onClose={() => setOpen(false)}
        lang={locale}
        entries={entries}
        role={role}
        online={online}
        now={now}
        summarize={summarize}
        describeError={describeError}
        onSendNow={() => void engine.replayNow()}
        onRetry={(seq) => void engine.retry(seq)}
        onDiscard={(e) => void engine.discard(e.seq)}
      />
    </>
  );
}

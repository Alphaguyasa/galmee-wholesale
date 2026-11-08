"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("Common");
  return (
    <div role="alert" className="grid max-w-md gap-3 p-4">
      <p>{t("loadError")}</p>
      <Button onClick={reset}>{t("retry")}</Button>
    </div>
  );
}

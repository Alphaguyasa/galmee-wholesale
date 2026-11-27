import { Link } from "@/i18n/navigation";
import type { ReceiptWidth } from "@/lib/galmee/receipt";
import { cn } from "@/lib/utils";

/** Picks the paper width for a receipt page (58 mm by default, 80 mm with `?w=80`). */
export function ReceiptWidthToggle({
  href,
  width,
  label,
  labels,
}: {
  /** The receipt page itself, without the width parameter. */
  href: string;
  width: ReceiptWidth;
  label: string;
  labels: Record<ReceiptWidth, string>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden" role="group" aria-label={label}>
      <span className="text-sm text-muted-foreground">{label}</span>
      {([58, 80] as const).map((w) => (
        <Link
          key={w}
          href={w === 80 ? `${href}?w=80` : href}
          replace
          scroll={false}
          aria-current={w === width ? "true" : undefined}
          className={cn(
            "inline-flex min-h-12 items-center rounded-md border px-4 text-sm font-medium",
            w === width ? "border-primary bg-primary text-primary-foreground" : "bg-card",
          )}
        >
          {labels[w]}
        </Link>
      ))}
    </div>
  );
}

/** Reads the width from the page's search params. */
export function receiptWidthParam(w: string | string[] | undefined): ReceiptWidth {
  return w === "80" ? 80 : 58;
}

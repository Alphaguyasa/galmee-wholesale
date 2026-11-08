import { cn } from "@/lib/utils";

// Whole class names so Tailwind keeps them, and no style attribute so the CSP stays strict.
const WIDTHS = [
  "w-1/12", "w-2/12", "w-3/12", "w-4/12", "w-5/12", "w-6/12",
  "w-7/12", "w-8/12", "w-9/12", "w-10/12", "w-11/12", "w-full",
] as const;

/** This customer's share of the biggest debt, like a tally of sack height. Decorative. */
export function OwedBar({ value, max, className }: { value: number; max: number; className?: string }) {
  if (value <= 0 || max <= 0) return null;
  const step = Math.min(WIDTHS.length - 1, Math.max(0, Math.ceil((value / max) * WIDTHS.length) - 1));
  return (
    <div aria-hidden className={cn("h-1.5 w-full bg-muted", className)}>
      <div className={cn("h-full bg-owed", WIDTHS[step])} />
    </div>
  );
}

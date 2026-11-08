import { cn } from "@/lib/utils";

/** A sack with a stencilled G. */
export function Logo({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <path
        d="M10 3h12l-2 5c5 3 7 9 7 13 0 6-4 8-11 8S5 27 5 21c0-4 2-10 7-13z"
        className={inverse ? "fill-jerrycan" : "fill-tarp"}
      />
      <path
        d="M20.5 16.2a5 5 0 1 0 .3 5.2h-4.3"
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={inverse ? "stroke-ink" : "stroke-white"}
      />
    </svg>
  );
}

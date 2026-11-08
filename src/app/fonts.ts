import localFont from "next/font/local";

// Atkinson Hyperlegible Next: 1/7, 0/O and 5/S cannot be confused, which matters on a debt ledger.
export const latin = localFont({
  src: "./fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-latin",
  display: "swap",
});

// Noto Sans Ethiopic for Amharic. Latin glyphs fall through to Atkinson first.
export const ethiopic = localFont({
  src: "./fonts/noto-sans-ethiopic-ethiopic-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-ethiopic",
  display: "swap",
  preload: false,
});

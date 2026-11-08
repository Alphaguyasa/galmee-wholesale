// Screenshots of key screens at 360x800 and 1280x800 in Amharic and English.
// Usage: npm run build && npm start (port 3000), then `node scripts/screenshots.mjs [baseUrl]`.
// Uses the Playwright that is installed globally in the build environment
// (or `npx playwright install chromium` locally).
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(`${execSync("npm root -g").toString().trim()}/playwright`);
}

const base = process.argv[2] ?? "http://localhost:3000";
const pages = [
  { name: "home", path: "" },
  { name: "login", path: "/login" },
  { name: "signup", path: "/signup" },
];
// Extra screens as "name:/path,name:/path" (logged-in screens need a session or fixture data).
for (const extra of (process.env.SHOT_EXTRA ?? "").split(",").filter(Boolean)) {
  const [name, path] = extra.split(":");
  pages.push({ name, path });
}
const locales = ["am", "en"];
const viewports = [
  { name: "360", width: 360, height: 800 },
  { name: "1280", width: 1280, height: 800 },
];

const browser = await playwright.chromium.launch();
let problems = 0;
for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  page.on("pageerror", (e) => {
    problems++;
    console.error("pageerror", e.message);
  });
  for (const locale of locales) {
    for (const p of pages) {
      await page.goto(`${base}/${locale}${p.path}`, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      if (overflow) {
        problems++;
        console.error(`horizontal scroll: ${locale}${p.path} @${vp.name}`);
      }
      const file = `docs/screenshots/${p.name}-${locale}-${vp.name}.png`;
      await page.screenshot({ path: file });
      console.log("saved", file);
    }
  }
  await page.close();
}
await browser.close();
process.exit(problems ? 1 : 0);

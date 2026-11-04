// Renders public/icon-*.png and apple-touch-icon.png from public/favicon.svg.
// Needs a Chromium and playwright-core (not a project dependency):
//   npx -p playwright-core node scripts/build-icons.mjs public/favicon.svg public
import { chromium } from "playwright-core";
const [svgPath, outDir] = process.argv.slice(2);
const fs = await import("node:fs");
const svg = fs.readFileSync(svgPath, "utf8");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();
async function render(size, name, maskable) {
  await page.setViewportSize({ width: size, height: size });
  const inner = maskable
    ? `<div style="width:100%;height:100%;background:#ff7a5c;display:flex;align-items:center;justify-content:center"><div style="width:70%;height:70%">${svg.replace('rx="8"', 'rx="0"')}</div></div>`
    : svg;
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${inner.replace("<svg ", '<svg width="100%" height="100%" ')}</body></html>`,
  );
  await page.screenshot({ path: `${outDir}/${name}`, omitBackground: true });
}
await render(192, "icon-192.png");
await render(512, "icon-512.png");
await render(512, "icon-maskable-512.png", true);
await render(180, "apple-touch-icon.png", true);
await browser.close();

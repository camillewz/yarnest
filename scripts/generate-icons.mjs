// Génère les icônes PNG de la PWA depuis public/icon.svg (Chromium de Playwright).
// Usage : node scripts/generate-icons.mjs
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8');
const targets = [
  { file: 'pwa-192x192.png', size: 192, padding: 0 },
  { file: 'pwa-512x512.png', size: 512, padding: 0 },
  // Zone de sécurité des icônes masquables : 80 % centraux.
  { file: 'maskable-512x512.png', size: 512, padding: 0.1, square: true },
  { file: 'apple-touch-icon.png', size: 180, padding: 0, square: true },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, padding, square } of targets) {
  const inner = square ? svg.replace('rx="112"', 'rx="0"') : svg;
  const pad = Math.round(size * padding);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;background:${square ? '#B5573A' : 'transparent'}">
       <div style="padding:${pad}px;width:${size}px;height:${size}px;box-sizing:border-box">
         ${inner.replace('<svg ', '<svg width="100%" height="100%" ')}
       </div></body>`,
  );
  await page.screenshot({
    path: new URL(`../public/${file}`, import.meta.url).pathname,
    omitBackground: !square,
  });
  console.log(file);
}
await browser.close();

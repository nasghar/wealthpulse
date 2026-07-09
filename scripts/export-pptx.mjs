import { chromium } from 'playwright-core';
import PptxGenJS from 'pptxgenjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/Users/nasghar/gold/wealthapp/WealthPulse-Architecture.pptx';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 }).then((c) => c.newPage());
await page.goto('http://localhost:3000/deck.html', { waitUntil: 'networkidle' });
const total = await page.evaluate(() => document.querySelectorAll('.slide').length);

const shots = [];
for (let n = 0; n < total; n++) {
  await page.evaluate((k) => window.show(k), n);
  await page.waitForTimeout(450);
  const buf = await page.screenshot({ type: 'png' });
  shots.push(buf.toString('base64'));
  process.stdout.write(`\r  rendered slide ${n + 1}/${total}`);
}
process.stdout.write('\n');
await browser.close();

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'W16x9', width: 13.333, height: 7.5 });
pptx.layout = 'W16x9';
pptx.author = 'WealthPulse';
pptx.company = 'SingleStore';
pptx.title = 'WealthPulse — Real-Time Wealth Management on SingleStore';

for (const b64 of shots) {
  const slide = pptx.addSlide();
  slide.background = { color: '070B16' };
  slide.addImage({ data: `image/png;base64,${b64}`, x: 0, y: 0, w: 13.333, h: 7.5 });
}

await pptx.writeFile({ fileName: OUT });
console.log('wrote', OUT, '·', shots.length, 'slides');

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: '4187' }, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Screenshot server did not start')), 10000);
    server.stdout.once('data', () => { clearTimeout(timer); resolve(); });
    server.once('error', reject);
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Screenshot server exited: ${code}`)); });
  });
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4187' ? route.continue() : route.abort());
  await page.goto('http://127.0.0.1:4187');
  await page.getByRole('heading', { name: 'The Last Light.' }).waitFor();
  await page.screenshot({ path: 'docs/title-screen.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/mobile-screen.png', fullPage: true });
  console.log('Captured docs/title-screen.png and docs/mobile-screen.png with external requests blocked.');
} finally {
  await browser?.close();
  server.kill();
}

// Real launch + page probe: a browser version alone is not a successful check.
import { chromium, firefox, webkit } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const results = [];
for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
  let browser;
  let timer;
  let stage = 'launch';
  const result = { name, passed: false };
  try {
    browser = await type.launch({ timeout: 15000 });
    result.version = browser.version();
    stage = 'page';
    await Promise.race([
      (async () => {
        const page = await browser.newPage();
        await page.setContent('<h1>Browser environment ready</h1>');
        if (await page.locator('h1').textContent() !== 'Browser environment ready') throw new Error('Page text mismatch');
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Page probe exceeded 15 seconds')), 15000); })
    ]);
    result.passed = true;
  } catch (error) {
    result.stage = stage;
    result.error = error.message.replace(/\u001b\[[0-9;]*m/g, '');
    process.exitCode = 1;
  } finally {
    clearTimeout(timer);
    if (browser) await browser.close();
  }
  results.push(result);
  console.log(`${name}: ${result.passed ? 'passed' : `blocked at ${stage}`}`);
}
await writeFile('results/browser-environment.json', JSON.stringify({ node: process.version, platform: process.platform, results }, null, 2) + '\n');

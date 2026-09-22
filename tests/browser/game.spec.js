import { test as base, expect } from '@playwright/test';
import { newSession, collect, serialize, SAVE_KEY } from '../../src/session.js';
import { possibleThieves, enumerate } from '../oracle.mjs';
const seed = 'the-last-light';
const fixture = newSession(seed);
const thief = possibleThieves(enumerate(fixture.game.evidence.map(e => e.clause)))[0];
const test = base.extend({
  page: async ({ page, context }, use) => {
    const external = [], errors = [];
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === 'http://127.0.0.1:4173') return route.continue();
      external.push(url.href); return route.abort('blockedbyclient');
    });
    page.on('pageerror', e => errors.push(e.message));
    await use(page);
    expect(external, 'App must not request any external resource').toEqual([]);
    expect(errors, 'No uncaught browser errors').toEqual([]);
  }
});
async function start(page, customSeed = seed) {
  await page.goto('/');
  await page.getByLabel('Choose your case seed').fill(customSeed);
  await page.getByRole('button', { name: 'Open case' }).click();
  await expect(page.getByRole('heading', { name: 'Explore the museum', exact: true })).toBeVisible();
}
async function collectRooms(page) {
  for (let i = 0; i < 4; i++) { await page.locator(`#room-${i}`).click(); await page.locator(`#inspect-${i}`).click(); }
}
async function collectInterviews(page) {
  await page.locator('#nav-interviews').click();
  for (let i = 0; i < 4; i++) {
    await page.locator(`#person-${i}`).click();
    await page.locator('#ask-background').click();
    await expect(page.locator('.dialogue-response')).toContainText(fixture.game.suspects[i].background);
    await page.locator('#ask-record').click();
    await expect(page.locator(`#record-E0${i + 5}`)).toBeVisible();
  }
}
async function openHints(page) {
  const panel = page.locator('.hint-panel');
  if (!(await panel.getAttribute('open')) && await panel.getAttribute('open') !== '') await panel.locator('summary').click();
}

test('complete offline playthrough: inspections, interviews, notes, hints, wrong accusation, and solution', async ({ page }) => {
  await start(page);
  await page.locator('#nav-interviews').click();
  await expect(page.locator('#ask-record')).toBeDisabled();
  await page.locator('#nav-accusation').click();
  await page.locator('#accused').selectOption(String(thief));
  await page.locator('#submit-accusation').click();
  await expect(page.getByRole('heading', { name: 'A theory needs evidence' })).toBeVisible();
  await page.locator('#nav-explore').click();
  await collectRooms(page);
  await collectInterviews(page);
  await expect(page.locator('.case-meta')).toContainText('8 / 8 RECORDS');
  await page.locator('#nav-evidence').click();
  await expect(page.locator('.evidence-card')).toHaveCount(8);
  await page.locator('#nav-notebook').click();
  await page.locator('[id="mark-0:room:0"]').click();
  await page.locator('[id="mark-1:room:0"]').click();
  await page.locator('#check-notebook').click();
  await expect(page.getByRole('heading', { name: 'A contradiction in the notebook' })).toBeVisible();
  await expect(page.locator('.mark.conflict')).not.toHaveCount(0);
  await page.locator('#clear-marks').click();
  await page.locator('#notes').fill('The badge record connects the two room records.');
  await openHints(page);
  await page.locator('#hint-2').click();
  await expect(page.getByRole('heading', { name: 'A justified conclusion' })).toBeVisible();
  await expect(page.locator('.hint-result')).toContainText(fixture.game.suspects[thief].name);
  await expect(page.locator('.hint-result .citation')).not.toHaveCount(0);
  await page.locator('#nav-accusation').click();
  await page.locator('#accused').selectOption(String((thief + 1) % 4));
  await page.locator('#submit-accusation').click();
  await expect(page.getByRole('heading', { name: 'The records rule this out' })).toBeVisible();
  await page.locator('#accused').selectOption(String(thief));
  await page.locator('#submit-accusation').click();
  await expect(page.getByRole('heading', { name: 'Case closed', exact: true })).toBeVisible();
  await page.getByText('Why the other three suspects are excluded', { exact: true }).click();
  await expect(page.locator('.exclusion')).toHaveCount(3);
  await page.reload();
  await page.locator('#resume-case').click();
  await expect(page.getByRole('heading', { name: 'The case is closed', exact: true })).toBeVisible();
  await page.locator('#nav-notebook').click();
  await expect(page.locator('#notes')).toHaveValue('The badge record connects the two room records.');
});

test('partial hints do not reveal future records; resume, export, import, and restart preserve seeded state', async ({ page }) => {
  await start(page);
  await openHints(page); await page.locator('#hint-2').click();
  await expect(page.locator('.hint-result')).toContainText('no evidence yet');
  await expect(page.locator('.hint-result .citation')).toHaveCount(0);
  await page.locator('#inspect-0').click();
  await openHints(page); await page.locator('#hint-1').click();
  const links = await page.locator('.hint-result .citation-link').allTextContents();
  expect(links.every(id => id === 'E01')).toBeTruthy();
  await page.locator('#nav-notebook').click();
  await page.locator('[id="mark-2:badge:3"]').click();
  await page.locator('#notes').fill('Return to Otto with E01.');
  const download = page.waitForEvent('download');
  await page.locator('#export-button').click();
  const file = await download;
  const downloadPath = await file.path();
  await page.reload();
  await expect(page.locator('#resume-case')).toContainText('1/8');
  await page.locator('#resume-case').click();
  await page.locator('#nav-notebook').click();
  await expect(page.locator('#notes')).toHaveValue('Return to Otto with E01.');
  await expect(page.locator('[id="mark-2:badge:3"]')).toHaveAccessibleName(/yes/);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#restart-case').click();
  await expect(page.locator('.case-meta')).toContainText('0 / 8');
  await page.locator('#inspect-0').click();
  await expect(page.locator('#record-E01')).toContainText(fixture.game.evidence[0].text);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#import-save').setInputFiles(downloadPath);
  await expect(page.locator('.case-meta')).toContainText('1 / 8');
  await page.locator('#nav-notebook').click();
  await expect(page.locator('#notes')).toHaveValue('Return to Otto with E01.');
});

test('imports render user text literally and reject malformed saves without losing current progress', async ({ page }) => {
  const attack = '<img src=x onerror="window.pwned=1">';
  const imported = newSession(attack);
  imported.notes = '</textarea><script>window.pwned=2</script><svg onload="window.pwned=3">';
  collect(imported, 'E01');
  await page.goto('/');
  await page.locator('#import-save').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from(serialize(imported)) });
  await expect(page.locator('.seed-display')).toHaveText(`SEED / ${attack}`);
  await page.locator('#nav-notebook').click();
  await expect(page.locator('#notes')).toHaveValue(imported.notes);
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
  await expect(page.locator('img')).toHaveCount(0);
  await expect(page.locator('script')).toHaveCount(1);
  await page.locator('#import-save').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.getByRole('alert')).toContainText('Import failed');
  await expect(page.locator('#notes')).toHaveValue(imported.notes);
  await expect(page.locator('.case-meta')).toContainText('1 / 8');
  const forged = JSON.parse(serialize(imported)); forged.completed = true;
  await page.locator('#import-save').setInputFiles({ name: 'forged.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(forged)) });
  await expect(page.getByRole('alert')).toContainText('Unsupported or malformed');
  await page.locator('#import-save').setInputFiles({ name: 'huge.json', mimeType: 'application/json', buffer: Buffer.alloc(65537, 120) });
  await expect(page.getByRole('alert')).toContainText('too large');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('casebook.save.v1')).collected)).toEqual(['E01']);
});

// Move using real Tab events; no locator.focus() or programmatic clicks in this flow.
async function keyboardActivate(page, id) {
  for (let i = 0; i < 110; i++) {
    if (await page.evaluate(target => document.activeElement?.id === target, id)) { await page.keyboard.press('Enter'); return; }
    await page.keyboard.press('Tab');
  }
  throw new Error(`Keyboard could not reach ${id}`);
}

test('keyboard-only core flow reaches all records, notebook, hints, and a successful accusation', async ({ page }) => {
  await page.goto('/');
  await keyboardActivate(page, 'start-case');
  for (let i = 0; i < 4; i++) { await keyboardActivate(page, `room-${i}`); await keyboardActivate(page, `inspect-${i}`); }
  await keyboardActivate(page, 'nav-interviews');
  for (let i = 0; i < 4; i++) { await keyboardActivate(page, `person-${i}`); await keyboardActivate(page, 'ask-background'); await keyboardActivate(page, 'ask-record'); }
  await keyboardActivate(page, 'nav-notebook');
  await keyboardActivate(page, 'mark-0:room:0');
  await keyboardActivate(page, 'check-notebook');
  await expect(page.locator('.feedback')).toBeVisible();
  // A summary is natively keyboard-operable; reach it through tab order.
  for (let i = 0; i < 100; i++) {
    if (await page.evaluate(() => document.activeElement?.matches('.hint-panel summary'))) { await page.keyboard.press('Enter'); break; }
    await page.keyboard.press('Tab');
  }
  await keyboardActivate(page, 'hint-2');
  await expect(page.locator('.hint-result')).toContainText('Only');
  await keyboardActivate(page, 'nav-accusation');
  for (let i = 0; i < 100; i++) {
    if (await page.evaluate(() => document.activeElement?.id === 'accused')) break;
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Home');
  for (let i = 0; i <= thief; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await keyboardActivate(page, 'submit-accusation');
  await expect(page.getByRole('heading', { name: 'Case closed', exact: true })).toBeVisible();
});

test('mobile layout stays within viewport and case works when local storage is denied', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Disabled', 'SecurityError'); }; });
  await start(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await expect(page.locator('#save-status')).toContainText('export a backup');
  await page.locator('#inspect-0').click();
  await page.locator('#nav-notebook').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.locator('[id="mark-0:room:0"]').click();
  await page.locator('#notes').fill('Temporary note');
  const download = page.waitForEvent('download'); await page.locator('#export-button').click();
  expect((await download).suggestedFilename()).toBe('casebook-save.json');
});

test('corrupt local saves show a recovery path, and static server does not expose source-adjacent files', async ({ page, request }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{invalid'), SAVE_KEY);
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Local save could not be loaded');
  await expect(page.locator('#start-case')).toBeVisible();
  for (const file of ['/package.json', '/.git/config', '/tests/seeds.json', '/results/case-verification.json']) expect((await request.get(file)).status()).toBe(404);
  expect((await request.get('/')).headers()['content-security-policy']).toContain("connect-src 'none'");
});

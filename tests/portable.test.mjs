import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newSession, collect, accuse, requestHint, restoreHint, serialize, deserialize } from '../src/session.js';
import { enumerate, possibleThieves } from './oracle.mjs';
const seeds = JSON.parse(readFileSync(new URL('./seeds.json', import.meta.url)));

test('portable saves preserve 256 seeds at empty, partial, investigated and closed stages', () => {
  for (const seed of seeds) {
    const s = newSession(seed);
    const check = () => {
      const restored = deserialize(serialize(s));
      assert.deepEqual(restored, s, seed);
      assert.equal(serialize(restored), serialize(s), seed);
      assert.deepEqual(restoreHint(restored), restoreHint(s), seed);
    };
    check();
    collect(s, 'E03'); collect(s, 'E07');
    s.conversations = [2]; s.notes = 'Unicode 🕵️ <script>literal</script>\nSecond line';
    s.marks = { '0:room:0': 'yes', '1:room:0': 'yes', '2:badge:3': 'no' };
    requestHint(s, 1); accuse(s, 0); check();
    for (const e of s.game.evidence) collect(s, e.id);
    requestHint(s, 2);
    const thief = possibleThieves(enumerate(s.game.evidence.map(e => e.clause)))[0];
    accuse(s, (thief + 1) % 4); check();
    accuse(s, thief); check();
  }
});

test('v1 fixture migrates without changing progress or case facts', () => {
  const text = readFileSync(new URL('./fixtures/save-v1.json', import.meta.url), 'utf8');
  const old = JSON.parse(text), s = deserialize(text), current = JSON.parse(serialize(s));
  assert.equal(current.version, 2);
  assert.deepEqual(s.hints, []);
  for (const key of ['seed', 'collected', 'conversations', 'marks', 'notes', 'attempts', 'generator']) assert.deepEqual(current[key], old[key]);
  assert.deepEqual(deserialize(serialize(s)), s);
});

test('hint snapshots are bounded, validated, and reconstructed rather than imported as prose', () => {
  const s = newSession('the-last-light');
  for (let i = 0; i < 35; i++) requestHint(s, i % 3);
  assert.equal(s.hints.length, 30);
  assert.deepEqual(deserialize(serialize(s)), s);
  const base = JSON.parse(serialize(s));
  for (const change of [
    d => { d.hints = null; }, d => { d.hints.push(d.hints[0]); },
    d => { d.hints[0].level = 3; }, d => { d.hints[0].level = '1'; },
    d => { d.hints[0].evidence = ['E01']; }, d => { d.hints[0].text = 'forged'; },
    d => { d.hints[0] = null; }, d => { delete d.hints; },
    d => { d.version = 99; }, d => { d.generator = 99; }
  ]) { const d = structuredClone(base); change(d); assert.throws(() => deserialize(JSON.stringify(d))); }
});

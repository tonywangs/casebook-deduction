import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS, solve, culprits, holds } from '../src/logic.js';
import { generateCase, normalizeSeed } from '../src/generator.js';
import { enumerate, accepts, independentWorlds, possibleThieves } from './oracle.mjs';

test('production and independent models agree on every atomic clause in every world', () => {
  assert.equal(WORLDS.length, 576);
  assert.equal(independentWorlds.length, 576);
  for (const kind of ['person-room', 'person-badge', 'badge-room']) for (const op of ['eq', 'ne']) {
    for (let subject = 0; subject < 4; subject++) for (let value = 0; value < 4; value++) {
      const clause = { kind, op, subject, value };
      for (const w of WORLDS) {
        const inverse = { occupants: [0, 1, 2, 3].map(r => w.rooms.indexOf(r)), wearers: [0, 1, 2, 3].map(b => w.badges.indexOf(b)) };
        assert.equal(holds(w, clause), accepts(inverse, clause));
      }
      assert.equal(solve([clause]).length, enumerate([clause]).length);
    }
  }
});

test('seed normalization, boundaries, Unicode, and complete deterministic regeneration', () => {
  assert.equal(normalizeSeed('  test  '), 'test');
  for (const invalid of ['', '   ', 'x'.repeat(81), 'abc\n', null, 0, {}, 'x\u0000y']) assert.throws(() => generateCase(invalid));
  for (const seed of ['the-last-light', '月の博物館', '<img src=x onerror=alert(1)>', 'a'.repeat(80)]) {
    assert.deepEqual(generateCase(seed), generateCase(seed));
    assert.equal(possibleThieves(enumerate(generateCase(seed).evidence.map(e => e.clause))).length, 1);
  }
});

test('contradictory clauses have no worlds; changing a crucial clue can change the answer', () => {
  const c = { kind: 'person-room', subject: 0, value: 0, op: 'eq' };
  assert.equal(solve([c, { ...c, op: 'ne' }]).length, 0);
  assert.deepEqual(culprits(solve([c])), [0]);
  assert.deepEqual(possibleThieves(enumerate([{ ...c, subject: 3 }])), [3]);
});

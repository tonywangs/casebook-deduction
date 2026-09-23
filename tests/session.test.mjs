import test from 'node:test';
import assert from 'node:assert/strict';
import { newSession, collect, available, hint, accuse, evaluateAccusation, checkNotebook, serialize, deserialize, MAX_SAVE_BYTES } from '../src/session.js';
import { enumerate, possibleThieves, allSubsets, accepts, independentText } from './oracle.mjs';
const original = newSession('the-last-light');
const fresh = () => structuredClone(original);
function collectAll(s) { for (const e of s.game.evidence) collect(s, e.id); }
function checkCitation(s, result) {
  for (const e of result.evidence) {
    assert.ok(s.collected.includes(e.id), `Hint leaked ${e.id}`);
    assert.deepEqual(e, s.game.evidence.find(x => x.id === e.id));
  }
  if (result.evidence.length) assert.ok(enumerate(result.evidence.map(e => e.clause)).length > 0);
}

test('record collection respects prerequisites and is idempotent', () => {
  const s = fresh();
  assert.throws(() => collect(s, 'E05'));
  assert.throws(() => collect(s, '__proto__'));
  assert.equal(available(s, s.game.evidence[4]), false);
  collect(s, 'E01'); collect(s, 'E01');
  assert.deepEqual(s.collected, ['E01']);
  collect(s, 'E05');
  assert.equal(s.collected.length, 2);
});

test('notebook conflicts use collected evidence, preserve contradictions, and never assert proof from compatibility', () => {
  const s = fresh();
  s.marks['0:room:0'] = 'yes'; s.marks['1:room:0'] = 'yes';
  assert.equal(checkNotebook(s).conflict, true);
  assert.deepEqual(checkNotebook(s).keys.sort(), ['0:room:0', '1:room:0']);
  delete s.marks['1:room:0'];
  assert.equal(checkNotebook(s).conflict, false);
  assert.match(checkNotebook(s).text, /does not mean/);
  collect(s, 'E02'); // Otto was in the garden, not the gallery.
  assert.equal(checkNotebook(s).conflict, true);
  assert.deepEqual(deserialize(serialize(s)).marks, s.marks);
  assert.equal(hint(s, 2).text, hint({ ...s, marks: {} }, 2).text);
});

test('no guessing win, wrong accusations explain collected proof, and correct case resumes closed', () => {
  const s = fresh();
  for (let i = 0; i < 4; i++) assert.equal(accuse(s, i).outcome, 'insufficient');
  assert.equal(s.completed, false);
  collectAll(s);
  const culprit = possibleThieves(enumerate(s.game.evidence.map(e => e.clause)))[0];
  for (let suspect = 0; suspect < 4; suspect++) {
    if (suspect === culprit) continue;
    const result = accuse(s, suspect);
    assert.equal(result.outcome, 'wrong'); checkCitation(s, result);
    assert.ok(!possibleThieves(enumerate(result.evidence.map(e => e.clause))).includes(suspect));
    assert.equal(s.completed, false);
  }
  const result = accuse(s, culprit);
  assert.equal(result.outcome, 'correct');
  assert.ok(result.evidence.length >= 3);
  assert.equal(s.completed, true);
  assert.equal(deserialize(serialize(s)).completed, true);
  for (const exclusion of result.eliminations) {
    assert.ok(!possibleThieves(enumerate(exclusion.evidence.map(e => e.clause))).includes(exclusion.suspect));
  }
});

test('hints and accusations are sound for every evidence subset across four seeded cases', () => {
  for (const seed of ['the-last-light', 'bellwether-020', 'bellwether-111', 'bellwether-233']) {
    const s = newSession(seed);
    for (const subset of allSubsets(s.game.evidence)) {
      s.collected = subset.map(e => e.id); // Includes hypothetical subsets beyond the UI's prerequisite order.
      const independent = enumerate(subset.map(e => e.clause));
      const possible = possibleThieves(independent);
      for (let level = 0; level <= 2; level++) {
        const result = hint(s, level); checkCitation(s, result);
        const proofWorlds = enumerate(result.evidence.map(e => e.clause));
        if (result.title === 'A justified conclusion') {
          assert.equal(possible.length, 1);
          assert.deepEqual(possibleThieves(proofWorlds), possible);
        } else if (result.title === 'An exclusion you can prove') {
          const person = s.game.suspects.find(p => result.text.startsWith(`${p.name} cannot`));
          assert.ok(person);
          assert.ok(!possibleThieves(proofWorlds).includes(person.id));
        } else if (result.title === 'A fact you can prove') {
          const facts = [];
          for (let subject = 0; subject < 4; subject++) for (let value = 0; value < 4; value++) for (const kind of ['person-room', 'person-badge']) facts.push({ subject, value, kind, op: 'eq' });
          const claimed = facts.find(c => independentText(c, s.game) === result.text);
          assert.ok(claimed);
          assert.ok(proofWorlds.every(w => accepts(w, claimed)));
        }
      }
      for (let suspect = 0; suspect < 4; suspect++) {
        const result = evaluateAccusation(s, suspect); checkCitation(s, result);
        assert.equal(result.outcome, possible.includes(suspect) ? possible.length === 1 ? 'correct' : 'insufficient' : 'wrong');
      }
      // Changing uncollected semantics cannot change hints or feedback.
      const poisoned = structuredClone(s);
      for (const e of poisoned.game.evidence) if (!s.collected.includes(e.id)) { e.clause = { kind: 'person-room', subject: 0, value: 0, op: 'eq' }; e.text = 'SECRET FUTURE CLUE'; }
      for (let level = 0; level <= 2; level++) assert.deepEqual(hint(poisoned, level), hint(s, level));
    }
  }
});

test('save roundtrip and deterministic replay preserve progress without trusting imported outcomes', () => {
  const a = fresh(); const b = fresh();
  for (const s of [a, b]) {
    collect(s, 'E03'); collect(s, 'E07'); collect(s, 'E01');
    s.conversations.push(2); s.marks['2:badge:3'] = 'yes'; s.notes = '<img src=x onerror=alert(1)>\nA handwritten theory.';
    accuse(s, 1);
  }
  assert.equal(serialize(a), serialize(b));
  const restored = deserialize(serialize(a));
  assert.deepEqual(restored, a);
  collectAll(a); collectAll(restored);
  assert.equal(serialize(a), serialize(restored));
});

test('malformed, oversized, foreign-version, forged-completion, and unreachable saves are rejected', () => {
  const base = JSON.parse(serialize(fresh()));
  for (const text of ['', '{', 'null', '[]', '1', '"text"', 'x'.repeat(MAX_SAVE_BYTES + 1)]) assert.throws(() => deserialize(text));
  for (const mutate of [
    d => { d.version = 99; }, d => { d.generator = 999; }, d => { d.format = 'other'; },
    d => { d.completed = true; }, d => { delete d.notes; }, d => { d.seed = []; },
    d => { d.collected = ['E05']; }, d => { d.collected = ['E01', 'E01']; }, d => { d.collected = ['E99']; },
    d => { d.collected = ['E05', 'E01']; }, d => { d.marks = []; }, d => { d.marks['0:room:0'] = 'maybe'; },
    d => { d.marks['4:badge:0'] = 'yes'; }, d => { d.marks.constructor = 'yes'; },
    d => { d.notes = 'a'.repeat(2001); }, d => { d.conversations = [0, 0]; }, d => { d.conversations = [9]; },
    d => { d.attempts = [{ suspect: 0, evidence: ['E01'] }]; }, d => { d.attempts = [{ suspect: 0, evidence: [], outcome: 'correct' }]; },
    d => { d.attempts = [{ suspect: '0', evidence: [] }]; }, d => { d.attempts = [{ suspect: 4, evidence: [] }]; }
  ]) { const data = structuredClone(base); mutate(data); assert.throws(() => deserialize(JSON.stringify(data))); }
});

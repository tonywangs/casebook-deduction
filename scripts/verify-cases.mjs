import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { generateCase } from '../src/generator.js';
import { enumerate, possibleThieves, reachableEvidence, allSubsets, independentText } from '../tests/oracle.mjs';
const seeds = JSON.parse(await readFile(new URL('../tests/seeds.json', import.meta.url), 'utf8'));
assert.ok(seeds.length >= 200);
assert.equal(new Set(seeds).size, seeds.length);
const cases = [], failures = [];
for (const seed of seeds) {
  try {
    const game = generateCase(seed);
    assert.deepEqual(generateCase(seed), game, 'Seed must regenerate the same entire case');
    assert.equal(game.suspects.length, 4);
    assert.equal(game.evidence.length, 8);
    assert.equal(new Set(game.evidence.map(e => e.id)).size, 8);
    assert.equal(new Set(game.evidence.map(e => JSON.stringify(e.clause))).size, 8);
    assert.equal(new Set(game.evidence.map(e => e.clause.kind)).size, 3);
    assert.ok(game.generationAttempts >= 1 && game.generationAttempts <= 48);
    const clauses = game.evidence.map(e => e.clause);
    const worlds = enumerate(clauses);
    const thieves = possibleThieves(worlds);
    assert.ok(worlds.length > 0, 'Clues must be mutually consistent');
    assert.equal(thieves.length, 1, 'All evidence must imply one culprit');
    let minimumProof = 9, minimumSingleCandidates = 4, minimumPairCandidates = 4;
    for (const subset of allSubsets(clauses)) {
      const candidates = possibleThieves(enumerate(subset)).length;
      assert.ok(candidates > 0);
      if (candidates === 1) minimumProof = Math.min(minimumProof, subset.length);
      if (subset.length === 1) minimumSingleCandidates = Math.min(minimumSingleCandidates, candidates);
      if (subset.length === 2) minimumPairCandidates = Math.min(minimumPairCandidates, candidates);
    }
    assert.ok(minimumProof >= 3 && minimumProof <= 8, 'At least three clues must be necessary');
    const reach = reachableEvidence(game);
    assert.equal(reach.seen.length, 8, 'All evidence must be reachable without an answer');
    for (const e of game.evidence) {
      assert.equal(e.text, independentText(e.clause, game), 'Prose must express exactly its clause');
      assert.ok(['room', 'interview'].includes(e.channel));
      assert.ok(Number.isInteger(e.location) && e.location >= 0 && e.location < 4);
    }
    cases.push({ seed, generationAttempts: game.generationAttempts, remainingWorlds: worlds.length,
      culprit: thieves[0], minimumProof, minimumSingleCandidates, minimumPairCandidates, reachableRounds: reach.rounds,
      logicalSignature: clauses.map(c => `${c.kind}/${c.subject}/${c.op}/${c.value}`).sort().join(';'),
      structureSignature: clauses.map(c => `${c.kind}/${c.op}`).sort().join(';') });
  } catch (error) { failures.push({ seed, error: error.message }); }
  if ((cases.length + failures.length) % 32 === 0) console.log(`Checked ${cases.length + failures.length}/${seeds.length} seeds; ${failures.length} failures`);
}
const histogram = key => Object.fromEntries([...new Set(cases.map(c => c[key]))].sort((a, b) => a - b).map(k => [k, cases.filter(c => c[key] === k).length]));
const report = {
  schema: 1, generator: 1, seedSource: 'tests/seeds.json', checker: 'tests/oracle.mjs (independent inverse-mapping enumeration)',
  worldCountBeforeEvidence: enumerate([]).length, culpritCountBeforeEvidence: possibleThieves(enumerate([])).length,
  checked: seeds.length, passed: cases.length, failures,
  distinctLogicalSignatures: new Set(cases.map(c => c.logicalSignature)).size,
  distinctTypeOperatorStructures: new Set(cases.map(c => c.structureSignature)).size,
  minimumProofHistogram: histogram('minimumProof'), culpritHistogram: histogram('culprit'),
  remainingWorldsHistogram: histogram('remainingWorlds'), maximumGenerationAttempts: Math.max(...cases.map(c => c.generationAttempts)),
  limitations: ['Finite fixed-seed sample, not a proof over all strings.', 'Unique culprit need not imply a unique full badge/room assignment.', 'Minimum evidence count is not a human difficulty rating.'], cases
};
await writeFile(new URL('../results/case-verification.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ checked: report.checked, passed: report.passed, failures, distinctTypeOperatorStructures: report.distinctTypeOperatorStructures, minimumProofHistogram: report.minimumProofHistogram, maximumGenerationAttempts: report.maximumGenerationAttempts }, null, 2));
assert.equal(failures.length, 0, 'See results/case-verification.json for preserved failures');
assert.ok(report.distinctTypeOperatorStructures > 1, 'Variation must change clue structures, not only names');
assert.equal(Object.keys(report.culpritHistogram).length, 4);

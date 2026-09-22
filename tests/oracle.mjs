// Test-only oracle: deliberately imports no production solver or permutation code.
// Worlds use room -> person and badge -> person maps, the inverse of runtime worlds.
function assignments() {
  const result = [];
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) for (let d = 0; d < 4; d++) {
    if (new Set([a, b, c, d]).size === 4) result.push([a, b, c, d]);
  }
  return result;
}
export const independentWorlds = [];
for (const occupants of assignments()) for (const wearers of assignments()) independentWorlds.push({ occupants, wearers });
export function accepts(world, clause) {
  if (!['eq', 'ne'].includes(clause.op) || !['person-room', 'person-badge', 'badge-room'].includes(clause.kind)
    || !Number.isInteger(clause.subject) || !Number.isInteger(clause.value) || clause.subject < 0 || clause.subject > 3 || clause.value < 0 || clause.value > 3) throw new Error('Invalid machine-readable clause');
  let equal;
  switch (clause.kind) {
    case 'person-room': equal = world.occupants[clause.value] === clause.subject; break;
    case 'person-badge': equal = world.wearers[clause.value] === clause.subject; break;
    case 'badge-room': equal = world.wearers[clause.subject] === world.occupants[clause.value]; break;
  }
  return clause.op === 'eq' ? equal : !equal;
}
export const enumerate = clauses => independentWorlds.filter(world => clauses.every(c => accepts(world, c)));
export const possibleThieves = worlds => [...new Set(worlds.map(w => w.occupants[0]))].sort();
export function reachableEvidence(game) {
  // Answer-blind breadth-first search through the public prerequisites.
  const seen = new Set();
  const rounds = [];
  for (let round = 0; round < game.evidence.length; round++) {
    const next = game.evidence.filter(e => !seen.has(e.id) && e.requires.every(id => seen.has(id)));
    if (!next.length) break;
    rounds.push(next.map(e => e.id));
    for (const e of next) seen.add(e.id);
  }
  return { seen: [...seen], rounds };
}
export function allSubsets(array) {
  return Array.from({ length: 2 ** array.length }, (_, bits) => array.filter((_, i) => bits & (1 << i)));
}
export function independentText(clause, game) {
  const neg = clause.op === 'ne' ? ' not' : '';
  if (clause.kind === 'person-room') return `${game.suspects[clause.subject].name} was${neg} in the ${game.rooms[clause.value].name} at 21:00.`;
  if (clause.kind === 'person-badge') return `${game.suspects[clause.subject].name} was${neg} wearing the ${game.badges[clause.value]} badge at 21:00.`;
  return `The person wearing the ${game.badges[clause.subject]} badge was${neg} in the ${game.rooms[clause.value].name} at 21:00.`;
}

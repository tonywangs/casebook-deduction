// All assignments are indexed by person. Rooms and badges are bijections.
export const IDS = [0, 1, 2, 3];
export function permutations(values) {
  return values.length ? values.flatMap((v, i) => permutations(values.filter((_, j) => i !== j)).map(p => [v, ...p])) : [[]];
}
const orders = permutations(IDS);
export const WORLDS = orders.flatMap(rooms => orders.map(badges => ({ rooms, badges })));
export function holds(world, clause) {
  let actual;
  if (clause.kind === 'person-room') actual = world.rooms[clause.subject];
  else if (clause.kind === 'person-badge') actual = world.badges[clause.subject];
  else if (clause.kind === 'badge-room') actual = world.rooms[world.badges.indexOf(clause.subject)];
  else throw new Error('Unknown clause kind');
  return clause.op === 'eq' ? actual === clause.value : actual !== clause.value;
}
export const solve = clauses => WORLDS.filter(w => clauses.every(c => holds(w, c)));
export const culprits = worlds => [...new Set(worlds.map(w => w.rooms.indexOf(0)))].sort();
export function minimalSupport(clauses, predicate) {
  // Inclusion-minimal proof, not necessarily a minimum-cardinality proof.
  let proof = [...clauses];
  for (const c of clauses) {
    const rest = proof.filter(x => x !== c);
    if (predicate(solve(rest))) proof = rest;
  }
  return proof;
}
export function describeClause(c, game) {
  const room = game.rooms[c.value].name;
  const badge = game.badges[c.value];
  const person = game.suspects[c.subject].name;
  const verb = c.op === 'eq' ? 'was' : 'was not';
  if (c.kind === 'person-room') return `${person} ${verb} in the ${room} at 21:00.`;
  if (c.kind === 'person-badge') return `${person} ${verb} wearing the ${badge} badge at 21:00.`;
  return `The person wearing the ${game.badges[c.subject]} badge ${verb} in the ${room} at 21:00.`;
}

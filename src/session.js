import { generateCase, GENERATOR_VERSION } from './generator.js';
import { solve, culprits, minimalSupport, describeClause } from './logic.js';
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'casebook.save.v1';
export const MAX_SAVE_BYTES = 65536;
export function newSession(seed) {
  return { game: generateCase(seed), collected: [], conversations: [], marks: {}, notes: '', attempts: [], completed: false };
}
export const collectedEvidence = session => session.game.evidence.filter(e => session.collected.includes(e.id));
export const collectedClauses = session => collectedEvidence(session).map(e => e.clause);
export const available = (session, evidence) => evidence.requires.every(id => session.collected.includes(id));
function proofFor(session, predicate) {
  const evidence = collectedEvidence(session);
  const proof = minimalSupport(evidence.map(e => e.clause), predicate);
  return evidence.filter(e => proof.includes(e.clause));
}
export function collect(session, id) {
  const evidence = session.game.evidence.find(e => e.id === id);
  if (!evidence || !available(session, evidence)) throw new Error('Review the required room record first.');
  if (!session.collected.includes(id)) session.collected.push(id);
  return evidence;
}
export function markClause(key, value) {
  const match = /^([0-3]):(room|badge):([0-3])$/.exec(key);
  if (!match || !['yes', 'no'].includes(value)) throw new Error('Invalid notebook mark.');
  return { kind: `person-${match[2]}`, subject: Number(match[1]), value: Number(match[3]), op: value === 'yes' ? 'eq' : 'ne' };
}
export function checkNotebook(session) {
  const marked = Object.entries(session.marks).map(([key, value]) => ({ key, clause: markClause(key, value) }));
  const evidence = collectedClauses(session);
  const worlds = solve([...evidence, ...marked.map(m => m.clause)]);
  if (worlds.length) return { conflict: false, keys: [], text: marked.length ? 'Your marks are compatible with the collected evidence. Compatibility does not mean every mark is proved.' : 'No marks to check yet. Record a room or badge deduction first.' };
  let core = [...marked];
  for (const m of marked) {
    const rest = core.filter(x => x !== m);
    if (solve([...evidence, ...rest.map(x => x.clause)]).length === 0) core = rest;
  }
  return { conflict: true, keys: core.map(m => m.key), text: 'These marks cannot all be true with the collected evidence and the one-person-per-room, one-badge-per-person rules. Change a highlighted mark and check again.' };
}
export function hint(session, level = 0) {
  const evidence = collectedEvidence(session);
  const worlds = solve(evidence.map(e => e.clause));
  if (level === 0) {
    const uncollected = session.game.evidence.filter(e => !session.collected.includes(e.id));
    const next = uncollected.find(e => available(session, e));
    return { title: 'A place to look', text: next ? (next.channel === 'room' ? `Inspect the ${session.game.rooms[next.location].name}. An uncollected record is available there.` : `Interview ${session.game.suspects[next.location].name} and ask to review the record. You have the required room record.`) : 'All eight records are collected. Cross-reference badge records with room records, or ask for a deduction.', evidence: [] };
  }
  const possible = culprits(worlds);
  const excluded = session.game.suspects.filter(s => !possible.includes(s.id));
  if (level >= 2 && possible.length === 1) {
    const person = session.game.suspects[possible[0]];
    const proof = proofFor(session, ws => ws.length > 0 && culprits(ws).length === 1 && culprits(ws)[0] === person.id);
    return { title: 'A justified conclusion', text: `Only ${person.name} can be in the Moon Gallery at 21:00. Under the briefing rules, that identifies the thief. The cited records together rule out every other suspect.`, evidence: proof };
  }
  if (excluded.length) {
    const person = excluded[0];
    return { title: 'An exclusion you can prove', text: `${person.name} cannot be the thief: no assignment consistent with these records puts them in the Moon Gallery at 21:00.`, evidence: proofFor(session, ws => ws.length > 0 && !culprits(ws).includes(person.id)) };
  }
  for (let subject = 0; subject < 4; subject++) for (const kind of ['person-room', 'person-badge']) {
    const field = kind === 'person-room' ? 'rooms' : 'badges';
    const values = [...new Set(worlds.map(w => w[field][subject]))];
    if (values.length === 1) {
      const clause = { kind, subject, value: values[0], op: 'eq' };
      return { title: 'A fact you can prove', text: describeClause(clause, session.game), evidence: proofFor(session, ws => ws.length > 0 && ws.every(w => w[field][subject] === values[0])) };
    }
  }
  return { title: 'Keep the possibilities open', text: evidence.length ? 'The collected records do not yet fix a room or badge for a person, or exclude a suspect. Use “A place to look” to find another record.' : 'You have no evidence yet. Visit a room and inspect its record before asking for a deduction.', evidence: [] };
}
export function evaluateAccusation(session, suspect) {
  if (!Number.isInteger(suspect) || suspect < 0 || suspect > 3) throw new Error('Choose one of the four suspects.');
  const possible = culprits(solve(collectedClauses(session)));
  const name = session.game.suspects[suspect].name;
  if (!possible.includes(suspect)) {
    const proof = proofFor(session, ws => ws.length > 0 && !culprits(ws).includes(suspect));
    return { outcome: 'wrong', title: 'The records rule this out', text: `${name} cannot be in the Moon Gallery at 21:00 given the cited records. The accusation does not hold. Your investigation remains open.`, evidence: proof };
  }
  if (possible.length > 1) return { outcome: 'insufficient', title: 'A theory needs evidence', text: `The collected evidence still permits ${possible.length} different suspects to be the thief. This accusation is not proved. Collect more records; guessing does not close the case.`, evidence: [] };
  const proof = proofFor(session, ws => ws.length > 0 && culprits(ws).length === 1 && culprits(ws)[0] === suspect);
  const eliminations = session.game.suspects.filter(p => p.id !== suspect).map(p => ({ suspect: p.id, evidence: proofFor(session, ws => ws.length > 0 && !culprits(ws).includes(p.id)) }));
  return { outcome: 'correct', title: 'Case closed', text: `${name} is the only person who can have occupied the Moon Gallery at 21:00. The object was taken by that room’s sole occupant. Together, these records establish the accusation.`, evidence: proof, eliminations };
}
export function accuse(session, suspect) {
  const result = evaluateAccusation(session, suspect);
  session.attempts.push({ suspect, evidence: [...session.collected] });
  session.attempts = session.attempts.slice(-30);
  session.completed = session.completed || result.outcome === 'correct';
  return result;
}
export function serialize(session) {
  return JSON.stringify({ format: 'casebook', version: SAVE_VERSION, generator: GENERATOR_VERSION,
    seed: session.game.seed, collected: session.collected, conversations: session.conversations,
    marks: session.marks, notes: session.notes, attempts: session.attempts });
}
const plainObject = x => x !== null && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
function uniqueList(value, allowed, max) {
  return Array.isArray(value) && value.length <= max && new Set(value).size === value.length && value.every(x => allowed.includes(x));
}
function validCollection(game, ids) {
  if (!uniqueList(ids, game.evidence.map(e => e.id), 8)) return false;
  // Order is acquisition order: each prerequisite must already have been found.
  return ids.every((id, i) => game.evidence.find(e => e.id === id).requires.every(p => ids.slice(0, i).includes(p)));
}
export function deserialize(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_SAVE_BYTES) throw new Error('Save file is too large (maximum 64 KiB).');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. Your current case has not changed.'); }
  const keys = ['format', 'version', 'generator', 'seed', 'collected', 'conversations', 'marks', 'notes', 'attempts'];
  if (!plainObject(data) || Object.keys(data).some(k => !keys.includes(k)) || keys.some(k => !Object.hasOwn(data, k))
    || data.format !== 'casebook' || data.version !== SAVE_VERSION || data.generator !== GENERATOR_VERSION) throw new Error('Unsupported or malformed Casebook save.');
  const session = newSession(data.seed);
  if (!validCollection(session.game, data.collected) || !uniqueList(data.conversations, [0, 1, 2, 3], 4)
    || !plainObject(data.marks) || Object.keys(data.marks).length > 32 || typeof data.notes !== 'string' || data.notes.length > 2000
    || !Array.isArray(data.attempts) || data.attempts.length > 30) throw new Error('Invalid progress in save file.');
  for (const [key, value] of Object.entries(data.marks)) markClause(key, value);
  session.collected = [...data.collected]; session.conversations = [...data.conversations];
  session.marks = { ...data.marks }; session.notes = data.notes;
  let priorEvidence = [];
  for (const attempt of data.attempts) {
    if (!plainObject(attempt) || Object.keys(attempt).sort().join(',') !== 'evidence,suspect' || !validCollection(session.game, attempt.evidence)
      || !attempt.evidence.every(id => data.collected.includes(id)) || !priorEvidence.every(id => attempt.evidence.includes(id))) throw new Error('Invalid accusation history.');
    const result = evaluateAccusation({ ...session, collected: attempt.evidence }, attempt.suspect);
    session.completed ||= result.outcome === 'correct';
    session.attempts.push({ suspect: attempt.suspect, evidence: [...attempt.evidence] });
    priorEvidence = attempt.evidence;
  }
  return session;
}

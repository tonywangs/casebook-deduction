import { IDS, WORLDS, holds, culprits, solve, describeClause } from './logic.js';
export const GENERATOR_VERSION = 1;
export const DEFAULT_SEED = 'the-last-light';
export function normalizeSeed(seed) {
  if (typeof seed !== 'string' || seed.length > 80 || !seed.trim() || /[\u0000-\u001f\u007f]/u.test(seed)) throw new Error('Use a seed of 1–80 characters, without control characters.');
  return seed.trim();
}
function randomFor(seed) {
  let a = 2166136261;
  for (const ch of seed) { a ^= ch.codePointAt(0); a = Math.imul(a, 16777619); }
  return () => {
    a += 0x6D2B79F5;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(a, random) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const PEOPLE = [
  ['Mara Vale', 'Conservator', 'A careful restorer with ink on one cuff.', 'The board wanted the restoration finished tonight. I wanted another month. Rushing a repair is how you lose a century.', 'I have handled things more fragile than reputations. Ask me about the records; they are less delicate.'],
  ['Elias Reed', 'Night custodian', 'A ring of ordinary keys, polished from use.', 'The museum sounds different after closing. Pipes, clocks, rain. Tonight even the clocks seemed to hold their breath.', 'I know every door here. That does not mean I opened every one. Let us stick to what was recorded.'],
  ['June Mercer', 'Exhibition designer', 'A folded floor plan peeks from a coat pocket.', 'I spent six weeks making the display disappear around that little object. Now the object has returned the favour.', 'People see what a room tells them to see. The access records are harder to persuade.'],
  ['Otto Finch', 'Collections registrar', 'A pencil is clipped precisely to a ledger.', 'Everything has a number, a shelf, a signature. An empty space is an administrative problem before it is a scandal.', 'I can help with a document. I will not help with a theory dressed up as a document.'],
  ['Iris Bell', 'Visiting curator', 'A rain-dark scarf rests across one arm.', 'It was supposed to be the final quiet evening before opening. I had even written the label for the case.', 'If you find a record, bring it here. Memory is not a filing system.'],
  ['Theo Ash', 'Lighting technician', 'A brass lamp meter hangs from a shoulder strap.', 'I was hired to make old silver look like moonlight. Nobody mentioned what to do when the moon went missing.', 'My work is light and shadow. Your work should probably involve fewer shadows.']
];
export const ROOMS = [
  { name: 'Moon Gallery', short: 'Gallery', subtitle: 'An absence under glass', description: 'Rain ticks against the skylight. In the centre of the room, a velvet cradle holds the exact shape of something that is no longer there.', inspect: 'Examine the display terminal', source: 'Display terminal', detail: 'The terminal retains a signed fragment of the 21:00 security snapshot.' },
  { name: 'Archive', short: 'Archive', subtitle: 'The building remembers', description: 'Drawers of index cards line the walls. The small security printer has left a ribbon of paper curled on the floor.', inspect: 'Read the security printout', source: 'Security printout', detail: 'The surviving printout contains one authenticated fact from the 21:00 snapshot.' },
  { name: 'Workshop', short: 'Workshop', subtitle: 'Nothing is beyond repair', description: 'A cold task lamp hangs over brushes, cotton gloves, and a disassembled clock. A diagnostic console is still awake.', inspect: 'Inspect the diagnostic console', source: 'Diagnostic console', detail: 'The console recovered a checksum-verified fragment of the 21:00 snapshot.' },
  { name: 'Winter Garden', short: 'Garden', subtitle: 'A pause among the palms', description: 'Condensation clouds the glass roof. Beside a bench, the emergency panel blinks patiently in the green half-light.', inspect: 'Check the emergency panel', source: 'Emergency panel', detail: 'The panel cached one verified line of the 21:00 security snapshot.' }
];
export function generateCase(rawSeed) {
  const seed = normalizeSeed(rawSeed);
  const random = randomFor(`casebook-v${GENERATOR_VERSION}:${seed}`);
  const suspects = shuffle(PEOPLE, random).slice(0, 4).map(([name, role, portrait, background, response], id) => ({ id, name, role, portrait, background, response }));
  const badges = shuffle(['Heron', 'Fox', 'Moth', 'Stag'], random);
  const rooms = ROOMS.map((r, id) => ({ ...r, id }));
  let selected, attempts = 0;
  // No unbounded rejection loop: at most 48 worlds and 12 clue selections each.
  for (; attempts < 48; attempts++) {
    const truth = WORLDS[Math.floor(random() * WORLDS.length)];
    const pool = [];
    for (const kind of ['person-room', 'person-badge', 'badge-room']) {
      for (const subject of IDS) for (const value of IDS) {
        const eq = { kind, subject, value, op: 'eq' };
        const clause = { ...eq, op: holds(truth, eq) ? 'eq' : 'ne' };
        if (culprits(solve([clause])).length > 1) pool.push(clause);
      }
    }
    const candidates = shuffle(pool, random);
    const clues = [];
    let remaining = WORLDS;
    for (let step = 0; step < 12; step++) {
      const available = candidates.filter(c => !clues.includes(c)
        && clues.every(prior => culprits(solve([prior, c])).length > 1));
      const reducing = available.filter(c => remaining.some(w => !holds(w, c)));
      const options = reducing.length ? reducing : available;
      if (!options.length) break;
      const c = options[Math.floor(random() * options.length)];
      clues.push(c);
      remaining = remaining.filter(w => holds(w, c));
      if (clues.length === 8) {
        if (culprits(remaining).length === 1 && new Set(clues.map(c => c.kind)).size === 3) selected = clues;
        break;
      }
    }
    if (selected) break;
  }
  if (!selected) throw new Error('This seed could not produce a verified case within the generation limit. Try another seed.');
  const game = { version: GENERATOR_VERSION, seed, title: 'The Last Light', suspects, badges, rooms, generationAttempts: attempts + 1 };
  game.evidence = shuffle(selected, random).map((clause, i) => {
    const id = `E${String(i + 1).padStart(2, '0')}`;
    const location = i % 4;
    const interview = i >= 4;
    const source = interview ? `${suspects[location].name} · record review` : rooms[location].source;
    return { id, clause, source, channel: interview ? 'interview' : 'room', location,
      requires: interview ? [`E${String(location + 1).padStart(2, '0')}`] : [],
      title: interview ? `Countersigned record ${location + 1}` : `${rooms[location].short} record`,
      text: describeClause(clause, game),
      context: interview ? 'A sealed duplicate is opened in your presence. The signature and timestamp authenticate this record; the speaker’s personal opinions are not evidence.' : rooms[location].detail };
  });
  return game;
}

# Generation, deduction, and persistence

## Finite world model

The runtime enumerates all `4! × 4! = 576` worlds. A world has two arrays indexed by suspect ID:

```js
{ rooms: [2, 0, 3, 1], badges: [1, 3, 0, 2] }
```

Both arrays are permutations of `[0, 1, 2, 3]`. Room `0` is the Moon Gallery. The thief is the person whose room is `0`. There is no separate “guilty” flag that can disagree with the evidence.

Every clue is a JSON object with four fields:

```json
{"kind":"badge-room","subject":3,"op":"eq","value":2}
```

| Kind | Subject | Value | Meaning of `eq` |
| --- | --- | --- | --- |
| `person-room` | Suspect ID | Room ID | This person occupied this room. |
| `person-badge` | Suspect ID | Badge ID | This person wore this badge. |
| `badge-room` | Badge ID | Room ID | The wearer of this badge occupied this room. |

`ne` negates the relation. IDs range from 0 through 3. The generator renders the same clause as an original sentence; the verifier separately checks that rendering. Text is not parsed back into logic. No name, role, opinion, motive, item description, or discovery location has an unstated logical effect.

## Bounded generator

`src/generator.js` normalizes seeds by trimming surrounding whitespace, rejects control characters and strings outside 1–80 UTF-16 code units, hashes the version-prefixed seed, and uses a fixed integer PRNG. It does not use time, locale-sensitive ordering, or `Math.random`.

For each of at most 48 attempts:

1. Select a complete world from the finite universe.
2. Build true positive or negative predicates for the three relation kinds. Exclude any predicate that alone fixes the culprit.
3. Select eight distinct predicates, preferring those that reduce the remaining worlds. Reject a new predicate if it would identify a culprit together with any single existing predicate.
4. Accept only if all eight predicates together admit exactly one culprit and include all three relation kinds. Otherwise retry.

The selection loop has a hard step bound (12; each attempt terminates at eight selected clues or earlier). There is no fallback that silently relaxes the multi-clue or uniqueness conditions. Exhausting the attempts throws a recoverable generation error.

The runtime and verifier require a unique **culprit**, not a unique whole world. Some clues are redundant; every record need not be essential. The verifier exhaustively finds the smallest number of clues that proves the culprit, including hypothetical subsets that would not satisfy discovery prerequisites. Thus its “at least three” condition is stronger than a count of required UI interactions.

## Discovery graph

Eight evidence objects add an ID, source, context, discovery channel, location ID, and `requires` list to the clause:

```text
Moon Gallery inspection → E01 → suspect 0 record review → E05
Archive inspection      → E02 → suspect 1 record review → E06
Workshop inspection     → E03 → suspect 2 record review → E07
Winter Garden inspection→ E04 → suspect 3 record review → E08
```

Every room and interview can be visited immediately. Background dialogue requires nothing. Each record review is visibly locked until its root record is found. A culprit, notebook entry, accusation, or hidden action is never a prerequisite. The independent verifier traverses this public graph without reading the solution.

Suspect IDs describe cast position, not culpability. Interviews provide signed security records, not unverified testimony: even the thief can provide a reliable document while expressing an unhelpful personal opinion.

## Hints and explanations

The session layer filters evidence by collected IDs before evaluating any predicate. Exploration nudges can mention available actions and their public prerequisites, but cannot disclose undiscovered record text. Reasoning hints either exclude a suspect, establish a room/badge fact, or (only when proved) identify the single possible thief.

Proofs use deletion minimization: try removing each collected clause and retain only a subset still sufficient for the claim. This is **inclusion-minimal**, not necessarily smallest by cardinality. Conclusions and per-suspect exclusions display the supporting records as clickable citations. The reasoning is exhaustive counterfactual checking over a tiny world space, not a simulated human deduction strategy.

An accusation has three outcomes:

- **Insufficient:** the accused is still possible, but so is someone else. Guessing the eventual answer does not reveal it or close the case.
- **Wrong:** collected evidence already excludes the accused. The response cites that evidence and keeps the case open.
- **Correct:** only the accused remains possible. The explanation includes its supporting proof and separate exclusions of the others.

The unit suite examines every evidence subset of four different cases, checks claims against the independent oracle, and replaces all undiscovered clue content with a false “future clue.” That mutation must leave hint results identical.

## Notebook

Marks are a map from `person:room:value` or `person:badge:value` to `yes` or `no`. Missing keys mean unknown. Checking combines marks with collected evidence and the bijection rules. If inconsistent, it returns an inclusion-minimal conflicting group of marks. It preserves the player’s entries until they change or clear them. Compatibility is expressly not confirmation.

## Save format

`casebook.save.v1` in local storage holds the same JSON format as exported files:

```json
{
  "format": "casebook",
  "version": 2,
  "generator": 1,
  "seed": "the-last-light",
  "collected": ["E01"],
  "conversations": [0],
  "marks": {"2:badge:3": "yes"},
  "notes": "Check the badge connection.",
  "attempts": [{"suspect": 0, "evidence": ["E01"]}],
  "hints": [{"level": 1, "evidence": ["E01"]}]
}
```

The importer enforces a 64 KiB byte limit before parsing, exact top-level fields/version, valid seed, unique collected IDs in reachable acquisition order, bounded conversation IDs, legal notebook keys/values, 2,000-character notes, and at most 30 accusation snapshots and 30 hint snapshots. Hint levels are integers 0–2; hint prose and citations are regenerated from their evidence snapshot. Each snapshot must contain a reachable subset of the collected records; evidence cannot disappear between retained attempts. Hint evidence also cannot disappear between retained requests. Outcomes and completion are recomputed from those snapshots. Saves do not supply case prose, executable code, clue predicates, HTML, or trusted completion flags.

Format 1 has exactly the same fields except `hints`. It is validated and migrated in memory with an empty hint history; the original release never saved hint requests. The next successful write or export emits format 2. The storage key deliberately remains `casebook.save.v1` so existing progress is discovered. Reads alone do not overwrite local data. Unsupported save or generator versions produce recovery guidance.

Notebook contradictions are legitimate player data, so saves preserve them. Untrusted seed and note text is inserted through text nodes and textarea content, never `innerHTML`. Loading validates everything in a temporary session before replacing live progress. Storage failure does not prevent play or file export.

## Source map

| File | Responsibility |
| --- | --- |
| `src/generator.js` | Seeded generation, character templates, evidence placement |
| `src/logic.js` | Runtime world enumeration, predicate evaluation, proof support |
| `src/session.js` | Progress, notebook checks, hints, accusations, save validation |
| `src/app.js` | Accessible DOM interface and local persistence |
| `scripts/serve.mjs` | Loopback static server with an asset allowlist |
| `tests/oracle.mjs` | Independent inverse-mapping world checker |
| `scripts/verify-cases.mjs` | Reproducible fixed-seed audit and result artifact |

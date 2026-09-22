# Validation evidence

Validated on 2026-09-22 with Node.js 24.20.0, Playwright 1.55.1, and its Chromium 140.0.7339.186 binary on Linux. These are correctness checks, not performance benchmarks or a player study.

## Recorded checks

| Check | Observed result | Reproduce | Artifact |
| --- | --- | --- | --- |
| Unit and semantic tests | 9 passed, 0 failed | `npm test` | [tests.log](../results/tests.log) |
| Independent generation audit | 256 passed, 0 failures | `npm run verify:cases` | [case-verification.json](../results/case-verification.json) |
| Offline browser tests | 6 passed, 0 failed, 0 skipped | `npm run test:browser` | [browser-results.json](../results/browser-results.json) |

Tests include real pointer and keyboard browser playthroughs, both accusation outcomes and unsupported guesses, discovery locks, background dialogue, contradictory notebook entries, progressive hints, reload/resume, portable saves, deterministic restart, literal rendering of hostile imported text, malformed and oversized imports, unavailable storage, corrupted local saves, narrow viewport overflow, and private-file isolation by the local server.

Every browser context routes requests through a same-origin allowlist. Requests outside the local test server are aborted and fail the test. Service workers are blocked. No external resource requests or uncaught page errors occurred. This establishes operation without internet resources while the local server is running; it is not a test of a service-worker cache or installed PWA.

## Independent audit

The input list is [tests/seeds.json](../tests/seeds.json): the default plus `bellwether-000` through `bellwether-254`. Each seed is regenerated twice for exact equality. For each of its 256 clue subsets, the oracle independently enumerates every possible assignment. Across the fixture set, this checks 65,536 subsets.

The oracle maps rooms and badges **to people**, while production maps people **to rooms and badges**. It uses separate enumeration loops and relation evaluation, importing neither runtime solver nor permutation code. Each accepted case has eight valid, distinct clue predicates from all three relation kinds. All records are reachable in two answer-blind traversal rounds: four room records, then four interview records.

| Measurement | Observed value |
| --- | --- |
| Possible worlds before evidence | 576 |
| Possible culprits before evidence | 4 |
| Fixed seeds checked | 256 |
| Generation or validation failures | 0 |
| Unique full-evidence culprit | 256 / 256 cases |
| Cases solvable from one or two clues | 0 |
| Largest attempt count | 22 of the allowed 48 |
| Distinct predicate signatures | 256 |
| Distinct type/operator combinations, ignoring IDs and names | 163 |
| Cases with exactly one full room/badge assignment | 146 |
| Cases with multiple full assignments but one culprit | 110 |

The remaining full-world counts range from 1 to 32. Thus the evidence does **not** always reconstruct every badge and room. This is intentional: the goal is culprit uniqueness. There is no claim that all assignments are uniquely recoverable.

The minimum number of clue predicates sufficient to identify the culprit was:

| Minimum clues | Cases |
| --- | --- |
| 3 | 79 |
| 4 | 114 |
| 5 | 22 |
| 6 | 30 |
| 7 | 10 |
| 8 | 1 |

Culprit IDs 0–3 occurred 61, 65, 64, and 66 times respectively. This sample covers all cast positions; it does not establish statistical uniformity. Variation in type/operator combinations establishes that generated logic changes beyond simply renaming the same puzzle. It does not quantify perceived replay value.

The checked default case needs four predicates: E01, E02, E05, and E07. The [walkthrough](walkthrough.md) shows a direct deduction.

## Hint and notebook evidence

The unit suite compares each of the 96 possible atomic predicates with the oracle in all 576 worlds. It also tests hint and accusation soundness over all 256 evidence subsets of four seeds (1,024 states). These include subsets not obtainable through normal discovery, making the evidence boundary test independent of UI gating.

Every hint citation must be collected. Deductions and accused-suspect exclusions are checked against the independent oracle. All undiscovered clause semantics and text are then replaced with different content; the same hint requests must return exactly the same results. Notebook assumptions never enter hint or accusation reasoning.

Malformed-save checks include invalid JSON, unsupported formats, invalid IDs, duplicate or out-of-order evidence, unknown notebook marks, invalid histories, oversized notes/files, and forged completion fields. Valid contradictory notebooks remain loadable. Browser tests exercise script-like seed and note content without code execution or injected elements.

## Limits

- The fixed-seed audit is reproducible evidence, not a proof for every possible seed string. The generator can report bounded failure outside this set.
- Runtime and oracle implement the same written fictional model. Agreement does not validate that model as a realistic account of security systems or criminal investigation.
- Minimum clue count is not a human difficulty metric. There are no measurements of player enjoyment, solve time, narrative quality, or accessibility with screen readers.
- Hints provide exhaustive logical support and citations, not a complete human-style chain for every generated case. Supporting sets are inclusion-minimal, not necessarily shortest.
- Automated browser coverage is Chromium only. Mobile checks use a desktop browser with a 390×844 viewport; real mobile devices were not tested.
- Storage quotas and browser privacy settings vary. A denied-storage browser test verifies that in-memory play and export work, but exported backups are the durable transfer mechanism.
- No performance claim is based on the recorded test durations, which include concurrent validation and shared-host overhead.

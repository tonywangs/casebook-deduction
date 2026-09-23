# Validation evidence

Validated on 2026-09-23 with Node.js 24.20.0 and Playwright 1.55.1 on Ubuntu 24.04. Chromium 140.0.7339.186 completed the application tests. Firefox 141.0 was installed but timed out at launch; WebKit 26.0 launched but timed out creating a page. The cross-browser milestone remains blocked by this environment. These are correctness checks, not performance benchmarks or a player study.

## Recorded checks

| Check | Observed result | Reproduce | Artifact |
| --- | --- | --- | --- |
| Unit, semantic, and portable-save tests | 12 passed, 0 failed | `npm test` | [tests.log](../results/tests.log) |
| Independent generation audit | 256 passed, 0 failures | `npm run verify:cases` | [case-verification.json](../results/case-verification.json) |
| Offline Chromium application tests | 8 passed, 0 failed, 0 skipped | `npx playwright test --project=chromium --grep-invert "downloaded unfinished"` | [browser-results.json](../results/browser-results.json) |
| Browser environment probe | Chromium passed; Firefox launch blocked; WebKit page blocked (exit 1) | `node scripts/verify-browser-environment.mjs` | [browser-environment.json](../results/browser-environment.json) |
| Chromium → other engines transfer | 1 failed: Firefox launch timeout after both source downloads | `npx playwright test --project=chromium --grep "downloaded unfinished"` | [browser-transfer-blocked.json](../results/browser-transfer-blocked.json) |

The default browser suite defines 27 tests across all three engines, including fresh-profile imports of both unfinished and completed downloads in every directed engine pair. Those transfer tests have **not passed** here. The final Chromium-source test completed both downloads and closed Chromium before attempting Firefox; it then failed at Firefox launch. The WebKit destination was not reached. The recorded successful browser report is explicitly the eight-test Chromium subset, not a three-engine result. `npm run check` includes the full browser suite and must not be called passing on this host.

Tests include real pointer and keyboard browser playthroughs, both accusation outcomes and unsupported guesses, discovery locks, background dialogue, contradictory notebook entries, progressive hints, reload/resume, portable saves, deterministic restart, literal rendering of hostile imported text, malformed and oversized imports, unavailable storage, corrupted local saves, narrow viewport overflow, and private-file isolation by the local server.

Every application-test browser context routes requests through a same-origin allowlist. Requests outside the local test server are aborted and fail the test. Service workers are blocked. No external resource requests or uncaught page errors occurred. This establishes operation without internet resources while the local server is running; it is not a test of a service-worker cache or installed PWA.

## Portable-save evidence

The portable unit test uses all 256 seeds in `tests/seeds.json` at four stages: empty; two collected records with notebook, conversation, hint and unproved accusation; all records with a wrong accusation; and a correct accusation. All 1,024 states round-trip to exact session equality, including generated facts and reconstructed hint output. It checks a contradictory notebook and literal Unicode/script-like notes. This is a correctness test, not a save-loading speed benchmark.

`tests/fixtures/save-v1.json` was exported by the original version-1 session implementation before the migration change. Unit and Chromium tests preserve its evidence, notebook, and accusation history. Browser tests edit it, check that storage now contains format 2, reload, and recover the edited note. Separate tests reject malformed hint histories and unsupported save/generator versions. The Chromium storage test denies both reads and writes, imports progress in memory, checks the announced persistence failure, and downloads the retained note.

## Browser environment and unfinished verification

The host has a 256-task ceiling and mounts `/dev/shm` read-only. Running overlapping browser probes initially exhausted that ceiling. Transfer tests now shut down the source before opening the destination. Library installation was unavailable as an ordinary user; required Ubuntu packages were downloaded and extracted under `/tmp/casebook-libs`. WebKit's bundled wrapper replaces `LD_LIBRARY_PATH`, so its `sys/lib` directories received links to those temporary libraries. No system directories were changed.

The final launch/page probe used these settings:

```sh
env XDG_CACHE_HOME=/tmp/casebook-cache \
  PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
  LD_LIBRARY_PATH=/tmp/casebook-libs/usr/lib/x86_64-linux-gnu \
  PLAYWRIGHT_BROWSERS_PATH=/tmp/casebook-browsers LP_NUM_THREADS=2 \
  node scripts/verify-browser-environment.mjs
```

The transfer attempt used the same environment plus `PLAYWRIGHT_JSON_OUTPUT_FILE=results/browser-transfer-blocked.json` to retain its negative result separately. The successful Chromium subset needed only `PLAYWRIGHT_BROWSERS_PATH=/tmp/casebook-browsers`.

The preflight bypass was required because Playwright checks the system `ldconfig` cache for some libraries, which does not reflect temporary libraries ([dependency-check implementation](https://github.com/microsoft/playwright/blob/v1.55.1/packages/playwright-core/src/server/registry/dependencies.ts)). It does not skip browser launches or page checks. Chromium opened a real page; Firefox's 15-second launch timed out with graphics/framebuffer diagnostics; WebKit reported version 26.0 but its page probe exceeded 15 seconds. The probe exits nonzero when any engine fails. Shared-memory restrictions are a suspected cause, not a proven diagnosis. Disabling browser child sandboxes in exploratory probes did not resolve the failures and is not part of the recommended setup.

For normal reproduction, provision a host supporting these browsers, run `npm ci` and `npx playwright install --with-deps chromium firefox webkit`, then `npm run check`. Complete the full three-engine suite there before declaring this milestone complete. Do not convert unavailable engines into skips.

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
- Successful application coverage is Chromium only; Firefox, WebKit, and cross-engine transfer remain blocked. Keyboard and mobile checks use a desktop browser at 390×844, not real mobile devices. Focus outlines and labeled controls are checked automatically; no screen-reader or operating-system file-dialog audit was performed.
- Storage quotas and browser privacy settings vary. Denied-read and denied-write browser tests verify that in-memory play and export work, but exported backups are the durable transfer mechanism.
- No performance claim is based on the recorded test durations, which include concurrent validation and shared-host overhead.

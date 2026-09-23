# Casebook: The Last Light

A complete, offline browser mystery set in the Bellwether Museum. A silver astrolabe has vanished. Explore four rooms, interview four suspects, collect eight authenticated records, keep a deduction notebook, and prove who took it.

Every case is generated from a text seed. The game uses authored narrative templates and a finite logic model, with no inference service, account, external assets, or runtime dependencies.

![Casebook title screen with an illustrated empty museum display](docs/title-screen.png)

## Play locally

Requires Node.js 22 or newer and a modern browser.

```sh
npm start
```

Open **http://127.0.0.1:4173**. No `npm install` is needed to play. Keep the local server running; internet access is unnecessary. To change the port, use `PORT=8080 npm start` on macOS/Linux. Open the printed address rather than opening `index.html` as a file.

1. Open the default seed, `the-last-light`, or enter your own.
2. Select each room and inspect its record. Read the briefing below the investigation panel.
3. Interview suspects. Ask about their evenings, then review records once their required room records are collected.
4. In the notebook, cycle cells through unknown, yes, and no. **Check my deductions** flags contradictory marks; a compatible mark is not necessarily proved.
5. Ask for a place to look, a justified deduction, or the conclusion. Help is optional and uses only collected evidence.
6. Present an accusation. An unsupported guess cannot win. A wrong accusation explains the evidence against it and leaves the investigation open.

There is no timer or guess penalty. The default seed has a [spoiler-marked walkthrough](docs/walkthrough.md).

## Saving and controls

Progress and notes save automatically to this browser’s local storage. Reload and choose **Resume investigation**. Use **Export save** for a portable JSON backup and **Import save** to resume it on another browser. Import validates the seed, progress, notebook, and accusation history before replacing the current case. Restart repeats the same seed with an empty notebook.

See [portable saves](docs/saves.md) for transfer, compatibility, and recovery instructions.

Only one local save is kept per origin (scheme, host, and port). Clearing browser data removes it; private browsing may not retain it. If storage is unavailable, the game remains playable and displays an export reminder. Starting a new case, importing over an existing one, and restarting ask for confirmation. Saves contain your seed and notes, so treat exported files accordingly.

All core actions use native buttons, inputs, selects, and disclosure controls: **Tab / Shift+Tab** to move, **Enter / Space** to activate, and arrow keys in the accusation selector. A skip link, visible focus indicators, text labels for notebook marks, and live announcements support keyboard use. Small screens can scroll notebook grids horizontally. Formal screen-reader and assistive-technology audits have not been performed.

## The rules

At 21:00, each suspect occupied exactly one of four rooms, with one person in each room. Each wore a different issued badge; badges were not exchanged. The display sensor establishes that the sole occupant of the Moon Gallery took the object. There is no accomplice, remote mechanism, or earlier substitution.

Collected records are always true and all refer to that interval. They describe a person’s room, a person’s badge, or a badge wearer’s room, positively or negatively. Personal accounts are atmosphere, clearly labelled as non-evidence. A record’s discovery location is not a clue about its subject.

Only the thief must be uniquely identified. Other room or badge assignments may remain ambiguous. The notebook records your hypotheses; it cannot change the evidence or influence hints. Final explanations cite an inclusion-minimal supporting set of collected records and show evidence excluding the other suspects.

## Reproduce validation

Development checks require the pinned Playwright dependency and its Chromium, Firefox, and WebKit binaries. Installation needs internet access once; browser tests themselves block all external requests.

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run check
```

On a Linux host missing browser system libraries, follow Playwright’s installation diagnostics. No system changes are needed for the game itself. If your environment requires writable caches, set `npm_config_cache` and `PLAYWRIGHT_BROWSERS_PATH` to writable directories for both installation and execution. The validation host uses `/tmp/casebook-browsers` for browser binaries. Missing browsers or shared libraries fail tests; they are never silently skipped.

`npm run check` runs the unit, case-audit, and full three-engine browser suites. The current validation host passed 12 unit tests, the 256-seed audit, and eight Chromium tests; Firefox/WebKit execution and cross-engine transfers remain blocked. See [actual results](docs/validation.md). No bundler or compilation step is required; the browser loads the JavaScript modules directly. The server serves an explicit allowlist of app assets, binds to loopback, and sets a policy forbidding external connections and inline scripts.

- `tests/seeds.json` fixes 256 seeds, including the playable default.
- `tests/oracle.mjs` independently enumerates 576 room/badge assignments, using inverse mappings and separate clause evaluation. It imports no runtime logic.
- `npm run verify:cases` checks all 256 evidence subsets per seed, exact regeneration, mutually consistent evidence, a unique full-evidence culprit, at least three clues needed, prose/semantics agreement, and answer-blind evidence reachability. It writes successes **and failures** to `results/case-verification.json` before failing a bad run.
- Save tests round-trip 256 fixed seeds at four stages (1,024 states), including notes, marks, hints, and closed cases. A checked-in version-1 fixture exercises migration. Unit tests compare all atomic predicates against the independent model, exercise malformed saves and contradictory notes, and check hints and accusations for every evidence subset of four cases. Poisoning undiscovered evidence must leave hints unchanged.
- Browser tests complete pointer and keyboard playthroughs; test interviews, hints, notes, wrong and correct accusations, persistence, restart, import/export, hostile imported text, narrow layouts, unavailable storage, corrupt saves, and server file isolation.

See [validation results and limits](docs/validation.md), [generation and save formats](docs/design.md), and [related work](docs/related-work.md). Test artifacts contain spoilers.

The [mobile screenshot](docs/mobile-screen.png) and title image can be reproduced with `node scripts/capture-screenshots.mjs` after installing the browser test dependencies.

## Scope and limits

This is a small authored logic mystery, not a simulation of arbitrary crimes. Six character profiles supply four suspects per case. The museum, theft premise, record locations, and interview structure stay fixed; seeds vary assignments, logical relationships, clue polarity, cast, badges, and evidence order. Seed hashing can collide; different strings are not guaranteed to produce different cases.

Generation is bounded to 48 attempts. If a seed fails, the UI reports that fact and asks for another seed. Accepted cases are checked by the runtime solver; the independent audit covers the fixed fixture set, not all possible strings. Clue count and uniqueness are not measures of human-rated difficulty, fairness of prose, or narrative quality. No user study has been conducted.

This is a local-server application, not an installable PWA. Browser validation targets Chromium, Firefox, and WebKit, including transfers between all six directed engine pairs. Save format 2 reads format 1 through a tested migration; generator version 1 remains unchanged. Unsupported future versions are rejected. Imported JSON is limited to 64 KiB and notes to 2,000 characters. The 30 most recent accusation attempts and hint requests are retained. The latest hint is restored against its original evidence snapshot. Saves are editable local data, not tamper-proof competitive records. No private data, paid compute, or personal integrations are needed.

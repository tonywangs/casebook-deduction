# Portable saves and recovery

Run `npm start`, open the printed local address, and keep that server running. No account, hosted service, or external connection is needed for play or transfer. Use the same host and port when returning to a local save.

## Transfer an investigation

1. In the original browser, open or resume your case. Choose **Export save**. Your browser downloads `casebook-save.json`; keep a copy before replacing a case.
2. Open this release in the destination browser or a fresh profile. Choose **Import save**, then select the downloaded JSON file.
3. If a case already exists, approve replacement in the browser dialog. Cancel leaves it intact. Invalid files are rejected before this dialog and leave progress unchanged.
4. Check the seed, evidence count, notebook, and save status. A completed file opens the accusation explanation. An unfinished file opens the museum. The latest requested hint is restored with the evidence count from when it was requested.
5. Reload and resume to check local persistence. If storage is unavailable, keep playing in memory and export another backup before leaving.

Export creates a download; it does not verify where the browser ultimately stores the file. Import reads only the selected file and never uploads it. Files contain your seed and private notes.

## Compatibility and limits

This release exports save format **2**, generator **1**, and imports formats **1** and **2** with generator **1**. Facts, hints, and accusation outcomes are reconstructed from the seed. An imported culprit, solution, HTML, or completed flag is never trusted. Version-1 local saves are discovered under the unchanged `casebook.save.v1` key. Migration preserves all recorded progress; old hint requests cannot be recovered because version 1 did not record them. The next edit or export writes version 2. The old application cannot read version 2; retain an old backup if you need that release.

Files are bounded to 65,536 UTF-8 bytes. Seeds have at most 80 UTF-16 code units, notes 2,000, evidence 8 unique records, conversations 4 unique suspect IDs, notebook marks 32, and accusation and hint histories 30 entries each. Older history entries are discarded when the bound is reached. Completion is recomputed from retained accusations. These are editable personal saves, not authenticated competitive records.

## Recovering from errors

- **Storage unavailable:** play continues in memory. Status and action announcements report failed persistence. Export now; import into a browser with working storage for a durable local copy. An older stored save may still exist, without your latest edits.
- **Local save could not be loaded:** import a known-good backup or start a new case. A corrupt stored value is not overwritten until a new case or import is accepted and can be saved.
- **Invalid JSON / malformed progress / invalid history:** export a fresh backup from the original browser. Renaming another file type to JSON will not work. Rejection leaves your current case and stored save unchanged.
- **Unsupported version:** use the compatible release that exported it. This release cannot reinterpret future generator versions.
- **File too large:** select a Casebook export smaller than 64 KiB. Normal exports fit, including maximum-length Unicode notes.

Only one case is stored per origin. Browser-data clearing, temporary profiles, private browsing, and storage policies can remove it. Export is the recovery mechanism. Keyboard controls use Tab/Shift+Tab, Enter/Space, and native file chooser and confirmation dialogs. Operating-system dialog accessibility and real assistive technologies still need manual validation.

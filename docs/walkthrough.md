# Default-case walkthrough

**Spoilers for generator version 1 and seed `the-last-light`.** Use another seed if you want to discover a different answer yourself.

Run `npm start`, open the local address, leave the seed as `the-last-light`, and choose **Open case**. Read the briefing: the person in the Moon Gallery at 21:00 is the thief, and each of the four people occupied a different room.

## Collect the records

In **Explore the museum**, visit all four room buttons and use their inspection actions:

| Record | Action | What it establishes |
| --- | --- | --- |
| E01 | Moon Gallery → Examine the display terminal | The Heron badge wearer was in the Workshop. |
| E02 | Archive → Read the security printout | Otto Finch was in the Winter Garden. |
| E03 | Workshop → Inspect the diagnostic console | The Fox badge wearer was not in the Archive. |
| E04 | Winter Garden → Check the emergency panel | Otto Finch was not wearing the Stag badge. |

Choose **Interview suspects**. Each suspect has a background question and a record-review question. The background response is labelled non-evidence. With the matching room record in hand, choose **“Can you review this room record?”**:

| Record | Interview | What it establishes |
| --- | --- | --- |
| E05 | Otto Finch, after E01 | Iris Bell wore the Heron badge. |
| E06 | Elias Reed, after E02 | Elias Reed was not in the Winter Garden. |
| E07 | Iris Bell, after E03 | June Mercer was not in the Archive. |
| E08 | June Mercer, after E04 | June Mercer was not wearing the Stag badge. |

All eight records now appear in **Evidence file**. You may review any of them without consuming it.

## Connect the evidence

Open **Deduction notebook**. Four records are enough for this case:

1. E02 places Otto in the Winter Garden.
2. E05 assigns the Heron badge to Iris. E01 places that badge wearer in the Workshop. Therefore Iris was in the Workshop.
3. Rooms have one occupant each. Elias and June must occupy the Archive and Moon Gallery.
4. E07 excludes June from the Archive. Therefore June was in the Moon Gallery and Elias was in the Archive.

Record these assignments using the room grid. One click means **yes**, a second means **no**, and a third returns to **unknown**. Add an explanatory note. **Check my deductions** should report compatibility.

To exercise conflict handling, first clear the marks, then mark both Otto and Elias **yes** for the Gallery. Checking reports a contradiction; your marks stay editable. Clear the marks again. A notebook mistake never corrupts evidence, changes hints, or blocks an accusation.

In **Need a nudge?**, **Explain the conclusion** gives the supported answer with clickable references to E01, E02, E05, and E07. You can also play without using help.

## Present the accusation

Choose **Make an accusation**. Accuse **Otto Finch** to see a wrong-accusation explanation based on E02. The case stays open. Then accuse **June Mercer**: the game closes the case, cites the supporting records, and offers separate evidence-based exclusions of the other suspects.

If you try accusing June before collecting enough evidence, the game reports an unproved theory rather than revealing that the guess happens to match the eventual solution.

## Resume or replay

Export a save, reload, and choose **Review closed case**. The solution and notes persist. **Restart this seed** clears progress and recreates exactly the same evidence. Importing the exported save restores the completed case after confirmation.

The browser suite performs this kind of complete playthrough with external network requests blocked. A separate test completes the core flow using Tab/Enter and selector arrow keys only.

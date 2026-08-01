# East Tennessee 1861 — Private Playtest Run Sheet

Use this sheet with one GM and four players. Discord voice carries declarations, consent, negotiation, and revealed information; Verso records mechanical state and GM rulings.

## Before players join

1. Open Verso and choose **East Tennessee 1861**. Confirm the title bar/session picker does not say Palimpsest.
2. Save once. Keep the exported file as the rollback point.
3. Host the table and share the join code. Four players join in separate browsers.
4. Each player claims one of the five character cards. Leave one in reserve.
5. Ask each player to expand their card. Confirm that only its owner sees private history, risk, complication, relationships, and private notes.
6. Confirm the GM can see all character and NPC information. A nonowner should see only public character content.

## Opening investigation and briefing

1. Use Gideon Caldwell, editor of the **Pigeon Valley Sentinel**, as the campaign contact. Clara Webb is the Sentinel’s printer and correspondent.
2. Reveal **Abbreviated Administrative Telegram** to only the characters who receive it. It should begin:

   ```text
   14 BB 7

   MSR EBD KXV
   GRNVL TMRW
   ACK RCT
   ```

3. Reveal **Monroe Pike’s Annotated Interpretation** when appropriate. Treat the telegram as abbreviated administrative traffic, not a cipher puzzle.
4. Use character private notes for copied intelligence. Opening a document must not create a summary automatically.

## Path A — quiet success

1. Initialize **Finch’s Nest** once. A second initialization attempt must be rejected without adding NPCs.
2. Check all three map buttons: Exterior & Stable, Ground Floor, and Upper Floor. Confirm the active floor, phase, Will’s location, and case location remain visible in Scene Control.
3. Advance through arrival, conversation, retirement, and deep night in unstructured time. Do not start rounds merely for stealth.
4. During the night, record the case as held by a player and describe its seal state. Mark official packets and/or personal letters independently as inspected.
5. Reveal only the individual documents actually inspected. Opening **Dispatch Case** must not reveal all contents.
6. Return the case and record Will as unaware. Record `cleanInspectionAndReturn` and confirm the **baseline** Lick Creek variant.
7. Initialize **Lick Creek** with Abner Raines’s chosen weapon. Confirm exactly six guards and a routine posture.
8. Reveal guard count, posture, and other reconnaissance facts to the party or selected recipients as appropriate.
9. Remain in unstructured time through ordinary reconnaissance and waiting. Start structured rounds only when opposing action or an action-relative countdown begins.
10. Start a competent stage-one fire. End rounds to advance it. When it resolves, confirm the bridge is disabled and stage two begins automatically.
11. Record the mission outcome and escape. Save, disconnect clients, reconnect, and reload the exported session.
12. Confirm owners, health, injuries, conditions, ammunition, cylinders, equipment locations, handout discoveries, Finch’s Nest outcome, baseline variant, bridge state, timers, and mission outcome.

## Path B1 — compromised

1. Initialize Finch’s Nest in a fresh session. Record the case as stolen or Will as alerted, plus descriptive witness and evidence notes.
2. Record `caseStolen` or another appropriate compromised courier outcome. Confirm the **alarmed** Lick Creek variant.
3. Initialize Lick Creek and confirm exactly eight guards and visibly alert behavior.
4. If a messenger escapes, check and save the GM confirmation once. Start **Help Warned** manually. A duplicate confirmation or duplicate active timer must be rejected without changing state.
5. Resolve Help Warned and confirm a separate Reinforcements timer is created at its full starting value. Resolve it and confirm the arrival flag.
6. Save and reload. Confirm Finch’s Nest evidence, Lick Creek evidence, messenger status, both timer histories, alarmed variant, NPC health/ammunition, and mission outcome.

## Path B2 — legitimate withdrawal

1. In a fresh alarmed Lick Creek session, reveal the actual eight-person count and visible alert posture.
2. Do not begin combat, fire, messenger, or alarm timers.
3. Record `partyWithdrawn` with a note that the party withdrew unseen after reconnaissance.
4. Confirm Lick Creek remains intact, no evidence or alarm is inferred, operational secrecy remains preserved, and the withdrawal ending acknowledges prudent judgment and the incomplete mission.

## Privacy spot check

For at least two connected players, inspect the actual synchronized state or network payload—not just the visible panel.

- Owner-only character history and private notes appear only for their owner and GM.
- GM NPC summaries, unrevealed identities, Finch’s Nest case state and NPC locations, Lick Creek overlays/patrol routes/evidence, and hidden timer values are absent.
- A selected handout reaches exactly its selected recipient; a party handout reaches both players; an unrevealed handout and transcript are absent.
- Transfer a PC to a different durable owner and reconnect both clients. Future owner-only state must follow the new owner.
- Delegate one NPC mechanically. The delegate receives mechanics but no GM narrative fields.

## Reset audit

Before each local reset, export a save. Read the confirmation aloud. Finch’s Nest reset should clear only local phase, placements, case, and reveals. Lick Creek reset should clear local positions, bridge/fire/timers/reveals/phase. Neither reset may erase character health, injuries, conditions, ammunition, cylinders, equipment, ownership, handouts, committed outcomes/evidence, or private notes.

## Browser and accessibility check

- Test a normal desktop width and a narrower realistic desktop window.
- Check the console before and after each map and handout opens.
- Verify map assets load with no 404s and use most of the central stage.
- Open every handout. Check transcript accuracy, zoom in/out/reset, drag-to-pan, Escape/Close behavior, focus return, and visible keyboard focus.
- Confirm timer rows use text—not color alone—to say Public, Players See Label, or GM Only.
- Confirm reset prompts identify what is cleared and what is preserved.

## Known deferred limits

Range bands, numeric movement, automated line of sight, cover/detection automation, suppression, additional firearm traits, additional scenes, and aftermath are intentionally outside this playtest build. Map measurement and overlays remain advisory GM tools.

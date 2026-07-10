(function(root){
"use strict";
const VERSO_ROOMS = [
 {id:"lift", name:"Freight Landing", sub:"scene of the crime",
  rect:{x:6,y:0,w:3,h:3}, floorA:"#3E424A", floorB:"#363A42", wall:"#5A5E66",
  read:"The freight doors hang wrenched off their track, one panel folded like a playing card. The lectern still stands beside them, its book open to pages that are now simply blank. The muzak plays on, unbothered. Somewhere down the corridor: footsteps on carpet. One set. Taking their time.",
  dm:"<b>ACT 1 RUNS HERE.</b> The Concierge arrives alone, notes the damage in a small pad, and delivers the bill speech: the account is matured; the lift goes DOWN or OUT freely, UP only after settlement; three ways to settle — <b>pay, win, or work</b> — at the Cage. He cannot lie about terms; anything else is 'above my floor, sir.' Key rule, stated in his voice when tested: <b>'Your magic can slam any door in this house. It can't unwrite a line. Effects, not records.'</b> One minute after he leaves, the patrols start (see Service Corridor).",
  clues:["The car panel now reads only: DOWN · OUT. The UP line is dark, labeled SETTLEMENT REQUIRED.",
         "The register is blank — their dispel erased it. The floor now reads the party as intruders, not guests.",
         "The TRANSIT tray fits the silver disc. Below it, much older: a slot shaped for a folded paper. A writ."]},
 {id:"white", name:"The White Room", sub:"where the elevator let him out",
  rect:{x:2,y:2,w:4,h:4}, floorA:"#D8D2C2", floorB:"#CCC5B2", wall:"#9C947E",
  read:"A room the color of nothing. No seams, no fixtures, no door — not on this side. Somewhere far off, a slot machine pays out; it sounds like applause.",
  dm:"<b>The door exists only when the house wants one.</b> It appears in whichever wall the Concierge is about to enter through. Trajan answers questions one beat too late, like a call on a bad line. If pressed (DC 13 Insight), his eyes flick toward the cloakroom wall before anyone knows the cloakroom exists.",
  clues:["Trajan's bootprints come IN through a solid wall. There are no prints of Randy's arrival at all.",
         "Trajan hums the muzak from the corridor — a song he hasn't heard yet.",
         "Scratched at floor level, very old, in Randy's handwriting: a tally of days. It stops at 9."]},
 {id:"cloak", name:"Cloakroom", sub:"unattended · ring bell for service",
  rect:{x:2,y:6,w:3,h:3}, floorA:"#33272A", floorB:"#2B2125", wall:"#5A4A40",
  read:"Rails of coats recede further than the room should allow. Every coat is dry. A brass bell sits on the counter beside a single claim ticket, face down.",
  dm:"<b>One coat is Randy's.</b> He never owned it — but it fits perfectly and smells like a campfire he can't place. The face-down ticket is stub #0001, decades old, in Randy's handwriting — <b>and it is a valid claim ticket at Lost &amp; Found.</b> Ringing the bell summons the Concierge in 1d4 rounds, polite and unhurried.",
  clues:["The claim ticket's date is older than Randy believes himself to be.",
         "In one coat pocket: a casino chip stamped MEISNER. The denomination is a word, smudged beyond reading.",
         "The coat-check log's line for Trajan reads only: TRAJAN — see ACQUISITIONS."]},
 {id:"corrH", name:"Service Corridor", sub:"staff only · mind the carpet",
  rect:{x:6,y:3,w:18,h:2}, floorA:"#5A2723", floorB:"#4D211E", wall:"#3A2E22", corridor:true,
  read:"Oxblood carpet, brass mirror-plates, muzak that is almost a song everyone at the table knows. The pattern in the carpet repeats — then repeats wrong, like a word said too many times.",
  dm:"<b>THE PATROL ENGINE.</b> 3 patrols of 2 Empty Suits (Animated Armor: AC 18, HP 33, +4, two slams 1d6+2; Press: a hit may grapple instead, escape DC 13). They ESCORT, not execute — violence only if the party swings first or breaks a grapple 3 times. One suit per patrol carries a whistle: nearest patrol arrives in 3 rounds. Circuits — A: this corridor loop; B: Lower Corridor; C: Lost &amp; Found / Cloakroom. <b>The pulse:</b> advance all patrols one leg whenever the party finishes a room activity or fails a check loudly. Moving between rooms: group Stealth vs passive 13. <b>The Cage is sanctuary</b> — suits stop at its threshold. Dispel or shatter staggers a suit 1 round (effects, not records — reward the verb). <b>Klaus's light:</b> makes under-writing legible in its radius (grant a clue of your choice); tally each use — at 5 total, the muzak stops for six seconds. Count them aloud. Say nothing else.",
  clues:["The under-writing shows in the mirror-plates, never on the walls (Investigation DC 12).",
         "The muzak resolves, for four bars, into a lullaby Randy's player gets to invent on the spot.",
         "Staff pass without footsteps. Their shadows arrive a half-second late."]},
 {id:"corrV", name:"Lower Corridor", sub:"the carpet is older here",
  rect:{x:14,y:5,w:2,h:12}, floorA:"#4D211E", floorB:"#411C1A", wall:"#3A2E22", corridor:true, bleed:[[14,13],[15,14],[14,15],[15,16],[14,16]],
  read:"The corridor slopes, though no stair was taken. The carpet thins. In patches it has worn through entirely — and beneath it is not floorboard but cold, dressed stone, much older than the building above.",
  dm:"<b>This is where the casino's skin fails.</b> The stone is the scriptio inferior — the original text the house was written over. The bare patches are warm, faintly, like skin. Patrol B walks this stretch. Sound carries strangely: whispers from the Cage arrive before they are spoken.",
  clues:["The wallpaper peels at the seam. Under it: the same stone, carved with writing that rearranges when watched.",
         "A service cart sits abandoned mid-corridor, drinks still cold. The order slip reads: R. MEISNER — THE USUAL.",
         "The bleed-through patches are larger than they were an hour ago."]},
 {id:"lost", name:"Lost & Found", sub:"unclaimed effects · claims honored",
  rect:{x:7,y:5,w:6,h:5}, floorA:"#21392B", floorB:"#1B3024", wall:"#2E4A38",
  read:"Bins and pigeonholes of objects nobody came back for: reading glasses, a wedding ring, a child's shoe, a violin with one string. Every object is labeled in the same tidy hand — not with names, but with prices. 'A brother's face.' 'The way home.' 'Three good years.'",
  dm:"<b>THE CLAIM SYSTEM.</b> Numbered bins; tickets match bins; stub #0001 (Cloakroom) is valid. Retrieval WITH a ticket: free, no consequence. WITHOUT: the item crossing the threshold marks the thief (no save — a faint smell of ink that won't wash off) and Patrol C diverts here in 3 rounds → <b>4 Empty Suits</b> (patrol + whistle). They accept surrender of the item plus a late fee (one Trifle memory) at any point — but this table may just want the fight. Winning it adds a DAMAGES line the party can go watch appear in Accounts. <b>The MEISNER bin is empty</b> — transfer slip inside (see clues). <b>The Cure ticket</b> (David's hook): the Concierge quotes terms for release to a non-claimant — 'a memory of the person you would spend it on' — or it can be folded into the Cage bundle instead.",
  clues:["Transfer slip in the empty bin: 'Contents relocated to VAULT per Article of Protection, upon maturity. Claimant must present in person. Level 2.'",
         "In a bin of unclaimed claims: a ticket for ONE (1) CURE — remedy, complete. Claimant name smudged.",
         "The grandfather clock against the east wall is stopped at 3:17. So is every other timepiece down here."]},
 {id:"acct", name:"Accounts", sub:"ledgers · liens · maturities",
  rect:{x:17,y:5,w:6,h:5}, floorA:"#C9BD9C", floorB:"#BFB28F", wall:"#8F8468",
  read:"Vellum everywhere. Sloped desks, entries writing themselves in unhurried brown ink. Floor-to-ceiling shelves of bound account books, thousands of them. As you watch, one book quietly slides itself two slots lower on its shelf — like something just got heavier.",
  dm:"<b>THE FILING PUZZLE:</b> shelved by weight of outstanding debt — heavier debts sink lower. Investigation DC 12, or free if a player notices the books move when gamblers upstairs lose. Finds: <b>Randy's ledger</b> (bottom shelf): deposit gouged out, gold leaf hammered into the cuts; 'Article of Protection — sealed against extraction, inspection, and divination. Depositor's mark: [Randy's own signature]. Maturity: when it begins again. MATURED: two nights ago.' Margin note: 'physical exhibits transferred to VAULT (Level 2) upon maturity.' <b>Sarlossi's ledger</b> (locked cabinet marked CLOSED — thieves' tools DC 14 or knock; alarm rune, Arcana DC 13, dispellable — let the dispel work): 'SETTLED — BY SERVICE. Service: ongoing. Collateral held: one (1) memory — the terms of service.' <b>Clown Fart's marker</b> (mid-shelf): assigned to the house by D. Sarlossi in partial settlement of service; clipped work order in different handwriting — a date, a vehicle, and the word 'brakes.' Trajan recognizes his own hand. <b>ACQUISITIONS lectern:</b> seller column repeating E. PINTO (older entries: P. EDSEL, same hand); line item 'TRAJAN — guilt, complete, one (1) night — purchased'; disbursements column reads, mostly: DOWN. <b>The scorched account</b> (bottom drawer, cold to the touch, chained — the chain breaks fine): name burned out, balance overruns three pages, 'Deposits: continuous. DO NOT SERVICE AT THE CAGE. REFER DOWN.'",
  clues:["Their OWN page, near a shelf top: 'PARTY OF MEISNER — damages, freight doors; register, erased.' As they read it, a new line writes itself: '— currently reading their own account.'",
         "The ink writing the ledgers matches the labels in Lost & Found: Randy's hand.",
         "Every find here is a leverage card at the Cage. Hand them over as physical index cards if you can."]},
 {id:"cage", name:"The Cage", sub:"settlements · sanctuary",
  rect:{x:8,y:11,w:6,h:5}, floorA:"#3A3326", floorB:"#322C20", wall:"#6B5A33", bleed:[[8,15],[9,15],[8,14]],
  read:"The Cage glows like the inside of a pocket watch — florentine brass polished by centuries of hands. Behind the bars the Concierge waits, hat on, hands folded, patient as a closed bank. Chip stacks in four colors. A balance scale. An open book of terms. 'You've been reading. Good. The house prefers an informed guest. Shall we begin?'",
  dm:"<b>THE NEGOTIATION.</b> The bundle is severable; TRANSIT is chained to the Principal only. <b>Currency tiers:</b> Trifle (pure flavor — a taste, a face, an afternoon) · Keepsake (one skill, tool, or language proficiency, permanent) · Cornerstone (a feat, an ability point, or a defining memory the player names). The balance scale weighs offers honestly. <b>DOOR 1 — PAY:</b> list price. The Principal returns as a vellum envelope, warm like skin — it opens when Randy sleeps (next session's cold open; do NOT improvise its contents tonight). <b>DOOR 2 — WIN (Vingt):</b> player dealt 2d10 open; house deals 2d10, ONE DIE FACE DOWN; hit with single d10s toward 21, over busts; house hits below 17, stands at 17+ (state this openly); tie = push, redeal; best of 3 hands, stakes named before each (player stakes a memory, house pro-rates the item). Cheating: Sleight of Hand DC 17 nudges one die one pip — on success the Concierge notices and ALLOWS it, saying nothing; on failure the hand is void and the stake forfeit. The house may cheat too, via the hole card, when it needs to (Insight DC 15 to catch; it considers once per game fair). <b>DOOR 3 — WORK:</b> retrieve one DOCUMENT from the Level 2 vault that Sarlossi does not know he keeps; deliver it here unopened, before the house opens tomorrow. Settles the Principal in full, restores transit INSTANTLY, zero sheet cost — the obvious free option, which is exactly the trap. It is NOT the Writs; it is a second folded paper filed beside them. Reveal that only when they are standing in the vault. <b>LEVERAGE CARDS:</b> Sarlossi's page = any one item drops a full price tier (single use — here, or against Sarlossi on Level 2; tell them it's their call); Randy's ledger = truthful Q&A on the deposit's terms, incl. 'when it begins again' → 'The activity you were investigating, sir. It resumed two nights ago.'; CF's marker settles at Keepsake and BURNS in his hand — void against Sarlossi forever; if CF hesitates, Trajan quietly offers to pay it himself; the ACQUISITIONS record is what puts Trajan's night on the menu at all; the scorched account earns exactly one line — 'That account predates the house, sir' — then 'Referred down,' forever. <b>Exit line, offered unprompted:</b> 'When you reach the vault — count the papers before you touch them.'",
  clues:["Suits stop dead at the Cage threshold, straighten their lapels, and wait outside. Demonstrate sanctuary early.",
         "The Cage bars are the one thing no spell staggers: not locked, UNDERWRITTEN. Records, not effects.",
         "If attacked, he collects his hat — 'I'll give you a moment' — leaves through a wall, returns later, adds damages to the bill. Unbotherable is the bit."]},
 {id:"stair", name:"The Stair Down", sub:"scriptio inferior",
  rect:{x:16,y:11,w:6,h:6}, floorA:"#4A4A4E", floorB:"#3F3F44", wall:"#2C2C30", bleedAll:true,
  read:"The carpet simply ends, mid-step, like a sentence abandoned. Below: a stair of cold dressed stone, far older than the casino, descending out of the light. The air rising from it smells of vellum and rain. The under-writing covers every surface here, no longer hiding.",
  dm:"<b>THE CODA — no mechanics, no invoice line.</b> Route them past this after settlement, on the way to the lift. Tonight's one new detail: the sound of turning pages from below is FASTER than it was. If Klaus casts light down the stair, the light comes back up a different color — describe the color and stop talking. Let someone ask what it is. Answer nothing. End the session with the lift doors closing on the party looking back at it.",
  clues:["The newest carving at the threshold is fresh: the radio voice's words, verbatim, in Randy's hand.",
         "Thirteen steps by count. Far more by sight — the descent visibly exceeds the building's depth.",
         "This is where 'REFER DOWN' refers to."]}
];

/* doors/openings: segments in tile-corner space */
const VERSO_DOORS = [
 {x:7, y:3, dir:"h", type:"door"},   // freight landing -> corrH
 {x:6, y:3, dir:"v", type:"door"},   // white -> corrH
 {x:3, y:6, dir:"h", type:"door"},   // white -> cloak
 {x:9, y:5, dir:"h", type:"door"},   // corrH -> lost
 {x:19,y:5, dir:"h", type:"door"},   // corrH -> accounts
 {x:14,y:5, dir:"h", type:"open", len:2}, // corrH -> corrV
 {x:14,y:12,dir:"v", type:"door"},   // corrV -> cage
 {x:16,y:12,dir:"v", type:"door"}    // corrV -> stair
];

const PARTY = [
 {name:"Randy Meisner", letter:"R", color:"#8A6FB8", pc:true},
 {name:"Trajan",        letter:"T", color:"#4E8F86", pc:true},
 {name:"Klaus Soundgarden", letter:"K", color:"#E0B341", pc:true},
 {name:"Clown Fart",    letter:"CF",color:"#D96A9C", pc:true},
 {name:"David Byrne",   letter:"D", color:"#B5443C", pc:true},
 {name:"The Concierge", letter:"♠", color:"#C8A14E"},
 {name:"Empty Suit",     letter:"\u25FB", color:"#9AA08F"}
];
const SWATCH = ["#8A6FB8","#4E8F86","#E0B341","#D96A9C","#B5443C","#C8A14E","#7FA8B8","#9AA08F","#5E7FB8","#8A2E25"];
const TEMPLATES=[
 {name:"Stone Hall",      floorA:"#4A4A4E",floorB:"#3F3F44",wall:"#2C2C30"},
 {name:"Wood Parlor",     floorA:"#5C4630",floorB:"#4F3C29",wall:"#6B5A33"},
 {name:"Marble Gallery",  floorA:"#C9BD9C",floorB:"#BFB28F",wall:"#8F8468"},
 {name:"Oxblood Corridor",floorA:"#5A2723",floorB:"#4D211E",wall:"#3A2E22",corridor:true},
 {name:"Green Baize",     floorA:"#21392B",floorB:"#1B3024",wall:"#2E4A38"},
 {name:"White Void",      floorA:"#D8D2C2",floorB:"#CCC5B2",wall:"#9C947E"},
 {name:"Dark Cloak",      floorA:"#33272A",floorB:"#2B2125",wall:"#5A4A40"},
 {name:"Steel Platform",  floorA:"#3E424A",floorB:"#363A42",wall:"#5A5E66"}
];
const PROP_LIB={
 table: {n:"Table",  draw(i,j){box(i+.12,j+.25,i+.88,j+.75,13,"#5C4630");}},
 chair: {n:"Chair",  draw(i,j){box(i+.32,j+.32,i+.68,j+.68,8,"#4F3C29");box(i+.32,j+.6,i+.68,j+.68,16,"#453425");}},
 crate: {n:"Crate",  draw(i,j){box(i+.2,j+.2,i+.8,j+.8,12,"#6B5A33");}},
 barrel:{n:"Barrel", draw(i,j){cyl(i+.5,j+.5,7,14,"#5A4A28");}},
 chest: {n:"Chest",  draw(i,j){box(i+.22,j+.3,i+.78,j+.7,10,"#7A5E2E");
   const A=P(i+.22,j+.5),B=P(i+.78,j+.5);
   ctx.strokeStyle="#C8A14E";ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(A[0],A[1]-10);ctx.lineTo(B[0],B[1]-10);ctx.stroke();}},
 shelf: {n:"Shelf",  draw(i,j){box(i+.1,j+.35,i+.9,j+.65,26,"#4F3C29");
   ctx.strokeStyle="rgba(7,9,8,.5)";ctx.lineWidth=.8;
   for(let k=1;k<3;k++){const A=P(i+.1,j+.35),B=P(i+.9,j+.35);
     ctx.beginPath();ctx.moveTo(A[0],A[1]-k*8);ctx.lineTo(B[0],B[1]-k*8);ctx.stroke();}}},
 bed:   {n:"Bed",    draw(i,j){box(i+.08,j+.2,i+.95,j+.8,7,"#8F8468");box(i+.08,j+.2,i+.3,j+.8,11,"#C9BD9C");}},
 rug:   {n:"Rug",    draw(i,j){flat(i+.08,j+.08,i+.92,j+.92,"#7E1F2B","rgba(7,9,8,.4)");}},
 pillar:{n:"Pillar", draw(i,j){cyl(i+.5,j+.5,5,34,"#8F8468");}},
 lamp:  {n:"Lamp",   draw(i,j){pole(i+.5,j+.5,30,2.4,"#8A6E36");lightPool(i+.5,j+.5,40,"rgba(232,196,120,.14)");
   const [x,y]=P(i+.5,j+.5);
   ctx.fillStyle="rgba(240,200,120,.95)";ctx.beginPath();ctx.arc(x,y-31,2.2,0,7);ctx.fill();}},
 altar: {n:"Altar",  draw(i,j){box(i+.2,j+.3,i+.8,j+.7,15,"#C9BD9C");lightPool(i+.5,j+.5,30,"rgba(127,168,184,.12)");}},
 stack: {n:"Chips",  draw(i,j){chipStack(i+.4,j+.5,"#8A2E25",5);chipStack(i+.62,j+.45,"#2E4A38",4);}}
};
root.VTTContent=Object.freeze({
  VERSO_LEVEL:{schemaVersion:1,name:"The Verso · Back of House",bg:"#0A0F0C",rooms:VERSO_ROOMS,doors:VERSO_DOORS,roster:PARTY,props:[]},
  VERSO_START:{revealed:{white:true},tokens:[
    {name:"Randy Meisner",letter:"R",color:"#8A6FB8",x:3.5,y:3.5,size:1,pc:true},
    {name:"Trajan",letter:"T",color:"#4E8F86",x:4.5,y:4.5,size:1,pc:true},
    {name:"The Concierge",letter:"♠",color:"#C8A14E",x:10.5,y:14.5,size:1},
  ]},
  DEFAULT_ROSTER:PARTY,
  SWATCHES:SWATCH,
  ROOM_TEMPLATES:TEMPLATES,
  PROP_LIBRARY:PROP_LIB,
});
})(typeof globalThis!=="undefined"?globalThis:this);

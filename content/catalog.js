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
 {name:"Masonry · Dressed Stone", floorA:"#4A4A4E",floorB:"#3F3F44",wall:"#2C2C30"},
 {name:"Interior · Dark Wood",    floorA:"#5C4630",floorB:"#4F3C29",wall:"#6B5A33"},
 {name:"Civic · Pale Marble",     floorA:"#C9BD9C",floorB:"#BFB28F",wall:"#8F8468"},
 {name:"Casino · Oxblood",        floorA:"#5A2723",floorB:"#4D211E",wall:"#3A2E22",corridor:true},
 {name:"Club · Green Baize",      floorA:"#21392B",floorB:"#1B3024",wall:"#2E4A38"},
 {name:"Uncanny · White Void",    floorA:"#D8D2C2",floorB:"#CCC5B2",wall:"#9C947E"},
 {name:"Interior · Dark Fabric",  floorA:"#33272A",floorB:"#2B2125",wall:"#5A4A40"},
 {name:"Industrial · Steel",      floorA:"#3E424A",floorB:"#363A42",wall:"#5A5E66"},
 {name:"Dungeon · Mossy Flagstone",floorA:"#39443A",floorB:"#303A32",wall:"#596052"},
 {name:"Temple · Sandstone",      floorA:"#9A805B",floorB:"#89704E",wall:"#6F5B42"},
 {name:"Arcane · Cold Slate",     floorA:"#394655",floorB:"#303A48",wall:"#657488"},
 {name:"Ruin · Charred Brick",    floorA:"#4C403B",floorB:"#403531",wall:"#6B5149"}
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
 sofa:  {n:"Velvet settee",draw(i,j,p){const fp=p&&p.footprint||{w:2,h:1},w=fp.w,h=fp.h;box(i+.08,j+.18,i+w-.08,j+h-.1,10,"#642638");box(i+.08,j+.12,i+w-.08,j+.32,25,"#4A1D2A");}},
 bar:   {n:"Private bar",draw(i,j,p){const fp=p&&p.footprint||{w:2,h:.7},w=fp.w,h=fp.h;box(i+.04,j+.08,i+w-.04,j+h-.04,24,"#4A2F22");for(let x=i+.3;x<i+w-.1;x+=.42)cyl(x,j+.2,1.5,9,(Math.round(x*10)%2)?"#4E6C55":"#7A5938");}},
 piano: {n:"Grand piano",draw(i,j,p){const fp=p&&p.footprint||{w:2,h:1.2},w=fp.w,h=fp.h;box(i+.08,j+.12,i+w-.08,j+h-.08,16,"#211A18");const A=P(i+.2,j+.18),B=P(i+w-.2,j+.18);ctx.strokeStyle="#E9E2CE";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(A[0],A[1]-18);ctx.lineTo(B[0],B[1]-18);ctx.stroke();}},
 portrait:{n:"Gilt portrait",draw(i,j){wallPlate(i+.1,i+.9,j+.12,34,"#8A6E36","rgba(116,54,42,.5)");}},
 rubble:{n:"Rubble",draw(i,j,p){const fp=p&&p.footprint||{w:1,h:1};for(let x=.15;x<fp.w;x+=.38)for(let y=.18;y<fp.h;y+=.42){const h=hash2(Math.round((i+x)*17),Math.round((j+y)*19));box(i+x,j+y,i+x+.22+h*.14,j+y+.18+h*.12,3+h*7,"#746B5C");}}},
 pillar:{n:"Pillar", draw(i,j){cyl(i+.5,j+.5,5,34,"#8F8468");}},
 lamp:  {n:"Lamp",   draw(i,j){pole(i+.5,j+.5,30,2.4,"#8A6E36");lightPool(i+.5,j+.5,40,"rgba(232,196,120,.14)");
   const [x,y]=P(i+.5,j+.5);
   ctx.fillStyle="rgba(240,200,120,.95)";ctx.beginPath();ctx.arc(x,y-31,2.2,0,7);ctx.fill();}},
 altar: {n:"Altar",  draw(i,j){box(i+.2,j+.3,i+.8,j+.7,15,"#C9BD9C");lightPool(i+.5,j+.5,30,"rgba(127,168,184,.12)");}},
 stack: {n:"Chips",  draw(i,j){chipStack(i+.4,j+.5,"#8A2E25",5);chipStack(i+.62,j+.45,"#2E4A38",4);}},
 lectern:{n:"Lectern",draw(i,j){box(i+.12,j+.28,i+.88,j+.72,20,"#5A4836");
   const [x,y]=P(i+.5,j+.5);quad([x-10,y-23],[x+10,y-27],[x+12,y-19],[x-8,y-15],"#E9E2CE","rgba(7,9,8,.4)");}},
 musicstand:{n:"Music stand",draw(i,j){pole(i+.5,j+.5,24,1.8,"#292724");const [x,y]=P(i+.5,j+.5);
   quad([x-9,y-31],[x+9,y-34],[x+10,y-19],[x-8,y-17],"#292724","rgba(200,161,78,.55)");
   quad([x-7,y-30],[x+7,y-32],[x+7.5,y-21],[x-6.5,y-19],"#E9E2CE","rgba(7,9,8,.35)");
   ctx.strokeStyle="rgba(42,35,28,.62)";ctx.lineWidth=.65;for(let k=0;k<4;k++){ctx.beginPath();ctx.moveTo(x-5.5,y-28+k*2);ctx.lineTo(x+5.8,y-29.5+k*2);ctx.stroke();}}},
 wallsconce:{n:"Torch sconce",draw(i,j){sconce(i+.34,j+.15,true);}},
 cabinet:{n:"Filing cabinet",draw(i,j){box(i+.18,j+.12,i+.82,j+.88,28,"#4A4036");
   const [x,y]=P(i+.5,j+.5);ctx.strokeStyle="rgba(7,9,8,.55)";ctx.lineWidth=.8;
   for(let k=0;k<4;k++){ctx.strokeRect(x-7,y-25+k*6,14,5);ctx.fillStyle="#C8A14E";ctx.fillRect(x-1,y-23+k*6,2,1);}}},
 clock:{n:"Grandfather clock",draw(i,j){box(i+.28,j+.3,i+.72,j+.7,42,"#3A2A1E");const [x,y]=P(i+.5,j+.5);
   ctx.beginPath();ctx.arc(x,y-34,5.5,0,7);ctx.fillStyle="#D8CFB6";ctx.fill();ctx.strokeStyle="rgba(7,9,8,.6)";ctx.stroke();
   ctx.beginPath();ctx.moveTo(x,y-34);ctx.lineTo(x+3,y-36);ctx.moveTo(x,y-34);ctx.lineTo(x+1,y-30);ctx.stroke();}},
 cart:{n:"Service cart",draw(i,j){box(i+.08,j+.2,i+.92,j+.78,16,"#6E6E72");const [x,y]=P(i+.5,j+.5);
   ctx.strokeStyle="#3A3E45";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-14,y-14);ctx.lineTo(x-14,y-31);ctx.lineTo(x-7,y-31);ctx.stroke();
   ctx.fillStyle="#CFE3EA";ctx.beginPath();ctx.arc(x-4,y-19,2.4,0,7);ctx.arc(x+5,y-21,2.4,0,7);ctx.fill();}},
 stage:{n:"Stage",draw(i,j,p){
   const fp=p&&p.footprint||{w:5,h:2.5},w=fp.w,h=fp.h;
   box(i+.06,j+.08,i+w-.06,j+h-.06,10,"#60442E");
   ctx.strokeStyle="rgba(26,17,12,.45)";ctx.lineWidth=.7;
   for(let x=i+.45;x<i+w;x+=.45){const A=P(x,j+.08),B=P(x,j+h-.06);ctx.beginPath();ctx.moveTo(A[0],A[1]-10);ctx.lineTo(B[0],B[1]-10);ctx.stroke();}
   wallPlate(i+.12,i+w-.12,j+.1,42,"#5A1F2A","rgba(200,161,78,.28)");
   for(let x=i+.4;x<i+w-.1;x+=.55){const A=P(x,j+.1);ctx.strokeStyle="rgba(25,10,14,.45)";ctx.beginPath();ctx.moveTo(A[0],A[1]-40);ctx.lineTo(A[0]-2,A[1]-4);ctx.stroke();}
   const topL=P(i+.12,j+.1),topR=P(i+w-.12,j+.1);ctx.strokeStyle="#8A6E36";ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(topL[0],topL[1]-41);ctx.lineTo(topR[0],topR[1]-41);ctx.stroke();
   for(let x=i+.45;x<i+w-.15;x+=.65){const [lx,ly]=P(x,j+h-.08);ctx.fillStyle="rgba(240,200,120,.95)";ctx.beginPath();ctx.arc(lx,ly-12,2.2,0,7);ctx.fill();lightPool(x,j+h-.05,18,"rgba(232,196,120,.09)");}
   const marks=[[.7,.75],[1.65,.7],[2.6,.78],[3.55,.7],[4.5,.77],[1.1,1.55],[2.1,1.48],[3.1,1.58],[4.05,1.5]];
   ctx.strokeStyle="rgba(233,226,206,.56)";ctx.lineWidth=1;
   for(const [mx,my]of marks){if(mx>w-.2||my>h-.15)continue;const [x,y]=P(i+mx,j+my);ctx.beginPath();ctx.moveTo(x-3,y-13);ctx.lineTo(x+3,y-7);ctx.moveTo(x+3,y-13);ctx.lineTo(x-3,y-7);ctx.stroke();}
 }},
 strongbox:{n:"Strongbox bank",draw(i,j,p){
   const fp=p&&p.footprint||{w:2.2,h:.8},w=fp.w,h=fp.h,cols=Math.max(2,Math.round(w/.55));
   for(let k=0;k<cols;k++){const x=i+k*w/cols;box(x+.02,j+.05,x+w/cols-.03,j+h-.05,31,"#4A4036");const [cx,cy]=P(x+w/cols/2,j+h/2);ctx.strokeStyle="rgba(7,9,8,.52)";ctx.lineWidth=.7;for(let r=0;r<3;r++){ctx.strokeRect(cx-4,cy-27+r*7,8,5);ctx.fillStyle="#C8A14E";ctx.fillRect(cx-.8,cy-25+r*7,1.6,1);}}
 }},
 mirror:{n:"Mirror plate",draw(i,j){
   wallPlate(i+.08,i+.92,j+.12,30,"#B7A66E","rgba(200,161,78,.55)");const A=P(i+.16,j+.12),B=P(i+.84,j+.12);quad([A[0],A[1]-26],[B[0],B[1]-26],[B[0],B[1]-5],[A[0],A[1]-5],"rgba(127,168,184,.28)","rgba(233,226,206,.4)");
 }},
 chandelier:{n:"Chandelier",draw(i,j,p){
   const fp=p&&p.footprint||{w:3,h:3},cx=i+fp.w/2,cy=j+fp.h/2,[x,y]=P(cx,cy),r=Math.max(16,Math.min(34,fp.w*7));
   lightPool(cx,cy,70,"rgba(232,196,120,.15)");ctx.strokeStyle="#C8A14E";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-r-32);ctx.lineTo(x,y-r);ctx.stroke();ctx.beginPath();ctx.ellipse(x,y-r,r,r*.45,0,0,7);ctx.stroke();
   for(let a=0;a<8;a++){const q=a*Math.PI/4,ax=x+Math.cos(q)*r,ay=y-r+Math.sin(q)*r*.45;ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(ax,ay);ctx.stroke();ctx.fillStyle="rgba(240,200,120,.95)";ctx.beginPath();ctx.arc(ax,ay-3,2.4,0,7);ctx.fill();}
 }},
 hoard:{n:"Coin hoard",draw(i,j,p){
   const fp=p&&p.footprint||{w:2,h:1};
   for(let x=.3;x<fp.w-.05;x+=.55)for(let y=.3;y<fp.h-.05;y+=.58){const n=3+((x*7+y*11)|0)%5;chipStack(i+x,j+y,((x+y)*10|0)%2?"#C8A14E":"#8A2E25",n);}
 }}
};

/* Level 2 is below the Verso. Its authored square grid is confined to the
   vault: the rest remains an exploration level in either renderer. */
const VAULT_ROOMS=[
 {id:"landing2",name:"The Landing",sub:"below the verso · the paint runs out",rect:{x:0,y:8,w:5,h:5},
  floorA:"#4A4A4E",floorB:"#3F3F44",wall:"#596052",bleedAll:true,masonry:true,light:"torchlight",revealMode:"always",
  read:"The stairs descend into a place the casino only partly managed to disguise. Your footsteps stop echoing midway across the landing. Painted marble ends at a ruler-straight waterline; beyond it, the walls resolve into courses of exposed dressed stone, warm beneath your hand. The last crystal fixtures have no wire behind them. Below them, iron sconces hold smoking torches whose light seems much older than the casino.",
  dm:"<b>LEVEL 2 IS BELOW.</b> No lift, no teleport, no transition trick: these are the same stairs visible in the Verso. Before the bargain, remind David that he still holds the Cure ticket; Belinda will remember him, but redeeming it costs every memory he has of her—narrate established images leaving rather than asking him to invent one at the table. Then force the immediate PAY/WORK decision that permits the party to leave the Verso and descend. PAY settles Randy's account but does not provide passage out of Val du Cendre; the Writs do. WORK remains open until the named document is delivered to the Concierge. The House will accept PAY later if it receives the same weight: Rasura unused, plus Randy returning the restored nine days.",
  clues:["Sound changes first, then the marble waterline, then the unwired sconces.","The stone is the same warm scriptio inferior exposed in the Verso."]},
 {id:"mirrors2",name:"The Mirror Gallery",sub:"five junctions · three arches each",rect:{x:5,y:9,w:14,h:3},
  floorA:"#39443A",floorB:"#303A32",wall:"#596052",corridor:true,masonry:true,light:"torchlight",revealMode:"armed",
  read:"The first hallway sheds the last pretense of a casino. Flagstones replace the finished floor; exposed blocks show between gilt mirror-plates; torches gutter in iron sconces driven straight into the older mortar. At the first junction, three arches wait. Each looks open from here. In the brass mirror opposite them, two reflections end at blank stone a few feet in. The third keeps going.",
  dm:"<b>NO ROLL.</b> Prepare a five-answer L/C/R key and keep it fixed. Looking in the mirror always reveals the continuing arch. A wrong choice ends at a wall; its dust drifts through the correct arch as a free hint. If they indiscriminately smash their way through three junctions, the Counting Floor is alerted. There is no backward-walking solution.",
  clues:["The mirror shows depth the direct view conceals.","Every wrong passage gives a physical hint toward the right one.","The gilt gallery is a thin installation bolted onto a much older torchlit passage."]},
 {id:"counting2",name:"The Counting Floor",sub:"night count · mortal employees",rect:{x:19,y:7,w:8,h:7},
  floorA:"#21392B",floorB:"#1B3024",wall:"#2E4A38",revealMode:"armed",
  read:"Green baize tables stand under hard white lamps. Four employees count chips into regimented towers, calling totals over one another. None looks eager to die for the privilege.",
  dm:"<b>3 THUGS + 1 VETERAN.</b> Four routes: group Stealth DC 12, 50 gp or casino chips, a plausible 'Sarlossi sent us' bluff, or a short fight. The social reward is gossip: Sarlossi received only <b>three Letters of Transit</b> and expected four; he has spent two nights in the vault and gets ugly when asked why. A loud fight means Sarlossi is forewarned and cannot be surprised. Do not use a contents ledger here.",
  clues:["The employees know there are three Writs before the party reaches the office.","They are employees, not fanatics; surrender and retreat are legitimate outcomes."]},
 {id:"office2",name:"Sarlossi's Office",sub:"office · stage · strongbox 0001",rect:{x:27,y:8,w:11,h:7},
  floorA:"#5C4630",floorB:"#4F3C29",wall:"#6B5A33",light:"bright",revealMode:"armed",
  read:"The office is a private music salon built with the appetite of a man who never learned the word enough. A velvet stage gleams beneath warm footlights; a black grand piano and a solitary music stand wait under a small chandelier. Yellowed score pages are already open. Sarlossi's desk occupies the best seat in the room, flanked by a private bar and oxblood settees. Gold-framed performers watch from the paneling. Beyond the desk stands a bank of strongboxes, one brass face stamped 0001. There is no visible vault door.",
  dm:"<b>THE MUSIC STAND IS CLOWN FART'S CUE.</b> The open pages are the troupe's old audition arrangement, marked in his own shorthand. Do not require a check to recognize or begin it. The first notes can simply come to him. As he plays, return the memory in short beats: the count-in they always rushed; each friend's exact mark on the stage; the failed audition's exit, when they turned Sarlossi's rejection into a bit at his expense and his smile went still; the last ride, when the brake pedal fell uselessly to the floor; and the final cue they never got to finish. These are recollections surfacing through the completed act, not a new bargain or mechanical refund. <b>CLOWN FART'S FAILED AUDITION MADE THE HIT PERSONAL.</b> The gambling debt gave Sarlossi leverage; being made the punchline gave him motive. A rejected engagement contract and marked set list in the desk connect the audition to the later work order concerning the brakes. <b>THE PERFORMANCE REVEALS THE VAULT DOOR.</b> As each phrase returns, one member of the troupe arrives and takes the remembered mark. Never gate their arrival behind a roll. They know the act, finish it with him, and disappear without commentary. One presses the <b>Plectrum of the Heavenly Host</b> into his hand: 1/day, when he casts a bard spell through it, increase that spell's save DC by 2 for that casting. One More Time, 1/day: DC 12 Performance as part of casting; success saves the slot, failure casts normally and spends it. <b>Desk:</b> Sarlossi's short service contract, the rejected engagement, and Vaedryn's paid instruction concerning Klaus. <b>Strongbox 0001:</b> opens to ticket 0001 with Randy present; contains Rasura, not the photograph. Touching Rasura restores Randy's nine sealed days immediately, before he chooses what to do with them. The strongbox has nothing to do with Sarlossi's fight and does not reveal the vault.",
  clues:["Music stand: the troupe's audition score, annotated in CF's hand; its opening cue is familiar before he consciously reads it.","Rejected engagement: CF's band did not make the cut, then made Sarlossi the punchline on their way out. The attached work order turns that humiliation into the sabotaged-brakes hit.","Contract: House protects fortune and forgives debts; Sarlossi guards the Vault when called; collateral is memory and recognition; release is surrender of the Bella Rosa and every claim upon it.","Vaedryn: three passages for four fugitives; Soundgarden is the remainder; keep him alive for Malrick; forward his destination manifest if he leaves.","Rasura's handle reads RASURA / FOR THE NINTH DAY in Elvish. The blade bears the negative scar of Kalaxia's name—not a second positive instance. The named Writ is the sole positive inscription."]},
 {id:"vault2",name:"The Vault of the Bella Rosa",sub:"sarlossi's hoard · the original scriptorium",rect:{x:38,y:4,w:14,h:14},
  floorA:"#66562F",floorB:"#574925",wall:"#8F8468",battleGrid:"square",tokensAlways:true,revealMode:"armed",
  read:"The hidden panel opens on blank brass, then the running watch tells it the true hour. Beyond is a square of ancient stone under the casino's gold: pillars, coin drifts, a chandelier on a black counterweight chain, and a map-drawer set into the far wall. Don Sarlossi stands at the center at two in the morning. He looks as though he has only just noticed he is here.",
  dm:"<b>OPEN TACTICAL MAP.</b> The office performance reveals this door; Clown Fart's running watch opens it. The fight begins here, never at strongbox 0001. Confront Sarlossi with the contract. If he sincerely renounces the Bella Rosa, the fight ends: the House has no guardian to recall. If the terms land but Persuasion fails, he still turns, shaken; Molten-Leaf Breath begins expended and must recharge. If they never get through to him, he turns at full capacity. Phase 1: AC 15, HP 60, two cane strikes +6 / 1d8+4; take Klaus alive. Phase 2: young brass dragon chassis; DC 14, 10d6 molten-leaf line; Scouring cone removes reactions and bonus actions on a failed DC 14 Con save. No goons—the caster-heavy party's pressure comes from the arena. Initiative 20 rotates coin spray, pillar collapse, persistent molten leaf, and a one-round telegraphed floor-unwrite zone. Trajan ruins the first threatened breath by cutting the chandelier chain, then may Make Amends when a PC would fall to 0. <b>Map-drawer:</b> three blank Writs and one named Writ. A valid Writ permits passage anywhere, even with debt unpaid. Returning the named Writ completes WORK, settles Randy's debt, and restores locked transit on delivery—not before; Kalaxia rides out on that valid named passage, leaving only three seats for the party. Erasing Kalaxia's sole positive name opens the fourth Writ, releases Kalaxia, and leaves the House's debt open. Keeping the intact named Writ leaves the demon filed and the debt open. They cannot trick the House. Rasura gets one cut.",
  clues:["The arena is 70 feet square. Each visible grid square is five feet.","Four pillars provide full cover; coin dunes are difficult terrain; the chandelier footprint is overhead until its chain is cut.","There are three blank Writs for four travelers. The fourth Writ and Kalaxia's cage are the same written name.","The Concierge gives Randy the second half of the photograph only when they return: Randy, Rynard, and the younger Concierge; DON'T / LET THEM WAKE IT."]}
];
const VAULT_DOORS=[
 {x:5,y:10,dir:"v",type:"open"},{x:19,y:10,dir:"v",type:"door"},
 {x:27,y:10,dir:"v",type:"door"},{x:38,y:11,dir:"v",type:"door"}
];
const VAULT_ROSTER=[
 {name:"Randy Meisner",letter:"R",color:"#8A6FB8",pc:true},
 {name:"Klaus Soundgarden",letter:"K",color:"#E0B341",pc:true},
 {name:"Clown Fart",letter:"CF",color:"#D96A9C",pc:true},
 {name:"David Byrne",letter:"D",color:"#B5443C",pc:true},
 {name:"Trajan",letter:"T",color:"#4E8F86"},
 {name:"Don Sarlossi",letter:"S",color:"#C8A14E"},
 {name:"Vault Guardian",letter:"D",color:"#B87333"},
 {name:"Counting Floor Veteran",letter:"V",color:"#7FA8B8"},
 {name:"Counting Floor Thug",letter:"T",color:"#9AA08F"}
];
const VAULT_PROPS=[
 {id:"landing-runner",t:"rug",x:2,y:11.4,label:"Paint-stiff runner",inspect:"Casino carpet ends in a ruler-straight line over the older stone.",scale:1.5},
 {id:"landing-crate",t:"crate",x:.25,y:11.7,label:"Unopened lighting crate",inspect:"Crystal sconces, packed carefully, with no wiring anywhere in the walls."},
 {id:"landing-dark-lamp",t:"lamp",x:4,y:8.25,label:"Unwired crystal standard",inspect:"Decorative, expensive, and entirely dark.",scale:.85},
 {id:"landing-torch-a",t:"wallsconce",x:1.1,y:8.05,label:"Iron torch sconce",playerLabel:"Smoking wall torch",playerInspect:"Its bracket is driven into mortar behind the casino finish.",focus:true},{id:"landing-torch-b",t:"wallsconce",x:3.3,y:12.85,rotation:2,label:"Iron torch sconce",playerLabel:"Smoking wall torch"},
 {id:"mirror-1",t:"mirror",x:5.4,y:9.05,label:"North mirror A",playerLabel:"Gilt mirror"},{id:"mirror-2",t:"mirror",x:7.8,y:9.05,label:"North mirror B",playerLabel:"Gilt mirror"},
 {id:"mirror-3",t:"mirror",x:10.2,y:9.05,label:"North mirror C",playerLabel:"Gilt mirror"},{id:"mirror-4",t:"mirror",x:12.6,y:9.05,label:"North mirror D",playerLabel:"Gilt mirror"},
 {id:"mirror-5",t:"mirror",x:15,y:9.05,label:"North mirror E",playerLabel:"Gilt mirror",playerInspect:"Its reflection carries depth that the direct view refuses to show."},{id:"mirror-6",t:"mirror",x:17.4,y:9.05,label:"North mirror F",playerLabel:"Tarnished mirror"},
 {id:"mirror-7",t:"mirror",x:6.6,y:11.05,rotation:2,label:"South mirror A",playerLabel:"Gilt mirror"},{id:"mirror-8",t:"mirror",x:9,y:11.05,rotation:2,label:"South mirror B",playerLabel:"Gilt mirror"},
 {id:"mirror-9",t:"mirror",x:11.4,y:11.05,rotation:2,label:"South mirror C",playerLabel:"Fractured mirror"},{id:"mirror-10",t:"mirror",x:13.8,y:11.05,rotation:2,label:"South mirror D",playerLabel:"Gilt mirror"},
 {id:"mirror-11",t:"mirror",x:16.2,y:11.05,rotation:2,label:"South mirror E",playerLabel:"Gilt mirror"},
 {id:"mirror-lamp-1",t:"wallsconce",x:7.4,y:11.05,rotation:2,label:"Gallery torch"},{id:"mirror-lamp-2",t:"wallsconce",x:10.2,y:11.05,rotation:2,label:"Gallery torch"},
 {id:"mirror-lamp-3",t:"wallsconce",x:13,y:11.05,rotation:2,label:"Gallery torch"},{id:"mirror-lamp-4",t:"wallsconce",x:15.8,y:11.05,rotation:2,label:"Gallery torch"},
 {id:"count-table-1",t:"table",x:20,y:8.2,label:"Count table A",scale:1.35},{id:"count-table-2",t:"table",x:23.6,y:8.2,label:"Count table B",scale:1.35},
 {id:"count-table-3",t:"table",x:21.8,y:11.4,label:"Night tally table",scale:1.45,focus:true},
 {id:"count-chair-1",t:"chair",x:20.2,y:9.3},{id:"count-chair-2",t:"chair",x:24,y:9.3},{id:"count-chair-3",t:"chair",x:21.3,y:12.3},{id:"count-chair-4",t:"chair",x:23.5,y:12.2},
 {id:"count-chips-1",t:"stack",x:20.7,y:8.1,label:"Counted chips"},{id:"count-chips-2",t:"stack",x:24.3,y:8.1,label:"Counted chips"},{id:"count-chips-3",t:"stack",x:22.4,y:11.3,label:"Unfinished night count"},
 {id:"count-lamp-1",t:"lamp",x:19.4,y:7.4,scale:.8},{id:"count-lamp-2",t:"lamp",x:26,y:7.4,scale:.8},
 {id:"office-stage",t:"stage",x:27.4,y:8.1,label:"Sarlossi's private stage",playerLabel:"Velvet stage",playerInspect:"Polished boards, wine-dark curtains, warm footlights, and nine performer marks worn into the finish.",focus:true,footprint:{w:5.5,h:2.5,shape:"rect"}},
 {id:"office-piano",t:"piano",x:28,y:8.75,label:"Sarlossi's grand piano",playerLabel:"Black grand piano",footprint:{w:2,h:1.2,shape:"rect"}},
 {id:"office-music-stand",t:"musicstand",x:31.25,y:9.15,label:"Troupe audition score · CF's annotations",inspect:"The opening bars unlock the act in sequence; no check is needed.",playerLabel:"Music stand with an open score",playerInspect:"The yellowed pages carry CF's own shorthand. The opening cue feels familiar before he reads it.",focus:true,scale:.95},
 {id:"office-desk",t:"table",x:34.1,y:11.7,rotation:3,label:"Sarlossi's desk",playerLabel:"Lacquered desk",playerInspect:"Its unlocked drawer holds contracts, a rejected set list, and a paid work order.",focus:true,scale:1.4},
 {id:"office-chair",t:"chair",x:35.1,y:12.35,rotation:3,label:"Sarlossi's private-box chair",playerLabel:"High-backed chair",scale:1.1},
 {id:"office-strongboxes",t:"strongbox",x:34.7,y:8.15,label:"Strongbox array · 0001",playerLabel:"Brass strongbox bank",playerInspect:"One face is stamped 0001.",focus:true,footprint:{w:2.7,h:.9,shape:"rect"}},
 {id:"office-books",t:"shelf",x:33.35,y:8.2,label:"Forty years of untouched files",playerLabel:"Gilt filing shelves",scale:1.1},
 {id:"office-bar",t:"bar",x:36.1,y:12.4,rotation:1,label:"Sarlossi's private bar",playerLabel:"Private bar",footprint:{w:2,h:.7,shape:"rect"}},
 {id:"office-settee-a",t:"sofa",x:28.4,y:11.6,label:"Oxblood audience settee",playerLabel:"Velvet settee",footprint:{w:2.5,h:1,shape:"rect"}},
 {id:"office-settee-b",t:"sofa",x:31.2,y:12.8,rotation:2,label:"Oxblood audience settee",playerLabel:"Velvet settee",footprint:{w:2.5,h:1,shape:"rect"}},
 {id:"office-portrait-a",t:"portrait",x:33.2,y:8.05,label:"Portrait of Sarlossi with Ella Fitzgerald",playerLabel:"Signed performance portrait"},
 {id:"office-portrait-b",t:"portrait",x:36.7,y:9.05,rotation:1,label:"Portrait of Sarlossi with Duke Ellington",playerLabel:"Signed performance portrait"},
 {id:"office-lamp-a",t:"lamp",x:33.6,y:13.5,label:"Private-box lamp",scale:.9},{id:"office-lamp-b",t:"lamp",x:36.7,y:10.15,label:"Private-box lamp",scale:.9},
 {id:"office-rug",t:"rug",x:31.6,y:11.3,label:"Hand-knotted audience rug",playerLabel:"Oxblood and gold rug",scale:1.7},
 {id:"vault-pillar-a",t:"pillar",x:41,y:7,label:"Northwest vault pillar",playerLabel:"Stone pillar",terrain:"cover",footprint:{w:1,h:1,shape:"rect"},states:[{id:"standing",name:"Standing"},{id:"collapsed",name:"Collapsed",t:"rubble",terrain:"difficult",playerLabel:"Collapsed masonry"}]},
 {id:"vault-pillar-b",t:"pillar",x:48,y:7,label:"Northeast vault pillar",playerLabel:"Stone pillar",terrain:"cover",footprint:{w:1,h:1,shape:"rect"},states:[{id:"standing",name:"Standing"},{id:"collapsed",name:"Collapsed",t:"rubble",terrain:"difficult",playerLabel:"Collapsed masonry"}]},
 {id:"vault-pillar-c",t:"pillar",x:41,y:14,label:"Southwest vault pillar",playerLabel:"Stone pillar",terrain:"cover",footprint:{w:1,h:1,shape:"rect"},states:[{id:"standing",name:"Standing"},{id:"collapsed",name:"Collapsed",t:"rubble",terrain:"difficult",playerLabel:"Collapsed masonry"}]},
 {id:"vault-pillar-d",t:"pillar",x:48,y:14,label:"Southeast vault pillar",playerLabel:"Stone pillar",terrain:"cover",footprint:{w:1,h:1,shape:"rect"},states:[{id:"standing",name:"Standing"},{id:"collapsed",name:"Collapsed",t:"rubble",terrain:"difficult",playerLabel:"Collapsed masonry"}]},
 {id:"vault-dune-a",t:"hoard",x:39,y:10,label:"Coin dune",terrain:"difficult",footprint:{w:4,h:2,shape:"rect"}},
 {id:"vault-dune-b",t:"hoard",x:46,y:5,label:"Coin dune",terrain:"difficult",footprint:{w:4,h:2,shape:"rect"}},
 {id:"vault-dune-c",t:"hoard",x:46,y:15,label:"Coin dune",terrain:"difficult",footprint:{w:3,h:2,shape:"rect"}},
 {id:"vault-chandelier",t:"chandelier",x:44,y:9,label:"Chandelier · counterweight chain",playerLabel:"Hanging chandelier",playerInspect:"A black chain disappears into the ceiling mechanism above it.",terrain:"overhead",footprint:{w:4,h:4,shape:"circle"},focus:true,states:[{id:"hanging",name:"Hanging"},{id:"fallen",name:"Fallen",x:43.5,y:10,t:"rubble",terrain:"cover",footprint:{w:4,h:2,shape:"rect"},playerLabel:"Fallen chandelier"}]},
 {id:"vault-writs",t:"cabinet",x:50.4,y:10.5,label:"Map-drawer · four Writs",inspect:"Three name-lines are blank. The fourth carries the only positive inscription of an impossible name.",playerLabel:"Brass map-drawer",playerInspect:"Four shallow document trays sit behind a lock without a keyway.",focus:true,scale:1.2},
 {id:"vault-chest-1",t:"chest",x:39,y:5.2,label:"Sarlossi's hoard chest",scale:1.15},{id:"vault-chest-2",t:"chest",x:50.4,y:16.1,label:"Sealed hoard chest",scale:1.15},
 {id:"vault-ledgers-1",t:"shelf",x:38.3,y:14.8,label:"Filed vault ledgers",scale:1.1},{id:"vault-ledgers-2",t:"shelf",x:50.8,y:7.6,label:"Filed vault ledgers",scale:1.1},
 {id:"vault-memory-tank-1",t:"barrel",x:39.2,y:16.3,label:"Memory-harvesting tank",inspect:"Brass tubing descends through the original stone floor.",playerLabel:"Brass reservoir",playerInspect:"Its tubing descends through the original stone floor.",focus:true,scale:1.25},
 {id:"vault-memory-tank-2",t:"barrel",x:40.2,y:16.3,label:"Memory-harvesting tank",playerLabel:"Brass reservoir",scale:1.25},
 {id:"vault-service-cart",t:"cart",x:49.4,y:4.3,label:"Abandoned vault cart",inspect:"Inventory sheets stop halfway through the same line.",scale:1.05}
];
root.VTTContent=Object.freeze({
  VERSO_LEVEL:{schemaVersion:1,name:"The Verso · Back of House",bg:"#0A0F0C",rooms:VERSO_ROOMS,doors:VERSO_DOORS,roster:PARTY,props:[
    {id:"accounts-lectern",t:"lectern",x:19.5,y:5.05,label:"ACQUISITIONS lectern",inspect:"A master lectern bearing an open account book.",focus:true,scale:1.15},
    {id:"accounts-cabinet",t:"cabinet",x:22.15,y:7.05,label:"Closed filing cabinet",inspect:"A locked cabinet marked CLOSED.",focus:true,scale:1.1},
    {id:"lost-clock",t:"clock",x:12.1,y:6.05,label:"Grandfather clock",inspect:"Its hands are stopped at 3:17.",focus:true,scale:1.1},
    {id:"corridor-cart",t:"cart",x:14.45,y:9.15,label:"Abandoned service cart",inspect:"Cold drinks and an order slip remain on the cart.",focus:true,scale:1.05}
  ]},
  VERSO_START:{revealed:{white:true},tokens:[
    {name:"Randy Meisner",letter:"R",color:"#8A6FB8",x:3.5,y:3.5,size:1,pc:true},
    {name:"Trajan",letter:"T",color:"#4E8F86",x:4.5,y:4.5,size:1,pc:true},
    {name:"The Concierge",letter:"♠",color:"#C8A14E",x:10.5,y:14.5,size:1},
  ]},
  VAULT_LEVEL:{schemaVersion:3,name:"Level 2 · The Vault of the Bella Rosa",bg:"#080B09",rooms:VAULT_ROOMS,doors:VAULT_DOORS,stairs:[
    {id:"verso-stairs",x:0,y:9,w:2,h:3,dir:"w",from:1,to:0,style:"stone"}
  ],roster:VAULT_ROSTER,props:VAULT_PROPS,encounterEffects:[
    {id:"coin-spray",name:"Coin Spray",terrain:"difficult",shape:"rect",w:4,h:4,duration:1},
    {id:"molten-leaf",name:"Molten Leaf",terrain:"hazard",shape:"rect",w:6,h:2,duration:0},
    {id:"floor-unwrite",name:"Floor Unwrite",terrain:"hazard",shape:"circle",w:4,h:4,duration:1},
    {id:"fallen-debris",name:"Fallen Debris",terrain:"cover",shape:"rect",w:2,h:2,duration:0}
  ]},
  VAULT_START:{revealed:{landing2:true},tracker:{order:[],active:0,round:1},tokens:[
    {name:"Randy Meisner",letter:"R",color:"#8A6FB8",x:2.5,y:9.5,size:1,pc:true},
    {name:"Klaus Soundgarden",letter:"K",color:"#E0B341",x:3.5,y:9.5,size:1,pc:true},
    {name:"Clown Fart",letter:"CF",color:"#D96A9C",x:2.5,y:10.5,size:1,pc:true},
    {name:"David Byrne",letter:"D",color:"#B5443C",x:3.5,y:10.5,size:1,pc:true},
    {name:"Trajan",letter:"T",color:"#4E8F86",x:2.5,y:11.5,size:1},
    {name:"Don Sarlossi",letter:"S",color:"#C8A14E",x:45,y:11,size:1.2,phase:0,
      sheet:{prof:3,init:2,ac:15,hp:60,hpMax:60,abil:{str:4,dex:2,con:3,int:1,wis:1,cha:3},atks:[{name:"Cane",hit:6,dmg:"1d8+4"},{name:"Cane",hit:6,dmg:"1d8+4"}],skills:{}},
      phases:[
        {title:"Don Sarlossi",name:"Don Sarlossi",letter:"S",color:"#C8A14E",size:1.2,sheet:{prof:3,init:2,ac:15,hp:60,hpMax:60,abil:{str:4,dex:2,con:3,int:1,wis:1,cha:3},atks:[{name:"Cane",hit:6,dmg:"1d8+4"},{name:"Cane",hit:6,dmg:"1d8+4"}],skills:{}}},
        {title:"Vault Guardian",name:"Don Sarlossi · Vault Guardian",letter:"S",color:"#B87333",size:3,sheet:{prof:4,init:2,ac:17,hp:110,hpMax:110,abil:{str:5,dex:2,con:4,int:1,wis:1,cha:3},atks:[{name:"Bite",hit:7,dmg:"2d10+5"},{name:"Claw",hit:7,dmg:"2d6+5"},{name:"Molten Leaf",hit:0,dmg:"10d6"}],skills:{}}}
      ]}
  ]},
  DEFAULT_ROSTER:PARTY,
  SWATCHES:SWATCH,
  ROOM_TEMPLATES:TEMPLATES,
  PROP_LIBRARY:PROP_LIB,
});
})(typeof globalThis!=="undefined"?globalThis:this);

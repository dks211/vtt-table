const test=require("node:test");
const assert=require("node:assert/strict");
const Health=require("../content/east-tennessee-health.js");
const Rounds=require("../content/east-tennessee-rounds.js");
const {projectCampaignStateForRecipient,normalizeRecipientContext}=require("../app/core.js");
const A="actor-a",B="actor-b",N="actor-n";const gm={role:"gm"};
const owner=(id,key)=>({role:"player",campaignId:Health.CAMPAIGN_ID,actorId:id,playerKey:key,partyMember:true});
function fixture(){return Rounds.normalizeState(Health.normalizeState({namespace:Health.CAMPAIGN_ID,actors:{
  [A]:{ownerKey:"key-a",identity:{name:"Ada"},health:{state:"unhurt"},skills:{resolve:12,medicine:14,awareness:11},medicalCapability:{hasPlausibleMaterials:true,hasProperSupplies:true},talents:{fieldMedicine:true}},
  [B]:{ownerKey:"key-b",identity:{name:"Ben"},health:{state:"unhurt"},skills:{resolve:10,medicine:8},medicalCapability:{hasPlausibleMaterials:true,hasProperSupplies:true}},
  [N]:{identity:{name:"Guard"},health:{state:"unhurt"},skills:{resolve:9}},
},scene:{id:"scene-1",immediateDanger:true},timers:{},logs:[]}))}
const roller=(d10=[],d20=[])=>{let a=0,b=0;return{rollDie:sides=>sides===10?d10[a++]:1,rollD20:()=>d20[b++]??10}};
const act=(s,r,a,o={})=>Rounds.performAction(s,r,a,o);
function start(s,participants,rolls=[2,5]){act(s,gm,{type:"startStructuredPlay"});act(s,gm,{type:"setParticipants",participants});return act(s,gm,{type:"rollInitiative"},roller(rolls));}
const pc=(id,actorId,name)=>({id,actorId,kind:"pc",active:true,displayName:name});
const npc=(id,actorId,name,group=null)=>({id,actorId,kind:"npc",active:true,displayName:name,initiativeGroupId:group});

test("initiative gives independent participants and shared groups one host d10 and sorts low first",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada"),npc("pn",N,"Guard"),npc("extra-1",null,"Extras","mob"),npc("extra-2",null,"Extras","mob")],[7,2,5]);
  assert.equal(s.structuredPlay.initiativeEntries.length,3);assert.deepEqual(s.structuredPlay.initiativeEntries.map(e=>e.initiativeRoll),[2,5,7]);
  assert.equal(s.structuredPlay.initiativeEntries.find(e=>e.participantIds.includes("extra-1")).participantIds.length,2);
});

test("PC wins mixed tie while same-class ties require explicit GM resolution",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada"),npc("pn",N,"Guard")],[4,4]);assert.equal(s.structuredPlay.initiativeEntries[0].tieClass,"pc");assert.equal(s.structuredPlay.unresolvedTieGroups.length,0);
  const t=fixture();start(t,[pc("pa",A,"Ada"),pc("pb",B,"Ben")],[3,3]);assert.equal(t.structuredPlay.unresolvedTieGroups.length,1);assert.equal(act(t,gm,{type:"startFirstTurn"}).ok,false);
  const tie=t.structuredPlay.unresolvedTieGroups[0],reversed=[...tie.entryIds].reverse();assert.equal(act(t,gm,{type:"resolveInitiativeTies",tieId:tie.id,entryIds:reversed}).ok,true);assert.deepEqual(t.structuredPlay.initiativeEntries.map(e=>e.entryId),reversed);
});

test("dead actors and duplicate actors are excluded without explicit override",()=>{
  const s=fixture();s.actors[N].health.dead=true;act(s,gm,{type:"startStructuredPlay"});act(s,gm,{type:"setParticipants",participants:[pc("a1",A,"Ada"),pc("a2",A,"Ada again"),npc("n",N,"Dead Guard")]});
  assert.equal(s.structuredPlay.participants.length,2);act(s,gm,{type:"rollInitiative"},roller([4,1]));assert.equal(s.structuredPlay.initiativeEntries.length,1);
});

test("turn ownership, stale requests, action spending, and duplicate end-turn are safe",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada"),pc("pb",B,"Ben")],[1,6]);act(s,gm,{type:"startFirstTurn"});const entry=s.structuredPlay.currentEntryId,round=s.structuredPlay.roundNumber;
  assert.equal(act(s,owner(B,"key-b"),{type:"endTurn",expectedRound:round,expectedEntryId:entry}).ok,false);
  assert.equal(act(s,owner(A,"key-a"),{type:"spendAction",actorId:A,reason:"test",expectedRound:round,expectedEntryId:entry}).ok,true);assert.equal(s.structuredPlay.initiativeEntries[0].actionState,"spent");
  assert.equal(act(s,owner(A,"key-a"),{type:"endTurn",expectedRound:round,expectedEntryId:entry}).ok,true);assert.notEqual(s.structuredPlay.currentEntryId,entry);
  assert.equal(act(s,owner(A,"key-a"),{type:"endTurn",expectedRound:round,expectedEntryId:entry}).ok,false);
});

test("Delay preserves an action, resumes once, and reaction consumption removes the delayed turn",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada"),pc("pb",B,"Ben")],[1,2]);act(s,gm,{type:"startFirstTurn"});const first=s.structuredPlay.currentEntryId;
  act(s,owner(A,"key-a"),{type:"delayTurn",expectedRound:1,expectedEntryId:first});assert.equal(s.structuredPlay.initiativeEntries.find(e=>e.entryId===first).actionState,"delayed");
  act(s,owner(B,"key-b"),{type:"endTurn",expectedRound:1,expectedEntryId:s.structuredPlay.currentEntryId});assert.equal(s.structuredPlay.currentEntryId,null);
  assert.equal(act(s,owner(A,"key-a"),{type:"resumeDelayedTurn",entryId:first,expectedRound:1,expectedEntryId:null}).ok,true);assert.equal(s.structuredPlay.initiativeEntries.find(e=>e.entryId===first).actionState,"unspent");
  act(s,owner(A,"key-a"),{type:"endTurn",expectedRound:1,expectedEntryId:first});assert.equal(act(s,owner(A,"key-a"),{type:"resumeDelayedTurn",entryId:first,expectedRound:1,expectedEntryId:null}).ok,false);
  const r=fixture();start(r,[pc("pa",A,"Ada"),pc("pb",B,"Ben")],[1,2]);act(r,gm,{type:"startFirstTurn"});const delayed=r.structuredPlay.currentEntryId;act(r,owner(A,"key-a"),{type:"delayTurn",expectedRound:1,expectedEntryId:delayed});
  assert.equal(act(r,owner(A,"key-a"),{type:"consumeActionAsReaction",entryId:delayed,expectedRound:1,expectedEntryId:r.structuredPlay.currentEntryId}).ok,true);assert.equal(r.structuredPlay.initiativeEntries.find(e=>e.entryId===delayed).actionState,"reactionConsumed");
});

test("Ready spends the action, preserves declaration visibility, and never grants another action",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada")],[1]);act(s,gm,{type:"startFirstTurn"});const id=s.structuredPlay.currentEntryId;
  assert.equal(act(s,owner(A,"key-a"),{type:"readyAction",trigger:"when the door opens",intendedAction:"raise the alarm",expectedRound:1,expectedEntryId:id}).ok,true);let e=s.structuredPlay.initiativeEntries[0];assert.equal(e.actionState,"readied");assert.equal(e.turnCompleted,true);
  assert.equal(act(s,owner(A,"key-a"),{type:"triggerReadiedAction",entryId:id,expectedRound:1,expectedEntryId:null}).ok,true);e=s.structuredPlay.initiativeEntries[0];assert.equal(e.actionState,"spent");assert.equal(act(s,owner(A,"key-a"),{type:"triggerReadiedAction",entryId:id,expectedRound:1,expectedEntryId:null}).ok,false);
});

test("start-of-turn Down Resolve happens exactly once and does not consume an action",()=>{
  const s=fixture();s.actors[A].health={state:"down",stable:false,dyingFailures:0,dead:false};start(s,[pc("pa",A,"Ada")],[1]);act(s,gm,{type:"startFirstTurn"},roller([], [5]));const e=s.structuredPlay.initiativeEntries[0];assert.equal(s.actors[A].health.stable,true);assert.equal(e.startTurnResolved,true);assert.equal(e.actionState,"unavailable");const rolls=s.rolls.length;
  assert.equal(act(s,gm,{type:"startFirstTurn"},roller([], [20])).ok,false);assert.equal(s.rolls.length,rolls);
  const stable=fixture();stable.actors[A].health={state:"down",stable:true,dyingFailures:0,dead:false};start(stable,[pc("pa",A,"Ada")],[1]);act(stable,gm,{type:"startFirstTurn"},roller([], [20]));assert.equal(stable.rolls.length,0);
});

test("First Aid, Field Medicine, and action-costing checks consume exactly one legal action",()=>{
  const s=fixture();s.actors[B].health={state:"down",stable:false,dyingFailures:0,dead:false};start(s,[pc("pa",A,"Ada"),pc("pb",B,"Ben")],[1,5]);act(s,gm,{type:"startFirstTurn"});
  let r=Health.performAction(s,owner(A,"key-a"),{type:"attemptFirstAid",healerActorId:A,targetActorId:B},roller([], [15]));assert.equal(r.ok,true);assert.equal(s.structuredPlay.initiativeEntries[0].actionState,"spent");
  const roll=r.record;Health.performAction(s,gm,{type:"gmProposePushCondition",originalRollId:roll.id,conditionId:"shaken"});Health.performAction(s,owner(A,"key-a"),{type:"acceptPush",sequence:s.pendingPush.sequence},roller([], [2]));assert.equal(s.structuredPlay.initiativeEntries[0].actionState,"spent");
  const f=fixture();f.actors[B].health={state:"down",stable:false,dyingFailures:0,dead:false};start(f,[pc("pa",A,"Ada"),pc("pb",B,"Ben")],[1,5]);act(f,gm,{type:"startFirstTurn"});r=Health.performAction(f,owner(A,"key-a"),{type:"useFieldMedicine",healerActorId:A,targetActorId:B},{tokens:[]});assert.equal(r.ok,true);assert.equal(f.structuredPlay.initiativeEntries[0].actionState,"spent");
  const g=fixture();start(g,[pc("pa",A,"Ada")],[1]);act(g,gm,{type:"startFirstTurn"});Health.performAction(g,gm,{type:"requestSkillCheck",actorId:A,skillId:"awareness",usesAction:false},roller([], [4]));assert.equal(g.structuredPlay.initiativeEntries[0].actionState,"unspent");Health.performAction(g,owner(A,"key-a"),{type:"requestSkillCheck",actorId:A,skillId:"awareness",usesAction:false},roller([], [4]));assert.equal(g.structuredPlay.initiativeEntries[0].actionState,"spent");
});

test("round end advances eligible timers once and next round rerolls initiative",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada")],[7]);act(s,gm,{type:"createTimer",definitionId:"custom",label:"Clock",initialRounds:3});act(s,gm,{type:"startFirstTurn"});act(s,gm,{type:"forceCompleteTurn"});
  assert.equal(act(s,gm,{type:"endRound"}).ok,true);assert.equal(Object.values(s.timers)[0].remainingRounds,2);assert.equal(act(s,gm,{type:"endRound"}).ok,false);assert.equal(Object.values(s.timers)[0].remainingRounds,2);
  act(s,gm,{type:"startNextRound"});act(s,gm,{type:"rollInitiative"},roller([2]));assert.equal(s.structuredPlay.roundNumber,2);assert.equal(s.structuredPlay.initiativeEntries[0].initiativeRoll,2);
});

test("paused, resolved, and manual timers do not auto-advance",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada")],[1]);for(const [id,state,auto] of [["paused","paused","endOfRound"],["resolved","resolved","endOfRound"],["manual","active","manual"]])act(s,gm,{type:"createTimer",definitionId:"custom",id,label:id,initialRounds:4,state,autoAdvance:auto});
  act(s,gm,{type:"startFirstTurn"});act(s,gm,{type:"forceCompleteTurn"});act(s,gm,{type:"endRound"});assert.deepEqual(Object.fromEntries(Object.entries(s.timers).map(([id,t])=>[id,t.remainingRounds])),{paused:4,resolved:4,manual:4});
});

test("mid-round timers advance at that round end while players cannot mutate timers or rounds",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada")],[1]);act(s,gm,{type:"startFirstTurn"});act(s,gm,{type:"createTimer",definitionId:"custom",id:"mid",label:"Mid-round",initialRounds:3});
  assert.equal(act(s,owner(A,"key-a"),{type:"timerCommand",timerId:"mid",command:"adjust",delta:-1,expectedRound:1,expectedEntryId:s.structuredPlay.currentEntryId}).ok,false);
  assert.equal(act(s,owner(A,"key-a"),{type:"endRound",expectedRound:1,expectedEntryId:s.structuredPlay.currentEntryId}).ok,false);
  act(s,gm,{type:"forceCompleteTurn"});act(s,gm,{type:"endRound"});assert.equal(s.timers.mid.remainingRounds,2);
});

test("stopping structured play requires explicit timer override and preserves timers",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada")],[1]);act(s,gm,{type:"createTimer",definitionId:"custom",id:"clock",label:"Clock",initialRounds:4});assert.equal(act(s,gm,{type:"stopStructuredPlay"}).ok,false);
  assert.equal(act(s,gm,{type:"stopStructuredPlay",overrideActiveTimers:true}).ok,true);assert.equal(s.structuredPlay.active,false);assert.equal(s.timers.clock.remainingRounds,4);assert.equal(s.timers.clock.state,"active");
});

test("private timer values never leak through public logs",()=>{
  const s=fixture();act(s,gm,{type:"createTimer",definitionId:"custom",id:"masked",label:"Riders",initialRounds:37,visibility:"public-label-private-value"});
  const publicText=s.logs.filter(x=>x.visibility==="public").map(x=>x.message).join(" ");assert.match(publicText,/Riders/);assert.equal(publicText.includes("37"),false);
});

test("fire stages sequence without decrementing the newly created stage",()=>{
  for(const [definition,sides] of [["lick-creek-fire-stage-1-weak",6],["lick-creek-fire-stage-1-competent",4],["lick-creek-fire-stage-1-exceptional",3]]){const x=fixture();act(x,gm,{type:"createTimer",definitionId:definition},{rollDie:()=>sides});assert.equal(Object.values(x.timers)[0].initialRounds,sides);}
  const s=fixture();start(s,[pc("pa",A,"Ada")],[1]);act(s,gm,{type:"createTimer",definitionId:"lick-creek-fire-stage-1-competent",initialRounds:1});act(s,gm,{type:"startFirstTurn"});act(s,gm,{type:"forceCompleteTurn"});act(s,gm,{type:"endRound"},{rollDie:()=>4});
  assert.equal(s.adventureFlags.bridgeDisabled,true);assert.equal(s.adventureFlags.sabotageSucceeded,true);const stage2=Object.values(s.timers).find(t=>t.definitionId==="lick-creek-fire-stage-2");assert.equal(stage2.remainingRounds,4);assert.equal(stage2.lastAdvancedRound,null);
  act(s,gm,{type:"timerCommand",timerId:stage2.id,command:"adjust",delta:-4});assert.equal(s.adventureFlags.fireUncontrollable,true);assert.equal(s.adventureFlags.bridgeWillBeConsumed,true);
});

test("Help Warned sequences full-value reinforcements and hidden alarm state",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada")],[1]);act(s,gm,{type:"createTimer",definitionId:"help-warned",initialRounds:1});act(s,gm,{type:"startFirstTurn"});act(s,gm,{type:"forceCompleteTurn"});act(s,gm,{type:"endRound"});assert.equal(s.adventureFlags.helpWarned,true);
  const reinforcements=Object.values(s.timers).find(t=>t.definitionId==="reinforcements-arrive");assert.equal(reinforcements.remainingRounds,12);assert.equal(reinforcements.lastAdvancedRound,null);act(s,gm,{type:"timerCommand",timerId:reinforcements.id,command:"adjust",delta:-12});assert.equal(s.adventureFlags.reinforcementsArrived,true);
});

test("timer and structured projections omit hidden values and transaction guards",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada")],[1]);act(s,gm,{type:"createTimer",definitionId:"custom",id:"public",label:"Public",initialRounds:3,visibility:"public"});act(s,gm,{type:"createTimer",definitionId:"custom",id:"masked",label:"Riders",initialRounds:9,visibility:"public-label-private-value"});act(s,gm,{type:"createTimer",definitionId:"missing-patrol",id:"hidden",gmNotes:"secret"});
  const p=projectCampaignStateForRecipient(s,normalizeRecipientContext(owner(A,"key-a")));assert.equal(p.timers.public.remainingRounds,3);assert.equal(p.timers.masked.label,"Riders");assert.equal("remainingRounds" in p.timers.masked,false);assert.equal(p.timers.hidden,undefined);assert.equal("processedRoundNumbers" in p.structuredPlay,false);assert.equal("stateVersion" in p.structuredPlay,false);assert.equal("missingPatrolNoticed" in p.adventureFlags,false);
});

test("normalization repairs impossible references and preserves incomplete rounds without advancing",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada"),pc("pb",B,"Ben")],[1,4]);act(s,gm,{type:"startFirstTurn"});act(s,gm,{type:"createTimer",definitionId:"custom",id:"clock",initialRounds:5});const saved=JSON.parse(JSON.stringify(s));const loaded=Rounds.normalizeState(saved);
  assert.equal(loaded.structuredPlay.currentEntryId,s.structuredPlay.currentEntryId);assert.equal(loaded.structuredPlay.roundNumber,1);assert.equal(loaded.timers.clock.remainingRounds,5);
  saved.structuredPlay.currentEntryId="missing";saved.structuredPlay.participants.push({...saved.structuredPlay.participants[0],id:"duplicate"});saved.timers.bad={definitionId:"unknown",remainingRounds:-4};const repaired=Rounds.normalizeState(saved);assert.equal(repaired.structuredPlay.currentEntryId,null);assert.equal(repaired.structuredPlay.participants.filter(p=>p.actorId===A).length,1);assert.equal(repaired.timers.bad,undefined);
});

test("scene changes require structured play to stop first",()=>{
  const s=fixture();start(s,[pc("pa",A,"Ada")],[1]);assert.equal(Health.performAction(s,gm,{type:"beginNewScene",sceneId:"scene-2"}).ok,false);act(s,gm,{type:"stopStructuredPlay",overrideActiveTimers:true});assert.equal(Health.performAction(s,gm,{type:"beginNewScene",sceneId:"scene-2"}).ok,true);assert.equal(s.scene.id,"scene-2");
});

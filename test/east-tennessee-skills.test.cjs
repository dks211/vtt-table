const test=require("node:test");
const assert=require("node:assert/strict");
const ET=require("../content/east-tennessee-health.js");
const {projectCampaignStateForRecipient,normalizeRecipientContext}=require("../app/core.js");

const A="actor-a",B="actor-b";
const gm={role:"gm"};
const owner=(id,key)=>({role:"player",campaignId:ET.CAMPAIGN_ID,actorId:id,playerKey:key,partyMember:true});
function fixture(){return ET.normalizeState({namespace:ET.CAMPAIGN_ID,actors:{
  [A]:{actorId:A,ownerKey:"key-a",identity:{name:"Actor A"},health:{state:"unhurt"},skills:{medicine:14,resolve:12,awareness:10,firearms:11},medicalCapability:{hasPlausibleMaterials:true,hasProperSupplies:true}},
  [B]:{actorId:B,ownerKey:"key-b",identity:{name:"Actor B"},health:{state:"unhurt"},skills:{medicine:8,resolve:9,awareness:9},medicalCapability:{hasPlausibleMaterials:true,hasProperSupplies:true}},
},scene:{id:"scene-1",immediateDanger:false,circumstanceId:1,actions:[]},rolls:[],logs:[]})}
const dice=values=>{let i=0;return{rollD20:()=>values[i++]}};
const action=(state,recipient,payload,values=[10])=>ET.performAction(state,recipient,payload,dice(values));

test("skill catalog order, normalization, and basic roll-under outcomes are canonical",()=>{
  assert.deepEqual(ET.SKILLS.map(s=>s.name),["Athletics","Awareness","Fieldcraft","Firearms","Influence","Mechanics","Medicine","Melee","Mobility","Resolve","Riding","Stealth"]);
  const s=fixture(),actor=s.actors[A];
  assert.equal(ET.resolveSkillCheck({state:s,actor,skillId:"awareness"},dice([10])).record.outcome,"success");
  assert.equal(ET.resolveSkillCheck({state:s,actor,skillId:"awareness"},dice([9])).record.outcome,"success");
  assert.equal(ET.resolveSkillCheck({state:s,actor,skillId:"awareness"},dice([11])).record.outcome,"failure");
  assert.equal(ET.resolveSkillCheck({state:s,actor,skillId:"bogus"},dice([1])).ok,false);
  actor.skills.awareness=20;assert.equal(ET.resolveSkillCheck({state:s,actor,skillId:"awareness"},dice([1])).ok,false);
  const normalized=ET.normalizeActor({skills:{awareness:0,medicine:19,resolve:"twelve",stealth:12}});assert.deepEqual(normalized.skills,{stealth:12});
});

test("boons and banes cancel before the two-die cap and retain the correct die",()=>{
  const cases=[
    [{requestedBoons:1},[15,5],5,1], [{requestedBoons:2},[15,9,4],4,2],
    [{requestedBanes:1},[3,12],12,-1], [{requestedBanes:2},[3,12,17],17,-2],
    [{requestedBoons:1,requestedBanes:1},[8],8,0], [{requestedBoons:3,requestedBanes:1},[18,7,9],7,2],
    [{requestedBoons:4},[18,7,9],7,2], [{requestedBoons:9,requestedBanes:7},[18,7,9],7,2],
  ];
  for(const [spec,rolled,retained,net] of cases){const s=fixture(),r=ET.resolveSkillCheck({state:s,actor:s.actors[A],skillId:"awareness",...spec,boonSources:["help"],baneSources:["injury"]},dice(rolled)).record;
    assert.equal(r.retainedDie,retained);assert.equal(r.netModifier,net);assert.equal(r.dice.length,1+Math.abs(net));}
});

test("only the retained natural die creates a critical or fumble",()=>{
  let s=fixture(),r=ET.resolveSkillCheck({state:s,actor:s.actors[A],skillId:"awareness",requestedBoons:1},dice([20,1])).record;assert.equal(r.critical,true);assert.equal(r.fumble,false);
  s=fixture();r=ET.resolveSkillCheck({state:s,actor:s.actors[A],skillId:"awareness",requestedBoons:1},dice([20,7])).record;assert.equal(r.fumble,false);
  s=fixture();r=ET.resolveSkillCheck({state:s,actor:s.actors[A],skillId:"awareness",requestedBanes:1},dice([1,20])).record;assert.equal(r.fumble,true);assert.equal(r.critical,false);
  s=fixture();r=ET.resolveSkillCheck({state:s,actor:s.actors[A],skillId:"awareness",requestedBanes:1},dice([1,8])).record;assert.equal(r.critical,false);
});

test("player skill requests use canonical actor, skill, purpose, visibility, and host dice",()=>{
  const s=fixture();let r=action(s,owner(A,"key-a"),{type:"requestSkillCheck",actorId:A,skillId:"awareness",boons:1,dice:[1],skillValue:18,outcome:"success",rollPurpose:"attack",visibility:"gm"},[19,18]);
  assert.equal(r.record.skillValue,10);assert.deepEqual(r.record.dice,[19,18]);assert.equal(r.record.outcome,"failure");assert.equal(r.record.rollPurpose,"general");assert.equal(r.record.visibility,"public");
  assert.equal(action(s,owner(A,"key-a"),{type:"requestSkillCheck",actorId:B,skillId:"awareness"}).ok,false);
  assert.equal(action(s,owner(null,"none"),{type:"requestSkillCheck",actorId:A,skillId:"awareness"}).ok,false);
});

test("Push eligibility excludes success, fumble, attack, Down Resolve, and rerolls",()=>{
  const make=(purpose,roll,pushable=true)=>{const s=fixture();return ET.resolveSkillCheck({state:s,actor:s.actors[A],skillId:"awareness",rollPurpose:purpose,pushable},dice([roll])).record;};
  assert.equal(make("general",15).pushable,true);assert.equal(make("general",5).pushable,false);assert.equal(make("general",20).pushable,false);
  assert.equal(make("attack",15).pushable,false);assert.equal(make("downResolve",15).pushable,false);assert.equal(make("general",15,false).pushable,false);
});

test("Push proposal, decline, stale protection, ownership, and atomic acceptance work",()=>{
  const s=fixture();let original=action(s,owner(A,"key-a"),{type:"requestSkillCheck",actorId:A,skillId:"awareness",boons:2,baneSources:["injury"]},[16,17,15]).record;
  assert.equal(original.pushable,true);assert.equal(action(s,gm,{type:"gmProposePushCondition",originalRollId:original.id,conditionId:"shaken"}).ok,true);
  const sequence=s.pendingPush.sequence;assert.equal(action(s,owner(B,"key-b"),{type:"acceptPush",sequence},[2,3,4]).ok,false);
  assert.equal(action(s,owner(A,"key-a"),{type:"acceptPush",sequence,conditionId:"exhausted"},[9,4,7]).ok,true);
  const pushed=s.rolls.at(-1);assert.equal(s.actors[A].conditions.shaken.active,true);assert.equal(s.actors[A].conditions.exhausted.active,false);assert.equal(pushed.pushedFromRollId,original.id);assert.equal(pushed.netModifier,original.netModifier);assert.equal(pushed.pushable,false);
  assert.equal(action(s,owner(A,"key-a"),{type:"acceptPush",sequence},[1]).ok,false);
  const d=fixture();original=action(d,owner(A,"key-a"),{type:"requestSkillCheck",actorId:A,skillId:"awareness"},[15]).record;action(d,gm,{type:"gmProposePushCondition",originalRollId:original.id,conditionId:"distracted"});const seq=d.pendingPush.sequence;
  assert.equal(action(d,owner(A,"key-a"),{type:"declinePush",sequence:seq}).ok,true);assert.equal(d.actors[A].conditions.distracted.active,false);assert.equal(original.outcome,"failure");
  const x=fixture();original=action(x,owner(A,"key-a"),{type:"requestSkillCheck",actorId:A,skillId:"awareness"},[15]).record;action(x,gm,{type:"gmProposePushCondition",originalRollId:original.id,conditionId:"frightened"});x.actors[A].ownerKey="new-key";
  assert.equal(action(x,owner(A,"new-key"),{type:"acceptPush",sequence:x.pendingPush.sequence},[1]).ok,false);assert.equal(x.actors[A].conditions.frightened.active,false);
});

test("GM can resolve a Push for an unassigned GM-controlled actor",()=>{
  const s=fixture();s.actors[A].ownerKey=null;const original=action(s,gm,{type:"requestSkillCheck",actorId:A,skillId:"awareness"},[15]).record;
  action(s,gm,{type:"gmProposePushCondition",originalRollId:original.id,conditionId:"shaken"});const sequence=s.pendingPush.sequence;
  const accepted=action(s,gm,{type:"acceptPush",sequence},[4]);assert.equal(accepted.ok,true);assert.equal(s.pendingPush,null);assert.equal(s.actors[A].conditions.shaken.active,true);
});

test("GM condition controls are independent, persistent, and not auto-applied",()=>{
  const s=fixture();action(s,gm,{type:"gmAddCondition",targetActorId:A,conditionId:"exhausted",source:"no sleep",notes:"GM detail"});action(s,gm,{type:"gmAddCondition",targetActorId:A,conditionId:"distracted"});
  const r=action(s,owner(A,"key-a"),{type:"requestSkillCheck",actorId:A,skillId:"awareness"},[8]).record;assert.equal(r.requestedBanes,0);
  const withBanes=action(s,owner(A,"key-a"),{type:"requestSkillCheck",actorId:A,skillId:"awareness",banes:2,baneSources:["exhausted","distracted"]},[2,5,16]).record;assert.equal(withBanes.netModifier,-2);
  action(s,gm,{type:"gmClearCondition",targetActorId:A,conditionId:"distracted"});assert.equal(s.actors[A].conditions.exhausted.active,true);assert.equal(s.actors[A].conditions.distracted.active,false);
  action(s,gm,{type:"gmClearAllConditions",targetActorId:A,reason:"full night in safety"});assert.ok(Object.values(s.actors[A].conditions).every(c=>!c.active));
  const saved=ET.normalizeState(JSON.parse(JSON.stringify(s)),{cancelPending:true});assert.ok(Object.values(saved.actors[A].conditions).every(c=>!c.active));
});

test("medical checks share the resolver and defer Push-eligible consequences",()=>{
  const first=fixture();first.actors[B].health={state:"down",stable:false,dyingFailures:0,dead:false};
  let r=action(first,owner(A,"key-a"),{type:"attemptFirstAid",healerActorId:A,targetActorId:B},[15]);assert.equal(r.record.skillId,"medicine");assert.equal(r.record.rollPurpose,"firstAid");assert.equal(first.actors[B].health.stable,false);assert.equal(first.actors[B].treatmentBlock,undefined);
  action(first,gm,{type:"gmProposePushCondition",originalRollId:r.record.id,conditionId:"shaken"});action(first,owner(A,"key-a"),{type:"acceptPush",sequence:first.pendingPush.sequence},[4]);assert.equal(first.actors[B].health.stable,true);
  const med=fixture();med.actors[B].health={state:"wounded",stable:true,dyingFailures:0,dead:false};r=action(med,owner(A,"key-a"),{type:"attemptExtendedMedicine",healerActorId:A,targetActorId:B},[18]);assert.equal(r.record.rollPurpose,"extendedMedicine");assert.equal(med.actors[B].treatmentBlock,undefined);
  action(med,gm,{type:"gmProposePushCondition",originalRollId:r.record.id,conditionId:"distracted"});action(med,owner(A,"key-a"),{type:"acceptPush",sequence:med.pendingPush.sequence},[2]);assert.equal(med.actors[B].health.state,"unhurt");assert.equal(med.actors[B].treatmentBlock,undefined);
  const failed=fixture();failed.actors[B].health={state:"wounded",stable:true,dyingFailures:0,dead:false};r=action(failed,owner(A,"key-a"),{type:"attemptExtendedMedicine",healerActorId:A,targetActorId:B},[18]);action(failed,gm,{type:"gmProposePushCondition",originalRollId:r.record.id,conditionId:"exhausted"});action(failed,owner(A,"key-a"),{type:"acceptPush",sequence:failed.pendingPush.sequence},[19]);assert.ok(failed.actors[B].treatmentBlock);
});

test("Down Resolve uses shared resolver and Field Medicine remains automatic",()=>{
  const s=fixture();s.actors[A].health={state:"down",stable:false,dyingFailures:0,dead:false};let r=action(s,owner(A,"key-a"),{type:"downResolve",targetActorId:A},[1]);assert.equal(r.record.skillId,"resolve");assert.equal(r.record.critical,true);assert.equal(r.record.pushable,false);assert.equal(s.actors[A].health.stable,true);
  const f=fixture();f.actors[A].talents={fieldMedicine:true};f.actors[B].health={state:"down",stable:false,dyingFailures:1,dead:false};const before=f.rolls.length;r=action(f,owner(A,"key-a"),{type:"useFieldMedicine",healerActorId:A,targetActorId:B});assert.equal(r.ok,true);assert.equal(f.rolls.length,before);assert.equal(f.actors[B].health.state,"wounded");
});

test("roll and Push projection obey public, owner, GM, and responder visibility",()=>{
  const s=fixture();action(s,gm,{type:"requestSkillCheck",actorId:A,skillId:"awareness",visibility:"public"},[5]);action(s,gm,{type:"requestSkillCheck",actorId:A,skillId:"awareness",visibility:"owner"},[6]);action(s,gm,{type:"requestSkillCheck",actorId:A,skillId:"awareness",visibility:"gm"},[7]);
  const failed=action(s,owner(A,"key-a"),{type:"requestSkillCheck",actorId:A,skillId:"awareness"},[15]).record;action(s,gm,{type:"gmProposePushCondition",originalRollId:failed.id,conditionId:"shaken"});
  const a=projectCampaignStateForRecipient(s,normalizeRecipientContext(owner(A,"key-a"))),b=projectCampaignStateForRecipient(s,normalizeRecipientContext(owner(B,"key-b")));
  assert.equal(a.rolls.filter(x=>x.visibility==="owner").length,1);assert.equal(a.rolls.some(x=>x.visibility==="gm"),false);assert.equal(b.rolls.some(x=>x.visibility==="owner"),false);
  assert.equal(a.pendingPush.proposedConditionId,"shaken");assert.equal(b.pendingPush,null);assert.equal(a.actors[A].conditions.shaken.notes,undefined);
});

test("history is bounded and load normalization cancels unresolved Pushes",()=>{
  const s=fixture();for(let i=0;i<ET.HISTORY_LIMIT+20;i++)ET.resolveSkillCheck({state:s,actor:s.actors[A],skillId:"awareness"},dice([5]));assert.equal(s.rolls.length,ET.HISTORY_LIMIT);
  const failed=action(s,owner(A,"key-a"),{type:"requestSkillCheck",actorId:A,skillId:"awareness"},[15]).record;action(s,gm,{type:"gmProposePushCondition",originalRollId:failed.id,conditionId:"shaken"});assert.ok(s.pendingPush);
  const loaded=ET.normalizeState(JSON.parse(JSON.stringify(s)),{cancelPending:true});assert.equal(loaded.pendingPush,null);assert.equal(loaded.rolls.at(-1).id,failed.id);
});

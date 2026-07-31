const test=require("node:test");
const assert=require("node:assert/strict");
const ET=require("../content/east-tennessee-health.js");
const {projectCampaignStateForRecipient,normalizeRecipientContext,authorizePlayerCampaignMutation}=require("../app/core.js");

const A="east-tennessee-1861:actor:patient",H="east-tennessee-1861:actor:healer",J="east-tennessee-1861:actor:jacob-sloane";
function fixture(){return ET.normalizeState({namespace:ET.CAMPAIGN_ID,actors:{
  [A]:{actorId:A,ownerKey:"patient-key",identity:{name:"Patient"},privateNotes:{visibility:"owner",data:{secret:"owner only"}},health:{state:"unhurt",stable:true,dyingFailures:0,dead:false},injuries:[],resolveValue:10},
  [H]:{actorId:H,ownerKey:"healer-key",identity:{name:"Healer"},health:{state:"unhurt"},medicalCapability:{medicineValue:12,hasPlausibleMaterials:true,hasProperSupplies:true}},
  [J]:{actorId:J,ownerKey:"jacob-key",identity:{name:"Jacob"},health:{state:"unhurt"},medicalCapability:{medicineValue:14,hasPlausibleMaterials:true,hasProperSupplies:true},talents:{fieldMedicine:true}},
},scene:{id:"scene-1",immediateDanger:false,circumstanceId:1,actions:[]},logs:[],fieldMedicineUsage:{}})}
const gm={role:"gm"};
const owner=(actorId,key)=>({role:"player",campaignId:ET.CAMPAIGN_ID,actorId,playerKey:key,partyMember:true});
const act=(state,recipient,action,roll=1,options={})=>ET.performAction(state,recipient,action,{rollD20:()=>roll,...options});

test("serious and critical hits advance capped health and create one injury",()=>{
  const s=fixture();act(s,gm,{type:"applySeriousHit",targetActorId:A,description:"Cut"});assert.equal(s.actors[A].health.state,"wounded");
  act(s,gm,{type:"applySeriousHit",targetActorId:A,description:"Shot"});assert.equal(s.actors[A].health.state,"down");assert.equal(s.actors[A].health.stable,false);
  act(s,gm,{type:"applySeriousHit",targetActorId:A,description:"More"});assert.equal(s.actors[A].health.state,"down");
  const c=fixture();act(c,gm,{type:"applyCriticalHit",targetActorId:A,description:"Crushed"});assert.equal(c.actors[A].health.state,"down");assert.equal(c.actors[A].injuries.length,1);assert.equal(c.actors[A].injuries[0].severity,"severe");
});

test("Down Resolve is host-rolled, owner-scoped, stabilizes or kills on second failure",()=>{
  const s=fixture();act(s,gm,{type:"applyCriticalHit",targetActorId:A});
  assert.equal(act(s,owner(A,"wrong"),{type:"downResolve",targetActorId:A}).ok,false);
  assert.equal(act(s,owner(A,"patient-key"),{type:"downResolve",targetActorId:A},8).passed,true);assert.equal(s.actors[A].health.stable,true);
  assert.equal(act(s,owner(A,"patient-key"),{type:"downResolve",targetActorId:A},8).ok,false);
  const f=fixture();act(f,gm,{type:"applyCriticalHit",targetActorId:A});act(f,owner(A,"patient-key"),{type:"downResolve",targetActorId:A},20);assert.equal(f.actors[A].health.dyingFailures,1);
  act(f,owner(A,"patient-key"),{type:"downResolve",targetActorId:A},20);assert.equal(f.actors[A].health.dead,true);assert.equal(f.actors[A].health.dyingFailures,2);
});

test("First Aid validates canonical materials, records danger action, and only stabilizes on success",()=>{
  const s=fixture();act(s,gm,{type:"applyCriticalHit",targetActorId:A});act(s,gm,{type:"setImmediateDanger",active:true});
  let r=act(s,owner(H,"healer-key"),{type:"attemptFirstAid",healerActorId:H,targetActorId:A},20);assert.equal(r.passed,false);assert.equal(s.actors[A].health.stable,false);
  r=act(s,owner(H,"healer-key"),{type:"attemptFirstAid",healerActorId:H,targetActorId:A},2);assert.equal(r.passed,true);assert.equal(s.actors[A].health.state,"down");assert.equal(s.scene.actions.length,2);
  const no=fixture();act(no,gm,{type:"applyCriticalHit",targetActorId:A});no.actors[H].medicalCapability.hasPlausibleMaterials=false;
  assert.equal(act(no,owner(H,"healer-key"),{type:"attemptFirstAid",healerActorId:H,targetActorId:A,hasPlausibleMaterials:true}).ok,false);
});

test("extended Medicine obeys danger, stability, supplies, repeat blocks, and preserves injuries",()=>{
  const s=fixture();act(s,gm,{type:"applyCriticalHit",targetActorId:A,description:"Broken arm"});
  act(s,gm,{type:"setImmediateDanger",active:true});assert.equal(act(s,owner(H,"healer-key"),{type:"attemptExtendedMedicine",healerActorId:H,targetActorId:A},1).ok,false);
  act(s,gm,{type:"setImmediateDanger",active:false});assert.equal(act(s,owner(H,"healer-key"),{type:"attemptExtendedMedicine",healerActorId:H,targetActorId:A},1).ok,false);
  act(s,gm,{type:"gmSetStabilization",targetActorId:A,stable:true});let r=act(s,owner(H,"healer-key"),{type:"attemptExtendedMedicine",healerActorId:H,targetActorId:A},20);assert.equal(r.passed,false);assert.ok(s.actors[A].treatmentBlock);
  assert.equal(act(s,owner(H,"healer-key"),{type:"attemptExtendedMedicine",healerActorId:H,targetActorId:A},1).ok,false);
  act(s,gm,{type:"advanceTreatmentCircumstance"});r=act(s,owner(H,"healer-key"),{type:"attemptExtendedMedicine",healerActorId:H,targetActorId:A,injuryId:s.actors[A].injuries[0].id},1);
  assert.equal(r.passed,true);assert.equal(s.actors[A].health.state,"wounded");assert.equal(s.actors[A].injuries.length,1);assert.equal(s.actors[A].injuries[0].treatmentState,"treated");
  act(s,owner(H,"healer-key"),{type:"attemptExtendedMedicine",healerActorId:H,targetActorId:A},1);assert.equal(s.actors[A].health.state,"unhurt");assert.equal(s.actors[A].injuries.length,1);
});

test("Field Medicine validates talent, supplies, adjacency, and per-healer/patient/scene use",()=>{
  const s=fixture();act(s,gm,{type:"applyCriticalHit",targetActorId:A});s.actors[A].health.dyingFailures=1;
  assert.equal(act(s,owner(H,"healer-key"),{type:"useFieldMedicine",healerActorId:H,targetActorId:A}).ok,false);
  assert.equal(act(s,owner(J,"jacob-key"),{type:"useFieldMedicine",healerActorId:J,targetActorId:A},1,{tokens:[{actorId:J,x:0,y:0},{actorId:A,x:4,y:0}]}).ok,false);
  assert.equal(act(s,owner(J,"jacob-key"),{type:"useFieldMedicine",healerActorId:J,targetActorId:A},1,{tokens:[{actorId:J,x:0,y:0},{actorId:A,x:1,y:0}]}).ok,true);
  assert.equal(s.actors[A].health.state,"wounded");assert.equal(s.actors[A].health.stable,true);assert.equal(s.actors[A].health.dyingFailures,0);assert.equal(s.actors[A].injuries.length,1);
  act(s,gm,{type:"gmSetHealth",targetActorId:A,state:"down"});assert.equal(act(s,owner(J,"jacob-key"),{type:"useFieldMedicine",healerActorId:J,targetActorId:A}).ok,false);
  const saved=JSON.parse(JSON.stringify(s));assert.equal(Object.keys(saved.fieldMedicineUsage).length,1);assert.equal(act(saved,gm,{type:"beginNewScene",sceneId:"scene-1"}).ok,false);
  assert.equal(act(saved,gm,{type:"beginNewScene",sceneId:"scene-2"}).ok,true);assert.deepEqual(saved.fieldMedicineUsage,{});assert.equal(saved.actors[A].injuries.length,1);
});

test("injury healing and health restoration are independent and GM-only",()=>{
  const s=fixture();act(s,gm,{type:"applySeriousHit",targetActorId:A});const id=s.actors[A].injuries[0].id;
  assert.equal(act(s,owner(A,"patient-key"),{type:"markInjuryHealed",targetActorId:A,injuryId:id}).ok,false);
  act(s,gm,{type:"markInjuryHealed",targetActorId:A,injuryId:id});assert.equal(s.actors[A].health.state,"wounded");assert.equal(s.actors[A].injuries[0].healed,true);
  act(s,gm,{type:"gmSetHealth",targetActorId:A,state:"unhurt"});assert.equal(s.actors[A].injuries.length,1);
});

test("projection exposes party mechanics but omits recovery and capabilities from nonowners",()=>{
  const s=fixture();act(s,gm,{type:"applySeriousHit",targetActorId:A,description:"Hidden recovery test",recoveryRequirement:"GM requirement",recoveryNotes:"GM note"});
  const p=normalizeRecipientContext(owner(H,"healer-key")),projected=projectCampaignStateForRecipient(s,p),patient=projected.actors[A];
  assert.equal(patient.health.state,"wounded");assert.equal(patient.injuries[0].description,"Hidden recovery test");assert.equal("recoveryRequirement" in patient.injuries[0],false);assert.equal(JSON.stringify(projected).includes("GM note"),false);assert.equal(patient.medicalCapability,undefined);
  assert.equal(projected.actors[H].medicalCapability.hasProperSupplies,true);assert.equal(JSON.stringify(projected).includes("owner only"),false);
});

test("generic owner patches cannot change East Tennessee mechanical domains",()=>{
  const session={campaignId:ET.CAMPAIGN_ID,campaignState:fixture()};const recipient=normalizeRecipientContext(owner(A,"patient-key"));
  const mutation=authorizePlayerCampaignMutation(session,recipient,{type:"actor.update",actorId:A,changes:{health:{state:"unhurt"},injuries:[],talents:{fieldMedicine:true}}});
  assert.equal(mutation,null);
});

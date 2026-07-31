(function(root){
"use strict";
const ID="east-tennessee-1861";
const A={elias:"east-tennessee-1861:actor:elias-rourke",clara:"east-tennessee-1861:actor:clara-webb",jacob:"east-tennessee-1861:actor:jacob-sloane",ned:"east-tennessee-1861:actor:ned-hale",tom:"east-tennessee-1861:actor:tom-whitaker"};
const clone=v=>JSON.parse(JSON.stringify(v)),obj=v=>v&&typeof v==="object"&&!Array.isArray(v),fail=reason=>({ok:false,reason});
const owns=(r,a)=>r?.role==="gm"||!!(r?.role==="player"&&a?.ownerKey&&a.ownerKey===r.playerKey&&a.actorId===r.actorId);
const DEFINITIONS=Object.freeze({
 "get-down":{id:"get-down",actorId:A.elias,name:"Get Down!",rulesText:"Spend Elias’s unspent action when he or an adjacent willing ally is targeted by gunfire to move into actual nearby cover."},
 "sharp-eye":{id:"sharp-eye",actorId:A.clara,name:"Sharp Eye",rulesText:"Once per scene, automatically succeed on an appropriate physically observable Awareness check."},
 "field-medicine":{id:"field-medicine",actorId:A.jacob,name:"Field Medicine",rulesText:"With proper supplies and an action, return an adjacent Down character to Wounded; each patient once per scene."},
 "trusted-voice":{id:"trusted-voice",actorId:A.ned,name:"Trusted Voice",rulesText:"Once per scene, Push a failed Influence roll without taking a condition; the reroll is final."},
 "set-the-order":{id:"set-the-order",actorId:A.tom,name:"Set the Order",rulesText:"After initiative is rolled but before anyone acts, exchange Tom’s result with one willing PC."},
});
function normalizeState(v,opt={}){const s=obj(v)?clone(v):{};s.talentUsage=obj(s.talentUsage)?s.talentUsage:{scene:{},round:{},pending:null};s.talentUsage.scene=obj(s.talentUsage.scene)?s.talentUsage.scene:{};s.talentUsage.round=obj(s.talentUsage.round)?s.talentUsage.round:{};s.talentUsage.pending=opt.cancelPending?null:(obj(s.talentUsage.pending)?s.talentUsage.pending:null);s.nextTalentSequence=Math.max(1,+s.nextTalentSequence||1);return s;}
function actor(s,id){return s.actors?.[id]}function entry(s,id){const sp=s.structuredPlay||{};return(sp.initiativeEntries||[]).find(e=>(e.participantIds||[]).some(x=>(sp.participants||[]).find(p=>p.id===x)?.actorId===id));}
function finish(c,s,x={}){Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,s);return{ok:true,state:c,...x};}function sceneKey(s,id){return`${s.scene?.id||"scene"}:${id}`;}function log(s,m){s.logs=Array.isArray(s.logs)?s.logs:[];s.nextLogId=Math.max(1,+s.nextLogId||1);s.logs.push({id:`et-log-${s.nextLogId++}`,visibility:"public",revealed:true,message:String(m).slice(0,400)});}
function pending(s,type,sequence){const p=s.talentUsage.pending;return p&&p.type===type&&(sequence==null||p.sequence===+sequence)?p:null;}
function performAction(c,r,a,opt={}){
 if(!obj(c)||c.namespace!==ID||!obj(a))return fail("invalid talent action");
 const s=normalizeState(c),gm=r?.role==="gm",type=String(a.type||""),owned=id=>owns(r,actor(s,id));
 if(type==="flagGetDown"){
  const attack=s.pendingAttack,target=actor(s,attack?.targetActorId),elias=actor(s,A.elias),weapon=root.EastTennesseeCombat?.WEAPONS[attack?.weaponId];if(!attack||!target||!elias||!weapon?.tags?.includes("firearm")||!owns(r,target)&&!owned(A.elias))return fail("involved owner and pending firearm attack required");
  s.talentUsage.pending={type:"get-down",sequence:s.nextTalentSequence++,attackId:attack.id,attackSequence:attack.sequence,roundNumber:s.structuredPlay?.roundNumber||0,targetActorId:target.actorId,flagged:true,involvedOwnerKeys:[target.ownerKey,elias.ownerKey].filter(Boolean)};return finish(c,s);
 }
 if(type==="gmApplyGetDown"){
  if(!gm)return fail("GM authorization required");const attack=s.pendingAttack,elias=actor(s,A.elias),target=actor(s,attack?.targetActorId),e=entry(s,A.elias),weapon=root.EastTennesseeCombat?.WEAPONS[attack?.weaponId];
  if(!attack||!target||!elias||!weapon?.tags?.includes("firearm"))return fail("pending firearm attack required");if(!e||!["unspent","delayed"].includes(e.actionState)||elias.health?.dead||elias.health?.state==="down")return fail("Elias cannot spend an action");
  if(a.adjacent!==true||a.coverExists!==true||!["partial","strong"].includes(a.cover)||!String(a.positionDescription||"").trim())return fail("GM-confirmed adjacency and actual cover required");
  if(e.actionState==="delayed"){s.structuredPlay.delayedEntryIds=(s.structuredPlay.delayedEntryIds||[]).filter(id=>id!==e.entryId);if(!s.structuredPlay.completedEntryIds.includes(e.entryId))s.structuredPlay.completedEntryIds.push(e.entryId);}e.actionState="reactionConsumed";s.structuredPlay.stateVersion++;
  target.combatContext.cover=a.cover;target.combatContext.coverDescription=String(a.positionDescription).slice(0,240);elias.aim={active:false};if(a.moveElias===true){elias.combatContext.cover=a.eliasCover==="strong"?"strong":a.cover;elias.combatContext.coverDescription=String(a.eliasPositionDescription||a.positionDescription).slice(0,240);}s.talentUsage.pending=null;
  log(s,`Elias uses Get Down! to pull ${target.identity?.name||"an ally"} into actual nearby cover.`);if(a.lineOfSightRemains===false){s.pendingAttack=null;delete s.pendingWeaponInstanceId;log(s,"The pending shot is cancelled because the target is no longer visible.");}return finish(c,s);
 }
 if(type==="gmClearGetDownFlag"){if(!gm)return fail("GM authorization required");if(pending(s,"get-down"))s.talentUsage.pending=null;return finish(c,s);}
 if(type==="gmProposeAwarenessCheck"){
  if(!gm)return fail("GM authorization required");if(s.talentUsage.pending)return fail("another talent adjudication is pending");const clara=actor(s,A.clara);if(!clara||a.skillId!=="awareness"||!String(a.purpose||"").trim())return fail("canonical Clara Awareness context required");
  const p={type:"sharp-eye",sequence:s.nextTalentSequence++,checkId:`sharp-eye-check-${s.nextTalentSequence}`,actorId:A.clara,ownerKey:clara.ownerKey||null,purpose:String(a.purpose).slice(0,240),usesAction:a.usesAction!==false,visibility:a.visibility==="owner"?"owner":"public",flagged:false,involvedOwnerKeys:[clara.ownerKey].filter(Boolean)};s.talentUsage.pending=p;return finish(c,s,{pending:clone(p)});
 }
 if(type==="flagSharpEye"){
  const p=pending(s,"sharp-eye",a.sequence);if(!p||!owned(A.clara)||p.ownerKey!==actor(s,A.clara)?.ownerKey||a.checkId!==p.checkId)return fail("canonical unresolved Awareness check required");p.flagged=true;return finish(c,s,{pending:clone(p)});
 }
 if(type==="gmApplySharpEye"){
  if(!gm)return fail("GM authorization required");const p=pending(s,"sharp-eye",a.sequence),clara=actor(s,A.clara),key=sceneKey(s,"sharp-eye");
  if(!p||!clara||clara.ownerKey!==p.ownerKey||s.talentUsage.scene[key])return fail("stale or unavailable Sharp Eye request");
  if(a.awarenessAppropriate!==true||a.physicallyObservable!==true||a.possibleKnowledge!==true)return fail("GM must confirm an appropriate possible observable check");
  if(p.usesAction){const used=root.EastTennesseeRounds.consumeAction(s,A.clara,"Sharp Eye");if(!used.ok)return used;}
  const roll={id:`et-roll-${s.nextRollId++}`,actorId:A.clara,skillId:"awareness",purpose:p.purpose,outcome:"success",critical:false,fumble:false,resultType:"talentAutoSuccess",visibility:p.visibility,timestamp:Date.now()};s.rolls.push(roll);s.talentUsage.scene[key]={sceneId:s.scene?.id,checkId:p.checkId};s.talentUsage.pending=null;log(s,"Clara uses Sharp Eye and automatically succeeds at an observable Awareness check.");return finish(c,s,{roll});
 }
 if(type==="gmClearSharpEye"){if(!gm)return fail("GM authorization required");if(!pending(s,"sharp-eye",a.sequence))return fail("stale Sharp Eye context");s.talentUsage.pending=null;return finish(c,s);}
 if(type==="useTrustedVoice"){
  if(!owned(A.ned))return fail("Ned ownership required");const key=sceneKey(s,"trusted-voice"),roll=s.rolls?.find(x=>x.id===a.rollId);if(s.talentUsage.scene[key]||!roll||roll.actorId!==A.ned||roll.skillId!=="influence"||roll.outcome!=="failure"||roll.fumble||roll.pushed||roll.resultType==="talentReroll")return fail("eligible failed Influence roll required");
  const die=Math.max(1,Math.min(20,Number(opt.rollD20?.()||a.testRoll||20))),value=actor(s,A.ned).skills.influence;s.talentUsage.scene[key]={sceneId:s.scene?.id,rollId:roll.id};roll.supersededBy=`${roll.id}-trusted`;const reroll={...clone(roll),id:`${roll.id}-trusted`,die,outcome:die<=value?"success":"failure",critical:die===1,fumble:die===20,pushed:true,resultType:"talentReroll",final:true,timestamp:Date.now()};s.rolls.push(reroll);s.pendingPush=null;log(s,"Ned uses Trusted Voice to reroll a failed Influence check without taking a condition.");return finish(c,s,{roll:reroll});
 }
 if(type==="proposeSetOrder"){
  if(!owned(A.tom))return fail("Tom ownership required");const sp=s.structuredPlay||{},te=entry(s,A.tom),target=entry(s,a.targetActorId);if(!sp.active||sp.phase!=="initiative"||sp.currentEntryId||!sp.initiativeEntries?.length||!te||!target||target===te||s.talentUsage.round[`set-order:${sp.roundNumber}`])return fail("initiative exchange unavailable");const participant=(target.participantIds||[]).map(id=>(sp.participants||[]).find(p=>p.id===id)).find(p=>p?.actorId===a.targetActorId);if(participant?.kind!=="pc")return fail("willing active PC required");const ta=actor(s,a.targetActorId);s.talentUsage.pending={type:"set-order",sequence:s.nextTalentSequence++,round:sp.roundNumber,tomOwnerKey:actor(s,A.tom).ownerKey,targetActorId:a.targetActorId,targetOwnerKey:ta?.ownerKey,involvedOwnerKeys:[actor(s,A.tom).ownerKey,ta?.ownerKey].filter(Boolean)};return finish(c,s);
 }
 if(type==="resolveSetOrder"){
  const p=pending(s,"set-order",a.sequence),sp=s.structuredPlay||{},target=actor(s,p?.targetActorId);if(!p||p.round!==sp.roundNumber||sp.phase!=="initiative"||sp.currentEntryId)return fail("stale initiative exchange");if(!gm&&!(owns(r,target)&&a.accept))return fail("target consent required");if(!a.accept&&!gm){s.talentUsage.pending=null;return finish(c,s);}const te=entry(s,A.tom),xe=entry(s,p.targetActorId);if(!te||!xe)return fail("initiative entries unavailable");[te.initiativeRoll,xe.initiativeRoll]=[xe.initiativeRoll,te.initiativeRoll];s.talentUsage.round[`set-order:${sp.roundNumber}`]=true;s.talentUsage.pending=null;sp.initiativeEntries.sort((x,y)=>x.initiativeRoll-y.initiativeRoll||(x.tieClass==="pc"?-1:1));log(s,`Tom uses Set the Order to exchange initiative with ${target.identity?.name||"another character"}.`);return finish(c,s);
 }
 return fail("unknown talent action");
}
root.EastTennesseeTalents=Object.freeze({CAMPAIGN_ID:ID,DEFINITIONS,normalizeState,performAction});if(typeof module!=="undefined"&&module.exports)module.exports=root.EastTennesseeTalents;
})(typeof globalThis!=="undefined"?globalThis:this);

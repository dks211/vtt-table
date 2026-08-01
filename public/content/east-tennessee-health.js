(function(root){
  "use strict";
  const CAMPAIGN_ID="east-tennessee-1861",HISTORY_LIMIT=150;
  const STATES=["unhurt","wounded","down"];
  const SKILLS=Object.freeze([
    ["athletics","Athletics"],["awareness","Awareness"],["fieldcraft","Fieldcraft"],["firearms","Firearms"],
    ["influence","Influence"],["mechanics","Mechanics"],["medicine","Medicine"],["melee","Melee"],
    ["mobility","Mobility"],["resolve","Resolve"],["riding","Riding"],["stealth","Stealth"],
  ].map(([id,name])=>Object.freeze({id,name})));
  const SKILL_IDS=new Set(SKILLS.map(skill=>skill.id));
  const CONDITIONS=Object.freeze(["exhausted","shaken","frightened","distracted"]);
  const PURPOSES=new Set(["general","attack","rangedAttack","meleeAttack","downResolve","firstAid","extendedMedicine"]);
  const VISIBILITIES=new Set(["public","owner","gm"]);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const object=value=>value&&typeof value==="object"&&!Array.isArray(value);
  const text=(value,max=240)=>String(value||"").trim().slice(0,max);
  const integer=(value,min,max,fallback=0)=>Number.isInteger(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
  const actorName=actor=>text(actor&&actor.identity&&actor.identity.name,80)||"Character";
  const owns=(recipient,actor)=>recipient&&recipient.role==="gm"||!!(recipient&&actor&&recipient.playerKey&&(recipient.actorId===actor.actorId&&recipient.playerKey===actor.ownerKey||recipient.playerKey===actor.delegatedOwnerKey));
  const fail=reason=>({ok:false,reason});
  const success=(state,result={})=>({ok:true,state,...result});
  const defaultConditions=()=>Object.fromEntries(CONDITIONS.map(id=>[id,{active:false,source:null,notes:null}]));
  const cleanSources=value=>(Array.isArray(value)?value:String(value||"").split(",")).map(item=>text(item,80)).filter(Boolean).slice(0,20);
  const nextDie=options=>integer(options&&options.rollD20?options.rollD20():Math.floor(Math.random()*20)+1,1,20,20);
  const skillName=id=>SKILLS.find(skill=>skill.id===id)?.name||id;

  function normalizeSkills(value,legacy={}){
    const source=object(value)?value:{};const out={};
    for(const {id} of SKILLS){
      const candidate=source[id]??(id==="resolve"?legacy.resolveValue:id==="medicine"?legacy.medicineValue:undefined);
      if(Number.isInteger(Number(candidate))&&Number(candidate)>=1&&Number(candidate)<=18)out[id]=Number(candidate);
    }
    return out;
  }
  function normalizeActor(actor){
    const out=object(actor)?clone(actor):{};const health=object(out.health)?out.health:{};
    health.state=STATES.includes(health.state)?health.state:"unhurt";health.stable=health.state==="down"?!!health.stable:true;
    health.dyingFailures=integer(health.dyingFailures,0,2);health.dead=!!health.dead;out.health=health;
    out.injuries=Array.isArray(out.injuries)?out.injuries.map((item,index)=>({id:text(item.id)||`legacy-injury-${index+1}`,
      description:text(item.description)||"Injury",severity:item.severity==="severe"?"severe":"ordinary",relevantBane:text(item.relevantBane),
      treatmentState:item.treatmentState==="treated"?"treated":"untreated",recoveryRequirement:text(item.recoveryRequirement,500),
      recoveryNotes:text(item.recoveryNotes,1000),healed:!!item.healed})):[];
    const medicineValue=out.medicalCapability&&out.medicalCapability.medicineValue;
    out.skills=normalizeSkills(out.skills,{resolveValue:out.resolveValue,medicineValue});
    delete out.resolveValue;
    out.medicalCapability={hasPlausibleMaterials:!!(out.medicalCapability&&out.medicalCapability.hasPlausibleMaterials),
      hasProperSupplies:!!(out.medicalCapability&&out.medicalCapability.hasProperSupplies)};
    out.talents={fieldMedicine:!!(out.talents&&out.talents.fieldMedicine)};
    const conditions=defaultConditions();
    if(object(out.conditions))for(const id of CONDITIONS){const item=out.conditions[id];if(object(item))conditions[id]={active:!!item.active,source:text(item.source,160)||null,notes:text(item.notes,500)||null};}
    out.conditions=conditions;if(!object(out.treatmentBlock))delete out.treatmentBlock;return out;
  }
  function sceneOf(state){state.scene=object(state.scene)?state.scene:{};state.scene.id=text(state.scene.id,100)||"east-tennessee-1861-placeholder";
    state.scene.immediateDanger=!!state.scene.immediateDanger;state.scene.circumstanceId=Math.max(1,Number(state.scene.circumstanceId)||1);
    state.scene.actions=Array.isArray(state.scene.actions)?state.scene.actions:[];return state.scene;}
  function normalizeState(value,options={}){
    const state=object(value)?clone(value):{};state.namespace=CAMPAIGN_ID;state.actors=object(state.actors)?state.actors:{};
    for(const [id,actor] of Object.entries(state.actors)){state.actors[id]=normalizeActor(actor);state.actors[id].actorId=id;}
    sceneOf(state);state.fieldMedicineUsage=object(state.fieldMedicineUsage)?state.fieldMedicineUsage:{};state.logs=Array.isArray(state.logs)?state.logs.slice(-500):[];
    state.rolls=Array.isArray(state.rolls)?state.rolls.filter(object).slice(-HISTORY_LIMIT):[];
    state.pendingPush=options.cancelPending?null:(object(state.pendingPush)?clone(state.pendingPush):null);
    state.nextInjuryId=Math.max(1,Number(state.nextInjuryId)||1);state.nextLogId=Math.max(1,Number(state.nextLogId)||1);
    state.nextRollId=Math.max(1,Number(state.nextRollId)||1);state.pushSequence=Math.max(1,Number(state.pushSequence)||1);return state;
  }
  function addLog(state,message,visibility="public",ownerActorId=null){state.logs.push({id:`et-log-${state.nextLogId++}`,visibility,
    ...(ownerActorId?{ownerActorId}:{}),revealed:true,message:text(message,400)});state.logs=state.logs.slice(-500);}
  function addRoll(state,record){state.rolls.push(record);state.rolls=state.rolls.slice(-HISTORY_LIMIT);return record;}
  function resolveSkillCheck({state,actor,skillId,requestedBoons=0,requestedBanes=0,boonSources=[],baneSources=[],rollPurpose="general",pushable=true,metadata={},visibility="public",pushedFromRollId=null},options={}){
    if(!actor||!SKILL_IDS.has(skillId))return fail("invalid skill");const skillValue=actor.skills&&actor.skills[skillId];
    if(!Number.isInteger(skillValue)||skillValue<1||skillValue>18)return fail("actor does not possess a valid skill value");
    const boons=integer(requestedBoons,0,20),banes=integer(requestedBanes,0,20),cancelledPairs=Math.min(boons,banes),balance=boons-banes;
    const netModifier=Math.max(-2,Math.min(2,balance)),dice=Array.from({length:1+Math.abs(netModifier)},()=>nextDie(options));
    const retainedDie=netModifier>0?Math.min(...dice):netModifier<0?Math.max(...dice):dice[0];
    const critical=retainedDie===1,fumble=retainedDie===20,outcome=retainedDie<=skillValue?"success":"failure";
    const purpose=PURPOSES.has(rollPurpose)?rollPurpose:"general",canPush=outcome==="failure"&&!fumble&&!new Set(["attack","rangedAttack","meleeAttack","downResolve"]).has(purpose)&&pushable!==false&&!pushedFromRollId;
    const record={id:`et-roll-${state.nextRollId++}`,actorId:actor.actorId,actorName:actorName(actor),skillId,skillValue,
      requestedBoons:boons,requestedBanes:banes,boonSources:cleanSources(boonSources),baneSources:cleanSources(baneSources),cancelledPairs,
      netModifier,dice,retainedDie,outcome,critical,fumble,rollPurpose:purpose,pushable:canPush,pushedFromRollId:pushedFromRollId||null,
      visibility:VISIBILITIES.has(visibility)?visibility:"public",ownerActorId:actor.actorId,timestamp:Number(options.timestamp)||Date.now(),
      metadata:object(metadata)?clone(metadata):{}};
    addRoll(state,record);addLog(state,`${record.actorName} rolls ${skillName(skillId)} ${skillValue}: [${dice.join(", ")}] → ${retainedDie}, ${critical?"critical success":fumble?"fumble":outcome}.`,record.visibility,record.visibility==="owner"?actor.actorId:null);
    return {ok:true,record};
  }
  const transition=(actor,steps)=>{const next=Math.min(2,Math.max(0,STATES.indexOf(actor.health.state))+steps);actor.health.state=STATES[next];if(actor.health.state==="down"){actor.health.stable=false;actor.health.dyingFailures=0;}};
  const injury=(state,severity,action)=>({id:`et-injury-${state.nextInjuryId++}`,description:text(action.description)||(severity==="severe"?"Severe injury":"Injury"),severity,
    relevantBane:text(action.relevantBane)||"One bane when this injury is relevant.",treatmentState:"untreated",recoveryRequirement:text(action.recoveryRequirement,500),recoveryNotes:text(action.recoveryNotes,1000),healed:false});
  const actionUsed=(state,actorId,type,targetActorId)=>{const scene=sceneOf(state);if(scene.immediateDanger)scene.actions.push({sceneId:scene.id,actorId,type,targetActorId});};
  const adjacent=(options,a,b)=>{const tokens=Array.isArray(options.tokens)?options.tokens:[],ta=tokens.find(t=>t.actorId===a),tb=tokens.find(t=>t.actorId===b);
    if(!ta||!tb||![ta.x,ta.y,tb.x,tb.y].every(Number.isFinite))return true;return Math.max(Math.abs(ta.x-tb.x),Math.abs(ta.y-tb.y))<=1.5;};
  function consequenceFor(action,transitionName){return {type:action.type,healerActorId:action.healerActorId,targetActorId:action.targetActorId,
    injuryId:text(action.injuryId,120)||null,transition:transitionName||null};}
  function applyConsequence(state,record,consequence){
    if(!consequence)return;const target=state.actors[consequence.targetActorId],healer=state.actors[consequence.healerActorId];if(!target||!healer)return;
    if(consequence.type==="attemptFirstAid"){
      if(record.outcome==="success")target.health.stable=true;
      addLog(state,`${actorName(healer)}'s First Aid for ${actorName(target)} is final: ${record.outcome==="success"?"stabilized":"failed"}.`);
    }
    if(consequence.type==="attemptExtendedMedicine"){
      if(record.outcome==="success"){const from=target.health.state;target.health.state=from==="down"?"wounded":"unhurt";target.health.stable=true;target.health.dyingFailures=0;delete target.treatmentBlock;
        const treated=target.injuries.find(item=>item.id===consequence.injuryId);if(treated)treated.treatmentState="treated";}
      else target.treatmentBlock={transition:consequence.transition,healerActorId:healer.actorId,circumstanceId:sceneOf(state).circumstanceId,reason:"Failed extended Medicine attempt"};
      addLog(state,`${actorName(healer)}'s extended Medicine for ${actorName(target)} is final: ${record.outcome==="success"?`health restored to ${target.health.state}`:"failed; repeat blocked"}.`);
    }
  }
  function startResolvedAction(state,actor,spec,consequence,options){const result=resolveSkillCheck({state,actor,...spec,metadata:{...(spec.metadata||{}),consequence}},options);if(!result.ok)return result;
    if(result.record.outcome==="success"||!result.record.pushable)applyConsequence(state,result.record,consequence);return result;}

  function performAction(canonical,recipient,action,options={}){
    if(!object(canonical)||canonical.namespace!==CAMPAIGN_ID||!object(action))return fail("invalid action");
    const state=normalizeState(canonical),actors=state.actors,type=text(action.type,60),target=actors[text(action.targetActorId,120)],healer=actors[text(action.healerActorId,120)],gm=recipient&&recipient.role==="gm";
    const finish=result=>{Object.keys(canonical).forEach(key=>delete canonical[key]);Object.assign(canonical,state);return success(canonical,result);};
    const finishRoll=result=>result.ok?finish({roll:result.record.retainedDie,passed:result.record.outcome==="success",record:result.record}):result;
    if(state.pendingPush&&["requestSkillCheck","downResolve","attemptFirstAid","attemptExtendedMedicine"].includes(type))return fail("resolve the pending Push before another check");
    if(type==="requestSkillCheck"){
      const actor=actors[text(action.actorId,120)];if(!actor||!owns(recipient,actor))return fail("actor ownership required");
      const purpose=gm&&PURPOSES.has(action.rollPurpose)?action.rollPurpose:"general",visibility=gm&&VISIBILITIES.has(action.visibility)?action.visibility:"public";
      const usesAction=gm?!!action.usesAction:state.structuredPlay?.active?true:!!action.usesAction;if(usesAction&&root.EastTennesseeRounds){const spent=root.EastTennesseeRounds.consumeAction(state,actor.actorId,`${skillName(text(action.skillId,40))} check`);if(!spent.ok)return spent;}
      return finishRoll(resolveSkillCheck({state,actor,skillId:text(action.skillId,40),requestedBoons:action.boons,requestedBanes:action.banes,
        boonSources:action.boonSources,baneSources:action.baneSources,rollPurpose:purpose,pushable:gm?action.pushable!==false:true,
        visibility,metadata:gm&&object(action.metadata)?action.metadata:{}},options));
    }
    if(type==="downResolve"){
      if(!target||!owns(recipient,target))return fail("actor ownership required");if(target.health.state!=="down"||target.health.stable||target.health.dead)return fail("Down Resolve is not currently legal");
      const result=resolveSkillCheck({state,actor:target,skillId:"resolve",rollPurpose:"downResolve",pushable:false},options);if(!result.ok)return result;
      if(result.record.outcome==="success")target.health.stable=true;else{target.health.dyingFailures=Math.min(2,target.health.dyingFailures+1);if(target.health.dyingFailures>=2)target.health.dead=true;}
      addLog(state,`${actorName(target)} ${result.record.outcome==="success"?"stabilizes":target.health.dead?"dies":"gains a Dying failure"} after Down Resolve${result.record.fumble?" (fumble)":result.record.critical?" (critical)":""}.`);return finishRoll(result);
    }
    if(type==="attemptFirstAid"||type==="attemptExtendedMedicine"){
      if(!healer||!owns(recipient,healer))return fail("healer ownership required");if(!target||target.health.dead)return fail("patient cannot receive treatment");
      if(type==="attemptFirstAid"){
        if(target.health.state!=="down"||target.health.stable)return fail("patient cannot receive First Aid");if(!healer.medicalCapability.hasPlausibleMaterials)return fail("plausible materials required");
        if(root.EastTennesseeRounds){const spent=root.EastTennesseeRounds.consumeAction(state,healer.actorId,"First Aid");if(!spent.ok)return spent;}
        actionUsed(state,healer.actorId,type,target.actorId);return finishRoll(startResolvedAction(state,healer,{skillId:"medicine",rollPurpose:"firstAid"},consequenceFor(action),options));
      }
      if(sceneOf(state).immediateDanger)return fail("extended Medicine is unavailable during immediate danger");if(!healer.medicalCapability.hasProperSupplies)return fail("proper supplies required");
      const from=target.health.state;if(from==="down"&&!target.health.stable)return fail("patient must first be stabilized");if(from!=="down"&&from!=="wounded")return fail("no supported health transition");
      const transitionName=`${from}->${from==="down"?"wounded":"unhurt"}`;if(target.treatmentBlock&&target.treatmentBlock.transition===transitionName&&target.treatmentBlock.circumstanceId===sceneOf(state).circumstanceId)return fail("treatment remains blocked until circumstances improve");
      return finishRoll(startResolvedAction(state,healer,{skillId:"medicine",rollPurpose:"extendedMedicine"},consequenceFor(action,transitionName),options));
    }
    if(type==="gmProposePushCondition"){
      if(!gm)return fail("GM authorization required");if(state.pendingPush)return fail("another Push response is pending");const roll=state.rolls.find(item=>item.id===action.originalRollId),conditionId=text(action.conditionId,40),actor=roll&&actors[roll.actorId];
      if(!roll||!roll.pushable||roll.outcome!=="failure"||!actor)return fail("roll is not Push-eligible");if(!CONDITIONS.includes(conditionId)||actor.conditions[conditionId].active)return fail("condition is invalid or already active");
      state.pendingPush={originalRollId:roll.id,actorId:actor.actorId,ownerKey:actor.ownerKey||null,proposedConditionId:conditionId,status:"proposed",sequence:state.pushSequence++};
      addLog(state,`A Push condition is proposed for ${actorName(actor)}.`,"owner",actor.actorId);return finish({pendingPush:clone(state.pendingPush)});
    }
    if(type==="acceptPush"||type==="declinePush"){
      const pending=state.pendingPush;if(!pending||pending.sequence!==Number(action.sequence))return fail("stale Push response");const actor=actors[pending.actorId];
      if(!actor||(!gm&&!owns(recipient,actor))||actor.ownerKey!==pending.ownerKey)return fail("Push ownership is no longer valid");
      const original=state.rolls.find(item=>item.id===pending.originalRollId);if(!original||!original.pushable)return fail("original roll is unavailable");
      if(type==="declinePush"){state.pendingPush=null;original.pushable=false;applyConsequence(state,original,original.metadata&&original.metadata.consequence);addLog(state,`${actorName(actor)} declines the Push.`);return finish();}
      const condition=actor.conditions[pending.proposedConditionId];if(!condition||condition.active)return fail("proposed condition is no longer available");
      const reroll=resolveSkillCheck({state,actor,skillId:original.skillId,requestedBoons:original.requestedBoons,requestedBanes:original.requestedBanes,
        boonSources:original.boonSources,baneSources:original.baneSources,rollPurpose:original.rollPurpose,pushable:false,visibility:original.visibility,
        metadata:original.metadata,pushedFromRollId:original.id},options);if(!reroll.ok)return reroll;
      condition.active=true;condition.source=`Push of ${original.id}`;condition.notes=null;original.pushable=false;state.pendingPush=null;
      applyConsequence(state,reroll.record,original.metadata&&original.metadata.consequence);addLog(state,`${actorName(actor)} accepts ${pending.proposedConditionId} and Pushes: ${reroll.record.outcome}.`,original.visibility,original.visibility==="owner"?actor.actorId:null);
      return finish({record:reroll.record,roll:reroll.record.retainedDie,passed:reroll.record.outcome==="success"});
    }
    if(type==="useFieldMedicine"){
      if(!healer||!owns(recipient,healer))return fail("healer ownership required");if(!healer.talents.fieldMedicine||!healer.medicalCapability.hasProperSupplies)return fail("Field Medicine talent and proper supplies required");
      if(!target||target.health.state!=="down"||target.health.dead)return fail("patient must be living and Down");if(!adjacent(options,healer.actorId,target.actorId))return fail("patient is not adjacent");
      const scene=sceneOf(state),key=`${scene.id}|${healer.actorId}|${target.actorId}`;if(Object.values(state.fieldMedicineUsage).some(use=>use&&use.sceneId===scene.id&&use.patientActorId===target.actorId))return fail("patient already benefited from Field Medicine in this scene");
      if(root.EastTennesseeRounds){const spent=root.EastTennesseeRounds.consumeAction(state,healer.actorId,"Field Medicine");if(!spent.ok)return spent;}
      state.fieldMedicineUsage[key]={sceneId:scene.id,healerActorId:healer.actorId,patientActorId:target.actorId};target.health.state="wounded";target.health.stable=true;target.health.dyingFailures=0;actionUsed(state,healer.actorId,type,target.actorId);addLog(state,`${actorName(healer)} uses Field Medicine on ${actorName(target)}; the patient is stable and Wounded.`);return finish();
    }
    if(!gm)return fail("GM authorization required");
    if(type==="gmCancelPush"){if(!state.pendingPush)return fail("no Push is pending");const original=state.rolls.find(item=>item.id===state.pendingPush.originalRollId);if(original){original.pushable=false;applyConsequence(state,original,original.metadata&&original.metadata.consequence);}state.pendingPush=null;return finish();}
    if(type==="gmAddCondition"||type==="gmClearCondition"){
      const id=text(action.conditionId,40);if(!target||!CONDITIONS.includes(id))return fail("invalid condition");target.conditions[id]={active:type==="gmAddCondition",source:type==="gmAddCondition"?(text(action.source,160)||"GM"):null,notes:type==="gmAddCondition"?(text(action.notes,500)||null):null};addLog(state,`${actorName(target)} ${type==="gmAddCondition"?"gains":"clears"} ${id}.`);return finish();}
    if(type==="gmClearAllConditions"){if(!target)return fail("unknown actor");target.conditions=defaultConditions();addLog(state,`${actorName(target)} clears all conditions${action.reason?`: ${text(action.reason,160)}`:""}.`);return finish();}
    if(type==="applySeriousHit"||type==="applyCriticalHit"){if(!target)return fail("unknown patient");transition(target,type==="applyCriticalHit"?2:1);target.injuries.push(injury(state,type==="applyCriticalHit"?"severe":"ordinary",action));addLog(state,`${actorName(target)} suffers a ${type==="applyCriticalHit"?"critical":"serious"} hit and is now ${target.health.state}.`);return finish();}
    if(type==="setImmediateDanger"){sceneOf(state).immediateDanger=!!action.active;addLog(state,`Immediate danger is now ${action.active?"active":"ended"}.`);return finish();}
    if(type==="beginNewScene"){if(state.structuredPlay?.active)return fail("stop structured play before beginning a new scene");const old=sceneOf(state),id=text(action.sceneId,100);if(!id||id===old.id)return fail("a distinct new scene id is required");state.scene={id,immediateDanger:false,circumstanceId:1,actions:[]};state.fieldMedicineUsage={};state.pendingPush=null;for(const actor of Object.values(actors))if(actor.aim)actor.aim={active:false};addLog(state,`A new scene begins: ${id}.`);return finish();}
    if(type==="advanceTreatmentCircumstance"){sceneOf(state).circumstanceId++;addLog(state,"Treatment circumstances meaningfully improve.");return finish();}
    if(type==="clearTreatmentBlock"){if(!target)return fail("unknown patient");delete target.treatmentBlock;return finish();}
    if(type==="markInjuryHealed"||type==="deleteInjury"||type==="editInjury"){if(!target)return fail("unknown patient");const index=target.injuries.findIndex(item=>item.id===action.injuryId);if(index<0)return fail("unknown injury");if(type==="deleteInjury")target.injuries.splice(index,1);else if(type==="markInjuryHealed"){target.injuries[index].healed=true;addLog(state,`${actorName(target)}'s ${target.injuries[index].description} is marked healed.`);}else for(const key of ["description","relevantBane","recoveryRequirement","recoveryNotes"]){if(action[key]!==undefined)target.injuries[index][key]=text(action[key],key.startsWith("recovery")?1000:240);}return finish();}
    if(type==="gmSetHealth"){if(!target||!STATES.includes(action.state))return fail("invalid health state");target.health.state=action.state;if(action.state!=="down"){target.health.stable=true;if(!action.preserveFailures)target.health.dyingFailures=0;}return finish();}
    if(type==="gmSetStabilization"){if(!target||target.health.state!=="down")return fail("patient is not Down");target.health.stable=!!action.stable;return finish();}
    if(type==="gmReviveOrOverride"){if(!target)return fail("unknown patient");target.health.dead=!!action.dead;target.health.dyingFailures=integer(action.dyingFailures,0,2);if(action.state&&STATES.includes(action.state))target.health.state=action.state;if(action.stable!==undefined)target.health.stable=!!action.stable;return finish();}
    if(type==="setMedicalCapability"){if(!target)return fail("unknown actor");target.medicalCapability={hasPlausibleMaterials:!!action.hasPlausibleMaterials,hasProperSupplies:!!action.hasProperSupplies};if(Number.isInteger(Number(action.medicineValue))&&Number(action.medicineValue)>=1&&Number(action.medicineValue)<=18)target.skills.medicine=Number(action.medicineValue);return finish();}
    if(type==="gmSetSkill"){if(!target||!SKILL_IDS.has(action.skillId)||!Number.isInteger(Number(action.value))||Number(action.value)<1||Number(action.value)>18)return fail("invalid skill value");target.skills[action.skillId]=Number(action.value);return finish();}
    return fail("unknown action");
  }
  root.EastTennesseeHealth=Object.freeze({CAMPAIGN_ID,HISTORY_LIMIT,STATES,SKILLS,CONDITIONS,normalizeActor,normalizeState,resolveSkillCheck,performAction});
  if(typeof module!=="undefined"&&module.exports)module.exports=root.EastTennesseeHealth;
})(typeof globalThis!=="undefined"?globalThis:this);

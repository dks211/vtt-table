(function(root){
  "use strict";

  const CAMPAIGN_ID="east-tennessee-1861";
  const STATES=["unhurt","wounded","down"];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const object=value=>value&&typeof value==="object"&&!Array.isArray(value);
  const text=(value,max=240)=>String(value||"").trim().slice(0,max);
  const actorName=actor=>text(actor&&actor.identity&&actor.identity.name,80)||"Character";
  const healthOf=actor=>object(actor.health)?actor.health:null;
  const owns=(recipient,actor)=>recipient&&recipient.role==="gm"||!!(recipient&&actor&&recipient.actorId===actor.actorId&&recipient.playerKey&&recipient.playerKey===actor.ownerKey);
  const transition=(actor,steps)=>{
    const health=healthOf(actor); if(!health)return false;
    const next=Math.min(2,Math.max(0,STATES.indexOf(health.state))+steps);
    health.state=STATES[next];
    if(health.state==="down"){health.stable=false;health.dyingFailures=0;}
    return true;
  };
  const log=(state,message)=>{
    state.logs=Array.isArray(state.logs)?state.logs:[];
    state.nextLogId=Math.max(1,Number(state.nextLogId)||1);
    state.logs.push({id:`et-log-${state.nextLogId++}`,visibility:"party",revealed:true,message:text(message,300)});
  };
  const fail=reason=>({ok:false,reason});
  const success=(state,result={})=>({ok:true,state,...result});
  const rollCheck=(value,options)=>{
    const roll=Math.max(1,Math.min(20,Number(options&&options.rollD20?options.rollD20():Math.floor(Math.random()*20)+1)||20));
    return {roll,passed:Number.isFinite(Number(value))&&roll<=Number(value)};
  };
  const sceneOf=state=>{
    state.scene=object(state.scene)?state.scene:{};
    state.scene.id=text(state.scene.id,100)||"east-tennessee-1861-placeholder";
    state.scene.immediateDanger=!!state.scene.immediateDanger;
    state.scene.circumstanceId=Math.max(1,Number(state.scene.circumstanceId)||1);
    state.scene.actions=Array.isArray(state.scene.actions)?state.scene.actions:[];
    return state.scene;
  };
  const actionUsed=(state,healerId,type,targetId)=>{
    const scene=sceneOf(state); if(!scene.immediateDanger)return;
    scene.actions.push({sceneId:scene.id,actorId:healerId,type,targetActorId:targetId});
  };
  const injury=(state,severity,action)=>{
    state.nextInjuryId=Math.max(1,Number(state.nextInjuryId)||1);
    return {id:`et-injury-${state.nextInjuryId++}`,description:text(action.description)|| (severity==="severe"?"Severe injury":"Injury"),severity,
      relevantBane:text(action.relevantBane)||"One bane when this injury is relevant.",treatmentState:"untreated",
      recoveryRequirement:text(action.recoveryRequirement,500),recoveryNotes:text(action.recoveryNotes,1000),healed:false};
  };
  const tokensFor=(options,actorId)=>Array.isArray(options&&options.tokens)?options.tokens.find(token=>token.actorId===actorId):null;
  const adjacent=(options,a,b)=>{
    const ta=tokensFor(options,a),tb=tokensFor(options,b);
    if(!ta||!tb||![ta.x,ta.y,tb.x,tb.y].every(Number.isFinite))return true;
    return Math.max(Math.abs(ta.x-tb.x),Math.abs(ta.y-tb.y))<=1.5;
  };

  function normalizeActor(actor){
    const out=object(actor)?clone(actor):{};
    const health=object(out.health)?out.health:{};
    health.state=STATES.includes(health.state)?health.state:"unhurt";
    health.stable=health.state==="down"?!!health.stable:true;
    health.dyingFailures=Math.max(0,Math.min(2,Number(health.dyingFailures)||0));
    health.dead=!!health.dead;
    out.health=health;
    out.injuries=Array.isArray(out.injuries)?out.injuries.map((item,index)=>({
      id:text(item.id)||`legacy-injury-${index+1}`,description:text(item.description)||"Injury",
      severity:item.severity==="severe"?"severe":"ordinary",relevantBane:text(item.relevantBane),
      treatmentState:item.treatmentState==="treated"?"treated":"untreated",
      recoveryRequirement:text(item.recoveryRequirement,500),recoveryNotes:text(item.recoveryNotes,1000),healed:!!item.healed,
    })):[];
    out.resolveValue=Number.isFinite(Number(out.resolveValue))?Math.max(1,Math.min(20,Number(out.resolveValue))):10;
    out.medicalCapability={medicineValue:Math.max(0,Math.min(20,Number(out.medicalCapability&&out.medicalCapability.medicineValue)||0)),
      hasPlausibleMaterials:!!(out.medicalCapability&&out.medicalCapability.hasPlausibleMaterials),
      hasProperSupplies:!!(out.medicalCapability&&out.medicalCapability.hasProperSupplies)};
    out.talents={fieldMedicine:!!(out.talents&&out.talents.fieldMedicine)};
    if(!object(out.treatmentBlock))delete out.treatmentBlock;
    return out;
  }

  function normalizeState(value){
    const state=object(value)?clone(value):{};
    state.namespace=CAMPAIGN_ID;
    state.actors=object(state.actors)?state.actors:{};
    for(const [id,actor] of Object.entries(state.actors)){state.actors[id]=normalizeActor(actor);state.actors[id].actorId=id;}
    sceneOf(state);
    state.fieldMedicineUsage=object(state.fieldMedicineUsage)?state.fieldMedicineUsage:{};
    state.logs=Array.isArray(state.logs)?state.logs:[];
    state.nextInjuryId=Math.max(1,Number(state.nextInjuryId)||1);
    state.nextLogId=Math.max(1,Number(state.nextLogId)||1);
    return state;
  }

  function performAction(canonical,recipient,action,options={}){
    if(!object(canonical)||canonical.namespace!==CAMPAIGN_ID||!object(action))return fail("invalid action");
    const state=normalizeState(canonical),actors=state.actors,type=text(action.type,60);
    const target=actors[text(action.targetActorId,120)],healer=actors[text(action.healerActorId,120)];
    const gm=recipient&&recipient.role==="gm";
    const finish=result=>{Object.keys(canonical).forEach(key=>delete canonical[key]);Object.assign(canonical,state);return success(canonical,result);};
    const requireGM=()=>gm?null:fail("GM authorization required");

    if(type==="applySeriousHit"||type==="applyCriticalHit"){
      const denied=requireGM();if(denied)return denied;if(!target)return fail("unknown patient");
      transition(target,type==="applyCriticalHit"?2:1);target.injuries.push(injury(state,type==="applyCriticalHit"?"severe":"ordinary",action));
      log(state,`${actorName(target)} suffers a ${type==="applyCriticalHit"?"critical":"serious"} hit and is now ${target.health.state}.`);
      return finish();
    }
    if(type==="downResolve"){
      if(!target||!owns(recipient,target))return fail("actor ownership required");
      if(target.health.state!=="down"||target.health.stable||target.health.dead)return fail("Down Resolve is not currently legal");
      const check=rollCheck(target.resolveValue,options);
      if(check.passed){target.health.stable=true;log(state,`${actorName(target)} succeeds at Down Resolve (${check.roll}) and stabilizes.`);}
      else{target.health.dyingFailures=Math.min(2,target.health.dyingFailures+1);if(target.health.dyingFailures>=2)target.health.dead=true;
        log(state,`${actorName(target)} fails Down Resolve (${check.roll})${target.health.dead?" and dies":" and gains a Dying failure"}.`);}
      return finish({roll:check.roll,passed:check.passed});
    }
    if(type==="attemptFirstAid"){
      if(!healer||!owns(recipient,healer))return fail("healer ownership required");
      if(!target||target.health.state!=="down"||target.health.stable||target.health.dead)return fail("patient cannot receive First Aid");
      if(!healer.medicalCapability.hasPlausibleMaterials||healer.medicalCapability.medicineValue<1)return fail("plausible materials and Medicine capability required");
      const check=rollCheck(healer.medicalCapability.medicineValue,options);actionUsed(state,healer.actorId,type,target.actorId);
      if(check.passed)target.health.stable=true;
      log(state,`${actorName(healer)} attempts First Aid for ${actorName(target)} (${check.roll}): ${check.passed?"stabilized":"failed"}.`);
      return finish({roll:check.roll,passed:check.passed});
    }
    if(type==="attemptExtendedMedicine"){
      if(!healer||!owns(recipient,healer))return fail("healer ownership required");
      if(!target||target.health.dead)return fail("patient cannot receive ordinary treatment");
      if(sceneOf(state).immediateDanger)return fail("extended Medicine is unavailable during immediate danger");
      if(!healer.medicalCapability.hasProperSupplies||healer.medicalCapability.medicineValue<1)return fail("proper supplies and Medicine capability required");
      const from=target.health.state;if(from==="down"&&!target.health.stable)return fail("patient must first be stabilized");
      if(from!=="down"&&from!=="wounded")return fail("no supported health transition");
      const transitionName=`${from}->${from==="down"?"wounded":"unhurt"}`;
      if(target.treatmentBlock&&target.treatmentBlock.transition===transitionName&&target.treatmentBlock.circumstanceId===sceneOf(state).circumstanceId)return fail("treatment remains blocked until circumstances improve");
      const check=rollCheck(healer.medicalCapability.medicineValue,options);
      if(check.passed){target.health.state=from==="down"?"wounded":"unhurt";target.health.stable=true;target.health.dyingFailures=0;delete target.treatmentBlock;
        const treated=target.injuries.find(item=>item.id===action.injuryId);if(treated)treated.treatmentState="treated";}
      else target.treatmentBlock={transition:transitionName,healerActorId:healer.actorId,circumstanceId:sceneOf(state).circumstanceId,reason:"Failed extended Medicine attempt"};
      log(state,`${actorName(healer)} attempts extended Medicine for ${actorName(target)} (${check.roll}): ${check.passed?`health restored to ${target.health.state}`:"failed; repeat blocked"}.`);
      return finish({roll:check.roll,passed:check.passed});
    }
    if(type==="useFieldMedicine"){
      if(!healer||!owns(recipient,healer))return fail("healer ownership required");
      if(!healer.talents.fieldMedicine||!healer.medicalCapability.hasProperSupplies)return fail("Field Medicine talent and proper supplies required");
      if(!target||target.health.state!=="down"||target.health.dead)return fail("patient must be living and Down");
      if(!adjacent(options,healer.actorId,target.actorId))return fail("patient is not adjacent");
      const scene=sceneOf(state),key=`${scene.id}|${healer.actorId}|${target.actorId}`;
      if(Object.values(state.fieldMedicineUsage).some(use=>use&&use.sceneId===scene.id&&use.patientActorId===target.actorId))return fail("patient already benefited from Field Medicine in this scene");
      state.fieldMedicineUsage[key]={sceneId:scene.id,healerActorId:healer.actorId,patientActorId:target.actorId};
      target.health.state="wounded";target.health.stable=true;target.health.dyingFailures=0;actionUsed(state,healer.actorId,type,target.actorId);
      log(state,`${actorName(healer)} uses Field Medicine on ${actorName(target)}; the patient is stable and Wounded.`);return finish();
    }
    if(!gm)return fail("GM authorization required");
    if(type==="setImmediateDanger"){sceneOf(state).immediateDanger=!!action.active;log(state,`Immediate danger is now ${action.active?"active":"ended"}.`);return finish();}
    if(type==="beginNewScene"){
      const old=sceneOf(state),id=text(action.sceneId,100);if(!id||id===old.id)return fail("a distinct new scene id is required");
      state.scene={id,immediateDanger:false,circumstanceId:1,actions:[]};state.fieldMedicineUsage={};log(state,`A new scene begins: ${id}.`);return finish();
    }
    if(type==="advanceTreatmentCircumstance"){sceneOf(state).circumstanceId++;log(state,"Treatment circumstances meaningfully improve.");return finish();}
    if(type==="clearTreatmentBlock"){if(!target)return fail("unknown patient");delete target.treatmentBlock;return finish();}
    if(type==="markInjuryHealed"||type==="deleteInjury"||type==="editInjury"){
      if(!target)return fail("unknown patient");const index=target.injuries.findIndex(item=>item.id===action.injuryId);if(index<0)return fail("unknown injury");
      if(type==="deleteInjury")target.injuries.splice(index,1);else if(type==="markInjuryHealed"){target.injuries[index].healed=true;log(state,`${actorName(target)}'s ${target.injuries[index].description} is marked healed.`);}
      else for(const key of ["description","relevantBane","recoveryRequirement","recoveryNotes"]){if(action[key]!==undefined)target.injuries[index][key]=text(action[key],key.startsWith("recovery")?1000:240);}
      return finish();
    }
    if(type==="gmSetHealth"){
      if(!target||!STATES.includes(action.state))return fail("invalid health state");target.health.state=action.state;
      if(action.state!=="down"){target.health.stable=true;if(!action.preserveFailures)target.health.dyingFailures=0;}return finish();
    }
    if(type==="gmSetStabilization"){if(!target||target.health.state!=="down")return fail("patient is not Down");target.health.stable=!!action.stable;return finish();}
    if(type==="gmReviveOrOverride"){
      if(!target)return fail("unknown patient");target.health.dead=!!action.dead;target.health.dyingFailures=Math.max(0,Math.min(2,Number(action.dyingFailures)||0));
      if(action.state&&STATES.includes(action.state))target.health.state=action.state;if(action.stable!==undefined)target.health.stable=!!action.stable;return finish();
    }
    if(type==="setMedicalCapability"){
      if(!target)return fail("unknown actor");target.medicalCapability={medicineValue:Math.max(0,Math.min(20,Number(action.medicineValue)||0)),hasPlausibleMaterials:!!action.hasPlausibleMaterials,hasProperSupplies:!!action.hasProperSupplies};return finish();
    }
    return fail("unknown action");
  }

  root.EastTennesseeHealth=Object.freeze({CAMPAIGN_ID,STATES,normalizeActor,normalizeState,performAction});
  if(typeof module!=="undefined"&&module.exports)module.exports=root.EastTennesseeHealth;
})(typeof globalThis!=="undefined"?globalThis:this);

"use strict";
let handoutZoom=1;
function openHandout(handout){
  let modal=$("handout-modal");if(!modal){modal=document.createElement("div");modal.id="handout-modal";modal.innerHTML=`<div class="handout-shell" role="dialog" aria-modal="true" aria-labelledby="handout-title"><div class="handout-tools"><strong id="handout-title"></strong><button id="handout-minus" aria-label="Zoom out">−</button><button id="handout-reset" aria-label="Reset zoom">100%</button><button id="handout-plus" aria-label="Zoom in">+</button><button id="handout-close" aria-label="Close handout">✕</button></div><div class="handout-viewport"><article id="handout-paper"><pre id="handout-transcript"></pre></article></div></div>`;document.body.appendChild(modal);}
  const priorFocus=document.activeElement,close=()=>{modal.classList.remove("open");priorFocus?.focus?.();};handoutZoom=1;$("handout-title").textContent=handout.title||"Handout";const paper=$("handout-paper");paper.className=`handout-paper handout-${handout.kind||"document"}`;$("handout-transcript").textContent=handout.transcript||handout.body||"";const apply=()=>{paper.style.transform=`scale(${handoutZoom})`;$("handout-reset").textContent=`${Math.round(handoutZoom*100)}%`;};$("handout-minus").onclick=()=>{handoutZoom=Math.max(.6,handoutZoom-.1);apply();};$("handout-plus").onclick=()=>{handoutZoom=Math.min(2,handoutZoom+.1);apply();};$("handout-reset").onclick=()=>{handoutZoom=1;apply();};$("handout-close").onclick=close;modal.onclick=e=>{if(e.target===modal)close();};modal.onkeydown=e=>{if(e.key==="Escape")close();};apply();modal.classList.add("open");$("handout-close").focus();
  const viewport=modal.querySelector(".handout-viewport");let drag=null;viewport.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(e.pointerId);};viewport.onpointermove=e=>{if(drag){viewport.scrollLeft=drag.left-(e.clientX-drag.x);viewport.scrollTop=drag.top-(e.clientY-drag.y);}};viewport.onpointerup=viewport.onpointercancel=()=>drag=null;
}
function handoutsHTML(gm=false,mineActor=null){const handouts=Object.values(App.session.campaignState.handouts||{}).filter(h=>h&&!h.withdrawn);if(!handouts.length)return"";const actors=Object.values(App.session.campaignState.actors||{}).filter(a=>a.definitionId&&!a.npcLiveId);return`<div class="sect"><h3>Handouts</h3><div class="hint">Documents open in the shared viewer with zoom, pan, and a readable transcript. Opening a dispatch never creates copied intelligence.</div>${handouts.map(h=>`<div class="tok"><span class="nm">${esc(h.title||h.id)}</span><button class="rbtn quiet" data-handout-open="${esc(h.id)}">OPEN</button>${gm?`<div class="row"><select data-handout-visibility="${esc(h.id)}">${["gm","party","selected","owner","public"].map(v=>`<option value="${v}" ${h.visibility===v?"selected":""}>${v}</option>`).join("")}</select><label class="check"><input type="checkbox" data-handout-reveal="${esc(h.id)}" ${h.revealed?"checked":""}> revealed</label><select data-handout-recipient="${esc(h.id)}"><option value="">choose recipient</option>${actors.map(a=>`<option value="${esc(a.actorId)}" ${(h.ownerActorId===a.actorId||(h.recipientIds||[]).includes(a.actorId))?"selected":""}>${esc(a.identity?.name||a.actorId)}</option>`).join("")}</select><button class="rbtn" data-handout-apply="${esc(h.id)}">APPLY</button></div>`:""}</div>`).join("")}${mineActor?`<label>Copied intelligence notes<textarea id="handout-notes" placeholder="Write only what your character actually copied or learned.">${esc(mineActor.privateNotes?.data?.handoutNotes||"")}</textarea></label><button class="rbtn quiet" id="handout-notes-save">SAVE PRIVATE NOTES</button>`:""}</div>`;}
function etHandoutsHTML(){const handouts=Object.values(App.session.campaignState.handouts||{}).filter(h=>h&&!h.withdrawn),actors=Object.values(App.session.campaignState.actors||{}).filter(a=>a.definitionId&&!a.npcLiveId),audience=h=>h.visibility==="gm"?"GM only":h.visibility==="party"?(h.revealed?"Everyone at the table":"Not yet shared"):h.visibility==="selected"?`Chosen: ${(h.recipientIds||[]).map(id=>actors.find(a=>a.actorId===id)?.identity?.name||id).join(", ")||"nobody"}`:h.visibility==="owner"?`Owner: ${actors.find(a=>a.actorId===h.ownerActorId)?.identity?.name||"nobody"}`:"Everyone";return`<div class="sect et-documents"><h3>Documents</h3><div class="hint">Opening previews a document for you. Sharing changes which player payloads receive it.</div>${handouts.map(h=>`<details class="et-card"><summary><span>${esc(h.title||h.id)}</span><b class="et-audience">${esc(audience(h))}</b></summary><div class="et-card-body"><button class="rbtn quiet" data-handout-open="${esc(h.id)}">PREVIEW DOCUMENT</button><label>Share with<select data-handout-visibility="${esc(h.id)}"><option value="gm" ${h.visibility==="gm"?"selected":""}>Nobody — GM only</option><option value="party" ${h.visibility==="party"?"selected":""}>Everyone at the table</option><option value="selected" ${h.visibility==="selected"?"selected":""}>One chosen character</option><option value="owner" ${h.visibility==="owner"?"selected":""}>Character owner</option><option value="public" ${h.visibility==="public"?"selected":""}>Public immediately</option></select></label><label>Character<select data-handout-recipient="${esc(h.id)}"><option value="">Choose when needed…</option>${actors.map(a=>`<option value="${esc(a.actorId)}" ${(h.ownerActorId===a.actorId||(h.recipientIds||[]).includes(a.actorId))?"selected":""}>${esc(a.identity?.name||a.actorId)}</option>`).join("")}</select></label><button class="rbtn" data-handout-apply="${esc(h.id)}">SHARE WITH SELECTED AUDIENCE</button></div></details>`).join("")}</div>`;}
function wireHandouts(p,gm=false,mineActor=null){p.querySelectorAll("[data-handout-open]").forEach(el=>el.onclick=()=>{const h=App.session.campaignState.handouts?.[el.dataset.handoutOpen];if(h)openHandout(h);});if(gm)p.querySelectorAll("[data-handout-apply]").forEach(el=>el.onclick=()=>{const id=el.dataset.handoutApply,visibility=p.querySelector(`[data-handout-visibility="${id}"]`).value,recipient=p.querySelector(`[data-handout-recipient="${id}"]`).value;etHostAction({type:"gmHandoutSetAccess",id,visibility,revealed:visibility==="party"?(p.querySelector(`[data-handout-reveal="${id}"]`)?.checked??true):true,recipientIds:visibility==="selected"&&recipient?[recipient]:[],ownerActorId:visibility==="owner"?recipient:null});});const save=$("handout-notes-save");if(save&&mineActor)save.onclick=()=>{const data={...(mineActor.privateNotes?.data||{}),handoutNotes:$("handout-notes").value};clientSend({type:"campaignMutation",mutation:{type:"actor.update",actorId:mineActor.actorId,changes:{privateNotes:data}}});};}
function etActor(actorId){return App.session.campaignId==="east-tennessee-1861"&&App.session.campaignState.actors&&App.session.campaignState.actors[actorId];}
function etOverlayNotesHTML(items){return`<details class="et-card"><summary><span>Advisory GM map notes</span><b>${items.length} notes</b></summary><div class="et-card-body">${items.map(item=>`<p><b>${esc(item.id)}:</b> ${esc(item.note)}</p>`).join("")}</div></details>`;}
function etSkillHTML(actor,gm=false){
  if(!actor||!actor.skills||!globalThis.EastTennesseeHealth)return"";const state=App.session.campaignState,rolls=(state.rolls||[]).filter(r=>r.actorId===actor.actorId),last=rolls[rolls.length-1],pending=state.pendingPush;
  const skills=EastTennesseeHealth.SKILLS.filter(s=>actor.skills[s.id]!=null);
  const conditions=EastTennesseeHealth.CONDITIONS.map(id=>{const c=actor.conditions?.[id]||{};return `<div class="hint"><b>${esc(id.toUpperCase())}</b> · ${c.active?`ACTIVE${c.source?` · ${esc(c.source)}`:""}`:"inactive"}${gm?` <button class="rbtn quiet" data-et-condition="${id}" data-active="${c.active?1:0}">${c.active?"CLEAR":"ADD"}</button>`:""}</div>`;}).join("");
  return `<div class="sect"><h3>Checks</h3>
    <div class="hint">${skills.map(s=>`${esc(s.name)} ${actor.skills[s.id]}`).join(" · ")}</div>
    <div class="row"><select id="et-skill">${skills.map(s=>`<option value="${s.id}">${esc(s.name)} · ${actor.skills[s.id]}</option>`).join("")}</select><label>boons</label><input id="et-boons" type="number" min="0" max="20" value="0" style="width:45px"><label>banes</label><input id="et-banes" type="number" min="0" max="20" value="0" style="width:45px"></div>
    <div class="row"><input id="et-boon-source" placeholder="boon sources: help, preparation" style="flex:1"><input id="et-bane-source" placeholder="bane sources: injury, condition" style="flex:1"></div>
    <label class="check"><input id="et-uses-action" type="checkbox" ${!gm&&state.structuredPlay?.active?"checked disabled":""}> uses structured action${!gm&&state.structuredPlay?.active?" (host required)":""}</label>
    ${gm?`<div class="row"><select id="et-purpose">${["general","attack","rangedAttack","meleeAttack","downResolve","firstAid","extendedMedicine"].map(v=>`<option value="${v}">${v}</option>`)}</select><select id="et-visibility"><option value="public">public</option><option value="owner">owner</option><option value="gm">GM only</option></select><button class="rbtn" id="et-roll">ROLL</button></div>`:`<button class="rbtn" id="et-roll" style="width:100%">REQUEST GENERAL CHECK</button>`}
    ${last?`<div class="hint" style="margin-top:7px"><b>${esc(last.actorName)} · ${esc(last.skillId.toUpperCase())} ${last.skillValue}</b><br>[${last.dice.join(", ")}] → ${last.retainedDie} · ${last.critical?"CRITICAL SUCCESS":last.fumble?"FUMBLE":last.outcome.toUpperCase()} · ${last.netModifier>0?`${last.netModifier} boon`:last.netModifier<0?`${-last.netModifier} bane`:"normal"}${last.pushedFromRollId?" · PUSHED":""}</div>`:""}
    <div style="margin-top:7px">${conditions}</div>
    ${gm&&last?.pushable&&!pending?`<div class="row"><select id="et-push-condition">${EastTennesseeHealth.CONDITIONS.filter(id=>!actor.conditions?.[id]?.active).map(id=>`<option value="${id}">${id}</option>`)}</select><button class="rbtn quiet" id="et-propose-push" data-roll="${last.id}">PROPOSE PUSH</button></div>`:""}
    ${gm&&pending&&pending.actorId===actor.actorId?`<div class="hint">Push pending: ${esc(pending.proposedConditionId)}</div><div class="row"><button class="rbtn" id="et-gm-accept-push">ACCEPT OVERRIDE</button><button class="rbtn quiet" id="et-gm-decline-push">FINALIZE FAILURE</button><button class="rbtn quiet" id="et-cancel-push">CANCEL PUSH</button></div>`:""}
    ${!gm&&pending&&pending.actorId===actor.actorId?`<div class="hint"><b>PUSH OFFER:</b> accept ${esc(pending.proposedConditionId)} and reroll?</div><div class="row"><button class="rbtn" id="et-accept-push">ACCEPT & REROLL</button><button class="rbtn quiet" id="et-decline-push">DECLINE</button></div>`:""}
  </div>`;
}
function etStructuredHTML(gm=false,mineActor=null){
  if(App.session.campaignId!=="east-tennessee-1861"||!globalThis.EastTennesseeRounds)return"";const state=App.session.campaignState,sp=state.structuredPlay||{},actors=Object.values(state.actors||{}),entries=sp.initiativeEntries||[],participants=sp.participants||[];
  const entryName=e=>(e.participantIds||[]).map(id=>participants.find(p=>p.id===id)?.displayName||id).join(", ");
  let html=`<div class="sect"><h3>Encounter Rounds</h3><div class="hint">${sp.active?`Round ${sp.roundNumber} · ${esc((sp.phase||"").replace(/([A-Z])/g," $1"))}`:"No structured rounds are running."}</div>`;
  if(gm){
    if(!sp.active)html+=`<button class="rbtn" id="et-sp-start">SET UP ENCOUNTER ROUNDS</button><div class="hint">This does not start merely because someone attempts stealth.</div>`;
    else{
      html+=sp.phase==="initiative"&&!entries.length?`<details class="et-card" open><summary><span>Who is in this encounter?</span><b>${participants.length} selected</b></summary><div class="et-card-body"><div class="hint">Characters currently at the table are selected by default. Add only people who can act during these rounds.</div>${actors.map(actor=>`<label class="check"><input type="checkbox" data-et-participant="${esc(actor.actorId)}" ${participants.some(p=>p.actorId===actor.actorId)||(!participants.length&&actor.ownerKey)?"checked":""}> ${esc(actor.identity?.name||actor.actorId)}</label>`).join("")}<button class="rbtn quiet" id="et-sp-participants">SAVE ENCOUNTER CAST</button></div></details>`:`<div class="hint"><b>Encounter cast:</b> ${participants.map(p=>esc(p.displayName)).join(" · ")||"None"}</div>`;
      if(sp.phase==="initiative"&&!entries.length)html+=`<button class="rbtn" id="et-sp-roll-init">ROLL INITIATIVE</button>`;
      if(entries.length)html+=`<div class="toklist">${entries.map(e=>`<div class="tok ${sp.currentEntryId===e.entryId?"sel":""}"><span class="nm">${e.initiativeRoll} · ${esc(entryName(e))}</span><span>${esc(e.actionState)}</span></div>`).join("")}</div>`;
      for(const tie of sp.unresolvedTieGroups||[])html+=`<div class="hint">Resolve ${esc(tie.tieClass)} tie at ${tie.initiativeRoll}</div>${tie.entryIds.map((id,i)=>`<div class="row"><span>${esc(entryName(entries.find(e=>e.entryId===id)))}</span><select data-et-tie-order="${id}" data-tie="${tie.id}">${tie.entryIds.map((_,n)=>`<option value="${n}" ${n===i?"selected":""}>${n+1}</option>`)}</select></div>`).join("")}<button class="rbtn quiet" data-et-resolve-tie="${tie.id}">RESOLVE TIE</button>`;
      if(sp.phase==="initiative"&&entries.length&&!(sp.unresolvedTieGroups||[]).length)html+=`<button class="rbtn" id="et-sp-first">START FIRST TURN</button>`;
      if(sp.currentEntryId)html+=`<div class="row"><button class="rbtn quiet" id="et-sp-end">END CURRENT TURN</button><button class="rbtn quiet" id="et-sp-delay-gm">DELAY</button><button class="rbtn quiet" id="et-sp-ready-gm">READY…</button><button class="rbtn quiet" id="et-sp-force">FORCE COMPLETE</button><select id="et-sp-repair">${["unspent","spent","delayed","readied","reactionConsumed","unavailable"].map(v=>`<option value="${v}" ${entries.find(e=>e.entryId===sp.currentEntryId)?.actionState===v?"selected":""}>${v}</option>`)}</select><button class="rbtn quiet" id="et-sp-repair-go">REPAIR</button></div>`;
      if(!sp.currentEntryId&&(sp.delayedEntryIds||[]).length)html+=`<div class="row">${sp.delayedEntryIds.map(id=>`<button class="rbtn quiet" data-et-resume="${id}">RESUME ${esc(entryName(entries.find(e=>e.entryId===id)))}</button>`).join("")}</div>`;
      const roundProcessed=(sp.processedRoundNumbers||[]).includes(sp.roundNumber);if(sp.phase==="roundEnd"&&!roundProcessed)html+=`<button class="rbtn" id="et-sp-end-round">END ROUND · ADVANCE TIMERS</button>`;
      if(roundProcessed)html+=`<button class="rbtn" id="et-sp-next-round">BEGIN NEXT ROUND</button>`;
      html+=`<button class="rbtn quiet" id="et-sp-stop" style="margin-top:6px">STOP STRUCTURED PLAY</button>`;
    }
  }else if(sp.active){
    html+=`<div class="toklist">${entries.map(e=>`<div class="tok ${sp.currentEntryId===e.entryId?"sel":""}"><span class="nm">${e.initiativeRoll} · ${esc(entryName(e))}</span><span>${esc(e.actionState)}</span>${e.readyTrigger?`<div class="hint">Ready: ${esc(e.readyTrigger)} → ${esc(e.readyAction||"")}</div>`:""}</div>`).join("")}</div>`;
    const mineEntry=entries.find(e=>(e.participantIds||[]).some(id=>participants.find(p=>p.id===id)?.actorId===mineActor?.actorId)),current=mineEntry&&sp.currentEntryId===mineEntry.entryId;
    if(current)html+=`<div class="row"><button class="rbtn" id="et-sp-player-end">END TURN</button>${mineEntry.actionState==="unspent"?`<button class="rbtn quiet" id="et-sp-delay">DELAY</button><button class="rbtn quiet" id="et-sp-ready">READY…</button>`:""}</div>`;
    if(mineEntry?.actionState==="delayed"&&!sp.currentEntryId)html+=`<button class="rbtn" id="et-sp-player-resume">RESUME DELAYED TURN</button>`;
    if(mineEntry?.actionState==="readied")html+=`<button class="rbtn" id="et-sp-trigger-ready">TRIGGER READY</button>`;
  }
  const timers=Object.values(state.timers||{}).filter(t=>t.state!=="removed"),timerHTML=t=>{
    const audience=t.labelVisibility==="gm"?"gm":t.valueVisibility==="gm"?"public-label-private-value":"public",audienceLabel=audience==="gm"?"GM ONLY":audience==="public-label-private-value"?"PLAYERS SEE LABEL":"PUBLIC";
    let row=`<div class="tok"><span class="nm">${esc(t.label)}${t.remainingRounds!=null?` · ${t.remainingRounds}`:""}</span><span>${esc(t.state||"")} · ${audienceLabel}</span>`;
    if(gm)row+=`<div class="row"><button class="rbtn quiet" data-et-timer="${t.id}" data-command="${t.state==="paused"?"resume":"pause"}">${t.state==="paused"?"RESUME":"PAUSE"}</button><button class="rbtn quiet" data-et-timer="${t.id}" data-command="minus">−1</button><button class="rbtn quiet" data-et-timer="${t.id}" data-command="plus">+1</button><button class="rbtn quiet" data-et-timer="${t.id}" data-command="resolve">RESOLVE</button><button class="rbtn quiet" data-et-timer="${t.id}" data-command="remove">REMOVE</button><select data-et-timer-vis="${t.id}"><option value="public" ${audience==="public"?"selected":""}>public</option><option value="public-label-private-value" ${audience==="public-label-private-value"?"selected":""}>hidden value</option><option value="gm" ${audience==="gm"?"selected":""}>GM only</option></select></div>`;
    return row+`</div>`;
  };html+=`<div class="hint" style="margin-top:8px">Round timers</div>${timers.length?timers.map(timerHTML).join(""):`<div class="hint">No visible timers.</div>`}`;
  if(gm)html+=`<div class="row" style="flex-wrap:wrap">${Object.entries(EastTennesseeRounds.DEFINITIONS).filter(([id])=>id!=="lick-creek-fire-stage-2"&&id!=="reinforcements-arrive").map(([id,d])=>`<button class="rbtn quiet" data-et-timer-preset="${id}">${esc(d.label)}</button>`).join("")}</div><div class="row"><input id="et-timer-label" placeholder="custom timer" style="flex:1"><input id="et-timer-rounds" type="number" min="0" max="999" value="4" style="width:55px"><select id="et-timer-vis"><option value="public">public</option><option value="public-label-private-value">hidden value</option><option value="gm">GM only</option></select><button class="rbtn quiet" id="et-timer-create">CREATE</button></div><div class="hint">Flags: ${Object.entries(state.adventureFlags||{}).map(([k,v])=>`${esc(k)}=${v?"yes":"no"}`).join(" · ")}</div>`;
  return html+`</div>`;
}
function etCharactersHTML(gm=false){if(App.session.campaignId!=="east-tennessee-1861"||!globalThis.EastTennesseeCharacters)return"";const s=App.session.campaignState,playerKey=globalThis.NET?.playerKey||App.playerKey;return`<div class="sect"><h3>Characters</h3><div class="hint">Choose a character to open their reference. Select their token on the map for in-play health, checks, equipment, and attacks.</div>${Object.values(EastTennesseeCharacters.DEFINITIONS).map(d=>{const a=s.actors[d.actorId],slot=s.characterRoster?.[d.id]||{status:"available"},owned=!!(gm||a?.ownerKey&&a.ownerKey===playerKey);return`<details class="et-card"><summary><span>${esc(d.name)}</span><b>${esc(slot.status)}</b></summary><div class="et-card-body"><div class="et-role">${esc(d.role)} · age ${d.age}</div><p>${esc(d.bio)}</p><p><b>Temperament:</b> ${esc(d.temperament)}</p><p><b>Strengths:</b> ${esc(d.strengths)}</p><p><b>Play:</b> ${esc(d.playStyle)}</p>${owned?`<div class="et-private"><b>Private history</b><p>${esc(d.owner.history)}</p><p><b>Will not risk:</b> ${esc(d.owner.risk)}</p><p><b>Complication:</b> ${esc(d.owner.complication)}</p><p><b>Relationships:</b> ${esc(d.owner.relationships)}</p><p><b>Why Gideon selected them:</b> ${esc(d.owner.parsons)}</p></div>`:""}${gm?`<div class="et-gm-note"><b>GM notes</b><p>${d.gm.map(esc).join(" ")}</p></div><label>Table status<select data-et-roster="${d.id}">${["available","claimed","active","reserve"].map(x=>`<option ${slot.status===x?"selected":""}>${x}</option>`)}</select></label>`:slot.status==="available"?`<button class="rbtn" data-et-claim="${d.id}">SELECT CHARACTER</button>`:owned?`<button class="rbtn quiet" data-et-release="${d.id}">RELEASE CHARACTER</button>`:""}</div></details>`;}).join("")}</div>`;}
function etNpcsHTML(gm=false){if(App.session.campaignId!=="east-tennessee-1861"||!globalThis.EastTennesseeNPCs)return"";const s=App.session.campaignState,defs=EastTennesseeNPCs.DEFINITIONS,npcs=Object.values(s.npcs||{});if(!gm)return`<div class="sect"><h3>People in the Scene</h3>${npcs.filter(n=>n.active&&n.sceneStatus!=="absent").map(n=>{const a=s.actors[n.actorId],badge=EastTennesseeNPCs.tokenBadge(s,n.id);return`<details class="tok"><summary class="nm">${esc(a?.identity?.name||n.visibleLabel)}</summary><div class="hint">${esc(a?.public?.role||"")} · ${esc(a?.health?.state||"unhurt")}${badge?` · <b>${esc(badge)}</b>`:""}${n.moraleRevealed?` · ${esc(n.moraleState)}`:""}<br>${esc(n.publicNotes||a?.public?.summary||"")}</div></details>`;}).join("")||`<div class="hint">No revealed people are active.</div>`}</div>`;
 const options=Object.values(defs).map(d=>`<option value="${d.id}">${esc(d.displayName)} · ${esc(d.npcClass)}</option>`).join("");return`<div class="sect"><h3>People</h3><details class="et-card"><summary><span>Add someone to the scene…</span><b>optional</b></summary><div class="et-card-body"><div class="hint">Choose a named person or reusable extra, then create one live scene entry.</div><div class="row"><select id="et-npc-definition" style="flex:1">${options}</select><button class="rbtn" id="et-npc-add">ADD</button></div></div></details><div class="hint">Open a person below only when you need their mechanics or GM notes.</div>${npcs.map(n=>{const d=defs[n.definitionId],a=s.actors[n.actorId],weapons=(a.weaponInstanceIds||[]).map(id=>s.weapons?.[id]).filter(Boolean),badge=EastTennesseeNPCs.tokenBadge(s,n.id),skills=Object.entries(d.skills).map(([k,v])=>`${k} ${v}`).join(" · ")||"No defined checks";return`<details class="tok"><summary class="nm">${esc(a.identity?.name||n.visibleLabel)} ${badge?`· ${esc(badge)}`:""}</summary><div class="hint"><b>${esc(d.role)}</b> · ${esc(n.npcClass)}<br>${esc(a.health.state)} · ${weapons.map(w=>{const wd=EastTennesseeCombat.WEAPONS[w.definitionId];return`${wd.name}${wd.firearmType?` ${EastTennesseeEquipment.loaded(s,w)}/${wd.capacity}`:""}`;}).join(" · ")||"no visible weapon"}<br>${esc(skills)}${d.backgroundBoonGuidance.length?`<br><b>Background boon:</b> ${d.backgroundBoonGuidance.map(esc).join(" · ")}`:""}<br><b>Guidance:</b> ${esc(d.moraleGuidance)}</div><div class="hint">Morale · disposition · scene status</div><div class="row"><select data-npc-morale="${n.id}">${[...EastTennesseeNPCs.MORALE].map(x=>`<option ${n.moraleState===x?"selected":""}>${x}</option>`)}</select><select data-npc-disposition="${n.id}">${[...EastTennesseeNPCs.DISPOSITIONS].map(x=>`<option ${n.disposition===x?"selected":""}>${x}</option>`)}</select><select data-npc-status="${n.id}">${[...EastTennesseeNPCs.STATUSES].map(x=>`<option ${n.sceneStatus===x?"selected":""}>${x}</option>`)}</select></div><div class="hint">NPC type · player-visible identity</div><div class="row"><select data-npc-class="${n.id}">${[...EastTennesseeNPCs.CLASSES].map(x=>`<option ${n.npcClass===x?"selected":""}>${x}</option>`)}</select><button class="rbtn quiet" data-npc-reveal="${n.id}">${n.identityRevealed?"CONCEAL":"REVEAL"}</button><button class="rbtn quiet" data-npc-restore="${n.id}">RESTORE</button></div><div class="row"><input data-npc-label="${n.id}" value="${esc(n.visibleLabel)}" placeholder="visible label" style="flex:1"><input data-npc-delegate="${n.id}" value="${esc(n.delegatedOwnerKey||"")}" placeholder="temporary player key" style="flex:1"></div><textarea data-npc-notes="${n.id}" placeholder="GM notes">${esc(n.gmNotes||"")}</textarea><button class="rbtn quiet" data-npc-save="${n.id}">SAVE LABEL / DELEGATION / NOTES</button></details>`;}).join("")}</div>`;}
function wireEtNpcs(p){if(!globalThis.EastTennesseeNPCs)return;const add=p.querySelector("#et-npc-add"),definition=p.querySelector("#et-npc-definition");if(add&&definition)add.onclick=()=>etHostAction({type:"gmNpcInstantiate",definitionId:definition.value,weaponChoice:definition.value==="abner-raines"?"revolver":undefined});p.querySelectorAll("[data-npc-reveal]").forEach(el=>el.onclick=()=>{const n=App.session.campaignState.npcs[el.dataset.npcReveal];etHostAction({type:"gmNpcSetIdentity",npcId:n.id,revealed:!n.identityRevealed});});p.querySelectorAll("[data-npc-restore]").forEach(el=>el.onclick=()=>etHostAction({type:"gmNpcRestore",npcId:el.dataset.npcRestore}));p.querySelectorAll("[data-npc-morale]").forEach(el=>el.onchange=()=>etHostAction({type:"gmNpcSetState",npcId:el.dataset.npcMorale,moraleState:el.value,revealMorale:true}));p.querySelectorAll("[data-npc-disposition]").forEach(el=>el.onchange=()=>etHostAction({type:"gmNpcSetState",npcId:el.dataset.npcDisposition,disposition:el.value}));p.querySelectorAll("[data-npc-status]").forEach(el=>el.onchange=()=>etHostAction({type:"gmNpcSetState",npcId:el.dataset.npcStatus,sceneStatus:el.value}));p.querySelectorAll("[data-npc-class]").forEach(el=>el.onchange=()=>etHostAction({type:"gmNpcSetState",npcId:el.dataset.npcClass,npcClass:el.value}));p.querySelectorAll("[data-npc-save]").forEach(el=>el.onclick=()=>{const id=el.dataset.npcSave,label=p.querySelector(`[data-npc-label="${id}"]`).value,key=p.querySelector(`[data-npc-delegate="${id}"]`).value,notes=p.querySelector(`[data-npc-notes="${id}"]`).value;etHostAction({type:"gmNpcSetIdentity",npcId:id,revealed:App.session.campaignState.npcs[id].identityRevealed,visibleLabel:label});etHostAction({type:"gmNpcDelegate",npcId:id,playerKey:key});etHostAction({type:"gmNpcSetNotes",npcId:id,gmNotes:notes});});}
function wireEtCharacters(p,gm=false){const s=App.session.campaignState,send=a=>{if(!gm)return clientSend({type:"eastTennesseeAction",action:a});const result=EastTennesseeCharacters.performAction(s,{role:"gm",campaignId:App.session.campaignId},a);if(!result.ok)alert(result.reason);else{markDirty();netMark();renderPanel();}};p.querySelectorAll("[data-et-claim]").forEach(el=>el.onclick=()=>send({type:"claimCharacter",characterId:el.dataset.etClaim,expectedSequence:s.characterClaimSequence}));p.querySelectorAll("[data-et-release]").forEach(el=>el.onclick=()=>send({type:"releaseCharacter",characterId:el.dataset.etRelease}));p.querySelectorAll("[data-et-roster]").forEach(el=>el.onchange=()=>send({type:"gmSetCharacterStatus",characterId:el.dataset.etRoster,status:el.value}));}
function etTalentControlsHTML(actor,gm=false){if(!globalThis.EastTennesseeTalents||App.session.campaignId!=="east-tennessee-1861")return"";const s=App.session.campaignState,p=s.talentUsage?.pending,attack=s.pendingAttack,firearm=attack&&EastTennesseeCombat.WEAPONS[attack.weaponId]?.tags?.includes("firearm"),eliasId="east-tennessee-1861:actor:elias-rourke",claraId="east-tennessee-1861:actor:clara-webb",involved=actor&&(actor.actorId===eliasId||actor.actorId===attack?.targetActorId);if(gm){if(!firearm&&p?.type!=="sharp-eye"&&actor?.actorId!==claraId)return"";return`<div class="sect"><h3>Contextual Talent</h3>${firearm?`<div class="hint">Get Down is available for this pending firearm attack after verbal confirmation.</div><div class="row"><select id="et-gd-cover"><option value="partial">partial cover</option><option value="strong">strong cover</option></select><input id="et-gd-position" placeholder="GM-approved resulting position" style="flex:1"></div><label class="check"><input id="et-gd-los" type="checkbox" checked> attacker still has line of sight</label><button class="rbtn" id="et-gd-apply">APPLY GET DOWN</button>${p?.type==="get-down"?`<button class="rbtn quiet" id="et-gd-clear">CLEAR PLAYER FLAG</button>`:""}`:""}${p?.type==="sharp-eye"?`<div class="hint">Clara has an unresolved Awareness check: ${esc(p.purpose)}</div><button class="rbtn" id="et-se-apply">RECORD SHARP EYE SUCCESS</button><button class="rbtn quiet" id="et-se-clear">USE A NORMAL ROLL</button>`:actor?.actorId===claraId?`<details class="et-card"><summary><span>Sharp Eye</span><b>prepare check</b></summary><div class="et-card-body"><div class="hint">Use only after Clara declares Sharp Eye for an observable Awareness check that has not been rolled.</div><button class="rbtn quiet" id="et-se-create">PREPARE SHARP EYE CHECK</button></div></details>`:""}</div>`;}return`<div class="sect"><h3>Talent</h3>${firearm&&involved?`<button class="rbtn" id="et-gd-flag">FLAG GET DOWN</button>`:""}${actor?.actorId===claraId&&p?.type==="sharp-eye"?`<button class="rbtn" id="et-se-flag">FLAG SHARP EYE</button>`:""}</div>`;}
function etTalentHostAction(action){const result=EastTennesseeTalents.performAction(App.session.campaignState,{role:"gm",campaignId:App.session.campaignId},action);if(!result.ok)alert(result.reason);else{markDirty();netMark();renderPanel();}}
function wireEtTalentControls(p,actor,gm=false){const s=App.session.campaignState,pending=s.talentUsage?.pending;if(gm){const apply=$("et-gd-apply");if(apply)apply.onclick=()=>etTalentHostAction({type:"gmApplyGetDown",adjacent:true,coverExists:true,cover:$("et-gd-cover").value,positionDescription:$("et-gd-position").value||"GM-approved nearby cover",lineOfSightRemains:$("et-gd-los").checked});const clear=$("et-gd-clear");if(clear)clear.onclick=()=>etTalentHostAction({type:"gmClearGetDownFlag"});const create=$("et-se-create");if(create)create.onclick=()=>{const purpose=prompt("Awareness check purpose","");if(purpose)etTalentHostAction({type:"gmProposeAwarenessCheck",skillId:"awareness",purpose,usesAction:true,visibility:"owner"});};const sharp=$("et-se-apply");if(sharp)sharp.onclick=()=>etTalentHostAction({type:"gmApplySharpEye",sequence:pending.sequence,awarenessAppropriate:true,physicallyObservable:true,possibleKnowledge:true});const reject=$("et-se-clear");if(reject)reject.onclick=()=>etTalentHostAction({type:"gmClearSharpEye",sequence:pending.sequence});return;}const send=action=>clientSend({type:"eastTennesseeAction",action}),gd=$("et-gd-flag"),se=$("et-se-flag");if(gd)gd.onclick=()=>send({type:"flagGetDown"});if(se)se.onclick=()=>send({type:"flagSharpEye",sequence:pending.sequence,checkId:pending.checkId});}
function etHealthHTML(actor,gm=false){
  if(!actor||!actor.health)return"";const h=actor.health,inj=actor.injuries||[];
  return `<div class="sect"><h3>East Tennessee Health · Prototype</h3>
    <div class="hint"><b>${esc(actor.identity?.name||actor.actorId)}</b> · ${esc(h.state.toUpperCase())} · ${h.dead?"DEAD":h.state==="down"?(h.stable?"STABLE":`DYING ${h.dyingFailures}/2`):"ACTIVE"}</div>
    ${inj.length?inj.map(i=>`<div class="hint" style="margin-top:6px"><b>${esc(i.description)}</b> · ${esc(i.severity)} · ${i.healed?"healed":esc(i.treatmentState)}<br>${esc(i.relevantBane)}${gm&&i.recoveryRequirement?`<br>GM recovery: ${esc(i.recoveryRequirement)} ${esc(i.recoveryNotes||"")}`:""}${gm?` <button class="rbtn quiet" data-et-edit="${i.id}">EDIT</button>${!i.healed?` <button class="rbtn quiet" data-et-heal="${i.id}">HEAL</button>`:""}`:""}</div>`).join(""):`<div class="hint">No injuries.</div>`}
    ${actor.treatmentBlock?`<div class="hint">Treatment blocked: ${esc(actor.treatmentBlock.transition)} (${esc(actor.treatmentBlock.reason)})</div>`:""}
    ${gm?`<div class="row"><button class="rbtn quiet" data-et-gm="applySeriousHit">SERIOUS HIT</button><button class="rbtn quiet" data-et-gm="applyCriticalHit">CRITICAL</button><button class="rbtn quiet" data-et-gm="gmSetStabilization">STABILIZE</button></div>
      <div class="row"><select id="et-gm-health">${["unhurt","wounded","down"].map(s=>`<option ${h.state===s?"selected":""}>${s}</option>`)}</select><button class="rbtn quiet" id="et-gm-set-health">SET HEALTH</button><button class="rbtn quiet" id="et-gm-death">${h.dead?"REVIVE OVERRIDE":"MARK DEAD"}</button><button class="rbtn quiet" id="et-clear-block">CLEAR BLOCK</button></div>`:""}
    ${gm?`<div class="row"><input id="et-med-value" type="number" min="1" max="18" value="${actor.skills?.medicine||1}" style="width:54px"><label class="check"><input id="et-plausible" type="checkbox" ${actor.medicalCapability?.hasPlausibleMaterials?"checked":""}> plausible materials</label><label class="check"><input id="et-proper" type="checkbox" ${actor.medicalCapability?.hasProperSupplies?"checked":""}> proper supplies</label><button class="rbtn quiet" id="et-save-med">SAVE MEDICINE & SUPPLIES</button></div>`:""}
  </div>`;
}
function etCombatHTML(actor,gm=false){
  if(!actor||!globalThis.EastTennesseeCombat)return"";const state=App.session.campaignState,pending=state.pendingAttack,last=(state.attacks||[]).slice(-1)[0],weapons=(actor.weaponInstanceIds||[]).map(id=>state.weapons?.[id]).filter(Boolean).map(i=>({...EastTennesseeCombat.WEAPONS[i.definitionId],instanceId:i.id})),targets=Object.values(state.actors||{}).filter(a=>a.actorId!==actor.actorId&&!a.health?.dead);
  const ctx=actor.combatContext||{},aim=actor.aim?.active?`${EastTennesseeCombat.WEAPONS[actor.aim.weaponId]?.name||actor.aim.weaponId}${actor.aim.targetActorId?` at ${state.actors[actor.aim.targetActorId]?.identity?.name||actor.aim.targetActorId}`:""}`:"none";
  let html=`<div class="sect"><h3>East Tennessee Attacks · Prototype</h3><div class="hint"><b>Aim:</b> ${esc(aim)} · <b>Cover:</b> ${esc(ctx.cover||"none")} · <b>Visibility:</b> ${esc(ctx.visibility||"clear")}</div>`;
  if(weapons.length&&targets.length)html+=`<div class="row"><select id="et-weapon">${weapons.map(w=>{const i=state.weapons[w.instanceId],loaded=globalThis.EastTennesseeEquipment?EastTennesseeEquipment.loaded(state,i):null;return`<option value="${w.instanceId}">${esc(w.name)} · ${w.attackType}${w.firearmType?` · ${loaded}/${w.capacity} · ${i.accessState} · ${i.condition}`:""}</option>`;}).join("")}</select><select id="et-attack-target">${targets.map(t=>`<option value="${esc(t.actorId)}">${esc(t.identity?.name||t.actorId)}</option>`).join("")}</select></div><div class="row"><select id="et-called"><option value="">no called shot</option><option value="substantial">substantial · 1 bane</option><option value="precise">precise · 2 banes</option></select><input id="et-called-desc" placeholder="location / object" style="flex:1"></div><label class="check"><input id="et-nonlethal" type="checkbox"> nonlethal melee intent</label><div class="row"><button class="rbtn quiet" id="et-aim">AIM</button><button class="rbtn" id="et-attack">REQUEST ATTACK</button>${actor.aim?.active?`<button class="rbtn quiet" id="et-cancel-aim">CANCEL AIM</button>`:""}</div>`;
  if(gm)html+=`<div class="row"><select id="et-cover">${["none","partial","strong","noLineOfSight"].map(v=>`<option ${ctx.cover===v?"selected":""}>${v}</option>`)}</select><select id="et-visible">${["clear","impaired","barelyIdentifiable","unidentifiable"].map(v=>`<option ${ctx.visibility===v?"selected":""}>${v}</option>`)}</select><label class="check"><input id="et-unaware" type="checkbox" ${ctx.unaware?"checked":""}> unaware</label><label class="check"><input id="et-stationary" type="checkbox" ${ctx.stationary?"checked":""}> stationary</label></div><div class="row"><input id="et-cover-desc" placeholder="nearby cover / position" value="${esc(ctx.coverDescription||"")}" style="flex:1"><button class="rbtn quiet" id="et-context">SET TARGET CONTEXT</button></div>`;
  if(pending)html+=`<div class="hint"><b>PENDING:</b> ${esc(state.actors[pending.attackerActorId]?.identity?.name||pending.attackerActorId)} → ${esc(state.actors[pending.targetActorId]?.identity?.name||pending.targetActorId)} · ${esc(pending.weaponId)}</div>${gm||pending.targetActorId===actor.actorId?`<div class="row">${(pending.availableReactions||[]).map(r=>`<button class="rbtn quiet" data-et-reaction="${r}">${esc(r.toUpperCase())}</button>`).join("")}<button class="rbtn quiet" id="et-decline-defense">DECLINE</button>${gm?`<button class="rbtn quiet" id="et-cancel-attack">CANCEL</button>`:""}</div>`:""}`;
  if(last)html+=`<div class="hint"><b>LAST:</b> ${esc(last.weaponId)} · ${last.critical?"CRITICAL":last.fumble?"FUMBLE":esc((last.outcome||"").toUpperCase())} · ${(last.boonSources||[]).map(esc).join(", ")||"no boons"} / ${(last.baneSources||[]).map(esc).join(", ")||"no banes"}${last.healthAfter?` · ${esc(last.healthBefore)} → ${esc(last.healthAfter)}`:""}</div>${gm&&last.status==="pendingConsequence"?`<div class="row"><input id="et-injury-desc" placeholder="injury description" value="Attack injury" style="flex:1"><input id="et-injury-bane" placeholder="relevant bane" value="One bane when relevant." style="flex:1"></div><div class="row"><button class="rbtn" id="et-confirm-hit" data-attack="${last.id}">CONFIRM SERIOUS HIT</button><button class="rbtn quiet" id="et-lesser-hit" data-attack="${last.id}">LESSER EFFECT</button></div>`:""}${gm&&last.fumble&&!last.fictionalEffect?`<div class="row"><input id="et-fumble-desc" placeholder="fumble consequence" value="Weapon dropped" style="flex:1"><button class="rbtn quiet" id="et-fumble" data-attack="${last.id}">RESOLVE FUMBLE</button></div>`:""}`;
  return html+`</div>`;
}
function etEquipmentHTML(actor,gm=false){if(!actor||!globalThis.EastTennesseeEquipment)return"";const s=App.session.campaignState,weapons=(actor.weaponInstanceIds||[]).map(id=>s.weapons?.[id]).filter(Boolean),reserve=actor.reserveAmmunition||{},pending=s.pendingExtendedReload,actors=Object.values(s.actors||{}),ownerOptions=current=>actors.map(a=>`<option value="${esc(a.actorId)}" ${a.actorId===current?"selected":""}>${esc(a.identity?.name||a.actorId)}</option>`).join("");return`<div class="sect"><h3>Equipment</h3><div class="hint"><b>Reserve:</b> revolver ${reserve.revolver36||0} · rifle-musket ${reserve.rifleMusket||0} · shotgun ${reserve.shotgun||0}</div>${weapons.map(w=>{const d=EastTennesseeCombat.WEAPONS[w.definitionId],loaded=EastTennesseeEquipment.loaded(s,w),cylinders=(w.cylinderIds||[]).map(id=>s.cylinders[id]).filter(Boolean);return`<div class="tok"><span class="nm">${esc(d.name)}${d.firearmType?` · ${loaded}/${d.capacity}`:""}</span><span>${esc(w.accessState)} · ${esc(w.condition)}</span>${d.firearmType==="capAndBallRevolver"?`<div class="hint">${cylinders.map(c=>`${c.id===w.installedCylinderId?"installed":"spare"}: ${c.loadedChambers}/6`).join(" · ")}</div>`:""}<div class="row">${["singleShotLongGun","shotgun"].includes(d.firearmType)?`<button class="rbtn quiet" data-eq-reload="${w.id}">RELOAD</button>`:""}${d.firearmType==="capAndBallRevolver"?cylinders.filter(c=>c.id!==w.installedCylinderId).map(c=>`<button class="rbtn quiet" data-eq-swap="${w.id}" data-cylinder="${c.id}">SWAP ${c.loadedChambers}/6</button><label>load <input data-eq-load-count="${c.id}" type="number" min="1" max="${6-c.loadedChambers}" value="${Math.max(1,6-c.loadedChambers)}" style="width:45px"></label><button class="rbtn quiet" data-eq-extended="${c.id}">BEGIN</button>`).join(""):""}${w.accessState==="held"?`<button class="rbtn quiet" data-eq-drop="${w.id}">DROP</button>`:""}${["packed","stored","dropped"].includes(w.accessState)?`<button class="rbtn quiet" data-eq-retrieve="${w.id}">RETRIEVE</button>`:""}${EastTennesseeEquipment.USABLE.has(w.accessState)?`<button class="rbtn quiet" data-eq-stow="${w.id}">STOW</button>`:""}</div>${gm?`<div class="row"><select data-eq-access="${w.id}">${["held","holstered","slung","accessible","packed","dropped","stored"].map(v=>`<option ${w.accessState===v?"selected":""}>${v}</option>`)}</select><select data-eq-condition="${w.id}">${["usable","damaged","broken"].map(v=>`<option ${w.condition===v?"selected":""}>${v}</option>`)}</select>${d.firearmType&&d.firearmType!=="capAndBallRevolver"?`<label>loaded <input data-eq-loaded="${w.id}" type="number" min="0" max="${d.capacity}" value="${loaded}" style="width:48px"></label>`:""}<label>owner <select data-eq-transfer-weapon="${w.id}">${ownerOptions(w.ownerActorId)}</select></label></div>${cylinders.map(c=>`<div class="row"><label>${c.id===w.installedCylinderId?"installed":"spare"} cylinder <input data-eq-cylinder-loaded="${c.id}" type="number" min="0" max="6" value="${c.loadedChambers}" style="width:48px"></label>${c.id!==w.installedCylinderId?`<label>owner <select data-eq-transfer-cylinder="${c.id}">${ownerOptions(c.ownerActorId)}</select></label>`:""}</div>`).join("")}`:""}</div>`;}).join("")}${gm?`<div class="row">${["revolver36","rifleMusket","shotgun"].map(k=>`<label>${k}<input data-eq-reserve="${k}" type="number" min="0" max="9999" value="${reserve[k]||0}" style="width:55px"></label>`).join("")}</div>`:""}${pending?`<div class="hint">Extended loading pending: ${pending.requestedChambers} chamber(s)</div>${gm?`<div class="row"><button class="rbtn" id="eq-complete">COMPLETE</button><button class="rbtn quiet" id="eq-cancel">CANCEL</button></div>`:""}`:""}</div>`;}
function wireEtEquipment(p,actor,gm=false){if(!actor||!globalThis.EastTennesseeEquipment)return;const s=App.session.campaignState,sp=s.structuredPlay||{},send=a=>gm?etHostAction(a):clientSend({type:"eastTennesseeAction",action:{...a,expectedRound:sp.roundNumber,expectedEntryId:sp.currentEntryId}});p.querySelectorAll("[data-eq-reload]").forEach(el=>el.onclick=()=>send({type:"reloadWeapon",actorId:actor.actorId,weaponInstanceId:el.dataset.eqReload}));p.querySelectorAll("[data-eq-swap]").forEach(el=>el.onclick=()=>send({type:"swapRevolverCylinder",actorId:actor.actorId,weaponInstanceId:el.dataset.eqSwap,cylinderId:el.dataset.cylinder}));p.querySelectorAll("[data-eq-extended]").forEach(el=>el.onclick=()=>{const input=p.querySelector(`[data-eq-load-count="${el.dataset.eqExtended}"]`),count=Number(input?.value);if(count)send({type:"beginExtendedCylinderReload",actorId:actor.actorId,cylinderId:el.dataset.eqExtended,requestedChambers:count});});p.querySelectorAll("[data-eq-drop]").forEach(el=>el.onclick=()=>send({type:"dropWeapon",actorId:actor.actorId,weaponInstanceId:el.dataset.eqDrop,location:s.scene?.id}));p.querySelectorAll("[data-eq-retrieve]").forEach(el=>el.onclick=()=>send({type:"retrieveWeapon",actorId:actor.actorId,weaponInstanceId:el.dataset.eqRetrieve}));p.querySelectorAll("[data-eq-stow]").forEach(el=>el.onclick=()=>send({type:"stowWeapon",actorId:actor.actorId,weaponInstanceId:el.dataset.eqStow}));if(gm){p.querySelectorAll("[data-eq-access]").forEach(el=>el.onchange=()=>send({type:"gmSetWeaponAccess",weaponInstanceId:el.dataset.eqAccess,accessState:el.value}));p.querySelectorAll("[data-eq-condition]").forEach(el=>el.onchange=()=>send({type:"gmSetWeaponCondition",weaponInstanceId:el.dataset.eqCondition,condition:el.value}));p.querySelectorAll("[data-eq-loaded]").forEach(el=>el.onchange=()=>send({type:"gmAdjustLoadedState",weaponInstanceId:el.dataset.eqLoaded,value:+el.value}));p.querySelectorAll("[data-eq-cylinder-loaded]").forEach(el=>el.onchange=()=>send({type:"gmAdjustLoadedState",cylinderId:el.dataset.eqCylinderLoaded,value:+el.value}));p.querySelectorAll("[data-eq-reserve]").forEach(el=>el.onchange=()=>send({type:"gmAdjustReserveAmmunition",actorId:actor.actorId,ammoType:el.dataset.eqReserve,value:+el.value}));p.querySelectorAll("[data-eq-transfer-weapon]").forEach(el=>el.onchange=()=>send({type:"gmTransferWeapon",weaponInstanceId:el.dataset.eqTransferWeapon,newOwnerActorId:el.value}));p.querySelectorAll("[data-eq-transfer-cylinder]").forEach(el=>el.onchange=()=>send({type:"gmTransferCylinder",cylinderId:el.dataset.eqTransferCylinder,newOwnerActorId:el.value}));const complete=$("eq-complete"),cancel=$("eq-cancel");if(complete)complete.onclick=()=>send({type:"completeExtendedCylinderReload",sequence:s.pendingExtendedReload.sequence});if(cancel)cancel.onclick=()=>send({type:"cancelExtendedCylinderReload",sequence:s.pendingExtendedReload.sequence});}}
function wireEtCombat(p,actor,gm=false){if(!actor||!globalThis.EastTennesseeCombat)return;const state=App.session.campaignState,sp=state.structuredPlay||{},send=action=>gm?etHostAction(action):clientSend({type:"eastTennesseeAction",action:{...action,expectedRound:sp.roundNumber,expectedEntryId:sp.currentEntryId}}),weapon=()=>$("et-weapon")?.value,target=()=>$("et-attack-target")?.value;
  const aim=$("et-aim");if(aim)aim.onclick=()=>send({type:"declareAim",actorId:actor.actorId,weaponId:state.weapons[weapon()]?.definitionId,targetActorId:target(),description:"Maintaining firing position"});const cancel=$("et-cancel-aim");if(cancel)cancel.onclick=()=>send({type:"cancelAim",actorId:actor.actorId});const attack=$("et-attack");if(attack)attack.onclick=()=>{const ready=(sp.initiativeEntries||[]).find(e=>e.triggeredReady&&(e.participantIds||[]).some(id=>(sp.participants||[]).find(x=>x.id===id)?.actorId===actor.actorId));send({type:"requestAttack",attackerActorId:actor.actorId,targetActorId:target(),weaponInstanceId:weapon(),calledShot:$("et-called").value||null,calledShotDescription:$("et-called-desc").value,nonlethal:$("et-nonlethal").checked,readyEntryId:ready?.entryId});};
  if(gm){const set=$("et-context");if(set)set.onclick=()=>{const id=target();if(id)send({type:"gmSetCombatContext",targetActorId:id,context:{cover:$("et-cover").value,visibility:$("et-visible").value,unaware:$("et-unaware").checked,stationary:$("et-stationary").checked,coverDescription:$("et-cover").value==="none"?"":$("et-cover-desc").value}});};}
  p.querySelectorAll("[data-et-reaction]").forEach(el=>el.onclick=()=>send({type:"chooseDefenseReaction",sequence:state.pendingAttack.sequence,reaction:el.dataset.etReaction,requestedCover:el.dataset.etReaction==="takeCover"?"partial":undefined,coverDescription:"nearby cover"}));const decline=$("et-decline-defense");if(decline)decline.onclick=()=>send({type:"declineDefenseReaction",sequence:state.pendingAttack.sequence});const cancelAttack=$("et-cancel-attack");if(cancelAttack)cancelAttack.onclick=()=>send({type:"gmCancelPendingAttack"});const confirm=$("et-confirm-hit");if(confirm)confirm.onclick=()=>send({type:"gmConfirmHitConsequence",attackId:confirm.dataset.attack,description:$("et-injury-desc").value||"Attack injury",relevantBane:$("et-injury-bane").value||"One bane when relevant."});const lesser=$("et-lesser-hit");if(lesser)lesser.onclick=()=>send({type:"gmConfirmHitConsequence",attackId:lesser.dataset.attack,serious:false,fictionalEffect:"GM-declared lesser fictional effect"});const fumble=$("et-fumble");if(fumble)fumble.onclick=()=>send({type:"gmApplyFumbleConsequence",attackId:fumble.dataset.attack,description:$("et-fumble-desc").value||"Weapon dropped"});
}
function etHostAction(action){if($("eq-waive-action")?.checked)action={...action,gmWaiveAction:true};const context={role:"gm",campaignId:App.session.campaignId},options={tokens:[...App.session.map.tokens,...App.session.verso.tokens]};let result=globalThis.EastTennesseeHandouts?EastTennesseeHandouts.performAction(App.session.campaignState,context,action):{ok:false,reason:"unknown handout action"};if(!result.ok&&result.reason==="unknown handout action")result=globalThis.EastTennesseeFinchsNest?EastTennesseeFinchsNest.performAction(App.session.campaignState,context,action,options):{ok:false,reason:"unknown Finch's Nest action"};if(!result.ok&&result.reason==="unknown Finch's Nest action")result=globalThis.EastTennesseeLickCreek?EastTennesseeLickCreek.performAction(App.session.campaignState,context,action,options):{ok:false,reason:"unknown Lick Creek action"};if(!result.ok&&result.reason==="unknown Lick Creek action")result=globalThis.EastTennesseeNPCs?EastTennesseeNPCs.performAction(App.session.campaignState,context,action,options):{ok:false,reason:"unknown NPC action"};if(!result.ok&&result.reason==="unknown NPC action")result=globalThis.EastTennesseeEquipment?EastTennesseeEquipment.performAction(App.session.campaignState,context,action,options):{ok:false,reason:"unknown equipment action"};if(!result.ok&&result.reason==="unknown equipment action")result=globalThis.EastTennesseeCombat?EastTennesseeCombat.performAction(App.session.campaignState,context,action,options):{ok:false,reason:"unknown combat action"};if(!result.ok&&result.reason==="unknown combat action")result=globalThis.EastTennesseeRounds?EastTennesseeRounds.performAction(App.session.campaignState,context,action,options):{ok:false,reason:"unknown structured-play action"};if(!result.ok&&result.reason==="unknown structured-play action")result=EastTennesseeHealth.performAction(App.session.campaignState,context,action,options);if(!result.ok)alert(result.reason);else{markDirty();netMark();renderPanel();}}
function etRollAction(actorId){return{type:"requestSkillCheck",actorId,skillId:$("et-skill").value,boons:+$("et-boons").value,banes:+$("et-banes").value,boonSources:$("et-boon-source").value,baneSources:$("et-bane-source").value,usesAction:!!$("et-uses-action")?.checked};}
function wireEtGM(p,actor){if(!actor)return;p.querySelectorAll("[data-et-gm]").forEach(el=>el.onclick=()=>{const type=el.dataset.etGm;const action={type,targetActorId:actor.actorId};if(type.startsWith("apply")){action.description=prompt("Injury description",type==="applyCriticalHit"?"Severe injury":"Injury")||"Injury";action.relevantBane=prompt("When does this impose one bane?","One bane when relevant.")||"One bane when relevant.";}if(type==="gmSetStabilization")action.stable=true;etHostAction(action);});
  p.querySelectorAll("[data-et-heal]").forEach(el=>el.onclick=()=>etHostAction({type:"markInjuryHealed",targetActorId:actor.actorId,injuryId:el.dataset.etHeal}));
  p.querySelectorAll("[data-et-edit]").forEach(el=>el.onclick=()=>{const item=actor.injuries.find(i=>i.id===el.dataset.etEdit);const description=prompt("Injury description",item.description);if(description==null)return;const relevantBane=prompt("When does this impose one bane?",item.relevantBane);if(relevantBane==null)return;etHostAction({type:"editInjury",targetActorId:actor.actorId,injuryId:item.id,description,relevantBane});});
  const set=$("et-gm-set-health");if(set)set.onclick=()=>etHostAction({type:"gmSetHealth",targetActorId:actor.actorId,state:$("et-gm-health").value});
  const death=$("et-gm-death");if(death)death.onclick=()=>etHostAction({type:"gmReviveOrOverride",targetActorId:actor.actorId,dead:!actor.health.dead,dyingFailures:actor.health.dead?0:2,stable:actor.health.dead});
  const supplies=$("et-save-med");if(supplies)supplies.onclick=()=>etHostAction({type:"setMedicalCapability",targetActorId:actor.actorId,medicineValue:+$("et-med-value").value,hasPlausibleMaterials:$("et-plausible").checked,hasProperSupplies:$("et-proper").checked});
  const clear=$("et-clear-block");if(clear)clear.onclick=()=>etHostAction({type:"clearTreatmentBlock",targetActorId:actor.actorId});}
function wireEtSkills(p,actor,gm=false){if(!actor)return;const roll=$("et-roll");if(roll)roll.onclick=()=>{const request=etRollAction(actor.actorId);if(gm){request.rollPurpose=$("et-purpose").value;request.visibility=$("et-visibility").value;etHostAction(request);}else clientSend({type:"eastTennesseeAction",action:request});};
  if(gm){p.querySelectorAll("[data-et-condition]").forEach(el=>el.onclick=()=>etHostAction({type:el.dataset.active==="1"?"gmClearCondition":"gmAddCondition",targetActorId:actor.actorId,conditionId:el.dataset.etCondition,source:el.dataset.active==="1"?null:(prompt("Condition source","GM adjudication")||"GM adjudication")}));
    const propose=$("et-propose-push");if(propose)propose.onclick=()=>etHostAction({type:"gmProposePushCondition",originalRollId:propose.dataset.roll,conditionId:$("et-push-condition").value});const cancel=$("et-cancel-push");if(cancel)cancel.onclick=()=>etHostAction({type:"gmCancelPush"});const accept=$("et-gm-accept-push"),decline=$("et-gm-decline-push"),seq=App.session.campaignState.pendingPush?.sequence;if(accept)accept.onclick=()=>etHostAction({type:"acceptPush",sequence:seq});if(decline)decline.onclick=()=>etHostAction({type:"declinePush",sequence:seq});}
  else if(App.session.campaignState.pendingPush){const seq=App.session.campaignState.pendingPush.sequence,accept=$("et-accept-push"),decline=$("et-decline-push");if(accept)accept.onclick=()=>clientSend({type:"eastTennesseeAction",action:{type:"acceptPush",sequence:seq}});if(decline)decline.onclick=()=>clientSend({type:"eastTennesseeAction",action:{type:"declinePush",sequence:seq}});}}
function wireEtStructured(p,gm=false,mineActor=null){if(App.session.campaignId!=="east-tennessee-1861")return;const sp=App.session.campaignState.structuredPlay||{},send=action=>gm?etHostAction(action):clientSend({type:"eastTennesseeAction",action:{...action,expectedRound:sp.roundNumber,expectedEntryId:sp.currentEntryId}});
  const bind=(id,action)=>{const el=$(id);if(el)el.onclick=()=>send(action);};bind("et-sp-start",{type:"startStructuredPlay",sceneId:App.session.campaignState.scene?.id});
  const save=$("et-sp-participants");if(save)save.onclick=()=>send({type:"setParticipants",participants:[...p.querySelectorAll("[data-et-participant]:checked")].map(el=>{const actor=etActor(el.dataset.etParticipant);return{id:`sp:${actor.actorId}`,actorId:actor.actorId,kind:"pc",active:true,controlledBy:"owner",displayName:actor.identity?.name||actor.actorId};})});
  bind("et-sp-roll-init",{type:"rollInitiative"});bind("et-sp-first",{type:"startFirstTurn"});bind("et-sp-end",{type:"endTurn"});bind("et-sp-force",{type:"forceCompleteTurn"});bind("et-sp-end-round",{type:"endRound"});bind("et-sp-next-round",{type:"startNextRound"});
  bind("et-sp-delay-gm",{type:"delayTurn"});const gmReady=$("et-sp-ready-gm");if(gmReady)gmReady.onclick=()=>{const trigger=prompt("Ready trigger","when…"),intendedAction=trigger&&prompt("Intended action","I will…");if(trigger&&intendedAction)send({type:"readyAction",trigger,intendedAction});};
  const repair=$("et-sp-repair-go");if(repair)repair.onclick=()=>send({type:"gmSetActionState",entryId:sp.currentEntryId,actionState:$("et-sp-repair").value});
  const stop=$("et-sp-stop");if(stop)stop.onclick=()=>{const active=Object.values(App.session.campaignState.timers||{}).some(t=>t.state==="active");if(!active||confirm("Active round timers will remain paused outside structured play. Stop anyway?"))send({type:"stopStructuredPlay",overrideActiveTimers:active});};
  p.querySelectorAll("[data-et-resolve-tie]").forEach(el=>el.onclick=()=>{const selects=[...p.querySelectorAll(`[data-tie="${el.dataset.etResolveTie}"]`)];selects.sort((a,b)=>+a.value-+b.value);send({type:"resolveInitiativeTies",tieId:el.dataset.etResolveTie,entryIds:selects.map(s=>s.dataset.etTieOrder)});});
  p.querySelectorAll("[data-et-resume]").forEach(el=>el.onclick=()=>send({type:"resumeDelayedTurn",entryId:el.dataset.etResume}));
  if(!gm&&mineActor){bind("et-sp-player-end",{type:"endTurn"});bind("et-sp-delay",{type:"delayTurn"});const ready=$("et-sp-ready");if(ready)ready.onclick=()=>{const trigger=prompt("Ready trigger","when…"),intendedAction=trigger&&prompt("Intended action","I will…");if(trigger&&intendedAction)send({type:"readyAction",trigger,intendedAction});};const mineEntry=(sp.initiativeEntries||[]).find(e=>(e.participantIds||[]).some(id=>(sp.participants||[]).find(x=>x.id===id)?.actorId===mineActor.actorId));const resume=$("et-sp-player-resume");if(resume&&mineEntry)resume.onclick=()=>send({type:"resumeDelayedTurn",entryId:mineEntry.entryId});const trigger=$("et-sp-trigger-ready");if(trigger&&mineEntry)trigger.onclick=()=>send({type:"triggerReadiedAction",entryId:mineEntry.entryId});}
  p.querySelectorAll("[data-et-timer-preset]").forEach(el=>el.onclick=()=>send({type:"createTimer",definitionId:el.dataset.etTimerPreset}));const create=$("et-timer-create");if(create)create.onclick=()=>send({type:"createTimer",definitionId:"custom",label:$("et-timer-label").value,initialRounds:+$("et-timer-rounds").value,visibility:$("et-timer-vis").value});
  p.querySelectorAll("[data-et-timer]").forEach(el=>el.onclick=()=>{const command=el.dataset.command;send({type:"timerCommand",timerId:el.dataset.etTimer,command:command==="plus"||command==="minus"?"adjust":command,delta:command==="plus"?1:command==="minus"?-1:undefined});});
  p.querySelectorAll("[data-et-timer-vis]").forEach(el=>el.onchange=()=>send({type:"timerCommand",timerId:el.dataset.etTimerVis,command:"visibility",visibility:el.value}));}
/* ---------------- right panel ---------------- */
let addColor=SWATCH[0];
let dmPanelTab="scene",lastPanelToken=null,lastPanelRoom=null;
let sheetEditorOpenFor=null,tokenAddOpen=false;
let etScenePanelLocation=null;
const dmPanelScroll={scene:0,combat:0,tokens:0,cast:0,encounter:0,documents:0,table:0};
const CHECK_RECENT_KEY="palimpsest-recent-checks";
const DEFAULT_CHECKS=["Perception","Investigation","Insight","Stealth","Persuasion","Arcana"];
let recentChecks=[];
try{recentChecks=JSON.parse(localStorage.getItem(CHECK_RECENT_KEY)||"[]");if(!Array.isArray(recentChecks))recentChecks=[];}catch(e){recentChecks=[];}
function checkNames(){
  const abilities=["STR","DEX","CON","INT","WIS","CHA"];
  return [...abilities.map(a=>a+" check"),...abilities.map(a=>a+" save"),...Object.keys(SKILL_ABIL).sort()];
}
function checkBonus(sh,key){
  const chk=/^(\w{3}) check$/.exec(key);
  return chk?(sh.abil[chk[1].toLowerCase()]||0):skillBonus(sh,key);
}
function rememberCheck(key){
  recentChecks=[key,...recentChecks.filter(item=>item!==key)].slice(0,6);
  try{localStorage.setItem(CHECK_RECENT_KEY,JSON.stringify(recentChecks));}catch(e){}
}

const REVEAL_MODES=[["manual","MANUAL"],["armed","ARMED"],["always","ALWAYS"]];
function roomRevealMode(room){return REVEAL_MODES.some(([v])=>v===room.revealMode)?room.revealMode:"manual";}
function revealModeOptions(room){
  const current=roomRevealMode(room);
  return REVEAL_MODES.map(([v,n])=>`<option value="${v}" ${v===current?"selected":""}>${n}</option>`).join("");
}
function setRoomRevealMode(room,mode){
  if(!room||!REVEAL_MODES.some(([v])=>v===mode)) return;
  room.revealMode=mode;
  if(mode==="armed") App.session.verso.revealed[room.id]=false;
  if(mode==="always") App.session.verso.revealed[room.id]=true;
  levelTouched(); renderPanel();
}
function toggleRoomReveal(room){
  if(!room) return;
  const next=!App.session.verso.revealed[room.id];
  App.session.verso.revealed[room.id]=next;
  if(roomRevealMode(room)!=="manual"){
    room.revealMode="manual";
    netMarkLevel();
  }
  netMarkLevel();markDirty(); renderPanel();
}


/* one-click rolls from a token's sheet — same UI for players (their claim)
   and the DM (any selected token, e.g. rolling for NPCs) */
function tokenRoll(t,o){ // o: {die,mod,expr,label,init}
  // o.label is omitted for freeform custom rolls — the dice notation (e.g. "8d6")
  // already says what was rolled, so echoing it a second time is just noise
  const label=o.label ? t.name+" · "+o.label : t.name;
  if(NET.mode==="client"){clientSend({type:"roll",die:o.die,mod:o.mod,expr:o.expr,label,init:o.init,critDmg:o.critDmg,critLabel:o.critLabel});return;}
  if(o.expr){const pd=parseDice(o.expr); if(pd) roll(pd.d,pd.n,pd.mod,"dm",label); return;}
  const critExpr=doubleDiceExpression(o.critDmg);
  const e=roll(o.die,1,o.mod||0,"dm",label,{attack:!!critExpr});
  if(critExpr&&isCriticalRoll(e)){
    showCritOffer({label:o.critLabel||o.label||"Attack",expr:critExpr,
      onRoll:()=>tokenRoll(t,{expr:critExpr,label:(o.critLabel||o.label||"Attack")+" critical damage"})});
  }
  if(o.init) trackerSet(t.name,e.total,t.id,false);
  return e;
}
function adjustHP(t,delta){
  const sh=t.sheet; if(!sh) return;
  const max=sh.hpMax;
  let cur = sh.hp==null ? (max==null?0:max) : sh.hp;
  cur = Math.max(0, max==null ? cur+delta : Math.min(max,cur+delta));
  sh.hp=cur;
  if(NET.mode==="client") clientSend({type:"sheet",id:t.id,sheet:sh});   // host re-validates & re-syncs
  else markDirty();
  renderPanel();
}
function distinctAttacks(attacks){
  const seen=new Set(),out=[];
  (attacks||[]).forEach((attack,index)=>{
    const key=[attack.name,attack.hit,attack.dmg].join("\u0000").toLowerCase();
    if(seen.has(key))return;
    seen.add(key);out.push({attack,index});
  });
  return out;
}
function sheetRollsHTML(t){
  const sh=t.sheet;
  if(!sh) return `<div class="hint">No sheet yet — fill in (or import) the form below and the roll buttons appear here.</div>`;
  const sign=v=>(v>=0?"+":"")+v;
  let h="";
  if(sh.ac!=null || sh.hpMax!=null || sh.hp!=null){
    const max=sh.hpMax, cur=sh.hp==null?(max==null?null:max):sh.hp;
    const frac = (max&&cur!=null) ? cur/max : 1;
    const hpColor = cur===0 ? "var(--oxblood)" : frac<=.5 ? "var(--brass)" : "var(--vellum)";
    const hpText = cur==null ? "—" : (max!=null ? cur+"/"+max : String(cur));
    h+=`<div class="row" style="align-items:center;gap:8px;margin-bottom:9px;padding:7px 9px;background:var(--felt-950);border:1px solid var(--brass-faint);border-radius:4px">
      <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--vellum-dim)">AC <b style="font-size:14px;color:var(--vellum);margin-left:2px">${sh.ac??"—"}</b></span>
      <span style="flex:1"></span>
      <button class="rbtn quiet" data-hpd="-5" style="flex:none;padding:4px 7px">-5</button>
      <button class="rbtn quiet" data-hpd="-1" style="flex:none;padding:4px 7px">-1</button>
      <span style="font-family:'IBM Plex Mono',monospace;font-size:13px;min-width:50px;text-align:center;color:${hpColor}">${hpText}</span>
      <button class="rbtn quiet" data-hpd="1" style="flex:none;padding:4px 7px">+1</button>
      <button class="rbtn quiet" data-hpd="5" style="flex:none;padding:4px 7px">+5</button>
    </div>`;
  }
  h+=`<div class="row"><button class="rbtn" id="sr-init">ROLL INITIATIVE ${sign(initOf(sh))}</button></div>`;
  if(sh.spellAbil!=null){
    h+=`<div class="row"><button class="rbtn" id="sr-spellatk">SPELL ATTACK ${sign(spellAtkBonus(sh))}</button>
      <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--vellum-dim);flex:none;padding:0 6px">DC ${spellSaveDC(sh)}</span></div>`;
  }
  const attacks=distinctAttacks(sh.atks);
  if(attacks.length){
    h+=`<div class="toklist">`+attacks.map(({attack:a,index:i})=>`<div class="tok" style="cursor:default">
      <span class="nm">${esc(a.name)}</span>
      <button class="rbtn" data-srhit="${i}" style="flex:none;padding:5px 7px">ATK ${sign(a.hit)}</button>
      <button class="rbtn quiet" data-sradv="${i}" style="flex:none;padding:5px 6px" title="attack with advantage">A</button>
      <button class="rbtn quiet" data-srdis="${i}" style="flex:none;padding:5px 6px" title="attack with disadvantage">D</button>
      <button class="rbtn quiet" data-srdmg="${i}" style="flex:none;padding:5px 7px">${esc(a.dmg)}</button>
    </div>`).join("")+`</div>`;
  }
  h+=`<div class="row" style="margin-top:7px"><input type="text" id="sr-custom" placeholder="custom: 8d6, 2d4+2…" style="flex:1"><button class="rbtn quiet" id="sr-customgo" style="flex:none;padding:6px 10px">ROLL</button></div>`;
  const current=recentChecks[0]||"Perception";
  const quick=[...new Set([...recentChecks,...DEFAULT_CHECKS])].slice(0,6);
  h+=`<div class="check-picker">
    <div class="row" style="margin-top:7px"><select id="sr-skill" style="flex:1" aria-label="Check or saving throw">
      ${checkNames().map(k=>`<option value="${esc(k)}" ${k===current?"selected":""}>${esc(k)} · ${sign(checkBonus(sh,k))}</option>`).join("")}
    </select></div>
    <div class="row" style="margin-top:7px"><input type="search" id="sr-check-search" placeholder="Find a check or save…" autocomplete="off"></div>
    <div class="check-results" id="sr-check-results">${quick.map(k=>`<button type="button" class="check-option ${k===current?"on":""}" data-check-pick="${k}"><span>${k}</span><b>${sign(checkBonus(sh,k))}</b></button>`).join("")}</div>
  </div>
  <div class="row"><button class="rbtn quiet" id="sr-roll">ROLL</button><button class="rbtn quiet" id="sr-adv">ADV</button><button class="rbtn quiet" id="sr-dis">DIS</button></div>`;
  return h;
}
function wireSheetRolls(p,t){
  // all lookups scoped to the container: the same ids can exist transiently
  // in both the panel and the pop-out float during re-renders
  const sh=t.sheet, q=sel=>p.querySelector(sel),sign=v=>(v>=0?"+":"")+v;
  if(!sh || !q("#sr-roll")) return;
  const skillPick=()=>{
    const k=q("#sr-skill").value;
    return {k,bonus:checkBonus(sh,k)};
  };
  const renderChecks=query=>{
    const needle=String(query||"").trim().toLowerCase();
    const names=needle?checkNames().filter(name=>name.toLowerCase().includes(needle)).slice(0,8)
      :[...new Set([...recentChecks,...DEFAULT_CHECKS])].slice(0,6);
    const current=q("#sr-skill").value;
    q("#sr-check-results").innerHTML=names.map(k=>`<button type="button" class="check-option ${k===current?"on":""}" data-check-pick="${k}"><span>${k}</span><b>${sign(checkBonus(sh,k))}</b></button>`).join("");
    q("#sr-check-results").querySelectorAll("[data-check-pick]").forEach(button=>{
      button.onclick=()=>{q("#sr-skill").value=button.dataset.checkPick;q("#sr-check-search").value="";renderChecks("");};
    });
    return names;
  };
  const checkSelect=q("#sr-skill");
  if(checkSelect)checkSelect.onchange=()=>{q("#sr-check-search").value="";renderChecks("");};
  const checkSearch=q("#sr-check-search");
  if(checkSearch){
    renderChecks("");
    checkSearch.oninput=()=>renderChecks(checkSearch.value);
    checkSearch.onkeydown=e=>{
      if(e.key==="Escape"){checkSearch.value="";renderChecks("");checkSearch.blur();}
      if(e.key==="Enter"){e.preventDefault();const names=renderChecks(checkSearch.value);if(names[0]){q("#sr-skill").value=names[0];checkSearch.value=names[0];renderChecks("");}}
    };
  }
  p.querySelectorAll("[data-hpd]").forEach(el=>{el.onclick=()=>adjustHP(t,+el.dataset.hpd);});
  const si=q("#sr-init"); if(si) si.onclick=()=>tokenRoll(t,{die:20,mod:initOf(sh),label:"Initiative",init:true});
  const ssa=q("#sr-spellatk"); if(ssa) ssa.onclick=()=>tokenRoll(t,{die:20,mod:spellAtkBonus(sh),label:"Spell Attack"});
  const scg=q("#sr-customgo");
  if(scg){
    const goCustom=()=>{
      const expr=q("#sr-custom").value.trim();
      const pd=parseDice(expr);
      const inp=q("#sr-custom");
      if(!pd){inp.style.borderColor="var(--oxblood)";setTimeout(()=>{if(inp)inp.style.borderColor="";},900);return;}
      tokenRoll(t,{expr});
    };
    scg.onclick=goCustom;
    q("#sr-custom").addEventListener("keydown",e=>{if(e.key==="Enter")goCustom();});
  }
  p.querySelectorAll("[data-srhit]").forEach(el=>{el.onclick=()=>{const a=sh.atks[+el.dataset.srhit];if(a)tokenRoll(t,{die:20,mod:a.hit,label:a.name,critDmg:a.dmg,critLabel:a.name});};});
  p.querySelectorAll("[data-sradv]").forEach(el=>{el.onclick=()=>{const a=sh.atks[+el.dataset.sradv];if(a)tokenRoll(t,{die:"adv",mod:a.hit,label:a.name+" (adv)",critDmg:a.dmg,critLabel:a.name});};});
  p.querySelectorAll("[data-srdis]").forEach(el=>{el.onclick=()=>{const a=sh.atks[+el.dataset.srdis];if(a)tokenRoll(t,{die:"dis",mod:a.hit,label:a.name+" (dis)",critDmg:a.dmg,critLabel:a.name});};});
  p.querySelectorAll("[data-srdmg]").forEach(el=>{el.onclick=()=>{const a=sh.atks[+el.dataset.srdmg];if(a)tokenRoll(t,{expr:a.dmg,label:a.name+" damage"});};});
  q("#sr-roll").onclick=()=>{const s=skillPick();rememberCheck(s.k);tokenRoll(t,{die:20,mod:s.bonus,label:s.k});renderChecks("");};
  q("#sr-adv").onclick=()=>{const s=skillPick();rememberCheck(s.k);tokenRoll(t,{die:"adv",mod:s.bonus,label:s.k+" (adv)"});renderChecks("");};
  q("#sr-dis").onclick=()=>{const s=skillPick();rememberCheck(s.k);tokenRoll(t,{die:"dis",mod:s.bonus,label:s.k+" (dis)"});renderChecks("");};
}

/* pop-out roll palette: same controls, floating over the map, draggable by its header */
let rollsFloatOpen=false;
function rollsFloatToken(){
  return NET.mode==="client" ? S().tokens.find(t=>t.id===NET.myToken)
                             : S().tokens.find(t=>t.id===App.session.selToken);
}
function renderRollsFloat(){
  const el=$("rolls-float");
  if(!el) return;
  const t=(rollsFloatOpen && App.session.mode!=="edit") ? rollsFloatToken() : null;
  if(!t || !t.sheet){el.style.display="none";el.innerHTML="";return;}
  const ae=document.activeElement;
  // only bail for an open select/input — a just-clicked button shouldn't freeze the display
  if(ae && el.contains(ae) && (ae.tagName==="SELECT"||ae.tagName==="INPUT"||ae.tagName==="TEXTAREA")) return;
  el.style.display="block";
  el.innerHTML=`<div class="rfh" id="rf-head">🎲 ${esc(t.name).toUpperCase()}<span class="x" id="rf-close" title="dock back into the panel">✕</span></div>`
    +sheetRollsHTML(t);
  wireSheetRolls(el,t);
  $("rf-close").onclick=()=>{rollsFloatOpen=false;renderPanel();};
  const head=$("rf-head");
  head.onpointerdown=e=>{
    if(e.target.id==="rf-close") return;
    const r=el.getBoundingClientRect();
    const ox=e.clientX-r.left, oy=e.clientY-r.top;
    const move=ev=>{el.style.left=(ev.clientX-ox)+"px";el.style.top=(ev.clientY-oy)+"px";el.style.right="auto";el.style.bottom="auto";};
    const up=()=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up);};
    addEventListener("pointermove",move); addEventListener("pointerup",up);
    e.preventDefault();
  };
}

/* character mini-sheet: same form for the DM (any token) and players (their claim) */
function sheetFormHTML(t,toLib){
  const sh=t.sheet||{prof:2,init:null,abil:{str:0,dex:0,con:0,int:0,wis:0,cha:0},atks:[],skills:{}};
  const sign=v=>(v>=0?"+":"")+v;
  return `<div class="sect sheet-editor"><h3>Sheet · ${esc(t.name)}</h3>
    <div class="row"><label>prof</label><input type="number" id="sh-prof" value="${sh.prof}" style="width:52px">
      <label style="width:auto">init</label><input type="number" id="sh-init" value="${sh.init==null?"":sh.init}" placeholder="dex" style="width:52px" title="blank = use the DEX modifier"></div>
    <div class="row"><label>AC</label><input type="number" id="sh-ac" value="${sh.ac==null?"":sh.ac}" style="width:52px">
      <label style="width:auto">HP</label><input type="number" id="sh-hp" value="${sh.hp==null?"":sh.hp}" placeholder="cur" style="width:52px">
      <label style="width:12px">/</label><input type="number" id="sh-hpmax" value="${sh.hpMax==null?"":sh.hpMax}" placeholder="max" style="width:52px"></div>
    <div class="row" style="flex-wrap:wrap;gap:5px">${["str","dex","con","int","wis","cha"].map(k=>
      `<label style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--vellum-dim)">${k.toUpperCase()}<input type="number" id="sh-${k}" value="${sh.abil[k]||0}" style="width:42px;margin-left:3px"></label>`).join("")}</div>
    <div class="hint" style="margin:4px 0">Ability boxes take the MODIFIER (+3, not 16).</div>
    <div class="row"><label>spellcasting</label><select id="sh-spellabil">
      <option value="">not a caster</option>
      ${["str","dex","con","int","wis","cha"].map(k=>`<option value="${k}" ${sh.spellAbil===k?"selected":""}>${k.toUpperCase()}</option>`).join("")}
    </select></div>
    <div class="row"><label>attacks</label></div>
    <textarea id="sh-atks" rows="3" placeholder="one per line:  Rapier +5 1d8+3">${esc((sh.atks||[]).map(a=>a.name+" "+sign(a.hit)+" "+a.dmg).join("\n"))}</textarea>
    <div class="row" style="margin-top:6px"><label>skill bonuses</label></div>
    <textarea id="sh-skills" rows="2" placeholder="one per line:  Stealth +7  (unlisted skills use the ability mod)">${esc(Object.entries(sh.skills||{}).map(([k,v])=>k+" "+sign(v)).join("\n"))}</textarea>
    <div class="row" style="margin-top:8px">
      <button class="rbtn quiet" id="sh-import" title="reads the CSV export of the v2.1 5e Google Sheet — File → Download → .csv on the main tab">IMPORT GSHEET CSV</button>
      <span class="sheet-save-state" id="sh-save-state">SAVED AUTOMATICALLY</span>
    </div>
    ${toLib?`<button class="rbtn quiet" id="sh-tolib" style="width:100%;margin-top:6px" title="store name/color/PC flag/sheet in this level's Token Library">SAVE TO TOKEN LIBRARY</button>`:""}
    <div class="hint" style="margin-top:5px">Changes save automatically. Import fills the boxes from a Google Sheet CSV export. Blank init = DEX.</div>
  </div>`;
}
function readSheetForm(root=document){
  const q=id=>root.querySelector("#"+id);
  const num=id=>(+q(id).value||0)|0;
  const abil={}; for(const k of ["str","dex","con","int","wis","cha"]) abil[k]=num("sh-"+k);
  const atks=q("sh-atks").value.split("\n").map(s=>s.trim()).filter(Boolean).map(line=>{
    const m=/^(.+?)\s+([+-]?\d+)\s+(\S+)$/.exec(line);
    return m?{name:m[1],hit:+m[2],dmg:m[3]}:null;
  }).filter(Boolean);
  const skills={};
  q("sh-skills").value.split("\n").map(s=>s.trim()).filter(Boolean).forEach(line=>{
    const m=/^(.+?)\s+([+-]?\d+)$/.exec(line);
    if(m) skills[m[1]]=+m[2];
  });
  const raw=id=>{const v=q(id).value.trim();return v===""?null:+v;};
  return sanitizeSheet({prof:num("sh-prof"),init:raw("sh-init"),
    ac:raw("sh-ac"),hp:raw("sh-hp"),hpMax:raw("sh-hpmax"),
    spellAbil:q("sh-spellabil").value||null,abil,atks,skills});
}
let sheetSaveTimer=null;
function wireSheetAutosave(container,t){
  const form=container.querySelector(".sheet-editor");
  if(!form||!t)return;
  const state=form.querySelector("#sh-save-state");
  const save=()=>{
    sheetSaveTimer=null;
    t.sheet=readSheetForm(form);
    if(NET.mode==="client")clientSend({type:"sheet",id:t.id,sheet:t.sheet});
    else markDirty();
    if(state){state.textContent="SAVED";state.classList.remove("saving");}
  };
  const schedule=()=>{
    if(state){state.textContent="SAVING…";state.classList.add("saving");}
    if(sheetSaveTimer)clearTimeout(sheetSaveTimer);
    sheetSaveTimer=setTimeout(save,650);
  };
  form.querySelectorAll("input,textarea,select").forEach(field=>{
    field.addEventListener("input",schedule);
    field.addEventListener("change",schedule);
  });
  form.addEventListener("focusout",event=>{
    if(event.relatedTarget&&!form.contains(event.relatedTarget)&&sheetSaveTimer){clearTimeout(sheetSaveTimer);save();}
  });
}
function trackerListHTML(canEdit){
  const tr=App.session.tracker;
  if(!tr.order.length) return "";
  return `<div class="toklist">${tr.order.map((en,i)=>`
    <div class="tok" style="cursor:default;${i===tr.active?"border-color:var(--brass-dim);background:var(--felt-950)":""}">
      <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;width:24px;text-align:right;color:${i===tr.active?"var(--brass)":"var(--vellum-dim)"}">${(en.h&&!canEdit)?"—":en.total}</span>
      <span class="nm" style="${i===tr.active?"color:var(--brass)":""}">${i===tr.active?"▶ ":""}${en.marker?"◆ ":""}${esc(en.name)}</span>
      ${canEdit?`<span class="del" data-trh="${i}" title="${en.h?"hidden from players — click to reveal":"visible to players — click to hide"}">${en.h?"🕶":"👁"}</span><span class="del" data-trup="${i}" title="move up">▲</span><span class="del" data-trdel="${i}" title="remove">✕</span>`:""}
    </div>`).join("")}</div>`;
}
function updateTrackerFloat(){
  const el=$("tracker-float");
  if(!el) return;
  const tr=App.session.tracker;
  if(!tr.order.length || App.session.mode==="edit"){el.style.display="none";return;}
  el.style.display="flex";
  const dm=NET.mode!=="client";
  el.innerHTML=`<div class="tfh">ROUND ${tr.round||1}</div>`+tr.order.map((en,i)=>
    `<div class="tfr${i===tr.active?" on":""}"><span class="n">${(en.h&&!dm)?"—":en.total}</span><span>${i===tr.active?"▶ ":""}${en.marker?"◆ ":""}${esc(en.name)}${(en.h&&dm)?" 🕶":""}</span></div>`).join("");
}
function renderPanel(){
  updateTrackerFloat();
  renderRollsFloat();
  // don't wipe a form someone is typing in (network syncs re-render constantly)
  const ae=document.activeElement;
  if(ae && ae.closest && ae.closest("#panel") &&
     (ae.tagName==="INPUT"||ae.tagName==="TEXTAREA"||ae.tagName==="SELECT")) return;
  if(NET.mode==="client"){renderClientPanel();return;}
  if(App.session.mode==="edit"){renderEditorPanel();return;}
  const p=$("panel");
  const etMode=App.session.campaignId==="east-tennessee-1861";
  const tabDefinitions=etMode?[["scene","SCENE"],["cast","CAST"],["encounter","ENCOUNTER"],["documents","DOCUMENTS"],["table","TABLE"]]:[["scene","SCENE"],["combat","COMBAT"],["tokens","TOKENS"]];
  if(!tabDefinitions.some(([key])=>key===dmPanelTab))dmPanelTab="scene";
  if(App.session.selToken!==lastPanelToken){
    if(App.session.selToken!=null)dmPanelTab=etMode?"cast":"tokens";
    sheetEditorOpenFor=null;
    lastPanelToken=App.session.selToken;
  }
  if(App.session.selRoom!==lastPanelRoom){
    if(App.session.selRoom!=null&&App.session.selToken==null)dmPanelTab="scene";
    lastPanelRoom=App.session.selRoom;
  }
  let html=`<nav class="panel-tabs" aria-label="DM workspace">
    ${tabDefinitions.map(([key,label])=>`<button class="${dmPanelTab===key?"on":""}" data-panel-tab="${key}" aria-selected="${dmPanelTab===key}">${label}</button>`).join("")}
  </nav>`;
  const bundledLevel=App.document.level.name===App.content.VAULT_LEVEL.name?"vault":App.document.level.name===App.content.VERSO_LEVEL.name?"verso":"custom";
  if(etMode)html+=`<div class="sect"><h3>Campaign Table</h3><div class="hint">East Tennessee uses one top-down player presentation. Choose Scene Map for prepared location maps; campaign state and character ownership persist when the scene changes.</div></div>`;
  else html+=`<div class="sect"><h3>Level</h3>
    <div class="row"><select id="run-level" style="flex:1">
      <option value="verso" ${bundledLevel==="verso"?"selected":""}>The Verso</option>
      <option value="vault" ${bundledLevel==="vault"?"selected":""}>Level 2 · The Vault</option>
      ${bundledLevel==="custom"?`<option value="custom" selected disabled>Current · ${esc(App.document.level.name)}</option>`:""}
    </select><button class="rbtn quiet" id="run-transition" style="flex:none">TRANSITION</button></div>
    <button class="rbtn quiet" id="run-import-level" style="width:100%;margin-top:6px">LOAD CUSTOM LEVEL…</button>
    <div class="hint">Moves the hosted table live and preserves PC sheets and player assignments. Custom levels place the party in their first room.</div></div>`;

  if(App.session.scene==="verso"){
    const r=App.document.rooms.find(r=>r.id===App.session.selRoom);
    html+=`<div class="sect"><h3>Room</h3>`;
    if(r){
      const rev=!!App.session.verso.revealed[r.id];
      html+=`<div id="roomcard">
        <div class="rc-head"><div class="rc-name">${esc(r.name)}</div>
        <div class="rc-sub">${esc(r.sub).toUpperCase()} · ${rev?"REVEALED":"HIDDEN"}</div></div>
        <div class="rc-body">
          <div class="rc-read">${esc(r.read)}</div>
          <div class="rc-dm">${r.dm}</div>
          <div class="rc-clues">${r.clues.map(c=>`<div>${esc(c)}</div>`).join("")}</div>
        </div>
        <div class="rc-foot dm-only" style="flex-direction:column;align-items:stretch">
          <button class="rbtn" id="rc-toggle">${rev?"HIDE FROM PLAYERS":"REVEAL TO PLAYERS"}</button>
          <button class="rbtn quiet" id="rc-tactical" style="margin-top:8px">${r.battleGrid==="square"?"OPEN TACTICAL MAP":"VIEW OVERHEAD"}</button>
          <div class="row" style="margin:8px 0 0">
            <button class="rbtn quiet" id="rc-light" title="cycle lit / dim / dark / flicker">☀ ${(r.light||"lit").toUpperCase()}</button>
            <button class="rbtn quiet" id="rc-tokens" title="off: NPCs here are hidden from players until a PC is also in the room. on: NPCs always show once the room is revealed.">${r.tokensAlways?"👁 NPCS VISIBLE":"🕶 PARTY ONLY"}</button>
          </div>
          <div class="row" style="margin:8px 0 0"><label>entry reveal</label><select id="rc-reveal-mode" title="Manual, one-shot reveal when a PC enters, or always visible">${revealModeOptions(r)}</select></div>
        </div></div>`;
    }else{
      html+=`<div class="hint">Click a room on the map to read it. Reveal rooms as the party reaches them — in Player view, hidden rooms don't exist yet.</div>`;
    }
    html+=`</div>`;
    html+=`<div class="sect dm-only"><h3>Reveal</h3><div class="toklist">`+
      App.document.rooms.map(r=>`<div class="tok" data-room="${r.id}">
        <span class="dot" style="background:${App.session.verso.revealed[r.id]?"#C8A14E":"#3a3a35"}"></span>
        <span class="nm">${esc(r.name)}</span>
        <span class="del" data-rmode="${r.id}" title="click to cycle reveal policy" style="width:auto;color:${roomRevealMode(r)==="armed"?"var(--brass)":"var(--vellum-dim)"}">${roomRevealMode(r).toUpperCase()}</span>
        <span class="del" data-rev="${r.id}" title="${App.session.verso.revealed[r.id]?"hide from players":"reveal to players"}" style="color:${App.session.verso.revealed[r.id]?"#C8A14E":"#666"}">${App.session.verso.revealed[r.id]?"●":"○"}</span>
      </div>`).join("")+`</div></div>`;
    if(tacticalView()){
      const focus=App.document.rooms.find(room=>room.id===App.session.verso.tacticalFocus);
      const room=App.document.rooms.find(room=>room.id===App.session.selRoom);
      const doors=room?App.document.doors.filter(door=>doorAdjoiningRooms(door,App.document.rooms).includes(room)):[];
      const statefulProps=room?App.document.level.props.filter(prop=>Array.isArray(prop.states)&&prop.states.length&&roomAtTile(...propCenter(prop))===room):[];
      const effectPresets=App.document.level.encounterEffects||[];
      html+=`<div class="sect dm-only"><h3>Tactical Control</h3>
        <div class="hint" style="margin-bottom:7px">${focus?`Encounter focus: ${esc(focus.name)}`:"No encounter room emphasized."}</div>
        <div class="row"><button class="rbtn quiet" id="tac-focus">${room&&focus?.id!==room.id?"FOCUS SELECTED ROOM":"CLEAR ROOM FOCUS"}</button></div>
        ${doors.length?`<div class="hint" style="margin-top:9px">Doors adjoining ${esc(room.name)}:</div><div class="toklist">${doors.map(door=>`<div class="tok"><span class="nm">${esc(door.id)}</span><button class="rbtn quiet" data-door-toggle="${door.id}" style="flex:none">${doorIsOpen(door,App.session.verso.doorStates)?"OPEN":"CLOSED"}</button></div>`).join("")}</div>`:""}
        ${statefulProps.length?`<div class="hint" style="margin-top:9px">Scene objects:</div><div class="toklist">${statefulProps.map(prop=>{const current=App.session.verso.propStates[prop.id]||prop.states[0].id,state=prop.states.find(item=>item.id===current)||prop.states[0];return`<div class="tok"><span class="nm">${esc(prop.label||PROP_LIB[prop.t]?.n||"Object")}</span><button class="rbtn quiet" data-prop-state="${prop.id}" style="flex:none">${esc(state.name||state.id)}</button></div>`;}).join("")}</div>`:""}
        <div class="hint" style="margin-top:9px">Ruler and area template:</div>
        <div class="row"><select id="tac-ruler-mode"><option value="line" ${App.session.rulerMode==="line"?"selected":""}>line</option><option value="radius" ${App.session.rulerMode==="radius"?"selected":""}>radius</option><option value="cone" ${App.session.rulerMode==="cone"?"selected":""}>cone</option></select><button class="rbtn quiet" id="tac-ruler">MEASURE</button></div>
        <div class="hint" style="margin-top:9px">Encounter effects:</div>
        ${effectPresets.length?`<div class="row"><select id="tac-effect-preset"><option value="">custom effect</option>${effectPresets.map(effect=>`<option value="${effect.id}">${esc(effect.name)}</option>`).join("")}</select></div>`:""}
        <div class="row"><input id="tac-effect-name" value="Hazard" maxlength="80" style="flex:1"><input id="tac-effect-duration" type="number" min="0" max="99" value="0" title="rounds; zero is persistent" style="width:54px"></div>
        <div class="row"><select id="tac-effect-type"><option value="hazard">hazard</option><option value="difficult">difficult terrain</option><option value="cover">full cover</option></select><select id="tac-effect-shape"><option value="rect">rectangle</option><option value="circle">ellipse</option></select></div>
        <div class="row"><label>size</label><input id="tac-effect-w" type="number" min="1" max="20" value="1"><span>×</span><input id="tac-effect-h" type="number" min="1" max="20" value="1"><span>squares</span></div>
        <button class="rbtn" id="tac-effect-place" style="width:100%;margin-top:6px">PLACE ON MAP</button>
        ${(App.session.verso.effects||[]).length?`<div class="toklist" style="margin-top:7px">${App.session.verso.effects.map(effect=>`<div class="tok"><span class="dot" style="background:${effect.terrain==="hazard"?"#B5443C":effect.terrain==="cover"?"#8A6E36":"#C8A14E"}"></span><span class="nm">${esc(effect.label)}${effect.timed?` · ${effect.remaining}r`:""}</span>${effect.timed?`<span class="del" data-effect-dec="${effect.id}">−</span><span class="del" data-effect-inc="${effect.id}">+</span>`:""}<span class="del" data-effect-del="${effect.id}">✕</span></div>`).join("")}</div>`:""}
        <div class="hint">Open doors here or click a door line. Placed effects belong to this session, not the reusable level.</div></div>`;
    }
  }else{
    html+=`<div class="sect"><h3>Map</h3>`;
    if(App.session.map.img){
      html+=`<div class="hint" style="margin-bottom:8px">${esc(App.session.map.name||"map")} · ${App.session.map.img.width}×${App.session.map.img.height}px</div>`;
    }
    html+=`<button class="rbtn" id="btn-import" style="width:100%">IMPORT MAP IMAGE</button></div>`;
    html+=`<div class="sect"><h3>Grid</h3>
      <label class="check"><input type="checkbox" id="g-show" ${App.session.map.grid.show?"checked":""}> show grid (G)</label>
      <label class="check"><input type="checkbox" id="g-snap" ${App.session.map.grid.snap?"checked":""}> snap tokens</label>
      <div class="row"><label>size px</label><input type="range" id="g-size" min="20" max="220" value="${App.session.map.grid.size}"><input type="number" id="g-size-n" value="${App.session.map.grid.size}"></div>
      <div class="row"><label>offset x</label><input type="range" id="g-ox" min="0" max="${App.session.map.grid.size}" value="${App.session.map.grid.ox}"></div>
      <div class="row"><label>offset y</label><input type="range" id="g-oy" min="0" max="${App.session.map.grid.size}" value="${App.session.map.grid.oy}"></div>
      <div class="hint">Match size to one 5-ft square on your Inkarnate export, then nudge offsets until lines sit on your walls.</div></div>`;
    html+=`<div class="sect dm-only"><h3>Fog of War</h3>
      <label class="check"><input type="checkbox" id="f-on" ${App.session.map.fogOn?"checked":""}> fog enabled</label>
      <div class="row"><label>brush</label><input type="range" id="f-brush" min="20" max="300" value="${App.session.map.brush}"></div>
      <div class="row">
        <button class="rbtn quiet" id="f-all">COVER ALL</button>
        <button class="rbtn quiet" id="f-none">CLEAR ALL</button>
      </div>
      <div class="hint">DM view shows fog at half strength; Player view is opaque. Use the eye tools (R / H) to paint.</div></div>`;
  }

  // dice
  if(!etMode)html+=`<div class="sect"><h3>Dice</h3>
    <div class="row" style="flex-wrap:wrap;gap:5px">
      ${[4,6,8,10,12,20,100].map(d=>`<button class="rbtn quiet" data-die="${d}" style="flex:none;padding:6px 9px">d${d}</button>`).join("")}
      <button class="rbtn quiet" data-die="adv" style="flex:none;padding:6px 9px">ADV</button>
      <button class="rbtn quiet" data-die="dis" style="flex:none;padding:6px 9px">DIS</button>
    </div>
    <div class="row"><label>count</label><input type="number" id="dice-n" min="1" max="10" value="${diceN}">
      <label style="width:auto">mod</label><input type="number" id="dice-mod" value="${diceMod}" style="width:58px"></div>
    <div class="row"><input type="text" id="dice-custom" placeholder="custom: 8d6, 2d4+2…" style="flex:1"><button class="rbtn quiet" id="dice-customgo" style="flex:none;padding:6px 10px">ROLL</button></div>
    <label class="check"><input type="checkbox" id="dice-hide" ${dmHidden?"checked":""}> hidden rolls — only you see the results</label>
    <div class="toklist">${diceLog.slice(0,6).map(e=>{const f=fmtRoll(e);
      return `<div class="tok" style="cursor:default"><span class="nm" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--vellum-dim)">${e.hush?"🕶 ":""}${esc(f.head)} ${esc(f.detail)}</span><span style="font-family:Marcellus,serif;font-size:16px;color:var(--brass)">${esc(f.total)}</span></div>`;}).join("")}</div>
    <div class="hint" style="margin-top:6px">Rolls flash on the player window. The tray at the bottom of that window is clickable too (for a table TV).</div></div>`;

  // initiative tracker
  if(!etMode)html+=`<div class="sect"><h3>Initiative · Round ${App.session.tracker.round||1}</h3>`+trackerListHTML(true)+
    (App.session.tracker.order.length
      ?`<div class="row" style="margin-top:7px"><button class="rbtn" id="tr-next">NEXT TURN</button><button class="rbtn quiet" id="tr-clear">CLEAR</button></div>`
      :`<div class="hint" style="margin-bottom:7px">Players can add themselves; the DM can roll every current PC or NPC token at once.</div>`)+
    `<div class="row"><button class="rbtn quiet" id="tr-pcs">ROLL PCS</button><button class="rbtn quiet" id="tr-npcs">ROLL NPCS</button></div>
    <div class="row"><input type="text" id="tr-name" placeholder="name" style="flex:1"><input type="number" id="tr-total" placeholder="#" style="width:52px"><button class="rbtn quiet" id="tr-add" style="flex:none;padding:6px 10px">ADD</button></div>
    <label class="check"><input type="checkbox" id="tr-marker"> initiative marker / lair action</label>
    <label class="check"><input type="checkbox" id="tr-hide" checked> added entries hidden from players (5e style)</label>
  </div>`;

  // events
  if(!etMode)html+=`<div class="sect"><h3>Events</h3>
    <div class="row"><button class="rbtn" id="ev-pulse">PULSE PATROLS</button></div>
    <div class="row"><input type="text" id="ev-text" placeholder="message the whole table…" style="flex:1"><button class="rbtn quiet" id="ev-send" style="flex:none;padding:6px 10px">SEND</button></div>
    <div class="hint">PULSE walks every patrolling token one waypoint. SEND flashes the text on every screen — good for "the muzak stops."</div></div>`;

  // tokens
  const toks=S().tokens;
  html+=`<div class="sect"><h3>Tokens</h3><div class="toklist">`+
    toks.map(t=>`<div class="tok ${App.session.selToken===t.id?"sel":""}" data-tok="${t.id}">
      <span class="dot" style="background:${t.color}">${esc(t.letter)}</span>
      <span class="nm">${esc(t.name)}${t.ownerKey?' <span style="font-size:9px;color:var(--under)">· assigned</span>':''}</span>
      ${t.ownerKey?`<span class="del" data-unclaim="${t.id}" title="clear saved player assignment">UNASSIGN</span>`:""}
      <span class="del" data-pc="${t.id}" title="toggle: players can see & claim this token" style="font-size:9px;letter-spacing:.05em;color:${t.pc?"var(--brass)":"#666"}">${t.pc?"PC":"npc"}</span>
      <span class="del" data-del="${t.id}" title="remove">✕</span>
    </div>`).join("")+
    `</div>`;
  // patrol controls for the selected token
  const selT=toks.find(t=>t.id===App.session.selToken);
  if(selT){
    html+=`<div class="row" style="margin-top:7px">
      <button class="rbtn quiet" id="pt-rec">${patrolRec===selT.id?"■ STOP RECORDING":"● RECORD PATROL"}</button>
      ${selT.patrol&&selT.patrol.length?`<button class="rbtn quiet" id="pt-clear">CLEAR PATH (${selT.patrol.length})</button>`:""}
    </div>`;
    if(patrolRec===selT.id) html+=`<div class="hint">Click the map to drop waypoints for ${esc(selT.name)}, then STOP. PULSE (Events) walks the route.</div>`;
    if(tacticalView())html+=`<div class="row" style="margin-top:7px"><label>elevation</label><input id="tok-z" type="number" min="0" max="40" value="${selT.z||0}" style="width:56px"><span>× 5 ft</span></div>
      <div class="row" style="margin-top:5px">${["prone","concentrating","marked"].map(status=>`<button class="rbtn quiet" data-status="${status}" style="${(selT.statuses||[]).includes(status)?"color:var(--brass);border-color:var(--brass-dim)":""}">${status.toUpperCase()}</button>`).join("")}</div>`;
    if(selT.phases?.length>1){
      const nextPhase=selT.phases[((selT.phase||0)+1)%selT.phases.length];
      html+=`<button class="rbtn" id="tok-phase" style="width:100%;margin-top:7px">TRANSFORM → ${esc((nextPhase.title||nextPhase.name||"NEXT PHASE").toUpperCase())}</button>`;
    }
  }
  html+=`<div class="row" style="margin-top:8px">${selT?`<button class="rbtn quiet" id="toggle-sheet-editor">${sheetEditorOpenFor===selT.id?"CLOSE SHEET EDITOR":selT.sheet?"EDIT SHEET":"ADD SHEET"}</button>`:""}<button class="rbtn quiet" id="toggle-add-token">${tokenAddOpen?"CLOSE ADD TOKEN":"+ ADD TOKEN"}</button></div>`;
  html+=`</div>`;
  if(selT && selT.sheet){
    html+=`<div class="sect"><h3>Roll as ${esc(selT.name)}</h3>`+
      (rollsFloatOpen?`<div class="hint">Popped out — floating over the map.</div>`
        :sheetRollsHTML(selT)+`<button class="rbtn quiet" id="sr-pop" style="width:100%;margin-top:6px">POP OUT OVER MAP</button>`)+
      `</div>`;
  }
  if(selT&&sheetEditorOpenFor===selT.id) html+=sheetFormHTML(selT,true);
  const etSelected=selT&&etActor(selT.actorId);
  if(etSelected)html+=etHealthHTML(etSelected,true)+etSkillHTML(etSelected,true)+`<label class="check"><input id="eq-waive-action" type="checkbox"> Equipment override: waive structured action cost</label>`+etEquipmentHTML(etSelected,true)+etCombatHTML(etSelected,true);
  if(App.session.campaignId==="east-tennessee-1861"){
    html+=etHandoutsHTML();
    html+=etCharactersHTML(true);
    html+=etNpcsHTML(true);
    if(!etScenePanelLocation)etScenePanelLocation=String(App.session.map.name||"").startsWith("Lick Creek")?"lick-creek":"finchs-nest";
    html+=`<div class="sect"><h3>Adventure Location</h3><div class="row"><button class="rbtn ${etScenePanelLocation==="finchs-nest"?"":"quiet"}" data-et-location="finchs-nest">FINCH'S NEST</button><button class="rbtn ${etScenePanelLocation==="lick-creek"?"":"quiet"}" data-et-location="lick-creek">LICK CREEK</button></div></div>`;
    html+=etScenePanelLocation==="lick-creek"?etLickCreekHTML(true):etFinchsHTML(true);
    html+=etTalentControlsHTML(etSelected,true);
    const danger=!!App.session.campaignState.scene?.immediateDanger;
    html+=`<div class="sect"><h3>Encounter State</h3><div class="hint">Use an encounter when immediate opposition or an action-relative countdown begins. Ordinary travel, waiting, and reconnaissance stay in scene time.</div><button class="rbtn" id="et-danger">${danger?"END ENCOUNTER":"START ENCOUNTER"}</button><details class="et-card"><summary><span>Scene maintenance</span><b>GM</b></summary><div class="et-card-body"><button class="rbtn quiet" id="et-new-scene">CLEAR SCENE-LIMITED USES</button><div class="hint">Use only when the fiction has genuinely moved into a new scene.</div></div></details></div>`;
    html+=etStructuredHTML(true);
  }
  // add token
  if(tokenAddOpen)html+=`<div class="sect"><h3>Add Token</h3>
    <div class="row"><input type="text" id="at-name" placeholder="name" style="flex:1"></div>
    <div class="swatches">${SWATCH.map(c=>`<span class="sw ${c===addColor?"on":""}" data-c="${c}" style="background:${c}"></span>`).join("")}</div>
    <div class="row"><label>size</label><select id="at-size"><option value="1">Medium</option><option value="2">Large</option><option value="3">Huge</option></select></div>
    <label class="check"><input type="checkbox" id="at-pc"> players can claim (PC)</label>
    <button class="rbtn" id="addtok-btn">PLACE TOKEN</button>
    <div class="hint" style="margin-top:8px">Library shortcuts (edit in EDITOR → Token Library):</div>
    <div class="toklist" style="margin-top:5px">${App.document.level.roster.map((p,i)=>`<div class="tok" data-party="${i}">
      <span class="dot" style="background:${p.color}">${esc(p.letter)}</span><span class="nm">${esc(p.name)}</span>${p.pc?'<span style="font-size:9px;color:var(--brass)">PC</span>':''}</div>`).join("")}</div>
  </div>`;

  p.innerHTML=html;
  const panelGroup=section=>{
    const title=section.querySelector("h3")?.textContent.trim()||"";
    if(etMode){
      if(title==="Documents")return"documents";
      if(title==="Characters"||title==="People"||title==="Tokens"||title.startsWith("Roll as ")||title.startsWith("East Tennessee Health")||title==="Checks"||title==="Equipment"||title.startsWith("East Tennessee Attacks")||title.startsWith("East Tennessee Treatment"))return"cast";
      if(title==="Encounter Rounds"||title==="Encounter State"||title==="Contextual Talent"||title==="Dice"||title.startsWith("Initiative"))return"encounter";
      if(title==="Adventure Location"||title.startsWith("Finch's Nest")||title.startsWith("Lick Creek"))return"scene";
      return"table";
    }
    if(title==="Dice"||title.startsWith("Initiative"))return"combat";
    if(title==="Tokens"||title.startsWith("Roll as ")||title.startsWith("Sheet ·")||title==="Add Token"||title.startsWith("East Tennessee Health")||title.startsWith("East Tennessee Skills")||title.startsWith("East Tennessee Equipment")||title.startsWith("East Tennessee Attacks"))return"tokens";
    return"scene";
  };
  for(const section of [...p.children].filter(child=>child.classList.contains("sect"))){
    const group=panelGroup(section);
    section.classList.add("panel-group-"+group);
    section.classList.toggle("panel-section-hidden",group!==dmPanelTab);
  }
  p.querySelectorAll("[data-panel-tab]").forEach(button=>{
    button.onclick=()=>{
      dmPanelScroll[dmPanelTab]=p.scrollTop;
      dmPanelTab=button.dataset.panelTab;
      renderPanel();
      requestAnimationFrame(()=>{p.scrollTop=dmPanelScroll[dmPanelTab]||0;});
    };
  });
  const transition=$("run-transition");
  const levelPick=$("run-level");
  const updateTransition=()=>{
    if(!transition||!levelPick)return;
    const same=levelPick.value===bundledLevel;
    transition.disabled=same;transition.textContent=same?"CURRENT":"TRANSITION";
  };
  if(levelPick)levelPick.onchange=updateTransition;
  if(transition)transition.onclick=()=>{
    const target=levelPick.value;
    if(target===bundledLevel)return;
    transition.disabled=true;transition.textContent="MOVING TABLE…";
    transitionBundledLevel(target);
  };
  const importLevel=$("run-import-level");
  if(importLevel)importLevel.onclick=()=>openLevelFile("transition");
  updateTransition();
  const sheetToggle=$("toggle-sheet-editor");
  if(sheetToggle&&selT)sheetToggle.onclick=()=>{sheetEditorOpenFor=sheetEditorOpenFor===selT.id?null:selT.id;renderPanel();};
  const addToggle=$("toggle-add-token");
  if(addToggle)addToggle.onclick=()=>{tokenAddOpen=!tokenAddOpen;renderPanel();};
  wireEtGM(p,etSelected);
  wireEtCharacters(p,true);
  wireEtNpcs(p);
  wireEtFinchs(p,true);
  wireHandouts(p,true);
  wireEtLickCreek(p,true);
  p.querySelectorAll("[data-et-location]").forEach(button=>button.onclick=()=>{etScenePanelLocation=button.dataset.etLocation;renderPanel();});
  wireEtTalentControls(p,etSelected,true);
  wireEtSkills(p,etSelected,true);
  wireEtEquipment(p,etSelected,true);
  wireEtCombat(p,etSelected,true);
  wireEtStructured(p,true);
  const etDanger=$("et-danger");if(etDanger)etDanger.onclick=()=>etHostAction({type:"setImmediateDanger",active:!App.session.campaignState.scene.immediateDanger});
  const etNewScene=$("et-new-scene");if(etNewScene)etNewScene.onclick=()=>{const id=prompt("New scene instance ID",`scene-${Date.now()}`);if(id)etHostAction({type:"beginNewScene",sceneId:id});};

  /* wire panel events */
  if(App.session.scene==="verso"){
    const tg=$("rc-toggle");
    if(tg) tg.onclick=()=>{
      toggleRoomReveal(App.document.rooms.find(r=>r.id===App.session.selRoom));
    };
    const rcm=$("rc-reveal-mode");
    if(rcm) rcm.onchange=e=>{const room=App.document.rooms.find(r=>r.id===App.session.selRoom);e.target.blur();setRoomRevealMode(room,e.target.value);};
    const rctac=$("rc-tactical");
    if(rctac)rctac.onclick=()=>{const room=App.document.rooms.find(r=>r.id===App.session.selRoom);setLevelView("tactical",room);};
    const rcl=$("rc-light");
    if(rcl) rcl.onclick=()=>{
      const room=App.document.rooms.find(x=>x.id===App.session.selRoom);
      if(!room) return;
      const seq=["lit","dim","dark","flicker"];
      const next=seq[(seq.indexOf(room.light||"lit")+1)%seq.length];
      if(next==="lit") delete room.light; else room.light=next;
      levelTouched(); renderPanel();
    };
    const rct=$("rc-tokens");
    if(rct) rct.onclick=()=>{
      const room=App.document.rooms.find(x=>x.id===App.session.selRoom);
      if(!room) return;
      if(room.tokensAlways) delete room.tokensAlways; else room.tokensAlways=true;
      levelTouched(); renderPanel();
    };
    p.querySelectorAll("[data-room]").forEach(el=>{
      el.onclick=e=>{
        if(e.target.dataset.rmode){
          const room=App.document.rooms.find(r=>r.id===e.target.dataset.rmode);
          const mode=roomRevealMode(room),i=REVEAL_MODES.findIndex(([v])=>v===mode);
          setRoomRevealMode(room,REVEAL_MODES[(i+1)%REVEAL_MODES.length][0]); return;
        }
        if(e.target.dataset.rev){
          toggleRoomReveal(App.document.rooms.find(r=>r.id===e.target.dataset.rev)); return;
        }
        App.session.selRoom=el.dataset.room; renderPanel();
      };
    });
    const tacFocus=$("tac-focus");if(tacFocus)tacFocus.onclick=()=>{
      const room=App.document.rooms.find(room=>room.id===App.session.selRoom);
      App.session.verso.tacticalFocus=room&&App.session.verso.tacticalFocus!==room.id?room.id:null;
      if(App.session.verso.tacticalFocus)focusRoom(room);markDirty();renderPanel();
    };
    p.querySelectorAll("[data-door-toggle]").forEach(el=>{el.onclick=()=>{
      const door=App.document.doors.find(door=>door.id===el.dataset.doorToggle);if(!door)return;
      App.session.verso.doorStates[door.id]=!doorIsOpen(door,App.session.verso.doorStates);markDirty();renderPanel();
    };});
    p.querySelectorAll("[data-prop-state]").forEach(el=>{el.onclick=()=>{
      const prop=App.document.level.props.find(item=>item.id===el.dataset.propState);if(!prop||!prop.states?.length)return;
      const current=App.session.verso.propStates[prop.id]||prop.states[0].id,index=prop.states.findIndex(state=>state.id===current);
      App.session.verso.propStates[prop.id]=prop.states[(index+1)%prop.states.length].id;markDirty();renderPanel();
    };});
    const rulerMode=$("tac-ruler-mode");if(rulerMode)rulerMode.onchange=()=>{App.session.rulerMode=rulerMode.value;};
    const rulerButton=$("tac-ruler");if(rulerButton)rulerButton.onclick=()=>{App.session.rulerMode=$("tac-ruler-mode").value;setTool("ruler");};
    const effectPreset=$("tac-effect-preset");if(effectPreset)effectPreset.onchange=()=>{
      const preset=(App.document.level.encounterEffects||[]).find(effect=>effect.id===effectPreset.value);if(!preset)return;
      $("tac-effect-name").value=preset.name;$("tac-effect-type").value=preset.terrain;$("tac-effect-shape").value=preset.shape;
      $("tac-effect-w").value=preset.w;$("tac-effect-h").value=preset.h;$("tac-effect-duration").value=preset.duration;
    };
    const effectPlace=$("tac-effect-place");if(effectPlace)effectPlace.onclick=()=>{
      tacticalEffectType=$("tac-effect-type").value;tacticalEffectWidth=Math.max(1,+$("tac-effect-w").value||1);tacticalEffectHeight=Math.max(1,+$("tac-effect-h").value||1);
      tacticalEffectName=$("tac-effect-name").value.trim()||"Encounter effect";tacticalEffectDuration=Math.max(0,+$("tac-effect-duration").value||0);
      tacticalEffectShape=$("tac-effect-shape").value;$("st-hint").textContent="Click the tactical map to place "+tacticalEffectName;
    };
    for(const [attr,delta]of[["data-effect-dec",-1],["data-effect-inc",1]])p.querySelectorAll(`[${attr}]`).forEach(el=>{el.onclick=()=>{
      const effect=App.session.verso.effects.find(item=>item.id===el.getAttribute(attr));if(!effect)return;
      effect.remaining=Math.max(0,Math.min(99,(effect.remaining||0)+delta));effect.timed=true;
      if(effect.remaining===0)App.session.verso.effects=App.session.verso.effects.filter(item=>item!==effect);markDirty();renderPanel();
    };});
    p.querySelectorAll("[data-effect-del]").forEach(el=>{el.onclick=()=>{
      App.session.verso.effects=App.session.verso.effects.filter(effect=>effect.id!==el.dataset.effectDel);markDirty();renderPanel();
    };});
  }else{
    const bi=$("btn-import"); if(bi) bi.onclick=()=>$("file-img").click();
    const gs=$("g-show"); if(gs) gs.onchange=e=>{App.session.map.grid.show=e.target.checked;markDirty();};
    const gp=$("g-snap"); if(gp) gp.onchange=e=>{App.session.map.grid.snap=e.target.checked;markDirty();};
    const sz=$("g-size"), szn=$("g-size-n");
    if(sz) sz.oninput=e=>{App.session.map.grid.size=+e.target.value;szn.value=e.target.value;markDirty();};
    if(szn) szn.onchange=e=>{App.session.map.grid.size=Math.max(10,+e.target.value||70);sz.value=App.session.map.grid.size;markDirty();};
    const ox=$("g-ox"); if(ox) ox.oninput=e=>{App.session.map.grid.ox=+e.target.value;markDirty();};
    const oy=$("g-oy"); if(oy) oy.oninput=e=>{App.session.map.grid.oy=+e.target.value;markDirty();};
    const fo=$("f-on"); if(fo) fo.onchange=e=>{App.session.map.fogOn=e.target.checked;markDirty();};
    const fb=$("f-brush"); if(fb) fb.oninput=e=>{App.session.map.brush=+e.target.value;};
    const fa=$("f-all"); if(fa) fa.onclick=()=>{
      if(!App.session.map.fog) return;
      const fc=App.session.map.fog.getContext("2d");
      fc.globalCompositeOperation="source-over";
      fc.fillStyle="#04130C"; fc.fillRect(0,0,App.session.map.fog.width,App.session.map.fog.height); markDirty(); netMarkFog();
    };
    const fn=$("f-none"); if(fn) fn.onclick=()=>{
      if(!App.session.map.fog) return;
      App.session.map.fog.getContext("2d").clearRect(0,0,App.session.map.fog.width,App.session.map.fog.height); markDirty(); netMarkFog();
    };
  }
  p.querySelectorAll("[data-die]").forEach(el=>{
    el.onclick=()=>{
      const v=el.dataset.die;
      roll(v==="adv"||v==="dis"?v:+v, diceN, diceMod, "dm");
    };
  });
  const dn=$("dice-n"); if(dn) dn.onchange=e=>{diceN=Math.max(1,Math.min(10,+e.target.value||1));};
  const dm=$("dice-mod"); if(dm) dm.onchange=e=>{diceMod=(+e.target.value)|0;};
  const dcg=$("dice-customgo");
  if(dcg){
    const goCustom=()=>{
      const inp=$("dice-custom"), expr=inp.value.trim();
      const pd=parseDice(expr);
      if(!pd){inp.style.borderColor="var(--oxblood)";setTimeout(()=>{if(inp)inp.style.borderColor="";},900);return;}
      roll(pd.d,pd.n,pd.mod,"dm");
    };
    dcg.onclick=goCustom;
    $("dice-custom").addEventListener("keydown",e=>{if(e.key==="Enter")goCustom();});
  }
  p.querySelectorAll("[data-pc]").forEach(el=>{
    el.onclick=e=>{
      e.stopPropagation();
      const t=S().tokens.find(t=>t.id===+el.dataset.pc);
      if(!t) return;
      if(t.pc){delete t.pc;delete t.owner;delete t.ownerKey;syncCampaignOwnership(t);}    // demoting clears any assignment
      else t.pc=true;
      markDirty(); renderPanel();
    };
  });
  p.querySelectorAll("[data-tok]").forEach(el=>{
    el.onclick=e=>{
      if(e.target.dataset.del||e.target.dataset.pc||e.target.dataset.unclaim) return;
      const id=+el.dataset.tok;
      App.session.selToken=id;
      const t=S().tokens.find(t=>t.id===id);
      if(t){ // center camera on token
        const c=cam();
        if(App.session.scene==="map"){c.x=t.x-W/(2*c.s);c.y=t.y-H/(2*c.s);}
        else{const [wx,wy]=levelWorldFromTile(t.x,t.y);c.x=wx-W/(2*c.s);c.y=wy-H/(2*c.s);}
      }
      renderPanel();
    };
  });
  p.querySelectorAll("[data-unclaim]").forEach(el=>{
    el.onclick=e=>{
      e.stopPropagation();
      const t=S().tokens.find(token=>token.id===+el.dataset.unclaim);
      if(!t)return;
      delete t.owner;delete t.ownerKey;syncCampaignOwnership(t);markDirty();renderPanel();
    };
  });
  p.querySelectorAll("[data-del]").forEach(el=>{
    el.onclick=()=>{
      const id=+el.dataset.del;
      const arr=S().tokens, i=arr.findIndex(t=>t.id===id);
      if(i>=0) arr.splice(i,1);
      if(App.session.selToken===id) App.session.selToken=null;
      markDirty(); renderPanel();
    };
  });
  /* initiative wiring */
  const trNext=$("tr-next"); if(trNext) trNext.onclick=()=>{
    const tr=App.session.tracker;
    if(!tr.order.length) return;
    const wrapped=tr.active===tr.order.length-1;
    tr.active=(tr.active+1)%tr.order.length;
    if(wrapped){
      tr.round=(tr.round||1)+1;
      for(const effect of App.session.verso.effects)if(effect.remaining>0)effect.remaining--;
      App.session.verso.effects=App.session.verso.effects.filter(effect=>!effect.timed||effect.remaining>0);
    }
    markDirty();trackerAnnounce();renderPanel();
  };
  const trClear=$("tr-clear"); if(trClear) trClear.onclick=()=>{App.session.tracker={order:[],active:0,round:1};markDirty();renderPanel();};
  const trPcs=$("tr-pcs"); if(trPcs) trPcs.onclick=()=>{
    for(const t of S().tokens.filter(t=>t.pc)){
      const e=roll(20,1,t.sheet?initOf(t.sheet):0,"dm",t.name+" · Initiative");
      trackerSet(t.name,e.total,t.id);
    }
  };
  const trNpcs=$("tr-npcs"); if(trNpcs) trNpcs.onclick=()=>{
    for(const t of S().tokens.filter(t=>!t.pc)){
      const e=roll(20,1,t.sheet?initOf(t.sheet):0,"dm",t.name+" · Initiative");
      trackerSet(t.name,e.total,t.id,true);
    }
  };
  const trAdd=$("tr-add"); if(trAdd) trAdd.onclick=()=>{
    const nm=($("tr-name").value||"").trim();
    if(!nm) return;
    trackerSet(nm,(+$("tr-total").value||0)|0,null,$("tr-hide").checked,$("tr-marker").checked);
  };
  const dh=$("dice-hide"); if(dh) dh.onchange=e=>{dmHidden=e.target.checked;};
  p.querySelectorAll("[data-trh]").forEach(el=>{el.onclick=()=>{
    const en=App.session.tracker.order[+el.dataset.trh];
    if(!en) return;
    if(en.h) delete en.h; else en.h=1;
    netMark(); renderPanel();
  };});
  p.querySelectorAll("[data-trup]").forEach(el=>{el.onclick=()=>{
    const i=+el.dataset.trup, tr=App.session.tracker;
    if(i<=0) return;
    [tr.order[i-1],tr.order[i]]=[tr.order[i],tr.order[i-1]];
    netMark(); renderPanel();
  };});
  p.querySelectorAll("[data-trdel]").forEach(el=>{el.onclick=()=>{
    const tr=App.session.tracker;
    tr.order.splice(+el.dataset.trdel,1);
    if(tr.active>=tr.order.length) tr.active=0;
    netMark(); renderPanel();
  };});
  /* events wiring */
  const evP=$("ev-pulse"); if(evP) evP.onclick=()=>{
    const n=pulsePatrols();
    $("st-hint").textContent = n ? n+" patrol"+(n>1?"s":"")+" advanced one waypoint" : "no tokens have patrol paths — select a token and RECORD PATROL";
  };
  const evS=$("ev-send"); if(evS) evS.onclick=()=>{
    const t=($("ev-text").value||"").trim();
    if(!t) return;
    const f={head:"THE TABLE",total:t,detail:""};
    NET.lastDice=Object.assign({},f,{stamp:++NET.diceStamp});
    netMark(); clientBanner(NET.lastDice); pwinBanner(f,"");
    $("ev-text").value="";
  };
  /* patrol wiring */
  const ptR=$("pt-rec"); if(ptR && selT) ptR.onclick=()=>{
    patrolRec = patrolRec===selT.id ? null : selT.id;
    renderPanel();
  };
  const ptC=$("pt-clear"); if(ptC && selT) ptC.onclick=()=>{
    delete selT.patrol; delete selT.pi;
    if(patrolRec===selT.id) patrolRec=null;
    markDirty(); renderPanel();
  };
  const tokZ=$("tok-z");if(tokZ&&selT)tokZ.onchange=()=>{selT.z=Math.max(0,Math.min(40,+tokZ.value||0));markDirty();renderPanel();};
  p.querySelectorAll("[data-status]").forEach(el=>{el.onclick=()=>{
    if(!selT)return;const statuses=new Set(selT.statuses||[]);statuses.has(el.dataset.status)?statuses.delete(el.dataset.status):statuses.add(el.dataset.status);
    selT.statuses=[...statuses];markDirty();renderPanel();
  };});
  const tokPhase=$("tok-phase");if(tokPhase&&selT)tokPhase.onclick=()=>{
    const next=((selT.phase||0)+1)%selT.phases.length,phase=selT.phases[next],phases=selT.phases;
    for(const key of ["name","letter","color","size","sheet"]){if(phase[key]!=null)selT[key]=JSON.parse(JSON.stringify(phase[key]));}
    selT.phase=next;selT.phases=phases;
    const entry=App.session.tracker.order.find(item=>item.tok===selT.id);if(entry)entry.name=selT.name;
    markDirty();renderPanel();
  };
  /* sheet wiring (DM edits any selected token; rolls as it too) */
  if(selT && !rollsFloatOpen) wireSheetRolls(p,selT);
  const srp=$("sr-pop"); if(srp) srp.onclick=()=>{rollsFloatOpen=true;renderPanel();};
  if(selT)wireSheetAutosave(p,selT);
  const shLib=$("sh-tolib"); if(shLib && selT) shLib.onclick=()=>{
    const i=App.document.level.roster.findIndex(q=>q.name===selT.name);
    const entry={id:i>=0?App.document.level.roster[i].id:newEntityId("roster",App.document.level.roster),name:selT.name, letter:selT.letter, color:selT.color, sheet:readSheetForm()};
    if(selT.pc) entry.pc=true;
    if(i>=0) App.document.level.roster[i]=entry; else App.document.level.roster.push(entry);
    levelTouched();
    $("st-hint").textContent=selT.name+" saved to the Token Library — persists with the level";
  };
  const shImp=$("sh-import"); if(shImp) shImp.onclick=()=>$("file-sheet").click();
  p.querySelectorAll(".sw").forEach(el=>{
    el.onclick=()=>{addColor=el.dataset.c;p.querySelectorAll(".sw").forEach(s=>s.classList.toggle("on",s===el));};
  });
  const ab=$("addtok-btn");
  if(ab) ab.onclick=()=>{
    const name=($("at-name").value||"Token").trim();
    const size=+$("at-size").value;
    placeToken(name, name.replace(/[^A-Za-z]/g,"").slice(0,2).toUpperCase()||"?", addColor, size, $("at-pc").checked);
  };
  p.querySelectorAll("[data-party]").forEach(el=>{
    el.onclick=()=>{const pp=App.document.level.roster[+el.dataset.party];placeToken(pp.name,pp.letter,pp.color,1,!!pp.pc,pp.sheet);};
  });
}
function placeToken(name,letter,color,size,pc,sheet){
  const c=cam();
  let x,y;
  if(App.session.scene==="map"){
    [x,y]=toWorld(W/2,H/2);
  }else{
    const [wx,wy]=toWorld(W/2,H/2);
    const [i,j]=levelTileFromWorld(wx,wy);
    x=Math.floor(i)+.5; y=Math.floor(j)+.5;
  }
  const t=mkTok(name,letter,color,x,y,size,pc);
  if(sheet) t.sheet=JSON.parse(JSON.stringify(sheet));
  S().tokens.push(t);
  App.session.selToken=t.id;
  markDirty(); renderPanel();
}

function renderEditorPanel(){
  const p=$("panel");
  const selected=selectedRooms(),sel=selected.length===1?selected[0]:null,presets=roomPresets(),stair=App.document.stairs.find(s=>s.id===edStairSel)||null,prop=App.document.level.props.find(p=>p.id===edPropSel)||null;
  const toolBtn=(t,label)=>`<button class="rbtn ${edTool===t?"":"quiet"}" data-edtool="${t}" style="flex:1">${label}</button>`;
  let html=`<div class="sect"><h3>Level</h3>
    <div class="row"><label>name</label><input type="text" id="lv-name" value="${esc(App.document.level.name)}"></div>
    <div class="row"><label>backdrop</label><input type="color" id="lv-bg" value="${App.document.level.bg}"></div>
    <div class="row">
      <button class="rbtn quiet" id="lv-export">EXPORT</button>
      <button class="rbtn quiet" id="lv-import">IMPORT</button>
    </div>
    <div class="row">
      <button class="rbtn quiet" id="lv-new">NEW BLANK</button>
      <button class="rbtn quiet" id="lv-verso">RESET TO VERSO</button>
    </div>
    <button class="rbtn quiet" id="lv-vault" style="width:100%">LOAD LEVEL 2 · THE VAULT</button></div>`;
  if(App.session.campaignId==="east-tennessee-1861")html+=`<div class="sect"><h3>Map Workflow</h3><div class="hint">This layout editor builds top-down room geometry, doors, stairs, and reusable objects. Illustrated outdoor maps such as Lick Creek are prepared as image assets, then run in Scene Map with fog, tokens, and advisory measuring tools.</div><button class="rbtn" id="ed-open-scene-map" style="width:100%;margin-top:8px">OPEN SCENE MAP TOOLS</button></div>`;
  html+=`<div class="sect"><h3>Tools</h3>
    <div class="row">${toolBtn("draw","DRAW (D)")}${toolBtn("select","SELECT (V)")}</div>
    <div class="row">${toolBtn("door","DOORS (O)")}${toolBtn("prop","PROPS (P)")}${toolBtn("stair","STAIRS (S)")}</div>
    <div class="row"><button class="rbtn quiet" id="ed-undo" ${edUndoStack.length?"":"disabled style='opacity:.4'"}>↩ UNDO</button><button class="rbtn quiet" id="ed-redo" ${edRedoStack.length?"":"disabled style='opacity:.4'"}>↪ REDO</button></div>
    <div class="row"><button class="rbtn quiet" id="ed-copy" ${selected.length?"":"disabled"}>COPY</button><button class="rbtn quiet" id="ed-paste" ${edClipboard.length?"":"disabled"}>PASTE</button><button class="rbtn quiet" id="ed-duplicate" ${selected.length?"":"disabled"}>DUPLICATE</button></div>
    <div class="row"><label>material pack</label><select id="ed-template">${
      TEMPLATES.map((t,i)=>`<option value="${i}" ${i===edTemplate?"selected":""}>${t.name}</option>`).join("")
    }</select></div>
    ${edTool==="prop"?`<div class="row"><label>furniture</label><select id="ed-prop">${
      Object.entries(PROP_LIB).map(([k,v])=>`<option value="${k}" ${k===edPropType?"selected":""}>${v.n}</option>`).join("")
    }</select></div>`:""}
    ${edTool==="stair"&&!stair?`<div class="row"><label>rise toward</label><select id="ed-stair-dir">${[["n","north"],["e","east"],["s","south"],["w","west"]].map(([v,n])=>`<option value="${v}" ${edStairDir===v?"selected":""}>${n}</option>`).join("")}</select></div><div class="row"><label>style</label><select id="ed-stair-style">${["stone","wood","metal"].map(v=>`<option ${edStairStyle===v?"selected":""}>${v}</option>`).join("")}</select></div><div class="row"><label>bottom</label><input id="ed-stair-from" type="number" min="0" max="12" value="${edStairFrom}"><label>top</label><input id="ed-stair-to" type="number" min="0" max="12" value="${edStairTo}"></div>`:""}
    <div class="hint">Shift-click selects multiple rooms. Drag or use arrow keys to move the selection.</div></div>`;
  if(prop)html+=`<div class="sect" id="ed-prop-editor"><h3>Prop · ${esc(prop.label||PROP_LIB[prop.t]?.n||prop.t)}</h3>
    <div class="row"><label>type</label><select id="ed-prop-type">${Object.entries(PROP_LIB).map(([k,v])=>`<option value="${k}" ${k===prop.t?"selected":""}>${v.n}</option>`).join("")}</select></div>
    <div class="row"><label>x</label><input id="ed-prop-x" type="number" step=".1" value="${prop.x}"><label>y</label><input id="ed-prop-y" type="number" step=".1" value="${prop.y}"></div>
    <div class="row"><label>scale</label><input id="ed-prop-scale" type="range" min=".5" max="2" step=".05" value="${prop.scale||1}"><span>${(prop.scale||1).toFixed(2)}×</span></div>
    <div class="row"><label>orientation</label><select id="ed-prop-rotation">${[[0,"north"],[1,"east"],[2,"south"],[3,"west"]].map(([v,n])=>`<option value="${v}" ${(prop.rotation||0)===v?"selected":""}>${n}</option>`).join("")}</select></div>
    <div class="row"><label>GM name</label><input id="ed-prop-label" type="text" maxlength="120" value="${esc(prop.label||"")}"></div>
    <textarea id="ed-prop-inspect" rows="2" maxlength="300" placeholder="GM-only notes">${esc(prop.inspect||"")}</textarea>
    <div class="row"><label>player name</label><input id="ed-prop-player-label" type="text" maxlength="120" value="${esc(prop.playerLabel||"")}" placeholder="optional"></div>
    <textarea id="ed-prop-player-inspect" rows="2" maxlength="300" placeholder="optional player-safe description">${esc(prop.playerInspect||"")}</textarea>
    <label class="check"><input type="checkbox" id="ed-prop-focus" ${prop.focus?"checked":""}> landmark lighting</label>
    <div class="row"><label>tactical</label><select id="ed-prop-terrain">${[["","furniture only"],["cover","full cover"],["difficult","difficult terrain"],["hazard","hazard zone"],["overhead","overhead object"]].map(([v,n])=>`<option value="${v}" ${(prop.terrain||"")===v?"selected":""}>${n}</option>`).join("")}</select></div>
    <div class="row"><label>footprint</label><input id="ed-prop-fw" type="number" min=".25" max="20" step=".25" value="${prop.footprint?.w||1}" title="width in five-foot tiles"><span>×</span><input id="ed-prop-fh" type="number" min=".25" max="20" step=".25" value="${prop.footprint?.h||1}" title="height in five-foot tiles"></div>
    <label class="check"><input type="checkbox" id="ed-prop-circle" ${prop.footprint?.shape==="circle"?"checked":""}> circular footprint</label>
    <button class="rbtn quiet" id="ed-prop-delete" style="width:100%;color:var(--oxblood);border-color:var(--oxblood)">DELETE PROP</button>
    <div class="hint">GM metadata stays private. Players only see the explicit player name and description.</div></div>`;
  if(stair)html+=`<div class="sect"><h3>Stairs · ${esc(stair.id)}</h3>
    <div class="row"><label>rise toward</label><select id="ed-stair-dir">${[["n","north"],["e","east"],["s","south"],["w","west"]].map(([v,n])=>`<option value="${v}" ${stair.dir===v?"selected":""}>${n}</option>`).join("")}</select></div>
    <div class="row"><label>style</label><select id="ed-stair-style">${["stone","wood","metal"].map(v=>`<option ${stair.style===v?"selected":""}>${v}</option>`).join("")}</select></div>
    <div class="row"><label>width E–W</label><input id="ed-stair-w" type="number" min="1" max="40" value="${stair.w}"></div>
    <div class="row"><label>depth N–S</label><input id="ed-stair-h" type="number" min="1" max="40" value="${stair.h}"></div>
    <div class="row"><label>bottom</label><input id="ed-stair-from" type="number" min="0" max="12" value="${stair.from}"><label>top</label><input id="ed-stair-to" type="number" min="0" max="12" value="${stair.to}"></div>
    <button class="rbtn quiet" id="ed-stair-delete" style="width:100%;color:var(--oxblood);border-color:var(--oxblood)">DELETE STAIRS</button></div>`;
  html+=`<div class="sect"><h3>Room Presets</h3>
    <div class="row"><select id="ed-preset" style="flex:1">${presets.map(item=>`<option value="${item.id}">${esc(item.name)}</option>`).join("")}</select><button class="rbtn quiet" id="ed-preset-place" style="flex:none">PLACE</button></div>
    <div class="row"><input type="text" id="ed-preset-name" placeholder="preset name" value="${sel?esc(sel.name):""}" style="flex:1"><button class="rbtn quiet" id="ed-preset-save" ${selected.length===1?"":"disabled"}>SAVE</button></div>
    <button class="rbtn quiet" id="ed-preset-delete" disabled style="width:100%">DELETE USER PRESET</button></div>`;
  if(selected.length>1)html+=`<div class="sect"><h3>Selection · ${selected.length} Rooms</h3><div class="row"><button class="rbtn quiet" id="ed-selection-delete" style="color:var(--oxblood)">DELETE SELECTION</button></div><div class="hint">Shift-click adds or removes rooms. Drag any selected room to move the group.</div></div>`;
  if(sel){
    html+=`<div class="sect"><h3>Room · ${esc(sel.id)}</h3>
      <div class="row"><label>name</label><input type="text" id="ed-name" value="${esc(sel.name)}"></div>
      <div class="row"><label>subtitle</label><input type="text" id="ed-sub" value="${esc(sel.sub||"")}"></div>
      <div class="row"><label>colors</label>
        <input type="color" id="ed-fa" value="${sel.floorA}" title="floor A">
        <input type="color" id="ed-fb" value="${sel.floorB}" title="floor B">
        <input type="color" id="ed-wl" value="${sel.wall}" title="wall">
        <button class="rbtn quiet" id="ed-applytpl" style="flex:1;padding:5px" title="apply the selected template palette">TPL</button>
      </div>
      <div class="row"><label>elevation</label><input type="number" id="ed-elevation" min="0" max="12" step="1" value="${sel.elevation||0}" title="height in tile steps"></div>
      <div class="row"><label>wall height</label><select id="ed-wallheight">${[[0,"none"],[1,"standard"],[2,"tall"],[3,"towering"]].map(([v,n])=>`<option value="${v}" ${(sel.wallHeight??1)===v?"selected":""}>${n}</option>`).join("")}</select></div>
      <label class="check"><input type="checkbox" id="ed-platform" ${sel.structure==="platform"?"checked":""}> raised platform edge</label>
      <label class="check"><input type="checkbox" id="ed-cutaway" ${sel.cutaway==="front"?"checked":""}> open front walls (cutaway)</label>
      <label class="check"><input type="checkbox" id="ed-corr" ${sel.corridor?"checked":""}> corridor (thin label styling)</label>
      <div class="row"><label>lighting</label><select id="ed-light">${["lit","bright","dim","dark","torchlight","flicker","magical"].map(v=>`<option ${(sel.light||"lit")===v?"selected":""}>${v}</option>`).join("")}</select></div>
      <div class="row"><label>entry reveal</label><select id="ed-reveal-mode" title="Manual, one-shot reveal when a PC enters, or always visible">${revealModeOptions(sel)}</select></div>
      <label class="check"><input type="checkbox" id="ed-battle-grid" ${sel.battleGrid==="square"?"checked":""}> five-foot tactical grid in this room</label>
      <label class="check"><input type="checkbox" id="ed-tokens" ${sel.tokensAlways?"checked":""}> NPCs always visible here (default: hidden from players until a PC is also in the room)</label>
      <div class="row"><label>read-aloud</label></div>
      <textarea id="ed-read" rows="4" placeholder="What the players hear when they enter…">${esc(sel.read||"")}</textarea>
      <div class="row" style="margin-top:6px"><label>DM notes</label></div>
      <textarea id="ed-dm" rows="4" placeholder="Only you see this. <b>bold</b> allowed.">${esc(sel.dm||"")}</textarea>
      <div class="row" style="margin-top:6px"><label>clues</label></div>
      <textarea id="ed-clues" rows="3" placeholder="One clue per line">${esc((sel.clues||[]).join("\n"))}</textarea>
      <button class="rbtn quiet" id="ed-del" style="width:100%;margin-top:8px;color:var(--oxblood);border-color:var(--oxblood)">DELETE ROOM</button>
    </div>`;
  }else{
    html+=`<div class="sect"><h3>Room</h3><div class="hint">Select a room to edit its name, palette, read-aloud text, DM notes and clues — the same card you use at the table.</div></div>`;
  }
  html+=`<div class="sect"><h3>Token Library</h3>
    <div class="toklist">${App.document.level.roster.map((q,i)=>`<div class="tok" style="cursor:default">
      <span class="dot" style="background:${q.color}">${esc(q.letter)}</span>
      <span class="nm">${esc(q.name)}</span>
      <span class="del" data-rpc="${i}" title="toggle: players can claim this token" style="color:${q.pc?"var(--brass)":"#666"}">${q.pc?"PC":"npc"}</span>
      <span class="del" data-rsheet="${i}" title="${q.sheet?"edit this token's sheet":"add a sheet (stats, attacks, skills)"}" style="color:${q.sheet?"var(--brass)":"#666"}">✎</span>
      <span class="del" data-rdel="${i}" title="remove from library">✕</span>
    </div>`).join("")}</div>
    <div class="row" style="margin-top:7px"><input type="text" id="ros-name" placeholder="name" style="flex:1"><input type="color" id="ros-color" value="#7FA8B8"></div>
    <label class="check"><input type="checkbox" id="ros-pc" checked> players can claim (PC)</label>
    <button class="rbtn quiet" id="ros-add" style="width:100%">ADD TO LIBRARY</button>
    <div class="hint" style="margin-top:6px">The library is this level's cast — it fills the shortcuts list when placing tokens, and ✎ sheets travel with each placed token. Players joining online can only see and claim PC tokens.</div></div>`;
  const rosEntry=(edRosterSel!=null)?App.document.level.roster[edRosterSel]:null;
  if(rosEntry) html+=sheetFormHTML(rosEntry);
  html+=`<div class="sect"><h3>How this works</h3><div class="hint">The editor is a top-down view of the same level players see in isometric. Switch back to the ${esc(App.document.level.name)} tab to play it; reveal rooms from there as usual. Levels travel with SAVE/LOAD, or share them with EXPORT.</div></div>`;
  p.innerHTML=html;
  const sceneMap=$("ed-open-scene-map");if(sceneMap)sceneMap.onclick=()=>{dmPanelTab="table";setMode("play");setScene("map");};
  let snapped=false;
  const snap1=()=>{if(!snapped){edSnapshot();snapped=true;}};   // one undo step per slider/picker interaction
  $("ed-undo").onclick=()=>edUndoPop();
  $("ed-redo").onclick=()=>edRedoPop();
  $("ed-copy").onclick=()=>{copySelection();renderPanel();};
  $("ed-paste").onclick=()=>pasteSelection();
  $("ed-duplicate").onclick=()=>duplicateSelection();
  $("ed-preset-place").onclick=()=>placeRoomPreset($("ed-preset").value);
  $("ed-preset-save").onclick=()=>saveRoomPreset($("ed-preset-name").value);
  $("ed-preset-delete").onclick=()=>deleteRoomPreset($("ed-preset").value);
  $("ed-preset").onchange=e=>{$("ed-preset-delete").disabled=!e.target.value.startsWith("user-");};
  const selectionDelete=$("ed-selection-delete");if(selectionDelete)selectionDelete.onclick=deleteSelection;
  p.querySelectorAll("[data-rpc]").forEach(el=>{el.onclick=()=>{
    edSnapshot();
    const q=App.document.level.roster[+el.dataset.rpc];
    if(q.pc) delete q.pc; else q.pc=true;
    levelTouched(); renderPanel();
  };});
  p.querySelectorAll("[data-rdel]").forEach(el=>{el.onclick=()=>{
    edSnapshot(); App.document.level.roster.splice(+el.dataset.rdel,1); edRosterSel=null; levelTouched(); renderPanel();
  };});
  p.querySelectorAll("[data-rsheet]").forEach(el=>{el.onclick=()=>{
    const i=+el.dataset.rsheet;
    edRosterSel = edRosterSel===i ? null : i;
    renderPanel();
  };});
  if(rosEntry){
    const shS=$("sh-save"); if(shS) shS.onclick=()=>{
      edSnapshot(); rosEntry.sheet=readSheetForm(); levelTouched(); renderPanel();
    };
    const shI=$("sh-import"); if(shI) shI.onclick=()=>$("file-sheet").click();
  }
  $("ros-add").onclick=()=>{
    const name=($("ros-name").value||"").trim();
    if(!name) return;
    edSnapshot();
    const entry={id:newEntityId("roster",App.document.level.roster),name, letter:name.replace(/[^A-Za-z]/g,"").slice(0,2).toUpperCase()||"?", color:$("ros-color").value};
    if($("ros-pc").checked) entry.pc=true;
    App.document.level.roster.push(entry);
    levelTouched(); renderPanel();
  };
  p.querySelectorAll("[data-edtool]").forEach(b=>{b.onclick=()=>edSetTool(b.dataset.edtool);});
  $("ed-template").onchange=e=>{edTemplate=+e.target.value;};
  const edP=$("ed-prop"); if(edP) edP.onchange=e=>{edPropType=e.target.value;};
  const mutateProp=(fn,rerender=true)=>{if(prop){edSnapshot();fn(prop);levelTouched();if(rerender)renderPanel();}};
  const propType=$("ed-prop-type");if(propType)propType.onchange=e=>mutateProp(p=>{p.t=e.target.value;edPropType=p.t;});
  const propX=$("ed-prop-x");if(propX)propX.onchange=e=>mutateProp(p=>p.x=+e.target.value||0);
  const propY=$("ed-prop-y");if(propY)propY.onchange=e=>mutateProp(p=>p.y=+e.target.value||0);
  const propScale=$("ed-prop-scale");if(propScale)propScale.onchange=e=>mutateProp(p=>p.scale=Math.max(.5,Math.min(2,+e.target.value||1)));
  const propRotation=$("ed-prop-rotation");if(propRotation)propRotation.onchange=e=>mutateProp(p=>{p.rotation=+e.target.value||0;if(!p.rotation)delete p.rotation;});
  const propLabel=$("ed-prop-label");if(propLabel)propLabel.onchange=e=>mutateProp(p=>{const v=e.target.value.trim();if(v)p.label=v;else delete p.label;});
  const propInspect=$("ed-prop-inspect");if(propInspect)propInspect.onchange=e=>mutateProp(p=>{const v=e.target.value.trim();if(v)p.inspect=v;else delete p.inspect;});
  const propPlayerLabel=$("ed-prop-player-label");if(propPlayerLabel)propPlayerLabel.onchange=e=>mutateProp(p=>{const v=e.target.value.trim();if(v)p.playerLabel=v;else delete p.playerLabel;});
  const propPlayerInspect=$("ed-prop-player-inspect");if(propPlayerInspect)propPlayerInspect.onchange=e=>mutateProp(p=>{const v=e.target.value.trim();if(v)p.playerInspect=v;else delete p.playerInspect;});
  const propFocus=$("ed-prop-focus");if(propFocus)propFocus.onchange=e=>mutateProp(p=>{if(e.target.checked)p.focus=true;else delete p.focus;});
  const propTerrain=$("ed-prop-terrain");if(propTerrain)propTerrain.onchange=e=>mutateProp(p=>{const v=e.target.value;if(v){p.terrain=v;p.footprint=p.footprint||{w:1,h:1,shape:"rect"};}else{delete p.terrain;delete p.footprint;}});
  const mutateFootprint=(key,value)=>mutateProp(p=>{p.footprint=p.footprint||{w:1,h:1,shape:"rect"};p.footprint[key]=value;});
  const propFW=$("ed-prop-fw");if(propFW)propFW.onchange=e=>mutateFootprint("w",Math.max(.25,Math.min(20,+e.target.value||1)));
  const propFH=$("ed-prop-fh");if(propFH)propFH.onchange=e=>mutateFootprint("h",Math.max(.25,Math.min(20,+e.target.value||1)));
  const propCircle=$("ed-prop-circle");if(propCircle)propCircle.onchange=e=>mutateFootprint("shape",e.target.checked?"circle":"rect");
  const propDelete=$("ed-prop-delete");if(propDelete)propDelete.onclick=()=>{edSnapshot();App.document.level.props=App.document.level.props.filter(p=>p.id!==prop.id);edPropSel=null;levelTouched();renderPanel();};
  const mutateStair=(fn)=>{if(stair){edSnapshot();fn(stair);levelTouched();renderPanel();}};
  const stairDir=$("ed-stair-dir");if(stairDir)stairDir.onchange=e=>{const next=e.target.value;if(stair){mutateStair(s=>{const oldX=s.dir==="e"||s.dir==="w",newX=next==="e"||next==="w";if(oldX!==newX)[s.w,s.h]=[s.h,s.w];s.dir=next;});}else edStairDir=next;};
  const stairStyle=$("ed-stair-style");if(stairStyle)stairStyle.onchange=e=>{if(stair)mutateStair(s=>s.style=e.target.value);else edStairStyle=e.target.value;};
  const stairFrom=$("ed-stair-from");if(stairFrom)stairFrom.onchange=e=>{const v=Math.max(0,Math.min(12,+e.target.value||0));if(stair)mutateStair(s=>s.from=v);else{edStairFrom=v;renderPanel();}};
  const stairTo=$("ed-stair-to");if(stairTo)stairTo.onchange=e=>{const v=Math.max(0,Math.min(12,+e.target.value||0));if(stair)mutateStair(s=>s.to=v);else{edStairTo=v;renderPanel();}};
  const stairW=$("ed-stair-w");if(stairW)stairW.onchange=e=>mutateStair(s=>s.w=Math.max(1,Math.min(40,+e.target.value||1)));
  const stairH=$("ed-stair-h");if(stairH)stairH.onchange=e=>mutateStair(s=>s.h=Math.max(1,Math.min(40,+e.target.value||1)));
  const stairDelete=$("ed-stair-delete");if(stairDelete)stairDelete.onclick=()=>{edSnapshot();App.document.stairs=App.document.stairs.filter(s=>s.id!==stair.id);edStairSel=null;levelTouched();renderPanel();};
  $("lv-name").onchange=e=>{edSnapshot();App.document.level.name=e.target.value.trim()||"Untitled Level";$("tab-verso").textContent=App.document.level.name.toUpperCase();levelTouched();};
  $("lv-bg").oninput=e=>{snap1();App.document.level.bg=e.target.value;levelTouched();};
  $("lv-export").onclick=()=>{
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify(levelData(),null,1)],{type:"application/json"}));
    a.download=(App.document.level.name||"level").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+".level.json";
    a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  };
  $("lv-import").onclick=()=>openLevelFile("edit");
  $("lv-new").onclick=()=>{
    if(!confirm("Start a new blank level? The current level is replaced (export first if you want to keep it)."))return;
    edSnapshot();
    loadLevel({name:"Untitled Level",bg:"#0A0F0C",rooms:[],doors:[],roster:[]});
    setEdSelection([]);edSetTool("draw");edFit();levelTouched();
  };
  $("lv-verso").onclick=()=>{
    if(!confirm("Replace the current level with The Verso — Back of House?"))return;
    edSnapshot();
    loadLevel(VERSO_LEVEL);
    if(App.document.rooms.some(r=>r.id==="white") && !Object.keys(App.session.verso.revealed).length) App.session.verso.revealed.white=true;
    setEdSelection([]);edFit();levelTouched();
  };
  $("lv-vault").onclick=()=>{
    if(!confirm("Replace the current level with Level 2 — The Vault of the Bella Rosa?"))return;
    edSnapshot();loadLevel(App.content.VAULT_LEVEL);
    App.session.verso.revealed={...App.content.VAULT_START.revealed};
    App.session.verso.tokens=App.content.VAULT_START.tokens.map(mkTokFrom);
    App.session.verso.doorStates={};App.session.verso.effects=[];App.session.verso.propStates={};App.session.verso.tacticalFocus=null;
    App.session.tracker=JSON.parse(JSON.stringify(App.content.VAULT_START.tracker||{order:[],active:0,round:1}));
    setEdSelection([]);edFit();levelTouched();
  };
  if(sel){
    $("ed-name").onchange=e=>{edSnapshot();sel.name=e.target.value.trim()||"Room";levelTouched();};
    $("ed-sub").onchange=e=>{edSnapshot();sel.sub=e.target.value;levelTouched();};
    $("ed-fa").oninput=e=>{snap1();sel.floorA=e.target.value;levelTouched();};
    $("ed-fb").oninput=e=>{snap1();sel.floorB=e.target.value;levelTouched();};
    $("ed-wl").oninput=e=>{snap1();sel.wall=e.target.value;levelTouched();};
    $("ed-elevation").oninput=e=>{snap1();sel.elevation=Math.max(0,Math.min(12,Math.round(+e.target.value||0)));levelTouched();};
    $("ed-wallheight").onchange=e=>{edSnapshot();sel.wallHeight=+e.target.value;levelTouched();};
    $("ed-platform").onchange=e=>{edSnapshot();sel.structure=e.target.checked?"platform":"floor";levelTouched();};
    $("ed-cutaway").onchange=e=>{edSnapshot();sel.cutaway=e.target.checked?"front":"none";levelTouched();};
    $("ed-applytpl").onclick=()=>{
      edSnapshot();
      const t=TEMPLATES[edTemplate];
      sel.floorA=t.floorA; sel.floorB=t.floorB; sel.wall=t.wall;
      if(t.corridor)sel.corridor=true;
      levelTouched(); renderPanel();
    };
    $("ed-corr").onchange=e=>{edSnapshot();if(e.target.checked)sel.corridor=true;else delete sel.corridor;levelTouched();};
    $("ed-light").onchange=e=>{edSnapshot();const v=e.target.value;if(v==="lit")delete sel.light;else sel.light=v;levelTouched();};
    $("ed-reveal-mode").onchange=e=>{edSnapshot();setRoomRevealMode(sel,e.target.value);};
    $("ed-battle-grid").onchange=e=>{edSnapshot();sel.battleGrid=e.target.checked?"square":"none";levelTouched();};
    $("ed-tokens").onchange=e=>{edSnapshot();if(e.target.checked)sel.tokensAlways=true;else delete sel.tokensAlways;levelTouched();};
    $("ed-read").onchange=e=>{edSnapshot();sel.read=e.target.value;levelTouched();};
    $("ed-dm").onchange=e=>{edSnapshot();sel.dm=e.target.value;levelTouched();};
    $("ed-clues").onchange=e=>{edSnapshot();sel.clues=e.target.value.split("\n").map(s=>s.trim()).filter(Boolean);levelTouched();};
    $("ed-del").onclick=()=>{
      const i=App.document.rooms.findIndex(r=>r.id===sel.id);
      if(i>=0){setEdSelection([sel.id],sel.id);deleteSelection();}
    };
  }
}
$("file-level").onchange=e=>{
  const f=e.target.files[0]; e.target.value="";
  if(!f) return;
  const intent=consumeLevelImportIntent();
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const d=JSON.parse(rd.result);
      if(!d || !Array.isArray(d.rooms)) throw new Error("not a level file");
      if(intent==="transition"){transitionCustomLevel(d);return;}
      const fromStart=$("startscreen").classList.contains("show");
      if(fromStart){edUndoStack.length=0;edRedoStack.length=0;}else edSnapshot();
      loadLevel(d);
      setEdSelection([]);if(fromStart)setMode("edit");if(App.session.mode==="edit")edFit();levelTouched();hideStartScreen();
    }catch(err){alert("Couldn't read that level file: "+err.message);}
  };
  rd.readAsText(f);
};

function renderClientPanel(){
  const p=$("panel");
  const toks=S().tokens.filter(t=>t.pc);   // players only ever see designated player tokens
  let html=`<div class="sect"><h3>Your Character</h3>`;
  if(!toks.length){
    html+=`<div class="hint" style="margin-bottom:8px">Waiting for the DM to set out the party's tokens…</div>`;
  }else if(NET.myToken==null){
    html+=`<div class="hint" style="margin-bottom:8px">Claim your character. You'll be able to move only that token, and only into rooms the DM has revealed.</div>`;
  }
  html+=`<div class="toklist">`+toks.map(t=>{
    const mine=t.ownerKey===NET.playerKey||t.id===NET.myToken;
    const taken=t.ownerKey&&t.ownerKey!==NET.playerKey;
    return `<div class="tok ${mine?"sel":""}" data-claim="${t.id}" style="${taken?"opacity:.45":""}">
      <span class="dot" style="background:${t.color}">${esc(t.letter)}</span>
      <span class="nm">${esc(t.name)}</span>
      <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.1em;color:${mine?"var(--brass)":"var(--vellum-dim)"}">${mine?"YOURS":taken?"TAKEN":"CLAIM"}</span>
    </div>`;}).join("")+`</div></div>`;
  const mine=S().tokens.find(t=>t.id===NET.myToken);
  const mineActor=mine&&etActor(mine.actorId);
  if(App.session.campaignId==="east-tennessee-1861"&&!mineActor)html+=handoutsHTML(false)+etCharactersHTML(false)+etNpcsHTML(false)+etFinchsHTML(false)+etLickCreekHTML(false);
  if(mineActor){
    html+=handoutsHTML(false,mineActor)+etCharactersHTML(false)+etNpcsHTML(false)+etFinchsHTML(false)+etLickCreekHTML(false)+etTalentControlsHTML(mineActor,false)+etHealthHTML(mineActor,false)+etSkillHTML(mineActor,false)+etEquipmentHTML(mineActor,false)+etCombatHTML(mineActor,false);
    const choices=Object.values(App.session.campaignState.actors||{}).filter(a=>a.health&&!a.health.dead).map(a=>`<option value="${esc(a.actorId)}">${esc(a.identity?.name||a.actorId)}</option>`).join("");
    const medical=mineActor.medicalCapability||{},medicineValue=mineActor.skills?.medicine||0,danger=!!App.session.campaignState.scene?.immediateDanger,sp=App.session.campaignState.structuredPlay||{};
    const mineEntry=(sp.initiativeEntries||[]).find(e=>(e.participantIds||[]).some(id=>(sp.participants||[]).find(p=>p.id===id)?.actorId===mineActor.actorId)),structuredMedicalAllowed=!sp.active||mineEntry&&sp.currentEntryId===mineEntry.entryId&&mineEntry.actionState==="unspent";
    html+=`<div class="sect"><h3>East Tennessee Treatment · Prototype</h3><select id="et-patient" style="width:100%">${choices}</select>
      <div class="row">${mineActor.health.state==="down"&&!mineActor.health.stable&&!mineActor.health.dead&&!sp.active?`<button class="rbtn quiet" id="et-resolve">DOWN RESOLVE</button>`:""}${medicineValue>0&&medical.hasPlausibleMaterials&&structuredMedicalAllowed?`<button class="rbtn quiet" data-et-player="attemptFirstAid">FIRST AID</button>`:""}</div>
      <div class="row">${medicineValue>0&&medical.hasProperSupplies&&!danger?`<button class="rbtn quiet" data-et-player="attemptExtendedMedicine">EXTENDED MEDICINE</button>`:""}${mineActor.talents?.fieldMedicine&&medical.hasProperSupplies&&structuredMedicalAllowed?`<button class="rbtn" data-et-player="useFieldMedicine">FIELD MEDICINE</button>`:""}</div></div>`;
    html+=etStructuredHTML(false,mineActor);
  }
  if(mine){
    html+=`<div class="sect"><h3>Your Rolls</h3>`+
      ((rollsFloatOpen&&mine.sheet)?`<div class="hint">Popped out — floating over the map.</div>`
        :sheetRollsHTML(mine)+(mine.sheet?`<button class="rbtn quiet" id="sr-pop" style="width:100%;margin-top:6px">POP OUT OVER MAP</button>`:""))+
      `</div>`;
  }
  if(App.session.tracker.order.length){
    html+=`<div class="sect"><h3>Initiative</h3>`+trackerListHTML(false)+`</div>`;
  }
  html+=`<div class="sect"><h3>Dice</h3>
    <div class="row" style="flex-wrap:wrap;gap:5px">
      ${[4,6,8,10,12,20,100].map(d=>`<button class="rbtn quiet" data-cdie="${d}" style="flex:none;padding:6px 9px">d${d}</button>`).join("")}
      <button class="rbtn quiet" data-cdie="adv" style="flex:none;padding:6px 9px">ADV</button>
      <button class="rbtn quiet" data-cdie="dis" style="flex:none;padding:6px 9px">DIS</button>
    </div>
    <div class="row"><input type="text" id="dice-custom" placeholder="custom: 8d6, 2d4+2…" style="flex:1"><button class="rbtn quiet" id="dice-customgo" style="flex:none;padding:6px 10px">ROLL</button></div>
    <div class="hint">Rolls go to the whole table.</div></div>`;
  if(mine) html+=sheetFormHTML(mine);
  html+=`<div class="sect"><h3>Table</h3>
    <div class="hint">Drag your token to move. Drag empty space to pan, pinch or scroll to zoom, ⤢ FIT to re-center. Double-tap anywhere to ping the map for the table. Rooms appear as the party discovers them.</div></div>`;
  p.innerHTML=html;
  wireHandouts(p,false,mineActor);
  wireEtCharacters(p,false);
  wireEtTalentControls(p,mineActor,false);
  if(mineActor){
    wireEtSkills(p,mineActor,false);
    wireEtEquipment(p,mineActor,false);
    wireEtCombat(p,mineActor,false);
    wireEtStructured(p,false,mineActor);
    const send=action=>clientSend({type:"eastTennesseeAction",action});
    const resolve=$("et-resolve");if(resolve)resolve.onclick=()=>send({type:"downResolve",targetActorId:mineActor.actorId});
    p.querySelectorAll("[data-et-player]").forEach(el=>el.onclick=()=>send({type:el.dataset.etPlayer,healerActorId:mineActor.actorId,targetActorId:$("et-patient").value}));
  }
  p.querySelectorAll("[data-claim]").forEach(el=>{
    el.onclick=()=>{
      const id=+el.dataset.claim;
      const t=S().tokens.find(t=>t.id===id);
      if(!t||(t.ownerKey&&t.ownerKey!==NET.playerKey))return;
      NET.myToken=id; cliWantTok=id;
      clientSend({type:"claim",id,playerKey:NET.playerKey});
      if(t.sheet){                          // sheet's ready — surface the roll buttons right over the map
        rollsFloatOpen=true; setDrawer(false);
      } // else: leave the drawer open so they see the sheet form and can fill one in
      renderPanel();
    };
  });
  p.querySelectorAll("[data-cdie]").forEach(el=>{
    el.onclick=()=>clientSend({type:"roll",die:el.dataset.cdie});
  });
  const dcg=$("dice-customgo");
  if(dcg){
    const goCustom=()=>{
      const inp=$("dice-custom"), expr=inp.value.trim();
      const pd=parseDice(expr);
      if(!pd){inp.style.borderColor="var(--oxblood)";setTimeout(()=>{if(inp)inp.style.borderColor="";},900);return;}
      clientSend({type:"roll",expr});
    };
    dcg.onclick=goCustom;
    $("dice-custom").addEventListener("keydown",e=>{if(e.key==="Enter")goCustom();});
  }
  /* my rolls + my sheet */
  if(mine){
    if(!rollsFloatOpen) wireSheetRolls(p,mine);
    const srp=$("sr-pop"); if(srp) srp.onclick=()=>{rollsFloatOpen=true;renderPanel();setDrawer(false);};
    wireSheetAutosave(p,mine);
    const shImp=$("sh-import"); if(shImp) shImp.onclick=()=>$("file-sheet").click();
  }
}

function etFinchsHTML(gm=false){if(App.session.campaignId!=="east-tennessee-1861"||!globalThis.EastTennesseeFinchsNest)return"";const d=EastTennesseeFinchsNest.DEFINITION,s=App.session.campaignState.finchsNest;if(!s?.initialized)return gm?`<div class="sect"><h3>Finch's Nest</h3><div class="hint">Dormant scene package. Initialization creates its scene roster once without starting structured rounds.</div><button class="rbtn" id="fn-init">INITIALIZE FINCH'S NEST</button></div>`:"";const phase=EastTennesseeFinchsNest.PHASES.find(x=>x.id===s.phaseId),willId=s.npcIds.will,willLoc=s.npcLocations[willId];if(!gm){return`<div class="sect"><h3>Finch's Nest</h3><div class="hint">${esc(phase?.label||s.phaseId)} · ${esc(phase?.time||"")} · ${esc(d.maps[s.activeFloor]?.label||s.activeFloor)}</div>${(s.regions||[]).map(r=>`<details class="tok"><summary class="nm">${esc(r.label)}</summary><div class="hint">${esc(r.public)}</div></details>`).join("")}${Object.values(s.objects||{}).map(o=>`<details class="tok"><summary class="nm">${esc(o.label)}</summary><div class="hint">${esc(o.publicSummary)}</div></details>`).join("")}</div>`;}
 const floorButtons=Object.entries(d.maps).map(([id,m])=>`<button class="rbtn ${s.activeFloor===id?"":"quiet"}" data-fn-floor="${id}">${esc(m.label.toUpperCase())}</button>`).join("");const caseState=s.caseState;return`<div class="sect"><h3>Finch's Nest · Scene Control</h3><div class="row">${floorButtons}</div><label class="check"><input id="fn-overlay" type="checkbox" ${s.overlayVisible?"checked":""}> show advisory GM overlay cards</label><div class="row"><select id="fn-phase" style="flex:1">${EastTennesseeFinchsNest.PHASES.map(x=>`<option value="${x.id}" ${x.id===s.phaseId?"selected":""}>${esc(x.label)} · ${esc(x.time)}</option>`).join("")}</select></div><div class="tok"><span class="nm">${esc(phase.label)} · ${esc(phase.time)}</span><div class="hint">Will: ${esc(willLoc?.regionId||"GM-set location")} · Case: <b>${esc(caseState.location)}</b> · ${esc(caseState.sealCondition)}<br>${esc(phase.guidance)}</div></div>${s.overlayVisible?etOverlayNotesHTML(EastTennesseeFinchsNest.OVERLAY.filter(x=>x.floor===s.activeFloor)):""}<details><summary>Regions and reveals</summary>${(d.regions[s.activeFloor]||[]).map(r=>`<div class="tok"><span class="nm">${esc(r.label)}</span><button class="rbtn quiet" data-fn-region="${r.id}">${s.revealedRegions.includes(r.id)?"CONCEAL":"REVEAL"}</button><div class="hint">${esc(r.public)}${r.gm?`<br><b>GM:</b> ${esc(r.gm)}`:""}</div></div>`).join("")}</details><details><summary>Dispatch case</summary><div class="row"><select id="fn-case-location">${[...EastTennesseeFinchsNest.LOCATIONS].map(x=>`<option ${x===caseState.location?"selected":""}>${x}</option>`).join("")}</select><select id="fn-case-seal">${["intact","openedCleanly","openedVisibly","resealedImperfectly","resealedConvincingly","damaged","unknown"].map(x=>`<option ${x===caseState.sealCondition?"selected":""}>${x}</option>`).join("")}</select></div>${[["contentsAccessed","contents accessed"],["officialPacketsInspected","packets inspected"],["importantInformationCopied","information copied"],["personalLettersHandled","letters handled"],["returnedToOriginalLocation","returned"],["missingDiscovered","missing discovered"],["willAwareOfCompromise","Will aware"],["concealed","concealed"]].map(([k,l])=>`<label class="check"><input data-fn-case="${k}" type="checkbox" ${caseState[k]?"checked":""}> ${l}</label>`).join("")}<textarea id="fn-case-notes" placeholder="case GM notes">${esc(caseState.gmNotes)}</textarea><button class="rbtn" id="fn-case-save">SAVE CASE STATE</button></details><details><summary>Inspectable objects</summary>${Object.values(EastTennesseeFinchsNest.OBJECTS).map(o=>`<div class="tok"><span class="nm">${esc(o.label)}</span><button class="rbtn quiet" data-fn-object="${o.id}">${s.revealedObjects.includes(o.id)?"CONCEAL":"REVEAL"}</button><div class="hint">${esc(o.gmSummary)}</div></div>`).join("")}</details><details><summary>Witnesses and evidence</summary>${EastTennesseeFinchsNest.WITNESS_FIELDS.map(k=>`<label>${esc(k)}<input data-fn-witness="${k}" value="${esc(s.witnessNotes[k]||"")}"></label>`).join("")}<textarea id="fn-evidence" placeholder="tracks, equipment, blood, bodies, prisoners, or other evidence">${esc(s.evidenceNotes)}</textarea><button class="rbtn" id="fn-witness-save">SAVE WITNESS / EVIDENCE</button></details><details><summary>Courier outcome and transition</summary><select id="fn-outcome">${[...EastTennesseeFinchsNest.OUTCOMES].map(x=>`<option ${x===s.courierOutcome?"selected":""}>${x}</option>`).join("")}</select><label class="check"><input id="fn-outcome-reveal" type="checkbox" ${s.courierOutcomeRevealed?"checked":""}> reveal outcome to players</label><button class="rbtn" id="fn-outcome-save">RECORD OUTCOME</button><div class="hint">Suggested Lick Creek variant: <b>${esc(s.suggestedLickCreekVariant)}</b>. Suggestion never changes the canonical selection.</div><div class="row"><select id="fn-variant">${[...EastTennesseeFinchsNest.VARIANTS].map(x=>`<option ${x===s.lickCreekVariant?"selected":""}>${x}</option>`).join("")}</select><button class="rbtn" id="fn-variant-save">CONFIRM VARIANT</button></div></details><button class="rbtn quiet" id="fn-reset">RESET LOCAL SCENE STATE</button></div>`;}
function showFinchsFloor(floor){const d=EastTennesseeFinchsNest.MAPS[floor],s=App.session.campaignState.finchsNest;if(!d||!s?.initialized)return;const image=new Image();image.onload=()=>{App.session.map.img=image;App.session.map.imgURL=d.asset;App.session.map.name=`Finch's Nest · ${d.label}`;Object.assign(App.session.map.grid,d.grid);const pcs=App.session.map.tokens.filter(t=>t.pc),npcs=Object.entries(s.npcLocations).filter(([,loc])=>loc.floor===floor&&loc.visible!==false).map(([actorId,loc],i)=>{const actor=App.session.campaignState.actors[actorId],name=actor?.identity?.name||"Person",parts=name.replace(/[^A-Za-z ]/g,"").split(/\s+/).filter(Boolean);return{id:900000+i,actorId,name,letter:parts.slice(0,2).map(x=>x[0]).join("").toUpperCase()||"?",color:"#705943",x:Number(loc.x)||600,y:Number(loc.y)||400,size:1};});App.session.map.tokens=[...pcs,...npcs];App.session.scene="map";document.body.classList.add("mapscene");fitScene();if(typeof NET!=="undefined"){NET.imgStamp++;netBroadcast({type:"img",data:d.asset,stamp:NET.imgStamp});}markDirty();netMark();renderPanel();};image.src=d.asset;}
function wireEtFinchs(p,gm=false){if(!gm||!globalThis.EastTennesseeFinchsNest)return;const init=p.querySelector("#fn-init");if(init)init.onclick=()=>{etHostAction({type:"gmFinchsInitialize"});showFinchsFloor(App.session.campaignState.finchsNest.activeFloor);};p.querySelectorAll("[data-fn-floor]").forEach(el=>el.onclick=()=>{etHostAction({type:"gmFinchsSetFloor",floor:el.dataset.fnFloor});showFinchsFloor(el.dataset.fnFloor);});const phase=p.querySelector("#fn-phase");if(phase)phase.onchange=()=>{etHostAction({type:"gmFinchsSetPhase",phaseId:phase.value});showFinchsFloor(App.session.campaignState.finchsNest.activeFloor);};const overlay=p.querySelector("#fn-overlay");if(overlay)overlay.onchange=()=>etHostAction({type:"gmFinchsSetOverlay",visible:overlay.checked});p.querySelectorAll("[data-fn-region]").forEach(el=>el.onclick=()=>etHostAction({type:"gmFinchsReveal",domain:"region",id:el.dataset.fnRegion,revealed:!App.session.campaignState.finchsNest.revealedRegions.includes(el.dataset.fnRegion)}));p.querySelectorAll("[data-fn-object]").forEach(el=>el.onclick=()=>etHostAction({type:"gmFinchsReveal",domain:"object",id:el.dataset.fnObject,revealed:!App.session.campaignState.finchsNest.revealedObjects.includes(el.dataset.fnObject)}));const caseSave=p.querySelector("#fn-case-save");if(caseSave)caseSave.onclick=()=>{const state={location:p.querySelector("#fn-case-location").value,sealCondition:p.querySelector("#fn-case-seal").value,gmNotes:p.querySelector("#fn-case-notes").value};p.querySelectorAll("[data-fn-case]").forEach(el=>state[el.dataset.fnCase]=el.checked);etHostAction({type:"gmFinchsSetCase",caseState:state});};const witness=p.querySelector("#fn-witness-save");if(witness)witness.onclick=()=>{const notes={};p.querySelectorAll("[data-fn-witness]").forEach(el=>notes[el.dataset.fnWitness]=el.value);etHostAction({type:"gmFinchsSetWitnesses",witnessNotes:notes,evidenceNotes:p.querySelector("#fn-evidence").value});};const outcome=p.querySelector("#fn-outcome-save");if(outcome)outcome.onclick=()=>etHostAction({type:"gmFinchsSetOutcome",courierOutcome:p.querySelector("#fn-outcome").value,revealed:p.querySelector("#fn-outcome-reveal").checked});const variant=p.querySelector("#fn-variant-save");if(variant)variant.onclick=()=>etHostAction({type:"gmFinchsConfirmVariant",variant:p.querySelector("#fn-variant").value});const reset=p.querySelector("#fn-reset");if(reset)reset.onclick=()=>{if(confirm("Reset local Finch's Nest phase, placements, case, and reveals? Committed witnesses, evidence, outcome, and Lick Creek variant will be preserved.")){etHostAction({type:"gmFinchsReset",confirm:true});showFinchsFloor("ground");}};}

function etLickCreekHTML(gm=false){if(App.session.campaignId!=="east-tennessee-1861"||!globalThis.EastTennesseeLickCreek)return"";const d=EastTennesseeLickCreek.DEFINITION,s=App.session.campaignState.lickCreek;if(!s?.initialized){if(!gm)return"";const inherited=App.session.campaignState.finchsNest?.lickCreekVariant||"undetermined";return`<div class="sect"><h3>Lick Creek</h3><div class="hint">Dormant scene package · Finch's Nest variant: <b>${esc(inherited)}</b>. Choose explicitly if undetermined.</div><div class="row"><select id="lc-init-variant"><option value="undetermined">choose variant</option><option value="baseline" ${inherited==="baseline"?"selected":""}>baseline</option><option value="alarmed" ${inherited==="alarmed"?"selected":""}>alarmed</option></select><span class="hint">Abner Raines carries a revolver.</span></div><button class="rbtn" id="lc-init">INITIALIZE LICK CREEK</button></div>`;}if(!gm)return`<div class="sect"><h3>Lick Creek</h3><div class="hint">${esc(s.scenePhase)} · ${esc(s.bridgeState)} · ${esc(s.variant)} posture</div>${(s.facts||[]).map(f=>`<details class="tok"><summary class="nm">${esc(f.label)}</summary><div class="hint">${esc(f.text)}</div></details>`).join("")}${Object.values(s.objects||{}).map(o=>`<details class="tok"><summary class="nm">${esc(o.label)}</summary><div class="hint">${esc(o.publicSummary)}</div></details>`).join("")}</div>`;
 const actorOptions=Object.values(App.session.campaignState.actors||{}).filter(a=>a.ownerKey).map(a=>`<option value="${esc(a.actorId)}">${esc(a.identity?.name||a.actorId)}</option>`).join("");return`<div class="sect"><h3>Lick Creek · Scene Control</h3><button class="rbtn" id="lc-map">OPEN SCENE MAP</button><label class="check"><input id="lc-overlay" type="checkbox" ${s.overlayVisible?"checked":""}> show advisory GM overlay cards</label><select id="lc-phase" style="width:100%">${[...EastTennesseeLickCreek.PHASES].map(x=>`<option ${x===s.scenePhase?"selected":""}>${x}</option>`).join("")}</select><div class="tok"><div class="hint"><b>Variant: ${esc(s.variant.toUpperCase())} · ${Object.keys(s.npcIds).filter(x=>x==="vance"||x==="rader"||x==="mose"||x.startsWith("guard-")).length} guards</b><br>Bridge: <b>${esc(s.bridgeState)}</b> · phase: ${esc(s.scenePhase)}</div></div>${s.overlayVisible?etOverlayNotesHTML(d.gmOverlay):""}
 <details><summary>Reconnaissance reveals</summary><div class="row"><select id="lc-recon-actor"><option value="">selected character…</option>${actorOptions}</select></div>${d.reconnaissanceFacts.map(f=>`<div class="tok"><span class="nm">${esc(f.label)}${f.plain?" · plainly visible":""}</span><div class="row"><button class="rbtn quiet" data-lc-fact="${f.id}" data-lc-vis="party">PARTY</button><button class="rbtn quiet" data-lc-fact="${f.id}" data-lc-vis="selected">SELECTED</button><button class="rbtn quiet" data-lc-fact="${f.id}" data-lc-vis="none">HIDE</button></div><div class="hint">${esc(f[s.variant]||f.text||"")}</div></div>`).join("")}</details>
 <details><summary>Patrol guidance and positions</summary><div class="hint">${esc(d.patrolGuidance[s.variant])}<br>${esc(d.patrolGuidance.automation)}</div><div class="row"><button class="rbtn quiet" data-lc-patrol="mose-rest">MOSE RESTS</button><button class="rbtn quiet" data-lc-patrol="mose-circuit">MOSE ON CIRCUIT</button></div></details>
 <details><summary>Bridge and fire</summary><div class="row"><select id="lc-bridge">${[...EastTennesseeLickCreek.BRIDGE_STATES].map(x=>`<option ${x===s.bridgeState?"selected":""}>${x}</option>`).join("")}</select><button class="rbtn quiet" id="lc-bridge-save">SET BRIDGE</button></div><div class="row"><select id="lc-fire-kind"><option value="weak">weak · d6</option><option value="competent">competent · d4</option><option value="exceptional">exceptional · d3</option><option value="custom">custom</option></select><input id="lc-fire-rounds" type="number" min="1" max="99" placeholder="override"><button class="rbtn" id="lc-fire-start" ${["stageOne","stageTwo"].includes(s.fireState.stage)?"disabled":""}>START STAGE ONE</button></div><div class="row"><input id="lc-stage2-rounds" type="number" min="1" max="99" placeholder="d4"><button class="rbtn quiet" id="lc-stage2" ${(!App.session.campaignState.adventureFlags?.bridgeDisabled&&s.bridgeState!=="disabled")||s.fireState.stageTwoTimerId?"disabled":""}>START STAGE TWO</button><button class="rbtn quiet" id="lc-extinguish">EXTINGUISH</button></div><div class="hint">Stage two begins automatically when stage one disables the bridge. Pause, resume, adjust, remove, or resolve fire timers in Structured Play.</div></details>
 <details><summary>Timers and messenger</summary><label class="check"><input id="lc-messenger" type="checkbox" ${s.messengerState.escaped?"checked":""}> GM confirms messenger escaped</label><button class="rbtn quiet" id="lc-messenger-save">SAVE MESSENGER</button><div class="row"><input id="lc-missing-rounds" type="number" min="1" value="8"><button class="rbtn quiet" data-lc-timer="missingPatrol">MISSING PATROL</button></div><div class="row"><input id="lc-help-rounds" type="number" min="1" value="12"><button class="rbtn quiet" data-lc-timer="helpWarned">HELP WARNED</button></div><div class="row"><input id="lc-train-rounds" type="number" min="1" value="20"><button class="rbtn quiet" data-lc-timer="morningTrain">MORNING TRAIN</button></div><div class="hint">All presets start manually and advance only through structured round ends.</div></details>
 <details><summary>Work camp and materials</summary><div class="row"><label>free/craftsmen <input id="lc-free-count" type="number" min="0" max="20" value="${s.workCampState.freeWorkerCount}"></label><label>hired-out <input id="lc-enslaved-count" type="number" min="0" max="20" value="${s.workCampState.enslavedWorkerCount}"></label><button class="rbtn quiet" id="lc-camp-save">SAVE</button></div><div class="hint">${EastTennesseeLickCreek.WORK_CAMP_GUIDANCE.map(esc).join(" ")} Objects remain in camp until the GM uses the equipment-location system.</div>${Object.values(d.inspectableObjects).map(o=>`<div class="tok"><span class="nm">${esc(o.label)}</span><button class="rbtn quiet" data-lc-object="${o.id}">${s.revealedObjects.includes(o.id)?"CONCEAL":"REVEAL"}</button></div>`).join("")}</details>
 <details><summary>Evidence, witnesses, and ending</summary>${EastTennesseeLickCreek.WITNESS_FIELDS.map(k=>`<label>${esc(k)}<input data-lc-witness="${k}" value="${esc(s.witnessNotes[k]||"")}"></label>`).join("")}<textarea id="lc-evidence" placeholder="other GM-only evidence">${esc(s.evidenceNotes)}</textarea><button class="rbtn quiet" id="lc-evidence-save">SAVE EVIDENCE</button><select id="lc-outcome" style="width:100%">${[...EastTennesseeLickCreek.OUTCOMES].map(x=>`<option ${x===s.missionOutcome?"selected":""}>${x}</option>`).join("")}</select><textarea id="lc-outcome-notes" placeholder="outcome notes">${esc(s.outcomeNotes)}</textarea><button class="rbtn" id="lc-outcome-save">CONFIRM OUTCOME</button><div class="hint"><b>Successful ridge:</b> ${esc(EastTennesseeLickCreek.ENDINGS.success)}<br><b>Legitimate withdrawal:</b> ${esc(EastTennesseeLickCreek.ENDINGS.withdrawal)}</div></details><button class="rbtn quiet" id="lc-reset">RESET LOCAL LICK CREEK STATE</button></div>`;}
function showLickCreekMap(){const d=EastTennesseeLickCreek.MAP,s=App.session.campaignState.lickCreek;if(!s?.initialized)return;const image=new Image();image.onload=()=>{App.session.map.img=image;App.session.map.imgURL=d.asset;App.session.map.name=d.label;Object.assign(App.session.map.grid,d.grid);const pcs=App.session.map.tokens.filter(t=>t.pc),npcs=Object.entries(s.npcLocations).filter(([,loc])=>loc.visible!==false).map(([actorId,loc],i)=>{const actor=App.session.campaignState.actors[actorId],name=actor?.identity?.name||"Person",parts=name.replace(/[^A-Za-z ]/g,"").split(/\s+/).filter(Boolean);return{id:910000+i,actorId,name,letter:parts.slice(0,2).map(x=>x[0]).join("").toUpperCase()||"?",color:"#705943",x:Number(loc.x)||800,y:Number(loc.y)||500,size:1};});App.session.map.tokens=[...pcs,...npcs];App.session.scene="map";document.body.classList.add("mapscene");fitScene();if(typeof NET!=="undefined"){NET.imgStamp++;netBroadcast({type:"img",data:d.asset,stamp:NET.imgStamp});}markDirty();netMark();renderPanel();};image.src=d.asset;}
function wireEtLickCreek(p,gm=false){if(!gm||!globalThis.EastTennesseeLickCreek)return;const init=p.querySelector("#lc-init");if(init)init.onclick=()=>{etHostAction({type:"gmLickInitialize",variant:p.querySelector("#lc-init-variant").value,abnerWeapon:"revolver"});if(App.session.campaignState.lickCreek.initialized)showLickCreekMap();};const map=p.querySelector("#lc-map");if(map)map.onclick=showLickCreekMap;const phase=p.querySelector("#lc-phase");if(phase)phase.onchange=()=>etHostAction({type:"gmLickSetPhase",phase:phase.value});const overlay=p.querySelector("#lc-overlay");if(overlay)overlay.onchange=()=>etHostAction({type:"gmLickSetOverlay",visible:overlay.checked});p.querySelectorAll("[data-lc-fact]").forEach(el=>el.onclick=()=>etHostAction({type:"gmLickRevealFact",factId:el.dataset.lcFact,visibility:el.dataset.lcVis,actorIds:el.dataset.lcVis==="selected"?[p.querySelector("#lc-recon-actor").value]:[]}));p.querySelectorAll("[data-lc-object]").forEach(el=>el.onclick=()=>etHostAction({type:"gmLickRevealObject",objectId:el.dataset.lcObject,revealed:!App.session.campaignState.lickCreek.revealedObjects.includes(el.dataset.lcObject)}));const bridge=p.querySelector("#lc-bridge-save");if(bridge)bridge.onclick=()=>etHostAction({type:"gmLickSetBridge",bridgeState:p.querySelector("#lc-bridge").value});const fire=p.querySelector("#lc-fire-start");if(fire)fire.onclick=()=>etHostAction({type:"gmLickStartFire",category:p.querySelector("#lc-fire-kind").value,initialRounds:p.querySelector("#lc-fire-rounds").value?+p.querySelector("#lc-fire-rounds").value:undefined});const stage2=p.querySelector("#lc-stage2");if(stage2)stage2.onclick=()=>etHostAction({type:"gmLickStartStageTwo",initialRounds:p.querySelector("#lc-stage2-rounds").value?+p.querySelector("#lc-stage2-rounds").value:undefined});const extinguish=p.querySelector("#lc-extinguish");if(extinguish)extinguish.onclick=()=>etHostAction({type:"gmLickExtinguishFire"});const messenger=p.querySelector("#lc-messenger-save");if(messenger)messenger.onclick=()=>etHostAction({type:"gmLickConfirmMessenger",escaped:p.querySelector("#lc-messenger").checked});p.querySelectorAll("[data-lc-timer]").forEach(el=>el.onclick=()=>{const kind=el.dataset.lcTimer,input=kind==="missingPatrol"?"#lc-missing-rounds":kind==="helpWarned"?"#lc-help-rounds":"#lc-train-rounds";etHostAction({type:"gmLickStartTimer",kind,initialRounds:+p.querySelector(input).value});});p.querySelectorAll("[data-lc-patrol]").forEach(el=>el.onclick=()=>{const id=App.session.campaignState.lickCreek.npcIds.mose,pos=el.dataset.lcPatrol==="mose-rest"?{regionId:"mose-rest",x:600,y:340,visible:false}:{regionId:"north-circuit",x:800,y:290,visible:true};etHostAction({type:"gmLickSetNpcLocation",npcId:id,...pos});showLickCreekMap();});const camp=p.querySelector("#lc-camp-save");if(camp)camp.onclick=()=>etHostAction({type:"gmLickSetWorkCamp",freeWorkerCount:+p.querySelector("#lc-free-count").value,enslavedWorkerCount:+p.querySelector("#lc-enslaved-count").value});const evidence=p.querySelector("#lc-evidence-save");if(evidence)evidence.onclick=()=>{const notes={};p.querySelectorAll("[data-lc-witness]").forEach(el=>notes[el.dataset.lcWitness]=el.value);etHostAction({type:"gmLickSetEvidence",witnessNotes:notes,evidenceNotes:p.querySelector("#lc-evidence").value});};const outcome=p.querySelector("#lc-outcome-save");if(outcome)outcome.onclick=()=>etHostAction({type:"gmLickSetOutcome",outcome:p.querySelector("#lc-outcome").value,notes:p.querySelector("#lc-outcome-notes").value});const reset=p.querySelector("#lc-reset");if(reset)reset.onclick=()=>{if(confirm("Reset local Lick Creek positions, bridge, fire, timers, reveals, and phase? Committed outcome and evidence will be preserved.")){etHostAction({type:"gmLickReset",confirm:true});showLickCreekMap();}};}

Object.assign(App.services.panel,{renderPanel,renderEditorPanel,renderClientPanel});

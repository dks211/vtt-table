"use strict";
/* ---------------- right panel ---------------- */
let addColor=SWATCH[0];


/* one-click rolls from a token's sheet — same UI for players (their claim)
   and the DM (any selected token, e.g. rolling for NPCs) */
function tokenRoll(t,o){ // o: {die,mod,expr,label,init}
  // o.label is omitted for freeform custom rolls — the dice notation (e.g. "8d6")
  // already says what was rolled, so echoing it a second time is just noise
  const label=o.label ? t.name+" · "+o.label : t.name;
  if(NET.mode==="client"){clientSend({type:"roll",die:o.die,mod:o.mod,expr:o.expr,label,init:o.init});return;}
  if(o.expr){const pd=parseDice(o.expr); if(pd) roll(pd.d,pd.n,pd.mod,"dm",label); return;}
  const e=roll(o.die,1,o.mod||0,"dm",label);
  if(o.init) trackerSet(t.name,e.total,t.id,false);
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
  if(sh.atks.length){
    h+=`<div class="toklist">`+sh.atks.map((a,i)=>`<div class="tok" style="cursor:default">
      <span class="nm">${esc(a.name)}</span>
      <button class="rbtn" data-srhit="${i}" style="flex:none;padding:5px 7px">ATK ${sign(a.hit)}</button>
      <button class="rbtn quiet" data-sradv="${i}" style="flex:none;padding:5px 6px" title="attack with advantage">A</button>
      <button class="rbtn quiet" data-srdis="${i}" style="flex:none;padding:5px 6px" title="attack with disadvantage">D</button>
      <button class="rbtn quiet" data-srdmg="${i}" style="flex:none;padding:5px 7px">${esc(a.dmg)}</button>
    </div>`).join("")+`</div>`;
  }
  h+=`<div class="row" style="margin-top:7px"><input type="text" id="sr-custom" placeholder="custom: 8d6, 2d4+2…" style="flex:1"><button class="rbtn quiet" id="sr-customgo" style="flex:none;padding:6px 10px">ROLL</button></div>`;
  const bonusOf=k=>{
    const chk=/^(\w{3}) check$/.exec(k);
    return chk ? (sh.abil[chk[1].toLowerCase()]||0) : skillBonus(sh,k);
  };
  const opt=k=>`<option value="${k}">${k}  ${sign(bonusOf(k))}</option>`;
  const ABL=["STR","DEX","CON","INT","WIS","CHA"];
  const bySkill={}; ABL.forEach(a=>bySkill[a]=[]);
  for(const [k,ab] of Object.entries(SKILL_ABIL)) bySkill[ab.toUpperCase()].push(k);
  let sel=`<optgroup label="— Ability checks —">${ABL.map(a=>opt(a+" check")).join("")}</optgroup>`;
  sel+=`<optgroup label="— Saving throws —">${ABL.map(a=>opt(a+" save")).join("")}</optgroup>`;
  for(const a of ABL) if(bySkill[a].length)
    sel+=`<optgroup label="— ${a} skills —">${bySkill[a].sort().map(opt).join("")}</optgroup>`;
  h+=`<div class="row" style="margin-top:7px"><select id="sr-skill" style="flex:1">${sel}</select></div>
  <div class="row"><button class="rbtn quiet" id="sr-roll">ROLL</button><button class="rbtn quiet" id="sr-adv">ADV</button><button class="rbtn quiet" id="sr-dis">DIS</button></div>`;
  return h;
}
function wireSheetRolls(p,t){
  // all lookups scoped to the container: the same ids can exist transiently
  // in both the panel and the pop-out float during re-renders
  const sh=t.sheet, q=sel=>p.querySelector(sel);
  if(!sh || !q("#sr-roll")) return;
  const skillPick=()=>{
    const k=q("#sr-skill").value;
    const chk=/^(\w{3}) check$/.exec(k);
    return {k, bonus: chk ? (sh.abil[chk[1].toLowerCase()]||0) : skillBonus(sh,k)};
  };
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
  p.querySelectorAll("[data-srhit]").forEach(el=>{el.onclick=()=>{const a=sh.atks[+el.dataset.srhit];if(a)tokenRoll(t,{die:20,mod:a.hit,label:a.name});};});
  p.querySelectorAll("[data-sradv]").forEach(el=>{el.onclick=()=>{const a=sh.atks[+el.dataset.sradv];if(a)tokenRoll(t,{die:"adv",mod:a.hit,label:a.name+" (adv)"});};});
  p.querySelectorAll("[data-srdis]").forEach(el=>{el.onclick=()=>{const a=sh.atks[+el.dataset.srdis];if(a)tokenRoll(t,{die:"dis",mod:a.hit,label:a.name+" (dis)"});};});
  p.querySelectorAll("[data-srdmg]").forEach(el=>{el.onclick=()=>{const a=sh.atks[+el.dataset.srdmg];if(a)tokenRoll(t,{expr:a.dmg,label:a.name+" damage"});};});
  q("#sr-roll").onclick=()=>{const s=skillPick();tokenRoll(t,{die:20,mod:s.bonus,label:s.k});};
  q("#sr-adv").onclick=()=>{const s=skillPick();tokenRoll(t,{die:"adv",mod:s.bonus,label:s.k+" (adv)"});};
  q("#sr-dis").onclick=()=>{const s=skillPick();tokenRoll(t,{die:"dis",mod:s.bonus,label:s.k+" (dis)"});};
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
  return `<div class="sect"><h3>Sheet · ${esc(t.name)}</h3>
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
      <button class="rbtn" id="sh-save">SAVE SHEET</button>
    </div>
    ${toLib?`<button class="rbtn quiet" id="sh-tolib" style="width:100%;margin-top:6px" title="store name/color/PC flag/sheet in this level's Token Library">SAVE TO TOKEN LIBRARY</button>`:""}
    <div class="hint" style="margin-top:5px">Import fills the boxes from a Google Sheet CSV export — check them, then SAVE. Blank init = DEX.</div>
  </div>`;
}
function readSheetForm(){
  const num=id=>(+$(id).value||0)|0;
  const abil={}; for(const k of ["str","dex","con","int","wis","cha"]) abil[k]=num("sh-"+k);
  const atks=$("sh-atks").value.split("\n").map(s=>s.trim()).filter(Boolean).map(line=>{
    const m=/^(.+?)\s+([+-]?\d+)\s+(\S+)$/.exec(line);
    return m?{name:m[1],hit:+m[2],dmg:m[3]}:null;
  }).filter(Boolean);
  const skills={};
  $("sh-skills").value.split("\n").map(s=>s.trim()).filter(Boolean).forEach(line=>{
    const m=/^(.+?)\s+([+-]?\d+)$/.exec(line);
    if(m) skills[m[1]]=+m[2];
  });
  const raw=id=>{const v=$(id).value.trim();return v===""?null:+v;};
  return sanitizeSheet({prof:num("sh-prof"),init:raw("sh-init"),
    ac:raw("sh-ac"),hp:raw("sh-hp"),hpMax:raw("sh-hpmax"),
    spellAbil:$("sh-spellabil").value||null,abil,atks,skills});
}
function trackerListHTML(canEdit){
  const tr=App.session.tracker;
  if(!tr.order.length) return "";
  return `<div class="toklist">${tr.order.map((en,i)=>`
    <div class="tok" style="cursor:default;${i===tr.active?"border-color:var(--brass-dim);background:var(--felt-950)":""}">
      <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;width:24px;text-align:right;color:${i===tr.active?"var(--brass)":"var(--vellum-dim)"}">${(en.h&&!canEdit)?"—":en.total}</span>
      <span class="nm" style="${i===tr.active?"color:var(--brass)":""}">${i===tr.active?"▶ ":""}${esc(en.name)}</span>
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
  el.innerHTML='<div class="tfh">INITIATIVE</div>'+tr.order.map((en,i)=>
    `<div class="tfr${i===tr.active?" on":""}"><span class="n">${(en.h&&!dm)?"—":en.total}</span><span>${i===tr.active?"▶ ":""}${esc(en.name)}${(en.h&&dm)?" 🕶":""}</span></div>`).join("");
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
  let html="";

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
          <div class="row" style="margin:8px 0 0">
            <button class="rbtn quiet" id="rc-light" title="cycle lit / dim / dark / flicker">☀ ${(r.light||"lit").toUpperCase()}</button>
            <button class="rbtn quiet" id="rc-tokens" title="off: NPCs here are hidden from players until a PC is also in the room. on: NPCs always show once the room is revealed.">${r.tokensAlways?"👁 NPCS VISIBLE":"🕶 PARTY ONLY"}</button>
          </div>
        </div></div>`;
    }else{
      html+=`<div class="hint">Click a room on the map to read it. Reveal rooms as the party reaches them — in Player view, hidden rooms don't exist yet.</div>`;
    }
    html+=`</div>`;
    html+=`<div class="sect dm-only"><h3>Reveal</h3><div class="toklist">`+
      App.document.rooms.map(r=>`<div class="tok" data-room="${r.id}">
        <span class="dot" style="background:${App.session.verso.revealed[r.id]?"#C8A14E":"#3a3a35"}"></span>
        <span class="nm">${esc(r.name)}</span>
        <span class="del" data-rev="${r.id}" title="${App.session.verso.revealed[r.id]?"hide from players":"reveal to players"}" style="color:${App.session.verso.revealed[r.id]?"#C8A14E":"#666"}">${App.session.verso.revealed[r.id]?"●":"○"}</span>
      </div>`).join("")+`</div></div>`;
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
  html+=`<div class="sect"><h3>Dice</h3>
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
  html+=`<div class="sect"><h3>Initiative</h3>`+trackerListHTML(true)+
    (App.session.tracker.order.length
      ?`<div class="row" style="margin-top:7px"><button class="rbtn" id="tr-next">NEXT TURN</button><button class="rbtn quiet" id="tr-clear">CLEAR</button></div>`
      :`<div class="hint" style="margin-bottom:7px">Players' INITIATIVE button adds them automatically; ROLL PCS rolls for every PC token from its sheet.</div>`)+
    `<div class="row"><button class="rbtn quiet" id="tr-pcs">ROLL PCS</button></div>
    <div class="row"><input type="text" id="tr-name" placeholder="name" style="flex:1"><input type="number" id="tr-total" placeholder="#" style="width:52px"><button class="rbtn quiet" id="tr-add" style="flex:none;padding:6px 10px">ADD</button></div>
    <label class="check"><input type="checkbox" id="tr-hide" checked> added entries hidden from players (5e style)</label>
  </div>`;

  // events
  html+=`<div class="sect"><h3>Events</h3>
    <div class="row"><button class="rbtn" id="ev-pulse">PULSE PATROLS</button></div>
    <div class="row"><input type="text" id="ev-text" placeholder="message the whole table…" style="flex:1"><button class="rbtn quiet" id="ev-send" style="flex:none;padding:6px 10px">SEND</button></div>
    <div class="hint">PULSE walks every patrolling token one waypoint. SEND flashes the text on every screen — good for "the muzak stops."</div></div>`;

  // tokens
  const toks=S().tokens;
  html+=`<div class="sect"><h3>Tokens</h3><div class="toklist">`+
    toks.map(t=>`<div class="tok ${App.session.selToken===t.id?"sel":""}" data-tok="${t.id}">
      <span class="dot" style="background:${t.color}">${esc(t.letter)}</span>
      <span class="nm">${esc(t.name)}${t.owner?' <span style="font-size:9px;color:var(--under)">· claimed</span>':''}</span>
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
  }
  html+=`</div>`;
  if(selT && selT.sheet){
    html+=`<div class="sect"><h3>Roll as ${esc(selT.name)}</h3>`+
      (rollsFloatOpen?`<div class="hint">Popped out — floating over the map.</div>`
        :sheetRollsHTML(selT)+`<button class="rbtn quiet" id="sr-pop" style="width:100%;margin-top:6px">POP OUT OVER MAP</button>`)+
      `</div>`;
  }
  if(selT) html+=sheetFormHTML(selT,true);
  // add token
  html+=`<div class="sect"><h3>Add Token</h3>
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

  /* wire panel events */
  if(App.session.scene==="verso"){
    const tg=$("rc-toggle");
    if(tg) tg.onclick=()=>{
      const id=App.session.selRoom;
      App.session.verso.revealed[id]=!App.session.verso.revealed[id];
      markDirty(); renderPanel();
    };
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
        if(e.target.dataset.rev){
          const id=e.target.dataset.rev;
          App.session.verso.revealed[id]=!App.session.verso.revealed[id];
          markDirty(); renderPanel(); return;
        }
        App.session.selRoom=el.dataset.room; renderPanel();
      };
    });
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
      if(t.pc){delete t.pc; if(t.owner) delete t.owner;}    // demoting kicks any claim
      else t.pc=true;
      markDirty(); renderPanel();
    };
  });
  p.querySelectorAll("[data-tok]").forEach(el=>{
    el.onclick=e=>{
      if(e.target.dataset.del||e.target.dataset.pc) return;
      const id=+el.dataset.tok;
      App.session.selToken=id;
      const t=S().tokens.find(t=>t.id===id);
      if(t){ // center camera on token
        const c=cam();
        if(App.session.scene==="map"){c.x=t.x-W/(2*c.s);c.y=t.y-H/(2*c.s);}
        else{c.x=isoX(t.x,t.y)-W/(2*c.s);c.y=isoY(t.x,t.y)-H/(2*c.s);}
      }
      renderPanel();
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
    tr.active=(tr.active+1)%tr.order.length;
    trackerAnnounce(); renderPanel();
  };
  const trClear=$("tr-clear"); if(trClear) trClear.onclick=()=>{App.session.tracker={order:[],active:0};netMark();renderPanel();};
  const trPcs=$("tr-pcs"); if(trPcs) trPcs.onclick=()=>{
    for(const t of S().tokens.filter(t=>t.pc)){
      const e=roll(20,1,t.sheet?initOf(t.sheet):0,"dm",t.name+" · Initiative");
      trackerSet(t.name,e.total,t.id);
    }
  };
  const trAdd=$("tr-add"); if(trAdd) trAdd.onclick=()=>{
    const nm=($("tr-name").value||"").trim();
    if(!nm) return;
    trackerSet(nm,(+$("tr-total").value||0)|0,null,$("tr-hide").checked);
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
  /* sheet wiring (DM edits any selected token; rolls as it too) */
  if(selT && !rollsFloatOpen) wireSheetRolls(p,selT);
  const srp=$("sr-pop"); if(srp) srp.onclick=()=>{rollsFloatOpen=true;renderPanel();};
  const shSave=$("sh-save"); if(shSave && selT) shSave.onclick=()=>{
    selT.sheet=readSheetForm();
    markDirty(); renderPanel();
  };
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
    const [i,j]=unIso(wx,wy);
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
  const sel=App.document.rooms.find(r=>r.id===edSel);
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
    </div></div>`;
  html+=`<div class="sect"><h3>Tools</h3>
    <div class="row">${toolBtn("draw","DRAW (D)")}${toolBtn("select","SELECT (V)")}</div>
    <div class="row">${toolBtn("door","DOORS (O)")}${toolBtn("prop","PROPS (P)")}</div>
    <div class="row"><button class="rbtn quiet" id="ed-undo" ${edUndoStack.length?"":"disabled style='opacity:.4'"}>↩ UNDO (CTRL+Z)</button></div>
    <div class="row"><label>template</label><select id="ed-template">${
      TEMPLATES.map((t,i)=>`<option value="${i}" ${i===edTemplate?"selected":""}>${t.name}</option>`).join("")
    }</select></div>
    ${edTool==="prop"?`<div class="row"><label>furniture</label><select id="ed-prop">${
      Object.entries(PROP_LIB).map(([k,v])=>`<option value="${k}" ${k===edPropType?"selected":""}>${v.n}</option>`).join("")
    }</select></div>`:""}
    <div class="hint">New rooms use the template palette. L-shapes: select a room, then Shift+drag beside it. Doors: click the shared edge (right-click removes). Props: pick furniture, click tiles.</div></div>`;
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
      <label class="check"><input type="checkbox" id="ed-corr" ${sel.corridor?"checked":""}> corridor (thin label styling)</label>
      <div class="row"><label>lighting</label><select id="ed-light">${["lit","dim","dark","flicker"].map(v=>`<option ${(sel.light||"lit")===v?"selected":""}>${v}</option>`).join("")}</select></div>
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

  let snapped=false;
  const snap1=()=>{if(!snapped){edSnapshot();snapped=true;}};   // one undo step per slider/picker interaction
  $("ed-undo").onclick=()=>edUndoPop();
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
  $("lv-name").onchange=e=>{edSnapshot();App.document.level.name=e.target.value.trim()||"Untitled Level";$("tab-verso").textContent=App.document.level.name.toUpperCase();levelTouched();};
  $("lv-bg").oninput=e=>{snap1();App.document.level.bg=e.target.value;levelTouched();};
  $("lv-export").onclick=()=>{
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify(levelData(),null,1)],{type:"application/json"}));
    a.download=(App.document.level.name||"level").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+".level.json";
    a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  };
  $("lv-import").onclick=()=>$("file-level").click();
  $("lv-new").onclick=()=>{
    if(!confirm("Start a new blank level? The current level is replaced (export first if you want to keep it)."))return;
    edSnapshot();
    loadLevel({name:"Untitled Level",bg:"#0A0F0C",rooms:[],doors:[],roster:[]});
    edSel=null; edSetTool("draw"); edFit(); levelTouched();
  };
  $("lv-verso").onclick=()=>{
    if(!confirm("Replace the current level with The Verso — Back of House?"))return;
    edSnapshot();
    loadLevel(VERSO_LEVEL);
    if(App.document.rooms.some(r=>r.id==="white") && !Object.keys(App.session.verso.revealed).length) App.session.verso.revealed.white=true;
    edSel=null; edFit(); levelTouched();
  };
  if(sel){
    $("ed-name").onchange=e=>{edSnapshot();sel.name=e.target.value.trim()||"Room";levelTouched();};
    $("ed-sub").onchange=e=>{edSnapshot();sel.sub=e.target.value;levelTouched();};
    $("ed-fa").oninput=e=>{snap1();sel.floorA=e.target.value;levelTouched();};
    $("ed-fb").oninput=e=>{snap1();sel.floorB=e.target.value;levelTouched();};
    $("ed-wl").oninput=e=>{snap1();sel.wall=e.target.value;levelTouched();};
    $("ed-applytpl").onclick=()=>{
      edSnapshot();
      const t=TEMPLATES[edTemplate];
      sel.floorA=t.floorA; sel.floorB=t.floorB; sel.wall=t.wall;
      if(t.corridor)sel.corridor=true;
      levelTouched(); renderPanel();
    };
    $("ed-corr").onchange=e=>{edSnapshot();if(e.target.checked)sel.corridor=true;else delete sel.corridor;levelTouched();};
    $("ed-light").onchange=e=>{edSnapshot();const v=e.target.value;if(v==="lit")delete sel.light;else sel.light=v;levelTouched();};
    $("ed-tokens").onchange=e=>{edSnapshot();if(e.target.checked)sel.tokensAlways=true;else delete sel.tokensAlways;levelTouched();};
    $("ed-read").onchange=e=>{edSnapshot();sel.read=e.target.value;levelTouched();};
    $("ed-dm").onchange=e=>{edSnapshot();sel.dm=e.target.value;levelTouched();};
    $("ed-clues").onchange=e=>{edSnapshot();sel.clues=e.target.value.split("\n").map(s=>s.trim()).filter(Boolean);levelTouched();};
    $("ed-del").onclick=()=>{
      const i=App.document.rooms.findIndex(r=>r.id===sel.id);
      if(i>=0){edSnapshot();App.document.rooms.splice(i,1);delete App.session.verso.revealed[sel.id];edSel=null;pruneDoors();levelTouched();renderPanel();}
    };
  }
}
$("file-level").onchange=e=>{
  const f=e.target.files[0]; e.target.value="";
  if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const d=JSON.parse(rd.result);
      if(!d || !Array.isArray(d.rooms)) throw new Error("not a level file");
      edSnapshot();
      loadLevel(d);
      edSel=null; if(App.session.mode==="edit") edFit(); levelTouched();
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
    const mine=t.id===NET.myToken;
    const taken=t.owner&&t.owner!==NET.myId;
    return `<div class="tok ${mine?"sel":""}" data-claim="${t.id}" style="${taken?"opacity:.45":""}">
      <span class="dot" style="background:${t.color}">${esc(t.letter)}</span>
      <span class="nm">${esc(t.name)}</span>
      <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.1em;color:${mine?"var(--brass)":"var(--vellum-dim)"}">${mine?"YOURS":taken?"TAKEN":"CLAIM"}</span>
    </div>`;}).join("")+`</div></div>`;
  const mine=S().tokens.find(t=>t.id===NET.myToken);
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
  p.querySelectorAll("[data-claim]").forEach(el=>{
    el.onclick=()=>{
      const id=+el.dataset.claim;
      const t=S().tokens.find(t=>t.id===id);
      if(!t||(t.owner&&t.owner!==NET.myId))return;
      NET.myToken=id; cliWantTok=id;
      clientSend({type:"claim",id});
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
    const shSave=$("sh-save"); if(shSave) shSave.onclick=()=>{
      const s2=readSheetForm();
      mine.sheet=s2;                                   // optimistic; host confirms via sync
      clientSend({type:"sheet",id:mine.id,sheet:s2});
      rollsFloatOpen=true; setDrawer(false);            // sheet just got filled in — surface the roll buttons
      renderPanel();
    };
    const shImp=$("sh-import"); if(shImp) shImp.onclick=()=>$("file-sheet").click();
  }
}

Object.assign(App.services.panel,{renderPanel,renderEditorPanel,renderClientPanel});

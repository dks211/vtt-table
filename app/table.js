"use strict";
/* ---------------- map pings ---------------- */
const PINGS=[]; // {x,y,scene,color,stamp,t0} — world coords of the active scene
function addPing(p){PINGS.push({...p,t0:performance.now()});if(PINGS.length>12)PINGS.shift();}
function spawnPing(wx,wy){
  const p={x:wx,y:wy,scene:App.session.scene,
    color:NET.mode==="client"?"#7FA8B8":"#C8A14E",
    stamp:Math.random().toString(36).slice(2)};
  addPing(p);
  if(NET.mode==="host") netBroadcast({type:"ping",x:p.x,y:p.y,color:p.color,stamp:p.stamp});
  else if(NET.mode==="client") clientSend({type:"ping",x:p.x,y:p.y,stamp:p.stamp});
}
function drawPatrolPath(){ // DM-only: dashed loop for the selected token's patrol
  if(RVIEW!=="dm" || NET.mode==="client") return;
  const t=S().tokens.find(t=>t.id===App.session.selToken);
  if(!t || !t.patrol || !t.patrol.length) return;
  const pts=t.patrol.map(([a,b])=> App.session.scene==="verso" ? levelWorldFromTile(a,b) : [a,b]);
  const c=cam();
  ctx.save();
  ctx.strokeStyle="#7FA8B8"; ctx.lineWidth=2/c.s; ctx.setLineDash([8/c.s,6/c.s]);
  ctx.beginPath();
  pts.forEach(([x,y],i)=> i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  if(pts.length>2) ctx.closePath();
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle="#7FA8B8";
  pts.forEach(([x,y],i)=>{
    ctx.globalAlpha = i===((t.pi||0)%pts.length) ? 1 : .5;
    ctx.beginPath(); ctx.arc(x,y,4.5/c.s,0,7); ctx.fill();
  });
  ctx.restore();
}
function drawPings(){ // called inside each scene's world transform
  const now=performance.now(), c=cam();
  for(let i=PINGS.length-1;i>=0;i--){
    const p=PINGS[i], age=(now-p.t0)/1400;
    if(age>1){PINGS.splice(i,1);continue;}
    if(p.scene!==App.session.scene) continue;
    if(RVIEW!=="dm"&&p.scene==="verso"){
      const [tileI,tileJ]=levelTileFromWorld(p.x,p.y),room=roomAtTile(tileI,tileJ);
      if(!room||!App.session.verso.revealed[room.id])continue;
    }
    ctx.save();
    ctx.strokeStyle=p.color; ctx.lineWidth=3/c.s; ctx.globalAlpha=(1-age)*.9;
    ctx.beginPath(); ctx.arc(p.x,p.y,(10+age*70)/c.s,0,7); ctx.stroke();
    ctx.globalAlpha=(1-age)*.5;
    ctx.beginPath(); ctx.arc(p.x,p.y,(4+age*34)/c.s,0,7); ctx.stroke();
    ctx.restore();
  }
}

/* ---------------- dice ---------------- */
const SKILL_ABIL={"Acrobatics":"dex","Animal Handling":"wis","Arcana":"int","Athletics":"str",
  "Deception":"cha","History":"int","Insight":"wis","Intimidation":"cha","Investigation":"int",
  "Medicine":"wis","Nature":"int","Perception":"wis","Performance":"cha","Persuasion":"cha",
  "Religion":"int","Sleight of Hand":"dex","Stealth":"dex","Survival":"wis"};
function initOf(sh){return sh.init==null ? (sh.abil.dex||0) : sh.init;} // blank init = DEX (5e default)
function skillBonus(sh,name){
  if(sh.skills && name in sh.skills) return sh.skills[name];
  const sv=/^(\w{3}) save$/i.exec(name);
  if(sv) return sh.abil[sv[1].toLowerCase()]||0;
  const ab=SKILL_ABIL[name];
  return ab ? (sh.abil[ab]||0) : 0;
}
/* ---------------- gsheet character import ----------------
   Reads the CSV export of the popular "v2.1" 5e Google Sheet template.
   Label-anchored, so it tolerates the row drift between characters. */
function parseCSV(text){
  const rows=[[]]; let cell="", q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){
      if(ch==='"'){ if(text[i+1]==='"'){cell+='"';i++;} else q=false; }
      else cell+=ch;
    }else if(ch==='"') q=true;
    else if(ch===","){rows[rows.length-1].push(cell);cell="";}
    else if(ch==="\n"){rows[rows.length-1].push(cell);cell="";rows.push([]);}
    else if(ch!=="\r") cell+=ch;
  }
  rows[rows.length-1].push(cell);
  return rows;
}
function importGSheetCSV(text){
  const rows=parseCSV(text);
  const cell=(r,c)=>((rows[r]||[])[c]||"").trim();
  const isNum=v=>/^[+-]?\d+$/.test(v);
  const find=label=>{
    for(let r=0;r<rows.length;r++) for(let c=0;c<(rows[r]||[]).length;c++)
      if(cell(r,c)===label) return [r,c];
    return null;
  };
  const out={abil:{},skills:{},atks:[]};
  let hits=0, p;
  if((p=find("CLASS(ES) & LEVEL(S)"))){out.name=cell(p[0],2); hits++;}
  if((p=find("PROFICIENCY BONUS"))){
    for(let c=0;c<p[1];c++) if(isNum(cell(p[0],c))){out.prof=+cell(p[0],c);hits++;break;}
  }
  if((p=find("INIT")) && isNum(cell(p[0]-2,p[1]))){out.init=+cell(p[0]-2,p[1]);hits++;}
  if((p=find("AC")) && isNum(cell(p[0]-2,p[1]))){out.ac=+cell(p[0]-2,p[1]);hits++;}
  if((p=find("Hit Point Max")) && isNum(cell(p[0],p[1]+3))){out.hpMax=+cell(p[0],p[1]+3);hits++;}
  if((p=find("CURRENT HIT POINTS"))){
    const v=cell(p[0]+2,p[1]);
    // sheets commonly leave this cell at 0 for an undamaged character (relying on
    // a formula elsewhere) — importing that literally would show a fresh PC as dying,
    // so only trust it when it's a positive number; otherwise fall back to max HP
    if(isNum(v) && +v>0){out.hp=+v;hits++;}
  }
  if((p=find("ABILITY"))){
    // the SPELLCASTING block's ability name (e.g. "Wisdom") sits 2 rows above its
    // own label, same as INIT/AC — attack bonus & save DC are derived from this,
    // not imported directly, so they stay correct if prof/mods change later
    const SPELL_ABIL={Strength:"str",Dexterity:"dex",Constitution:"con",Intelligence:"int",Wisdom:"wis",Charisma:"cha"};
    const full=cell(p[0]-2,p[1]);
    if(SPELL_ABIL[full]){out.spellAbil=SPELL_ABIL[full]; hits++;}
  }
  for(const ab of ["STR","DEX","CON","INT","WIS","CHA"]){
    for(let r=0;r<rows.length;r++){
      if(cell(r,2)!==ab) continue;
      for(let rr=r+1;rr<=r+3;rr++) if(isNum(cell(rr,2))){out.abil[ab.toLowerCase()]=+cell(rr,2);hits++;break;}
      break;
    }
  }
  const SAVES={Strength:"STR",Dexterity:"DEX",Constitution:"CON",Intelligence:"INT",Wisdom:"WIS",Charisma:"CHA"};
  for(let r=0;r<rows.length;r++){
    const n=cell(r,9), b=cell(r,8);
    if(!isNum(b)) continue;
    if(n in SKILL_ABIL){out.skills[n]=+b;hits++;}
    else if(n in SAVES) out.skills[SAVES[n]+" save"]=+b;
  }
  if((p=find("ATK BONUS"))){
    const [r0,cAtk]=p;
    const row0=rows[r0]||[];
    const cName=row0.findIndex(v=>v.trim()==="NAME"), cDmg=row0.findIndex(v=>v.trim()==="DAMAGE/TYPE");
    const near=(r,c0,test)=>{
      for(let c=c0-1;c<=c0+1;c++){const v=cell(r,c); if(v&&test(v)) return v;}
      return null;
    };
    for(let r=r0+1;r<=r0+8 && cName>=0;r++){
      const name=near(r,cName,v=>v!=="-");
      const atk=near(r,cAtk,isNum);
      const dmgraw=near(r,cDmg,v=>/\d*d\d+/.test(v));
      if(!name||!atk||!dmgraw) continue;
      const m=/(\d*)d(\d+)\s*\+?\s*(-?\d+)?/.exec(dmgraw);
      out.atks.push({name:name.slice(0,24), hit:+atk,
        dmg:(m[1]||"1")+"d"+m[2]+(m[3]?((+m[3]>=0?"+":"")+m[3]):"")});
      hits++;
    }
  }
  return hits>=6 ? out : null;   // too few anchors = not this template
}
function fillSheetForm(s){ // populate the open form for review; user still hits SAVE
  const sign=v=>(v>=0?"+":"")+v;
  if("prof" in s) $("sh-prof").value=s.prof;
  if("init" in s) $("sh-init").value=s.init;
  if("ac" in s) $("sh-ac").value=s.ac;
  if("hpMax" in s) $("sh-hpmax").value=s.hpMax;
  if("hp" in s) $("sh-hp").value=s.hp;
  if("spellAbil" in s) $("sh-spellabil").value=s.spellAbil||"";
  for(const k of ["str","dex","con","int","wis","cha"]) if(k in s.abil) $("sh-"+k).value=s.abil[k];
  if(s.atks.length) $("sh-atks").value=s.atks.map(a=>a.name+" "+sign(a.hit)+" "+a.dmg).join("\n");
  const sk=Object.entries(s.skills);
  if(sk.length) $("sh-skills").value=sk.map(([k,v])=>k+" "+sign(v)).join("\n");
}
$("file-sheet").onchange=e=>{
  const f=e.target.files[0]; e.target.value="";
  if(!f || !$("sh-prof")) return;
  const rd=new FileReader();
  rd.onload=()=>{
    const s=importGSheetCSV(rd.result);
    if(!s){alert("Couldn't find the character data — export the sheet's main tab as CSV (File → Download → .csv) and try again.");return;}
    fillSheetForm(s);
  };
  rd.readAsText(f);
};
let diceLog=[], diceN=1, diceMod=0, bannerTimer=null, dmHidden=false;
function roll(d,n,mod,who,label){
  n=Math.max(1,Math.min(10,n|0)); mod=mod|0;
  let results=[],mode=null;
  if(d==="adv"||d==="dis"){
    mode=d; d=20;
    const a=1+Math.floor(Math.random()*20), b=1+Math.floor(Math.random()*20);
    results=[a,b];
    var kept = mode==="adv" ? Math.max(a,b) : Math.min(a,b);
    var total = kept+mod;
  }else{
    for(let k=0;k<n;k++) results.push(1+Math.floor(Math.random()*d));
    var kept=null;
    var total=results.reduce((a,b)=>a+b,0)+mod;
  }
  const hush = who==="dm" && dmHidden;   // hidden DM roll: log only, no banners, nothing broadcast
  const entry={d,n:mode?2:n,mod,results,kept,mode,total,who,label:label||null,hush,at:Date.now()};
  diceLog.unshift(entry); diceLog=diceLog.slice(0,10);
  if(!hush){
    NET.lastDice=Object.assign(fmtRoll(entry),{stamp:++NET.diceStamp});
    netMark();
  }
  renderPanel();
  if(!hush){
    pushRollBanner(entry);
    if(NET.mode!=="client") clientBanner(NET.lastDice);
  }
  return entry;
}
function fmtRoll(e){
  const die=(e.mode? "d20 "+e.mode.toUpperCase() : e.n+"d"+e.d);
  const mod=e.mod? (e.mod>0?" +"+e.mod:" "+e.mod) : "";
  return {head:(e.label? e.label+" · " : "")+die+mod, total:e.total,
    detail:"["+e.results.join(", ")+"]"+(e.kept!=null?" → keep "+e.kept:"")+(e.mod?" "+(e.mod>0?"+":"")+e.mod:"")};
}
function pwinBanner(f,cls){
  if(!pwin || pwin.closed) return;
  try{
    const d=pwin.document, b=d.getElementById("dice-banner");
    if(!b) return;
    setBannerContent(d,b,f,cls);
    b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
    if(bannerTimer) clearTimeout(bannerTimer);
    bannerTimer=setTimeout(()=>{try{b.classList.remove("show");}catch(_){}} ,5200);
  }catch(_){/* window mid-close */}
}
function pushRollBanner(e){
  const crit = (e.d===20 && (e.kept!=null?e.kept:e.results[0]))===20 && e.n<=2;
  const fumble=(e.d===20 && (e.kept!=null?e.kept:e.results[0]))===1 && e.n<=2;
  pwinBanner(fmtRoll(e), crit?' crit':fumble?' fumble':'');
}

/* ---------------- player window (second screen) ---------------- */
let pwin=null, pcv=null, pctx=null, pwinFocus=null;
function openPlayerWindow(){
  if(pwin && !pwin.closed){ pwin.focus(); return; }
  pwin=window.open("","versoPlayer","width=1280,height=800");
  if(!pwin){
    alert("Popup blocked. Allow popups for this page (or run the file directly in your browser), then click PLAYER WINDOW again.");
    return;
  }
  const d=pwin.document;
  d.open();
  d.write('<!DOCTYPE html><html><head><title>Player View</title>'+
    '<link href="https://fonts.googleapis.com/css2?family=Marcellus&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">'+
    '<style>html,body{margin:0;height:100%;background:#0A0F0C;overflow:hidden}'+
    'canvas{display:block;width:100vw;height:100vh;cursor:none}'+
    '#dice-banner{position:fixed;top:7vh;left:50%;transform:translateX(-50%) scale(.7);opacity:0;'+
      'pointer-events:none;text-align:center;transition:opacity .25s,transform .25s;'+
      'text-shadow:0 2px 14px rgba(0,0,0,.9)}'+
    '#dice-banner.show{opacity:1;transform:translateX(-50%) scale(1)}'+
    '.rb-head{font-family:"IBM Plex Mono",monospace;font-size:15px;letter-spacing:.25em;color:#ABA38C}'+
    '.rb-total{font-family:Marcellus,serif;font-size:110px;line-height:1.05;color:#E9E2CE}'+
    '.rb-total.crit{color:#C8A14E}.rb-total.fumble{color:#8A2E25}'+
    '.rb-detail{font-family:"IBM Plex Mono",monospace;font-size:13px;color:#7FA8B8;letter-spacing:.08em}'+
    '#dice-tray{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:7px;'+
      'padding:8px 10px;background:rgba(14,20,17,.88);border:1px solid #5A4A28;border-radius:6px}'+
    '#dice-tray button{font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:.06em;'+
      'color:#C8A14E;background:none;border:1px solid #5A4A28;border-radius:4px;padding:7px 11px;cursor:pointer}'+
    '#dice-tray button:hover{background:#C8A14E;color:#070908}'+
    '</style></head><body>'+
    '<canvas id="c"></canvas><div id="dice-banner"></div>'+
    '<div id="dice-tray">'+
      ["d4","d6","d8","d10","d12","d20","d100"].map(x=>'<button data-d="'+x.slice(1)+'">'+x+'</button>').join('')+
      '<button data-d="adv">ADV</button><button data-d="dis">DIS</button>'+
    '</div></body></html>');
  d.close();
  pcv=d.getElementById("c");
  pctx=pcv.getContext("2d");
  pwinFocus=cameraFocusFromViewport(cam(),W,H,App.session.scene,App.session.verso.view);
  d.querySelectorAll("#dice-tray button").forEach(b=>{
    b.onclick=()=>{
      const v=b.dataset.d;
      roll(v==="adv"||v==="dis"?v:+v,1,0,"players");
    };
  });
  $("btn-pwin").textContent="PLAYER WINDOW · LIVE";
  const watch=setInterval(()=>{
    if(!pwin||pwin.closed){clearInterval(watch);pwin=null;pcv=null;pctx=null;pwinFocus=null;
      const b=$("btn-pwin"); if(b) b.textContent="PLAYER WINDOW ↗";}
  },800);
}
$("btn-pwin").onclick=openPlayerWindow;

function renderPlayerWindow(){
  if(!pwin || pwin.closed || !pctx) return;
  let pW,pH,pd;
  try{ pW=pwin.innerWidth; pH=pwin.innerHeight; pd=Math.min(pwin.devicePixelRatio||1,2); }
  catch(e){ return; }
  if(!pW||!pH) return;
  if(pcv.width!==Math.round(pW*pd)||pcv.height!==Math.round(pH*pd)){
    pcv.width=Math.round(pW*pd); pcv.height=Math.round(pH*pd);
  }
  pctx.setTransform(pd,0,0,pd,0,0);
  if(!pwinFocus||pwinFocus.scene!==App.session.scene||pwinFocus.levelView!==App.session.verso.view)
    pwinFocus=cameraFocusFromViewport(cam(),W,H,App.session.scene,App.session.verso.view);
  CAMOVR=cameraFromFocus(pwinFocus,pW,pH);
  const oc=ctx,oW=W,oH=H,ov=RVIEW;
  ctx=pctx; W=pW; H=pH; RVIEW="pl";
  ctx.clearRect(0,0,pW,pH);
  if(App.session.scene==="map") drawMap(); else if(tacticalView())drawTactical();else drawVerso();
  drawRuler();
  drawMoveGuide();
  ctx=oc; W=oW; H=oH; RVIEW=ov; CAMOVR=null;
}

function focusPlayerViews(){
  const focus=cameraFocusFromViewport(cam(),W,H,App.session.scene,App.session.verso.view);
  pwinFocus=focus;
  focusRemotePlayers(focus);
  const b=$("btn-focus");
  b.textContent="PLAYERS FOCUSED";
  setTimeout(()=>{if(b)b.textContent="FOCUS PLAYERS";},1200);
}
$("btn-focus").onclick=focusPlayerViews;

/* ---------------- main loop ---------------- */
function frame(t){
  tNow=t;
  RVIEW=App.session.view; CAMOVR=null;
  ctx.clearRect(0,0,W,H);
  if(App.session.mode==="edit"){
    drawEditor();
    renderEditorPreview();
  }else{
    if(App.session.scene==="map") drawMap(); else if(tacticalView())drawTactical();else drawVerso();
    drawRuler();
    drawMoveGuide();
  }
  renderPlayerWindow();
  requestAnimationFrame(frame);
}

/* ---------------- input ---------------- */
let pointers=new Map(), panRef=null, dragTok=null, pinchRef=null, spaceDown=false, downAt=null, fogPainting=false, lastTap=null, patrolRec=null;
let dragOrigin=null, tacticalEffectType=null, tacticalEffectSize=1;

function tokenAt(sx,sy){
  const [wx,wy]=toWorld(sx,sy);
  if(App.session.scene==="map"){
    const g=App.session.map.grid.size;
    for(let k=App.session.map.tokens.length-1;k>=0;k--){
      const t=App.session.map.tokens[k];
      if(Math.hypot(wx-t.x,wy-t.y)<=g*.45*t.size) return t;
    }
  }else{
    const [i,j]=levelTileFromWorld(wx,wy);
    // a player can only ever move their own claimed token — if it's anywhere under
    // the tap, grab it outright rather than losing to whatever else is on that tile
    if(NET.mode==="client" && NET.myToken!=null){
      const mine=App.session.verso.tokens.find(t=>t.id===NET.myToken);
      if(mine && Math.hypot(i-mine.x,j-mine.y)<.75*mine.size) return mine;
    }
    // otherwise prefer whichever token is drawn on top, so an exact tile-stack
    // (e.g. an NPC standing where a PC snapped to) resolves to what's visible
    const byTop=orderedLevelTokens(App.session.verso.tokens,tacticalView()).reverse();
    let best=null;
    for(const t of byTop){
      const d=Math.hypot(i-t.x,j-t.y);
      if(d<.75*t.size){best=t;break;}
    }
    return best;
  }
  return null;
}
function paintFog(sx,sy){
  const m=App.session.map; if(!m.img||!m.fog) return;
  const [wx,wy]=toWorld(sx,sy);
  const fctx=m.fog.getContext("2d");
  fctx.save();
  fctx.globalCompositeOperation = App.session.tool==="fogr" ? "destination-out" : "source-over";
  fctx.fillStyle="#04130C";
  fctx.beginPath(); fctx.arc(wx,wy,m.brush,0,7); fctx.fill();
  fctx.restore();
  markDirty(); netMarkFog();
}

cv.addEventListener("pointerdown",e=>{
  try{cv.setPointerCapture(e.pointerId);}catch(_){/* pointer already gone */}
  pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(pointers.size===2){
    const [a,b]=[...pointers.values()];
    pinchRef={d:Math.hypot(a.x-b.x,a.y-b.y)};
    dragTok=null; panRef=null; edDraft=null; edDrag=null; return;
  }
  if(App.session.mode==="edit"){edDown(e);return;}
  if(tacticalView()&&tacticalEffectType&&NET.mode!=="client"&&e.button===0){
    const [wx,wy]=toWorld(e.offsetX,e.offsetY),[i,j]=levelTileFromWorld(wx,wy);
    App.session.verso.effects.push({id:"effect-"+Date.now().toString(36),terrain:tacticalEffectType,
      x:Math.floor(i),y:Math.floor(j),w:tacticalEffectSize,h:tacticalEffectSize,shape:"rect",
      label:"Temporary "+tacticalEffectType});
    tacticalEffectType=null;markDirty();renderPanel();return;
  }
  // patrol recording: DM clicks drop waypoints for the selected token
  if(patrolRec!=null && NET.mode!=="client" && e.button===0 && !spaceDown){
    const t=S().tokens.find(t=>t.id===patrolRec);
    if(t){
      const [pwx,pwy]=toWorld(e.offsetX,e.offsetY);
      let pt;
      if(App.session.scene==="verso"){
        const [i,j]=levelTileFromWorld(pwx,pwy);
        pt=shouldSnapLevelToken(App.document.rooms,i,j,tacticalView())?[Math.floor(i)+.5,Math.floor(j)+.5]:[i,j];
      }else{
        pt=[pwx,pwy];
        const g=App.session.map.grid;
        if(g.snap&&g.show) pt=[Math.floor((pwx-g.ox)/g.size)*g.size+g.ox+g.size/2,
                               Math.floor((pwy-g.oy)/g.size)*g.size+g.oy+g.size/2];
      }
      t.patrol=t.patrol||[];
      t.patrol.push(pt);
      markDirty(); renderPanel();
    }
    return;
  }
  // double-tap / double-click pings the spot for everyone at the table
  if(e.button===0 && !spaceDown){
    const now=performance.now();
    if(lastTap && now-lastTap.t<400 && Math.hypot(e.offsetX-lastTap.x,e.offsetY-lastTap.y)<24){
      const [pwx,pwy]=toWorld(e.offsetX,e.offsetY);
      spawnPing(pwx,pwy);
      lastTap=null;
      downAt=null;
      return;   // the second tap pings; don't also grab a token or start a pan
    }else lastTap={t:now,x:e.offsetX,y:e.offsetY};
  }
  downAt={x:e.offsetX,y:e.offsetY,moved:false};
  if(NET.mode==="client"){
    if(e.button===2){downAt=null;return;}
    const wantPanC = spaceDown || e.button===1;
    if(!wantPanC && App.session.tool!=="ruler"){
      const t=tokenAt(e.offsetX,e.offsetY);
      if(t && t.id===NET.myToken){
        dragTok=t; clientDragging=true;
        cliOX=t.x; cliOY=t.y;
        dragOrigin={x:t.x,y:t.y,pc:!!t.pc};moveGuide={token:dragOrigin,x:t.x,y:t.y};
        App.session.selToken=t.id; return;
      }
    }
    if(App.session.tool==="ruler" && !wantPanC){
      const [wx,wy]=toWorld(e.offsetX,e.offsetY);
      ruler={x1:wx,y1:wy,x2:wx,y2:wy}; return;
    }
    panRef={x:e.offsetX,y:e.offsetY,cx:cam().x,cy:cam().y};
    return;
  }
  if(e.button===2){           // right-click a token: delete it
    const t=tokenAt(e.offsetX,e.offsetY);
    if(t && confirm('Remove token "'+t.name+'"?')){
      const arr=S().tokens, i=arr.indexOf(t);
      if(i>=0) arr.splice(i,1);
      if(App.session.selToken===t.id) App.session.selToken=null;
      markDirty(); renderPanel(); downAt=null; return;
    }
  }
  const wantPan = spaceDown || e.button===1 || e.button===2;
  if(App.session.tool==="ruler" && !wantPan){
    const [wx,wy]=toWorld(e.offsetX,e.offsetY);
    ruler={x1:wx,y1:wy,x2:wx,y2:wy};
    return;
  }
  if((App.session.tool==="fogr"||App.session.tool==="fogh") && App.session.scene==="map" && !wantPan){
    fogPainting=true; paintFog(e.offsetX,e.offsetY); return;
  }
  if(!wantPan){
    const t=tokenAt(e.offsetX,e.offsetY);
    if(t){dragTok=t;dragOrigin={x:t.x,y:t.y,pc:!!t.pc};moveGuide={token:dragOrigin,x:t.x,y:t.y};App.session.selToken=t.id;renderPanel();return;}
  }
  panRef={x:e.offsetX,y:e.offsetY,cx:cam().x,cy:cam().y};
});
cv.addEventListener("pointermove",e=>{
  const p=pointers.get(e.pointerId);
  if(p){p.x=e.offsetX;p.y=e.offsetY;}
  // status coords
  const [wx,wy]=toWorld(e.offsetX,e.offsetY);
  if(App.session.mode==="edit"){
    /* edMove writes the tile readout */
  }else if(App.session.scene==="verso"){
    const [i,j]=levelTileFromWorld(wx,wy);
    $("st-pos").textContent=`tile ${i.toFixed(1)}, ${j.toFixed(1)}`;
    setPropHover(i,j);
  }else{
    $("st-pos").textContent=`${wx.toFixed(0)}, ${wy.toFixed(0)} px`;
  }
  if(pinchRef && pointers.size===2){
    const [a,b]=[...pointers.values()];
    const d=Math.hypot(a.x-b.x,a.y-b.y);
    const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    if(pinchRef.d>0) zoomAt(mx,my,d/pinchRef.d);
    pinchRef.d=d; updZoom(); return;
  }
  if(App.session.mode==="edit"){edMove(e);return;}
  if(downAt && Math.hypot(e.offsetX-downAt.x,e.offsetY-downAt.y)>4) downAt.moved=true;
  if(ruler && App.session.tool==="ruler" && e.buttons){
    const [rx,ry]=toWorld(e.offsetX,e.offsetY);
    ruler.x2=rx; ruler.y2=ry; return;
  }
  if(fogPainting && e.buttons){paintFog(e.offsetX,e.offsetY);return;}
  if(dragTok && e.buttons){
    if(App.session.scene==="map"){dragTok.x=wx;dragTok.y=wy;}
    else{const [i,j]=levelTileFromWorld(wx,wy);dragTok.x=i;dragTok.y=j;}
    if(moveGuide){moveGuide.x=dragTok.x;moveGuide.y=dragTok.y;}
    markDirty(); return;
  }
  if(panRef && e.buttons){
    const c=cam();
    c.x=panRef.cx-(e.offsetX-panRef.x)/c.s;
    c.y=panRef.cy-(e.offsetY-panRef.y)/c.s;
  }
});
cv.addEventListener("pointerup",e=>{
  pointers.delete(e.pointerId);
  if(pointers.size<2) pinchRef=null;
  if(App.session.mode==="edit"){edUp();return;}
  if(ruler && App.session.tool==="ruler"){ setTimeout(()=>{ruler=null;},900); }
  if(dragTok && NET.mode==="client"){
    if(App.session.scene==="map" && App.session.map.grid.snap && App.session.map.grid.show){
      const g=App.session.map.grid.size;
      dragTok.x=Math.floor((dragTok.x-App.session.map.grid.ox)/g)*g+App.session.map.grid.ox+g/2;
      dragTok.y=Math.floor((dragTok.y-App.session.map.grid.oy)/g)*g+App.session.map.grid.oy+g/2;
    }else if(App.session.scene==="verso"&&shouldSnapLevelToken(App.document.rooms,dragTok.x,dragTok.y,tacticalView())){
      dragTok.x=Math.floor(dragTok.x)+.5;
      dragTok.y=Math.floor(dragTok.y)+.5;
    }
    if(moveAllowed(dragTok.x,dragTok.y,{...dragTok,x:cliOX,y:cliOY})){
      clientSend({type:"move",id:dragTok.id,x:dragTok.x,y:dragTok.y});
    }else{
      dragTok.x=cliOX; dragTok.y=cliOY;               // snap back: room not revealed / fogged
      $("st-hint").textContent="Movement blocked by a wall, closed door, hidden room, or full-cover object";
    }
    clientDragging=false;dragTok=null;dragOrigin=null;moveGuide=null;panRef=null;fogPainting=false;downAt=null;
    return;
  }
  if(dragTok){
    // snap
    if(App.session.scene==="map" && App.session.map.grid.snap && App.session.map.grid.show){
      const g=App.session.map.grid.size;
      dragTok.x=Math.floor((dragTok.x-App.session.map.grid.ox)/g)*g+App.session.map.grid.ox+g/2;
      dragTok.y=Math.floor((dragTok.y-App.session.map.grid.oy)/g)*g+App.session.map.grid.oy+g/2;
    }else if(App.session.scene==="verso"&&shouldSnapLevelToken(App.document.rooms,dragTok.x,dragTok.y,tacticalView())){
      dragTok.x=Math.floor(dragTok.x)+.5;
      dragTok.y=Math.floor(dragTok.y)+.5;
    }
    revealRoomOnPcEntry(dragTok,dragTok.x,dragTok.y);
    markDirty();
  }
  // click (no drag): select room in verso
  if(downAt && !downAt.moved && !dragTok && App.session.scene==="verso" && App.session.tool==="select"){
    const [wx,wy]=toWorld(e.offsetX,e.offsetY);
    const [i,j]=levelTileFromWorld(wx,wy);
    const door=doorAtTile(i,j);
    if(door){
      App.session.verso.doorStates[door.id]=!doorIsOpen(door,App.session.verso.doorStates);
      markDirty();renderPanel();dragTok=null;dragOrigin=null;moveGuide=null;panRef=null;downAt=null;return;
    }
    const r=roomAtTile(i,j);
    App.session.selRoom = r ? r.id : null;
    renderPanel();
  }
  if(downAt && !downAt.moved && !dragTok && App.session.scene==="map" && App.session.tool==="select"){
    App.session.selToken=null; renderPanel();
  }
  dragTok=null;dragOrigin=null;moveGuide=null;panRef=null;fogPainting=false;downAt=null;
});
cv.addEventListener("pointercancel",e=>{
  // iOS fires this when Safari takes over a gesture; without cleanup a stale
  // pointer stays in the map and every later touch reads as a two-finger pinch
  pointers.delete(e.pointerId);
  if(pointers.size<2) pinchRef=null;
  clientDragging=false;dragTok=null;dragOrigin=null;moveGuide=null;panRef=null;fogPainting=false;downAt=null;
  edDraft=null; edDrag=null;
});
cv.addEventListener("pointerleave",()=>setPropHover(NaN,NaN));
cv.addEventListener("wheel",e=>{
  e.preventDefault();
  const dm=e.deltaMode===1?33:e.deltaMode===2?H:1;   // lines/pages -> px
  if(e.ctrlKey||e.metaKey){
    // trackpad pinch (macOS reports it as ctrl+wheel) & ctrl/cmd+scroll:
    // zoom proportional to the gesture instead of fixed 12% steps
    zoomAt(e.offsetX,e.offsetY,Math.exp(-e.deltaY*dm*.0018));
    updZoom(); return;
  }
  if(App.session.mode==="edit"){
    // editor: two-finger scroll pans, so DRAW mode never needs a tool switch
    const c=cam();
    c.x+=e.deltaX*dm/c.s; c.y+=e.deltaY*dm/c.s;
    return;
  }
  zoomAt(e.offsetX,e.offsetY,Math.exp(-e.deltaY*dm*.0018));
  updZoom();
},{passive:false});
cv.addEventListener("contextmenu",e=>e.preventDefault());
/* iOS Safari ignores user-scalable=no and pinch-zooms the page itself;
   swallow the native gesture so the canvas pinch handler gets the touches */
for(const ev of ["gesturestart","gesturechange","gestureend"])
  document.addEventListener(ev,e=>e.preventDefault(),{passive:false});
/* macOS Safari trackpad pinch arrives ONLY as gesture events (no ctrl+wheel) —
   apply it to the canvas; skipped when a real two-finger touch pinch is active */
let gestRef=null;
cv.addEventListener("gesturestart",e=>{e.preventDefault();gestRef={s:e.scale||1};});
cv.addEventListener("gesturechange",e=>{
  e.preventDefault();
  if(!gestRef || pointers.size>=2) return;
  const r=cv.getBoundingClientRect();
  zoomAt(e.clientX-r.left,e.clientY-r.top,(e.scale||1)/gestRef.s);
  gestRef.s=e.scale||1; updZoom();
});
cv.addEventListener("gestureend",e=>{e.preventDefault();gestRef=null;});

addEventListener("keydown",e=>{
  if(e.target.tagName==="INPUT"||e.target.tagName==="SELECT"||e.target.tagName==="TEXTAREA") return;
  if(e.code==="Space"){spaceDown=true;cv.style.cursor="grabbing";e.preventDefault();}
  const k=e.key.toLowerCase();
  if(e.key==="Escape"&&tacticalEffectType){tacticalEffectType=null;$("st-hint").textContent="Temporary effect placement cancelled";return;}
  if(App.session.mode==="edit"){
    if((e.metaKey||e.ctrlKey) && k==="z"){e.shiftKey?edRedoPop():edUndoPop();e.preventDefault();return;}
    if((e.metaKey||e.ctrlKey) && k==="y"){edRedoPop();e.preventDefault();return;}
    if((e.metaKey||e.ctrlKey) && k==="c"){copySelection();e.preventDefault();return;}
    if((e.metaKey||e.ctrlKey) && k==="v"){pasteSelection();e.preventDefault();return;}
    if((e.metaKey||e.ctrlKey) && k==="d"){duplicateSelection();e.preventDefault();return;}
    if(k==="delete"||k==="backspace"){if(!deleteSelectedProp()&&!deleteSelectedStair())deleteSelection();e.preventDefault();return;}
    if(e.key==="Escape"){edStairSel=null;setEdSelection([]);renderPanel();}
    if(e.key.startsWith("Arrow")){const step=e.shiftKey?5:1;nudgeSelection(e.key==="ArrowLeft"?-step:e.key==="ArrowRight"?step:0,e.key==="ArrowUp"?-step:e.key==="ArrowDown"?step:0);e.preventDefault();return;}
    if(k==="f") edFit();
    if(k==="d") edSetTool("draw");
    if(k==="v") edSetTool("select");
    if(k==="o") edSetTool("door");
    if(k==="p") edSetTool("prop");
    if(k==="s") edSetTool("stair");
    return;
  }
  if(k==="v") setTool("select");
  if(k==="m") setTool("ruler");
  if(k==="r" && App.session.scene==="map") setTool("fogr");
  if(k==="h" && App.session.scene==="map") setTool("fogh");
  if(k==="f") fitScene();
  if(k==="b" && App.session.scene==="verso" && NET.mode!=="client")setLevelView(tacticalView()?"isometric":"tactical",App.document.rooms.find(r=>r.id===App.session.selRoom));
  if(k==="g" && App.session.scene==="map"){App.session.map.grid.show=!App.session.map.grid.show;renderPanel();}
  if((k==="delete"||k==="backspace") && App.session.selToken!=null){
    const arr=S().tokens; const i=arr.findIndex(t=>t.id===App.session.selToken);
    if(i>=0){arr.splice(i,1);App.session.selToken=null;renderPanel();markDirty();}
  }
});
addEventListener("keyup",e=>{
  if(e.code==="Space"){spaceDown=false;cv.style.cursor="grab";}
});

function updZoom(){$("st-zoom").textContent=Math.round(cam().s*100)+"%";}

Object.assign(App.services.table,{frame,roll,openPlayerWindow,focusPlayerViews,updZoom});

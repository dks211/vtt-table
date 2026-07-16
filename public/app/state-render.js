"use strict";
const {LEVEL_SCHEMA_VERSION, SESSION_SCHEMA_VERSION, escapeHTML:esc, parseDice, sanitizeSheet, spellAtkBonus, spellSaveDC, sanitizeLevelForClient, setBannerContent, normalizeLevel, normalizeSession}=App.core;
/* =====================================================================
   PALIMPSEST VTT — state and isometric rendering
   Scenes: "map" (uploaded image, square grid, fog of war)
           "verso" (built-in isometric Back of House)
   ===================================================================== */

const {VERSO_LEVEL,VERSO_START,DEFAULT_ROSTER:PARTY,SWATCHES:SWATCH,ROOM_TEMPLATES:TEMPLATES,PROP_LIBRARY:PROP_LIB}=App.content;
const $ = id => document.getElementById(id);
const cv = $("cv");
let ctx = cv.getContext("2d");
let RVIEW = "dm";      // view used by the current render pass ("dm" | "pl")
let CAMOVR = null;     // camera override for the player-window render pass
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- iso constants ---------------- */
const TW = 72, TH = 36;                 // iso tile screen size at zoom 1
const ELEV_STEP = 12;
const isoX = (i,j)=> (i-j)*TW/2;
const isoY = (i,j)=> (i+j)*TH/2;
const unIso = (x,y)=> [ (x/(TW/2)+y/(TH/2))/2, (y/(TH/2)-x/(TW/2))/2 ];

/* ---------------- level system ----------------
   App.document.rooms/App.document.doors are the live, editable level; the Verso ships as the built-in
   default. Levels round-trip as JSON via the editor's export/import. */
function levelData(){return {schemaVersion:LEVEL_SCHEMA_VERSION,name:App.document.level.name,bg:App.document.level.bg,rooms:App.document.rooms,doors:App.document.doors,stairs:App.document.stairs,roster:App.document.level.roster,props:App.document.level.props};}
function clientLevelData(){
  // the Token Library can hold NPC sheets (stat blocks) — never ship those to players,
  // even though placed tokens are already sanitized separately in lightSnapshot()
  return sanitizeLevelForClient(levelData());
}
function enforceAlwaysRoomReveal(){
  for(const room of App.document.rooms) if(room.revealMode==="always") App.session.verso.revealed[room.id]=true;
}
function loadLevel(lv){
  const data=normalizeLevel(lv,{fallbackRoster:PARTY});
  App.document.level.schemaVersion=data.schemaVersion;
  App.document.level.name=data.name;
  App.document.level.bg=data.bg;
  App.document.level.roster=data.roster;
  App.document.level.props=data.props;
  App.document.rooms=data.rooms;
  App.document.doors=data.doors;
  App.document.stairs=data.stairs;
  const ids=new Set(App.document.rooms.map(r=>r.id));
  for(const k of Object.keys(App.session.verso.revealed)) if(!ids.has(k)) delete App.session.verso.revealed[k];
  enforceAlwaysRoomReveal();
  if(App.session.selRoom && !ids.has(App.session.selRoom)) App.session.selRoom=null;
  const tab=$("tab-verso"); if(tab) tab.textContent=App.document.level.name.toUpperCase();
  netMarkLevel(); netMark();
  renderPanel();
}

/* ---------------- App.session ---------------- */
let uid = 1;
const mkTok = (name,letter,color,x,y,size=1,pc=false)=>{
  const t={id:uid++,name,letter,color,x,y,size};
  if(pc) t.pc=true;                 // pc = players may see in the claim list & claim
  return t;
};

App.session = {
  view:"dm",
  scene:"verso",
  mode:"play",     // "play" | "edit" (edit = top-down level editor, DM only)
  tool:"select",
  tracker:{order:[],active:0},   // initiative: [{name,total,tok?}]
  selToken:null,
  selRoom:null,
  map:{
    img:null, imgURL:null, name:null,
    grid:{show:true, size:70, ox:0, oy:0, snap:true},
    fog:null, fogOn:true, brush:90,
    tokens:[],
    cam:{x:0,y:0,s:1}
  },
  verso:{
    revealed:{...VERSO_START.revealed},
    tokens:VERSO_START.tokens.map(t=>mkTok(t.name,t.letter,t.color,t.x,t.y,t.size,t.pc)),
    cam:{x:0,y:0,s:1}
  }
};

const S  = ()=> App.session[App.session.scene];
const cam= ()=> CAMOVR || (App.session.mode==="edit" ? edCam : S().cam);

/* ---------------- canvas sizing ---------------- */
let W=0,H=0,DPR=1;
function resize(){
  DPR = Math.min(devicePixelRatio||1,2);
  const r = $("stage").getBoundingClientRect();
  W=r.width; H=r.height;
  cv.width=W*DPR; cv.height=H*DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize",()=>{
  const wasZero=!(W>0&&H>0);
  resize();
  const c=cam();
  if((wasZero||!isFinite(c.s)||c.s<=0) && W>0 && H>0){fitScene();updZoom();} // recover from hidden-tab boot
});
if(window.visualViewport) visualViewport.addEventListener("resize",()=>resize()); // iOS URL-bar collapse / rotation
function setDrawer(open){
  document.body.classList.toggle("panelopen",open);
  $("panel-toggle").textContent=open?"✕ CLOSE":"☰ MENU";
}
$("panel-toggle").onclick=()=>setDrawer(!document.body.classList.contains("panelopen"));
$("fit-float").onclick=()=>{fitScene();updZoom();};
document.querySelectorAll("#dicebar [data-bdie]").forEach(b=>{
  b.onclick=()=>{if(NET.mode==="client")clientSend({type:"roll",die:b.dataset.bdie});};
});

/* ---------------- camera helpers ---------------- */
const toScreen=(wx,wy)=>{const c=cam();return [(wx-c.x)*c.s,(wy-c.y)*c.s];};
const toWorld =(sx,sy)=>{const c=cam();return [sx/c.s+c.x, sy/c.s+c.y];};
function zoomAt(sx,sy,f){
  const c=cam(); const [wx,wy]=toWorld(sx,sy);
  c.s=Math.min(6,Math.max(.12,c.s*f));
  c.x=wx-sx/c.s; c.y=wy-sy/c.s;
}
function fitScene(){
  if(!(W>0&&H>0)) return;   // stage not laid out yet (hidden tab) — a resize will refit
  const c=cam();
  if(App.session.scene==="map"){
    if(!App.session.map.img){c.x=-W/2;c.y=-H/2;c.s=1;return;}
    const iw=App.session.map.img.width, ih=App.session.map.img.height;
    c.s=Math.min(W/iw,H/ih)*.94;
    c.x=-(W/c.s-iw)/2; c.y=-(H/c.s-ih)/2;
  }else{
    // players only see revealed rooms — fit those, not the whole hidden floor plan
    let fitRooms=App.document.rooms;
    if(NET.mode==="client"){
      const rev=App.document.rooms.filter(r=>App.session.verso.revealed[r.id]);
      if(rev.length) fitRooms=rev;
    }
    let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
    for(const r of fitRooms) for(const rc of r.rects){
      const cs=[[rc.x,rc.y],[rc.x+rc.w,rc.y],[rc.x+rc.w,rc.y+rc.h],[rc.x,rc.y+rc.h]];
      for(const [i,j] of cs){minX=Math.min(minX,isoX(i,j));maxX=Math.max(maxX,isoX(i,j));minY=Math.min(minY,isoY(i,j));maxY=Math.max(maxY,isoY(i,j));}
    }
    const fitStairs=(App.document.stairs||[]).filter(stair=>NET.mode!=="client"||stairVisible(stair));
    for(const stair of fitStairs){
      const z=Math.max(stair.from,stair.to)*ELEV_STEP;
      for(const [i,j] of [[stair.x,stair.y],[stair.x+stair.w,stair.y],[stair.x+stair.w,stair.y+stair.h],[stair.x,stair.y+stair.h]]){
        minX=Math.min(minX,isoX(i,j));maxX=Math.max(maxX,isoX(i,j));minY=Math.min(minY,isoY(i,j)-z);maxY=Math.max(maxY,isoY(i,j));
      }
    }
    if(minX===1e9){minX=-TW;maxX=TW;minY=-TH;maxY=TH;}
    const bw=maxX-minX, bh=maxY-minY+70;
    c.s=Math.min(W/bw,H/bh)*.9;
    c.x=minX-(W/c.s-bw)/2; c.y=minY-44-(H/c.s-bh)/2;
  }
}

/* ---------------- drawing: map scene ---------------- */
function drawMap(){
  const m=App.session.map, c=cam();
  ctx.save();
  ctx.scale(c.s,c.s); ctx.translate(-c.x,-c.y);
  if(m.img){
    ctx.drawImage(m.img,0,0);
    if(m.grid.show){
      ctx.strokeStyle="rgba(200,161,78,.22)";
      ctx.lineWidth=1/c.s;
      ctx.beginPath();
      const g=m.grid.size;
      for(let x=m.grid.ox%g; x<=m.img.width; x+=g){ctx.moveTo(x,0);ctx.lineTo(x,m.img.height);}
      for(let y=m.grid.oy%g; y<=m.img.height; y+=g){ctx.moveTo(0,y);ctx.lineTo(m.img.width,y);}
      ctx.stroke();
    }
    // tokens
    for(const t of m.tokens) drawTokenFlat(t,m.grid.size,c.s);
    // fog
    if(m.fog && m.fogOn){
      ctx.globalAlpha = RVIEW==="dm" ? .45 : 1;
      ctx.drawImage(m.fog,0,0);
      ctx.globalAlpha = 1;
    }
  }else{
    ctx.restore();
    emptyMapMessage();
    return;
  }
  drawPatrolPath();
  drawPings();
  ctx.restore();
}
function emptyMapMessage(){
  ctx.fillStyle="#0E1411"; ctx.fillRect(0,0,W,H);
  ctx.textAlign="center";
  ctx.fillStyle="#C8A14E"; ctx.font="22px Marcellus, serif";
  if(RVIEW==="pl"){
    ctx.fillText("THE TABLE IS BEING SET",W/2,H/2);
    return;
  }
  ctx.fillText("NO MAP ON THE TABLE",W/2,H/2-16);
  ctx.fillStyle="#ABA38C"; ctx.font="12px 'IBM Plex Mono', monospace";
  ctx.fillText("drop an image anywhere, or use IMPORT MAP in the panel →",W/2,H/2+12);
}
function drawTokenFlat(t,g,s){
  const r=g*.42*t.size;
  ctx.save();
  ctx.shadowColor="rgba(0,0,0,.55)"; ctx.shadowBlur=10/s; ctx.shadowOffsetY=3/s;
  ctx.beginPath(); ctx.arc(t.x,t.y,r,0,7); ctx.fillStyle=t.color; ctx.fill();
  ctx.shadowColor="transparent";
  ctx.lineWidth=Math.max(2,g*.05);
  ctx.strokeStyle = (RVIEW==="dm"&&App.session.selToken===t.id) ? "#E9E2CE" : "rgba(7,9,8,.6)";
  ctx.stroke();
  ctx.fillStyle="#070908"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.font=`600 ${r*.8}px 'IBM Plex Mono', monospace`;
  ctx.fillText(t.letter,t.x,t.y+r*.04);
  ctx.font=`500 ${Math.max(10,g*.2)}px 'IBM Plex Mono', monospace`;
  ctx.fillStyle="#E9E2CE";
  ctx.strokeStyle="rgba(7,9,8,.8)"; ctx.lineWidth=3; ctx.lineJoin="round";
  ctx.strokeText(t.name,t.x,t.y+r+g*.18);
  ctx.fillText(t.name,t.x,t.y+r+g*.18);
  ctx.restore();
}

/* ---------------- drawing: verso iso scene ---------------- */
let tNow=0;
function hash2(i,j){let h=(i*374761393+j*668265263)|0;h=(h^(h>>13))*1274126177;return ((h^(h>>16))>>>0)/4294967295;}
function tilePath(i,j){
  ctx.beginPath();
  tilePathAdd(i,j);
}
function tilePathAdd(i,j){ // append one tile to the current path (for multi-tile fills)
  ctx.moveTo(isoX(i,j),       isoY(i,j));
  ctx.lineTo(isoX(i+1,j),     isoY(i+1,j));
  ctx.lineTo(isoX(i+1,j+1),   isoY(i+1,j+1));
  ctx.lineTo(isoX(i,j+1),     isoY(i,j+1));
  ctx.closePath();
}
const roomElevation=r=>((r&&r.elevation)||0)*ELEV_STEP+(r&&r.structure==="platform"?ELEV_STEP/2:0);
function isFrontRoomEdge(r,edge){
  const [x1,y1,x2,y2]=edge;
  if(y1===y2) return roomHasTile(r,Math.floor((x1+x2)/2),y1-1);
  return roomHasTile(r,x1-1,Math.floor((y1+y2)/2));
}
function drawStair(stair){
  const alongX=stair.dir==="e"||stair.dir==="w",run=alongX?stair.w:stair.h,steps=Math.max(3,run*3);
  const riser=Math.max(2,Math.abs(stair.to-stair.from)*ELEV_STEP/steps);
  const styles={stone:["#777168","#625D56"],wood:["#765B3E","#61482F"],metal:["#69727A","#545D64"]},colors=styles[stair.style]||styles.stone;
  for(let k=0;k<steps;k++){
    const forward=stair.dir==="e"||stair.dir==="s"?k:steps-1-k;
    const z=(stair.from+(stair.to-stair.from)*(forward+.5)/steps)*ELEV_STEP;
    const a=k/steps*run,b=(k+1)/steps*run;
    const inset=.08;
    const i0=stair.x+(alongX?a:inset),i1=stair.x+(alongX?b:stair.w-inset);
    const j0=stair.y+(alongX?inset:a),j1=stair.y+(alongX?stair.h-inset:b);
    ctx.save();ctx.translate(0,-z);box(i0,j0,i1,j1,riser,colors[k%2]);ctx.restore();
  }
}
function stairVisible(stair){
  for(let i=stair.x;i<stair.x+stair.w;i++)for(let j=stair.y;j<stair.y+stair.h;j++){
    const room=roomAtTile(i+.5,j+.5);if(room&&App.session.verso.revealed[room.id])return true;
  }
  return false;
}
const GLYPHS="ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛋᛏᛒᛖᛗᛚᛜᛞᛟ";

/* ----- iso prop primitives ----- */
const P=(i,j)=>[isoX(i,j),isoY(i,j)];
function quad(a,b,c,d,fill,stroke){
  ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.7;ctx.stroke();}
}
const flat=(i0,j0,i1,j1,fill,stroke)=>quad(P(i0,j0),P(i1,j0),P(i1,j1),P(i0,j1),fill,stroke);
function shade(hex,f){ // f<1 darker, f>1 lighter
  const n=parseInt(hex.slice(1),16);
  const ch=s=>Math.max(0,Math.min(255,Math.round(s*f)));
  return `rgb(${ch(n>>16)},${ch((n>>8)&255)},${ch(n&255)})`;
}
function box(i0,j0,i1,j1,h,base){
  const A=P(i0,j0),B=P(i1,j0),C=P(i1,j1),D=P(i0,j1);
  const L=p=>[p[0],p[1]-h];
  quad(L(D),L(C),C,D,shade(base,.62));        // left-front face
  quad(L(B),L(C),C,B,shade(base,.8));         // right-front face
  quad(L(A),L(B),L(C),L(D),shade(base,1.18),"rgba(7,9,8,.45)"); // top
}
function wallPlate(i0,i1,j,h,base,glint){ // upright plate standing on a j-line
  const A=P(i0,j),B=P(i1,j),LA=[A[0],A[1]-h],LB=[B[0],B[1]-h];
  quad(LA,LB,B,A,base,"rgba(7,9,8,.5)");
  if(glint){
    const g=.16, A2=P(i0+g,j),B2=P(i1-g,j);
    quad([A2[0],A2[1]-h+4],[B2[0],B2[1]-h+4],[B2[0],B2[1]-4],[A2[0],A2[1]-4],glint);
  }
}
function lightPool(i,j,r,col){
  const [cx,cy]=P(i,j);
  const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
  g.addColorStop(0,col);g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.save();ctx.translate(cx,cy);ctx.scale(1,.5);ctx.translate(-cx,-cy);
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.fill();ctx.restore();
}
function pole(i,j,h,w,base){
  const [x,y]=P(i,j);
  ctx.fillStyle=shade(base,.85);
  ctx.fillRect(x-w/2,y-h,w,h);
  ctx.beginPath();ctx.ellipse(x,y,w*1.4,w*.7,0,0,7);ctx.fillStyle="rgba(0,0,0,.4)";ctx.fill();
}

/* ----- second dressing pass: denser furniture ----- */
function cyl(i,j,r,h,base){
  const [x,y]=P(i,j);
  ctx.fillStyle=shade(base,.78); ctx.fillRect(x-r,y-h,r*2,h);
  ctx.beginPath();ctx.ellipse(x,y,r,r*.5,0,0,7);ctx.fillStyle=shade(base,.55);ctx.fill();
  ctx.beginPath();ctx.ellipse(x,y-h,r,r*.5,0,0,7);ctx.fillStyle=shade(base,1.2);ctx.fill();
  ctx.strokeStyle="rgba(7,9,8,.45)";ctx.lineWidth=.7;ctx.stroke();
}
function chipStack(i,j,base,n){
  const [x,y]=P(i,j), h=n*2.1, r=3.4;
  cyl(i,j,r,h,base);
  ctx.strokeStyle="rgba(233,226,206,.5)";ctx.lineWidth=.6;
  for(let k=1;k<n;k++){ctx.beginPath();ctx.moveTo(x-r,y-k*2.1);ctx.lineTo(x+r,y-k*2.1);ctx.stroke();}
}
function ropePosts(i1,j1,i2,j2){
  const A=P(i1,j1),B=P(i2,j2);
  cyl(i1,j1,2.2,24,"#8A6E36"); cyl(i2,j2,2.2,24,"#8A6E36");
  ctx.fillStyle="#C8A14E";
  ctx.beginPath();ctx.arc(A[0],A[1]-26,2.6,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(B[0],B[1]-26,2.6,0,7);ctx.fill();
  ctx.strokeStyle="#7E1F2B";ctx.lineWidth=2.6;
  ctx.beginPath();ctx.moveTo(A[0],A[1]-24);
  ctx.quadraticCurveTo((A[0]+B[0])/2,(A[1]+B[1])/2-13,B[0],B[1]-24);ctx.stroke();
}
function sconce(i,j,glow){
  wallPlate(i,i+.32,j,12,"#3A2E22");
  const [x,y]=P(i+.16,j);
  ctx.fillStyle="rgba(240,200,120,.9)";
  ctx.beginPath();ctx.arc(x,y-14,1.7,0,7);ctx.fill();
  if(glow) lightPool(i+.16,j+.55,30,"rgba(232,196,120,.12)");
}
/* ----- placeable furniture (editor PROPS tool) ----- */
function drawProps2(r){
  const id=r.id;
  if(id==="lift"){
    // steel platform plating with rivets
    flat(6.15,.15,8.85,1.62,"#4A4E55","rgba(7,9,8,.45)");
    ctx.strokeStyle="rgba(7,9,8,.3)";ctx.lineWidth=.7;
    for(let k=1;k<3;k++){
      const a=P(6.15+k*.9,.15),b=P(6.15+k*.9,1.62);
      ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
    }
    ctx.fillStyle="rgba(20,22,26,.8)";
    [[6.35,.35],[8.65,.35],[6.35,1.42],[8.65,1.42],[7.5,.9]].forEach(([ri,rj])=>{
      const [x,y]=P(ri,rj);ctx.beginPath();ctx.arc(x,y,1.1,0,7);ctx.fill();
    });
    // rear cage wall of the car
    wallPlate(6.2,8.8,.08,34,"#3A3E45");
    ctx.strokeStyle="rgba(7,9,8,.5)";ctx.lineWidth=.7;
    for(let k=1;k<8;k++){
      const a=P(6.2+k*.325,.08);
      ctx.beginPath();ctx.moveTo(a[0],a[1]-32);ctx.lineTo(a[0],a[1]-2);ctx.stroke();
    }
    // the doors: open a hand's width
    wallPlate(6.3,7.34,1.66,30,"#5A5E66","rgba(20,22,26,.35)");
    wallPlate(7.66,8.7,1.66,30,"#5A5E66","rgba(20,22,26,.35)");
    const [gx,gy]=P(7.5,1.66);                                   // darkness in the gap
    ctx.fillStyle="rgba(5,7,6,.9)";
    ctx.fillRect(gx-3,gy-30,6,30);
    // control panel: TRANSIT tray over the older writ-slot
    box(8.45,1.8,8.85,2.08,19,"#3A3E45");
    const [px,py]=P(8.65,1.94);
    ctx.fillStyle="#8FA8B8";ctx.fillRect(px-4,py-16,8,2.2);      // disc tray
    ctx.fillStyle="rgba(200,161,78,.75)";ctx.fillRect(px-3,py-11,6,1.4); // the paper slot beneath
    // call button, warm and pulsing
    let ca=.95; if(!REDUCED) ca=.6+.35*Math.sin(tNow/500);
    ctx.fillStyle=`rgba(240,180,90,${ca})`;
    ctx.beginPath();ctx.arc(px,py-21,2.2,0,7);ctx.fill();
    lightPool(8.65,2.2,24,"rgba(240,180,90,.12)");
    // speaking tube on the south wall, beside the corridor door
    const [tx3,ty3]=P(6.3,2.94);
    ctx.strokeStyle="#C8A14E";ctx.lineWidth=1.6;
    ctx.beginPath();ctx.arc(tx3,ty3-16,3.4,0,7);ctx.stroke();
    ctx.beginPath();ctx.arc(tx3,ty3-16,1.2,0,7);ctx.fillStyle="#1A1714";ctx.fill();
    ctx.beginPath();ctx.moveTo(tx3,ty3-12.6);ctx.lineTo(tx3,ty3-4);ctx.stroke();
    // the ARRIVALS lectern
    box(6.45,2.25,6.95,2.6,17,"#5A4836");
    const [ax,ay]=P(6.7,2.42);
    quad([ax-6,ay-18],[ax+6,ay-20],[ax+7,ay-15],[ax-5,ay-13],"#E9E2CE","rgba(7,9,8,.35)");
    ctx.strokeStyle="rgba(90,70,40,.8)";ctx.lineWidth=.6;
    for(let m=0;m<3;m++){ctx.beginPath();ctx.moveTo(ax-3,ay-17+m*1.8);ctx.lineTo(ax+3,ay-17.6+m*1.8);ctx.stroke();}
    // overhead cage lamp
    lightPool(7.5,1.2,52,"rgba(232,196,120,.10)");
  }
  if(id==="white"){
    // panel seams — the walls are made of nothing in particular
    ctx.strokeStyle="rgba(120,116,104,.25)";ctx.lineWidth=.8;
    for(let k=1;k<4;k++){
      const a=P(2+k,2);
      ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(a[0],a[1]-28);ctx.stroke();
      const c2=P(2,2+k);
      ctx.beginPath();ctx.moveTo(c2[0],c2[1]);ctx.lineTo(c2[0],c2[1]-28);ctx.stroke();
    }
    const [vx,vy]=P(5.55,2.45);     // ceiling vent, the only feature
    quad([vx-7,vy-26],[vx+7,vy-29],[vx+9,vy-24],[vx-5,vy-21],"#8F8A7A","rgba(7,9,8,.4)");
    ctx.strokeStyle="rgba(7,9,8,.4)";
    for(let k=1;k<4;k++){ctx.beginPath();ctx.moveTo(vx-7+k*3.6,vy-26+k*.4-1);ctx.lineTo(vx-5+k*3.6,vy-21+k*.4-1);ctx.stroke();}
  }
  if(id==="cloak"){
    flat(2.3,6.7,4.7,8.8,"#4A2B27","rgba(200,161,78,.2)");      // worn rug under the rails
    const [lx,ly]=P(2.5,6.3);                                    // ledger on the counter
    quad([lx-5,ly-15],[lx+5,ly-17],[lx+6,ly-12],[lx-4,ly-10],"#D8CFB6","rgba(7,9,8,.3)");
    sconce(2.6,6.06,true);
    cyl(4.65,8.75,2.6,18,"#3A332A");                             // umbrella stand
    ctx.strokeStyle="#5E5648";ctx.lineWidth=1.2;
    const [ux,uy]=P(4.65,8.75);
    ctx.beginPath();ctx.moveTo(ux-2,uy-18);ctx.lineTo(ux-4,uy-30);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ux+2,uy-18);ctx.lineTo(ux+3,uy-31);ctx.stroke();
  }
  if(id==="corrH"){
    for(const i of [10,14,18,22]) sconce(i,3.05,true);           // sconces between mirrors
    box(6.7,4.45,8.2,4.85,12,"#4A3A2C");                         // settee bench
    flat(6.85,4.5,8.05,4.8,"#5E2430");
    box(21.6,3.1,22.4,3.5,16,"#4A3A2C");                         // side table + vase
    const [tx2,ty2]=P(22,3.3);
    cyl(22,3.28,2,8,"#7A6E5A");
    ctx.strokeStyle="#3E5A3A";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(tx2,ty2-24);ctx.lineTo(tx2-3,ty2-31);ctx.stroke();
    ctx.beginPath();ctx.moveTo(tx2,ty2-24);ctx.lineTo(tx2+3,ty2-30);ctx.stroke();
  }
  if(id==="corrV"){
    sconce(14.06,8,true); sconce(14.06,12,false);                 // second one is dark
    [[15.3,6.8],[14.6,7.1],[15.1,11.2]].forEach(([ci,cj])=>{      // dropped chips on the carpet
      const [x,y]=P(ci,cj);
      ctx.fillStyle="rgba(200,161,78,.8)";
      ctx.beginPath();ctx.ellipse(x,y,3,1.5,0,0,7);ctx.fill();
      ctx.strokeStyle="rgba(7,9,8,.5)";ctx.lineWidth=.6;ctx.stroke();
    });
  }
  if(id==="lost"){
    [[7.6,9.2],[9.2,9.2]].forEach(([bi,bj],k)=>{                  // third shelf row
      box(bi,bj,bi+1.25,bj+.55,16,"#4A3A2C");
      for(let m=0;m<3;m++){
        const h=hash2(k*13+m,29);
        const [ix,iy]=P(bi+.25+m*.38,bj+.27);
        ctx.fillStyle=`rgba(${110+h*110|0},${95+h*70|0},${85+h*50|0},.9)`;
        ctx.beginPath();ctx.arc(ix,iy-18,2.4,0,7);ctx.fill();
      }
    });
    // hanging claim tags on the bins
    [[8.2,6.95],[9.8,6.95],[11.4,6.95],[8.2,8.45],[8.2,9.75],[9.8,9.75]].forEach(([ti,tj])=>{
      const [x,y]=P(ti,tj);
      ctx.strokeStyle="rgba(233,226,206,.5)";ctx.lineWidth=.5;
      ctx.beginPath();ctx.moveTo(x,y-12);ctx.lineTo(x,y-8);ctx.stroke();
      ctx.fillStyle="#E9E2CE";ctx.fillRect(x-2.5,y-8,5,4);
    });
    // the violin with one string, on top of a bin
    const [vx,vy]=P(10.6,6.6);
    ctx.fillStyle="#6B4226";
    ctx.beginPath();ctx.ellipse(vx-2,vy-19,4,2.4,.5,0,7);ctx.fill();
    ctx.beginPath();ctx.ellipse(vx+1,vy-21,3,2,.5,0,7);ctx.fill();
    ctx.strokeStyle="#6B4226";ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(vx+2,vy-22);ctx.lineTo(vx+8,vy-26);ctx.stroke();
    ctx.strokeStyle="rgba(233,226,206,.8)";ctx.lineWidth=.5;
    ctx.beginPath();ctx.moveTo(vx-5,vy-19);ctx.lineTo(vx+8,vy-26);ctx.stroke();
    // grandfather clock against the east wall — stopped at 3:17
    box(12.35,6.2,12.85,6.6,44,"#3A2A1E");
    const [cx2,cy2]=P(12.6,6.4);
    ctx.beginPath();ctx.arc(cx2,cy2-36,5,0,7);ctx.fillStyle="#D8CFB6";ctx.fill();
    ctx.strokeStyle="rgba(7,9,8,.5)";ctx.lineWidth=.7;ctx.stroke();
    ctx.strokeStyle="#1A1714";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(cx2,cy2-36);ctx.lineTo(cx2+2.6,cy2-37.5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx2,cy2-36);ctx.lineTo(cx2+1.4,cy2-32);ctx.stroke();
  }
  if(id==="acct"){
    [[18,9.4],[20.6,9.4]].forEach(([di,dj])=>{                   // third desk row
      box(di,dj,di+.95,dj+.62,14,"#6B5436");
      const [px,py]=P(di+.48,dj+.31);
      quad([px-7,py-15],[px+7,py-18],[px+8,py-13],[px-6,py-10],"#E9E2CE","rgba(7,9,8,.3)");
      lightPool(di+.5,dj+.3,30,"rgba(240,200,120,.14)");
    });
    box(22.45,6.2,22.9,9.6,30,"#4A4036");                        // filing wall, east side
    ctx.strokeStyle="rgba(7,9,8,.5)";ctx.lineWidth=.6;
    for(let k=1;k<7;k++){
      const a=P(22.45,6.2+k*.48),b=P(22.9,6.2+k*.48);
      ctx.beginPath();ctx.moveTo(a[0],a[1]-30+k*1.2);ctx.lineTo(b[0],b[1]-30+k*1.2);ctx.stroke();
    }
    [[17.4,6.1],[17.4,7.9]].forEach(([si,sj])=>{                 // ledger stacks on the floor
      box(si,sj,si+.5,sj+.4,7,"#7A5E3A");
      box(si+.04,sj+.04,si+.46,sj+.36,12,"#8A6E46");
      box(si+.08,sj+.06,si+.42,sj+.32,16,"#6B5436");
    });
    cyl(19.6,5.85,1.4,11,"#C8A14E");                             // candlestick at the lectern
    lightPool(19.6,6.1,26,"rgba(240,200,120,.16)");
  }
  if(id==="cage"){
    ropePosts(9.0,11.6,10.6,11.6); ropePosts(10.6,11.6,12.2,11.6); // the queue, mostly empty
    chipStack(9.1,13.45,"#7E1F2B",5);                             // stacks behind the counter
    chipStack(9.55,13.55,"#2E4A38",7);
    chipStack(12.4,13.5,"#3A4A6B",4);
    chipStack(12.85,13.4,"#C8A14E",6);
    // brass balance scale on the counter, by the window
    const [sx2,sy2]=P(11,12.85);
    ctx.strokeStyle="#C8A14E";ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(sx2,sy2-11);ctx.lineTo(sx2,sy2-24);ctx.stroke();
    ctx.beginPath();ctx.moveTo(sx2-8,sy2-21);ctx.lineTo(sx2+8,sy2-23);ctx.stroke();
    ctx.beginPath();ctx.ellipse(sx2-8,sy2-17,3,1.4,0,0,7);ctx.stroke();
    ctx.beginPath();ctx.ellipse(sx2+8,sy2-19,3,1.4,0,0,7);ctx.stroke();
    box(12.9,15.3,13.6,15.7,15,"#4A3A2C");                       // small desk with the open book of terms
    const [bx2,by2]=P(13.25,15.5);
    quad([bx2-5,by2-16],[bx2+5,by2-18],[bx2+6,by2-13],[bx2-4,by2-11],"#E9E2CE","rgba(7,9,8,.3)");
  }
  if(id==="stair"){
    cyl(16.6,11.5,3.2,38,"#4A4A50"); cyl(21.4,11.5,3.2,38,"#4A4A50"); // stone columns flanking the descent
    const [f1x,f1y]=P(16.6,11.5),[f2x,f2y]=P(21.4,11.5);
    let fa=.5;
    if(!REDUCED) fa=.35+.2*Math.sin(tNow/600);
    ctx.fillStyle=`rgba(127,168,184,${fa})`;
    ctx.beginPath();ctx.ellipse(f1x,f1y-40,2.4,3.6,0,0,7);ctx.fill();   // cold blue braziers
    ctx.beginPath();ctx.ellipse(f2x,f2y-40,2.4,3.6,0,0,7);ctx.fill();
    lightPool(16.6,12,34,"rgba(127,168,184,.10)");
    lightPool(21.4,12,34,"rgba(127,168,184,.10)");
    ctx.fillStyle="rgba(110,110,118,.7)";                        // rubble where the carpet tore
    [[16.4,12.2],[17,12.35],[21.2,12.25],[20.7,12.4]].forEach(([ri,rj])=>{
      const [x,y]=P(ri,rj);
      ctx.beginPath();ctx.ellipse(x,y,2.4,1.3,0,0,7);ctx.fill();
    });
  }
}

/* ----- room dressing ----- */
function drawProps(r){
  const id=r.id;
  if(id==="white"){
    lightPool(4,4,86,"rgba(233,226,206,.13)");
    // bootprints entering through the west wall, no prints for Randy
    ctx.fillStyle="rgba(70,66,58,.55)";
    [[2.15,3.15],[2.5,3.5],[2.85,3.85],[3.2,4.2],[3.55,4.45]].forEach(([i,j],k)=>{
      const [x,y]=P(i+(k%2?.12:0),j-(k%2?.12:0));
      ctx.beginPath();ctx.ellipse(x,y,4.5,2.2,0,0,7);ctx.fill();
    });
    // the tally of days, scratched at floor level — stops at 9
    ctx.strokeStyle="rgba(90,86,76,.8)";ctx.lineWidth=1;
    const [tx,ty]=P(2.5,5.55);
    for(let k=0;k<9;k++){
      const x=tx+k*4+(k===4?-2:0);
      ctx.beginPath();
      if(k===4){ctx.moveTo(tx-2,ty-7);ctx.lineTo(tx+14,ty-1);}
      else{ctx.moveTo(x,ty-8);ctx.lineTo(x+1,ty);}
      ctx.stroke();
    }
  }
  if(id==="cloak"){
    box(2.2,6.15,4.6,6.55,13,"#5A4232");                       // counter
    const [bx,by]=P(4.2,6.35);                                  // brass bell
    ctx.beginPath();ctx.arc(bx,by-16,3.4,0,7);ctx.fillStyle="#C8A14E";ctx.fill();
    ctx.strokeStyle="rgba(7,9,8,.5)";ctx.lineWidth=.8;ctx.stroke();
    const [kx,ky]=P(3.2,6.35);                                  // face-down ticket
    quad([kx-5,ky-14],[kx+5,ky-16],[kx+6,ky-12],[kx-4,ky-10],"#E9E2CE");
    // two coat rails, coats hanging deeper than the room should allow
    const coatCols=["#3E3A33","#46342E","#333A40","#3B3330","#2E3A36","#44403A","#3A2F36"];
    [7.3,8.3].forEach((jr,row)=>{
      const A=P(2.35,jr),B=P(4.75,jr);
      ctx.strokeStyle="#8A6E36";ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(A[0],A[1]-30);ctx.lineTo(B[0],B[1]-30);ctx.stroke();
      for(let k=0;k<7;k++){
        const t=k/6,x=A[0]+(B[0]-A[0])*t,y=A[1]+(B[1]-A[1])*t-30;
        const randys=(row===0&&k===2);
        const c=randys?"#5E4A35":coatCols[(k+row*3)%coatCols.length];
        quad([x-3,y+3],[x+3,y+3],[x+5,y+21],[x-5,y+21],c,"rgba(7,9,8,.4)");
        ctx.fillStyle="#C8A14E";ctx.fillRect(x-.8,y,1.6,3);   // hook
      }
    });
  }
  if(id==="corrH"){
    flat(6.45,3.3,23.55,4.7,"#6B2F2A","rgba(200,161,78,.35)"); // runner
    for(let i=7;i<23;i++){                                      // motif — one repeats wrong
      const [mx,my]=P(i+.5,4);
      ctx.save();ctx.translate(mx,my);ctx.scale(1,.5);
      if(i===15)ctx.rotate(.8);else ctx.rotate(Math.PI/4);
      ctx.fillStyle=i===15?"rgba(200,161,78,.7)":"rgba(200,161,78,.4)";
      ctx.fillRect(-4,-4,8,8);ctx.restore();
    }
    for(const i of [8,12,16,20]) wallPlate(i,i+.9,3.04,24,"#2E2A24","rgba(127,168,184,.35)"); // mirror-plates
    for(const i of [9,15,21]) lightPool(i,4,62,"rgba(232,196,120,.11)");
  }
  if(id==="corrV"){
    flat(14.3,5.2,15.7,13.2,"#5A2723","rgba(200,161,78,.25)"); // runner thins out
    box(14.55,9.3,15.4,9.85,15,"#6E6E72");                     // abandoned service cart
    const [gx,gy]=P(14.9,9.5),[hx,hy]=P(15.15,9.65);
    ctx.fillStyle="#CFE3EA";
    ctx.beginPath();ctx.arc(gx,gy-18,2.2,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(hx,hy-18,2.2,0,7);ctx.fill();
    const [sx,sy]=P(15.3,9.4);                                  // order slip: R. MEISNER — THE USUAL
    quad([sx-4,sy-16],[sx+4,sy-18],[sx+5,sy-13],[sx-3,sy-11],"#E9E2CE");
    const [fx,fy]=P(16,12.6);                                   // wallpaper flap, stone behind
    ctx.beginPath();ctx.moveTo(fx,fy-26);ctx.lineTo(fx-9,fy-6);ctx.lineTo(fx+2,fy-9);ctx.closePath();
    ctx.fillStyle="#5A2723";ctx.fill();ctx.strokeStyle="rgba(7,9,8,.5)";ctx.stroke();
  }
  if(id==="lost"){
    box(7.25,5.12,9.9,5.5,26,"#3A2E22");                        // pigeonholes on the north wall
    ctx.strokeStyle="rgba(7,9,8,.5)";ctx.lineWidth=.6;
    for(let k=1;k<6;k++){const a=P(7.25+k*.44,5.12),b=P(7.25+k*.44,5.5);
      ctx.beginPath();ctx.moveTo(a[0],a[1]-26);ctx.lineTo(a[0],a[1]-4);ctx.stroke();}
    const bins=[[7.6,6.4],[9.2,6.4],[10.8,6.4],[7.6,7.9],[9.2,7.9]];
    bins.forEach(([bi,bj],k)=>{
      box(bi,bj,bi+1.25,bj+.55,16,"#4A3A2C");
      for(let m=0;m<3;m++){                                     // unclaimed effects
        const h=hash2(k*7+m,11);
        const [ix,iy]=P(bi+.25+m*.38,bj+.27);
        ctx.fillStyle=`rgba(${120+h*100|0},${100+h*60|0},${80+h*40|0},.9)`;
        ctx.beginPath();ctx.arc(ix,iy-18,2.4,0,7);ctx.fill();
      }
    });
    flat(10.8,7.9,12.05,8.45,"transparent","rgba(233,226,206,.5)"); // MEISNER bin: empty, dust outline
    const [dx,dy]=P(11.1,8.15);
    ctx.strokeStyle="rgba(233,226,206,.35)";ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.ellipse(dx+8,dy,16,4,0,0,7);ctx.stroke();ctx.setLineDash([]);
  }
  if(id==="acct"){
    [[18,6.4],[20.6,6.4],[18,8.1],[20.6,8.1]].forEach(([di,dj],k)=>{
      box(di,dj,di+.95,dj+.62,14,"#6B5436");                    // sloped desks
      const [px,py]=P(di+.48,dj+.31);
      quad([px-7,py-15],[px+7,py-18],[px+8,py-13],[px-6,py-10],"#E9E2CE","rgba(7,9,8,.3)"); // open ledger
      ctx.strokeStyle="rgba(90,70,40,.8)";ctx.lineWidth=.7;     // self-writing lines
      const lines=2+Math.floor(hash2(k,3)*3);
      for(let m=0;m<lines;m++){ctx.beginPath();ctx.moveTo(px-4,py-15+m*2);ctx.lineTo(px+3+hash2(k,m)*3,py-15.8+m*2);ctx.stroke();}
      lightPool(di+.5,dj+.3,30,"rgba(240,200,120,.14)");        // candle glow
    });
    box(19.4,5.15,20.6,5.55,30,"#5A4836");                      // master lectern, north wall
    const [lx,ly]=P(20,5.35);
    quad([lx-9,ly-32],[lx+9,ly-36],[lx+11,ly-28],[lx-7,ly-24],"#E9E2CE","rgba(7,9,8,.35)");
  }
  if(id==="cage"){
    box(8.45,12.7,13.55,13.05,11,"#7A5E2E");                    // brass counter
    ctx.strokeStyle="#C8A14E";ctx.lineWidth=1.6;                // florentine bars (window gap mid)
    for(let i=8.5;i<=13.5;i+=.42){
      if(i>10.55&&i<11.45)continue;
      const [x,y]=P(i,13);
      ctx.beginPath();ctx.moveTo(x,y-11);ctx.lineTo(x,y-40);ctx.stroke();
    }
    const A=P(8.5,13),B=P(13.5,13);                             // top rail
    ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(A[0],A[1]-40);ctx.lineTo(B[0],B[1]-40);ctx.stroke();
    pole(12.7,14.7,30,2.4,"#3A332A");                           // hat stand
    const [px,py]=P(12.7,14.7);
    ctx.fillStyle="#1A1714";
    ctx.beginPath();ctx.ellipse(px,py-31,7,3,0,0,7);ctx.fill(); // the top hat
    ctx.fillRect(px-4,py-42,8,11);
    ctx.beginPath();ctx.ellipse(px,py-42,4,1.8,0,0,7);ctx.fill();
    lightPool(11,13.6,54,"rgba(232,196,120,.10)");
  }
  if(id==="stair"){
    flat(16.06,11.06,21.94,12.1,"#5A2723","rgba(7,9,8,.4)");    // carpet, ending mid-step
    ctx.fillStyle="#5A2723";                                     // ragged edge
    for(let i=16.2;i<21.8;i+=.6){
      const a=P(i,12.1),b=P(i+.3,12.1+.22),c=P(i+.6,12.1);
      ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.closePath();ctx.fill();
    }
    for(let k=0;k<6;k++){                                        // the stair: 13 by count, deeper by sight
      const j0=12.3+k*.75,j1=12.3+(k+1)*.75;
      const f=1-.16*k;
      flat(16.6,j0,21.4,j1,shade("#4A4A4E",Math.max(.08,f)));
      const a=P(16.6,j0),b=P(21.4,j0);
      ctx.strokeStyle=`rgba(160,160,170,${.35*f})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
    }
    const g=ctx.createLinearGradient(...P(19,13.5),...P(19,17)); // descent into the under-writing
    g.addColorStop(0,"rgba(10,15,12,0)");g.addColorStop(1,"rgba(5,7,6,.95)");
    flat(16.1,13.2,21.9,16.9,"transparent");ctx.fillStyle=g;ctx.fill();
    ctx.font="11px serif";ctx.textAlign="center";                // fresh carving at the threshold
    for(let k=0;k<5;k++){
      const [tx,ty]=P(17.6+k*.7,12.18);
      let a=.65; if(!REDUCED)a=.5+.25*Math.sin(tNow/700+k);
      ctx.fillStyle=`rgba(127,168,184,${a})`;
      ctx.save();ctx.translate(tx,ty);ctx.scale(1,.5);ctx.fillText(GLYPHS[(k*5+3)%GLYPHS.length],0,0);ctx.restore();
    }
  }
}
function drawVerso(){
  const v=App.session.verso, c=cam();
  ctx.fillStyle=App.document.level.bg||"#0A0F0C"; ctx.fillRect(0,0,W,H);
  ctx.save();
  ctx.scale(c.s,c.s); ctx.translate(-c.x,-c.y);

  const showHidden = RVIEW==="dm";
  // floors
  for(const r of App.document.rooms){
    const rev = !!v.revealed[r.id];
    if(!rev && !showHidden) continue;
    ctx.save();
    if(!rev){ ctx.globalAlpha=.22; }
    ctx.translate(0,-roomElevation(r));
    const bleedSet = new Set((r.bleed||[]).map(p=>p[0]+","+p[1]));
    {
      for(const [i,j] of roomTiles(r)){
        const h=hash2(i,j);
        const isBleed = r.bleedAll ? true : bleedSet.has(i+","+j);
        tilePath(i,j);
        if(isBleed){
          ctx.fillStyle = h>.5 ? "#46464B" : "#3D3D42";
        }else{
          ctx.fillStyle = h>.5 ? r.floorA : r.floorB;
        }
        ctx.fill();
        ctx.strokeStyle="rgba(7,9,8,.35)"; ctx.lineWidth=.7; ctx.stroke();
        if(isBleed && rev){
          // under-writing glyph
          const g=GLYPHS[Math.floor(h*GLYPHS.length)];
          const cx=isoX(i+.5,j+.5), cy=isoY(i+.5,j+.5);
          let a=.4;
          if(!REDUCED) a=.28+.2*Math.sin(tNow/900+h*12);
          ctx.save();
          ctx.translate(cx,cy); ctx.scale(1,.5); ctx.rotate(h*6.28);
          ctx.fillStyle=`rgba(127,168,184,${a})`;
          ctx.font="16px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText(g,0,0);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }
  // walls (room perimeters)
  for(const r of App.document.rooms){
    const rev = !!v.revealed[r.id];
    if(!rev && !showHidden) continue;
    ctx.save();
    if(!rev) ctx.globalAlpha=.3;
    const elevation=roomElevation(r),wallPx=(r.wallHeight??1)*12;
    for(const edge of roomEdges(r)){
      const [x1,y1,x2,y2]=edge,A=[isoX(x1,y1),isoY(x1,y1)-elevation],B=[isoX(x2,y2),isoY(x2,y2)-elevation];
      if(elevation>0&&isFrontRoomEdge(r,edge))quad(A,B,[B[0],B[1]+elevation],[A[0],A[1]+elevation],shade(r.wall,.58),"rgba(7,9,8,.5)");
      if(r.cutaway==="front"&&isFrontRoomEdge(r,edge))continue;
      if(!wallPx)continue;
      quad([A[0],A[1]-wallPx],[B[0],B[1]-wallPx],B,A,shade(r.wall,isFrontRoomEdge(r,edge)?.82:.68),"rgba(7,9,8,.6)");
      ctx.beginPath();ctx.moveTo(A[0],A[1]-wallPx);ctx.lineTo(B[0],B[1]-wallPx);
      ctx.strokeStyle=shade(r.wall,1.12);ctx.lineWidth=2;ctx.lineCap="round";ctx.stroke();
    }
    ctx.restore();
  }
  // room dressing
  for(const r of App.document.rooms){
    const rev = !!v.revealed[r.id];
    if(!rev && !showHidden) continue;
    ctx.save();
    if(!rev) ctx.globalAlpha=.18;
    ctx.translate(0,-roomElevation(r));
    drawProps(r);
    drawProps2(r);
    ctx.restore();
  }
  // stairs sit on top of room-specific carpet and floor dressing. Drawing them
  // before that pass buries most of each tread and makes the run appear shorter.
  for(const stair of (App.document.stairs||[]))if(RVIEW==="dm"||stairVisible(stair))drawStair(stair);
  // placed furniture (editor props)
  for(const pr of (App.document.level.props||[])){
    const lib=PROP_LIB[pr.t];
    if(!lib) continue;
    const room=roomAtTile(pr.x+.5,pr.y+.5);
    const rev=room && v.revealed[room.id];
    if(!rev && !showHidden) continue;
    ctx.save();
    if(!rev) ctx.globalAlpha=.22;
    ctx.translate(0,-roomElevation(room));
    lib.draw(pr.x,pr.y);
    ctx.restore();
  }
  // lighting overlays (dim / dark / flicker per room)
  for(const r of App.document.rooms){
    if(!r.light) continue;
    const rev=v.revealed[r.id];
    if(!rev && !showHidden) continue;
    let a = r.light==="dim"?.34 : r.light==="dark"?.74 : 0;
    if(r.light==="flicker"||r.light==="torchlight"){
      a = REDUCED ? .4 : .22+.26*(.5+.5*Math.sin(tNow/93)+.3*Math.sin(tNow/31+2));
    }
    const glow=r.light==="bright"?"rgba(244,226,174,.14)":r.light==="magical"?"rgba(112,174,210,.16)":r.light==="torchlight"?"rgba(220,142,72,.10)":null;
    if(a<=0&&!glow) continue;
    if(RVIEW==="dm") a*=.5;                    // DM keeps night vision
    ctx.save();
    ctx.translate(0,-roomElevation(r));
    ctx.beginPath();
    for(const [i,j] of roomTiles(r)) tilePathAdd(i,j);
    if(a>0){ctx.fillStyle="rgba(4,7,9,"+Math.min(a,.85)+")";ctx.fill();}
    if(glow){ctx.fillStyle=glow;ctx.fill();}
    ctx.restore();
  }
  // doors / openings
  for(const d of App.document.doors){
    const len=d.len||1;
    const x2 = d.dir==="h" ? d.x+len : d.x;
    const y2 = d.dir==="h" ? d.y : d.y+len;
    const visible = doorVisible(d);
    if(!visible && RVIEW!=="dm") continue;
    ctx.save();
    if(!visible) ctx.globalAlpha=.3;
    const adjoining=[roomAtTile(d.x+.25,d.y-.25),roomAtTile(d.x+.25,d.y+.25),roomAtTile(d.x-.25,d.y+.25),roomAtTile(d.x+.25,d.y+.25)].filter(Boolean);
    ctx.translate(0,-Math.max(0,...adjoining.map(roomElevation)));
    ctx.beginPath();
    ctx.moveTo(isoX(d.x,d.y),isoY(d.x,d.y));
    ctx.lineTo(isoX(x2,y2),isoY(x2,y2));
    if(d.type==="open"){
      ctx.strokeStyle="#2B2125"; ctx.lineWidth=5; ctx.stroke();
    }else{
      ctx.strokeStyle="#0A0F0C"; ctx.lineWidth=6; ctx.stroke();
      ctx.strokeStyle="#C8A14E"; ctx.lineWidth=3; ctx.setLineDash([7,4]); ctx.stroke();
    }
    ctx.restore();
  }
  // room labels (DM always; players only when revealed)
  ctx.textAlign="center";
  for(const r of App.document.rooms){
    const rev=!!v.revealed[r.id];
    if(!rev && !showHidden) continue;
    const bb=roomBBox(r);
    const cx=isoX((bb.x0+bb.x1)/2,(bb.y0+bb.y1)/2);
    const cy=isoY((bb.x0+bb.x1)/2,(bb.y0+bb.y1)/2);
    ctx.save();
    ctx.translate(0,-roomElevation(r));
    ctx.globalAlpha = rev?1:.45;
    ctx.font="13px Marcellus, serif";
    ctx.fillStyle = (RVIEW==="dm"&&App.session.selRoom===r.id) ? "#E9E2CE" : "#C8A14E";
    ctx.strokeStyle="rgba(7,9,8,.85)"; ctx.lineWidth=3; ctx.lineJoin="round";
    const label=r.name.toUpperCase()+(rev?"":" · HIDDEN");
    ctx.strokeText(label,cx,cy); ctx.fillText(label,cx,cy);
    ctx.restore();
  }
  // tokens, depth-sorted
  const toks=[...v.tokens].sort((a,b)=>(a.x+a.y)-(b.x+b.y));
  // players only see NPCs sharing a room with a PC right now (or a room the DM
  // has flagged "always show tokens") — a revealed room stays readable, but a
  // patrol that's since wandered off elsewhere doesn't broadcast its position
  let partyRoomIds=null;
  for(const t of toks){
    if(RVIEW!=="dm"){
      const room=roomAtTile(t.x,t.y);
      if(room && !v.revealed[room.id]) continue;
      if(room && !t.pc && !room.tokensAlways){
        if(!partyRoomIds){
          partyRoomIds=new Set();
          for(const p of v.tokens) if(p.pc){const pr=roomAtTile(p.x,p.y); if(pr) partyRoomIds.add(pr.id);}
        }
        if(!partyRoomIds.has(room.id)) continue;
      }
    }
    drawTokenIso(t,c.s);
  }
  drawPatrolPath();
  drawPings();
  ctx.restore();
}
function doorVisible(d){
  // visible to players if either adjoining room near the segment is revealed
  const probes = d.dir==="h"
    ? [[d.x+.5,d.y-.5],[d.x+.5,d.y+.5]]
    : [[d.x-.5,d.y+.5],[d.x+.5,d.y+.5]];
  return probes.some(([i,j])=>{const r=roomAtTile(i,j);return r && App.session.verso.revealed[r.id];});
}
function roomHasTile(r,i,j){return r.rects.some(rc=>i>=rc.x&&i<rc.x+rc.w&&j>=rc.y&&j<rc.y+rc.h);}
function roomAtTile(i,j){
  for(const r of App.document.rooms){ if(roomHasTile(r,i,j)) return r; }
  return null;
}
function roomTiles(r){ // union of the room's rects, deduped
  const seen=new Set(), out=[];
  for(const rc of r.rects) for(let i=rc.x;i<rc.x+rc.w;i++) for(let j=rc.y;j<rc.y+rc.h;j++){
    const k=i+","+j; if(!seen.has(k)){seen.add(k);out.push([i,j]);}
  }
  return out;
}
function roomEdges(r){ // outer boundary segments in tile-corner space
  const s=new Set(roomTiles(r).map(([i,j])=>i+","+j));
  const out=[];
  for(const key of s){
    const [i,j]=key.split(",").map(Number);
    if(!s.has(i+","+(j-1))) out.push([i,j,i+1,j]);
    if(!s.has(i+","+(j+1))) out.push([i,j+1,i+1,j+1]);
    if(!s.has((i-1)+","+j)) out.push([i,j,i,j+1]);
    if(!s.has((i+1)+","+j)) out.push([i+1,j,i+1,j+1]);
  }
  return out;
}
function roomBBox(r){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const rc of r.rects){x0=Math.min(x0,rc.x);y0=Math.min(y0,rc.y);x1=Math.max(x1,rc.x+rc.w);y1=Math.max(y1,rc.y+rc.h);}
  return {x0,y0,x1,y1};
}
function drawTokenIso(t,s){
  const room=roomAtTile(t.x,t.y),cx=isoX(t.x,t.y),cy=isoY(t.x,t.y)-roomElevation(room||{});
  const r=15*t.size;
  ctx.save();
  // base ellipse
  ctx.beginPath(); ctx.ellipse(cx,cy+4,r*.95,r*.48,0,0,7);
  ctx.fillStyle="rgba(0,0,0,.45)"; ctx.fill();
  // disk
  ctx.beginPath(); ctx.arc(cx,cy-r*.5,r,0,7);
  ctx.fillStyle=t.color; ctx.fill();
  ctx.lineWidth=2.4;
  ctx.strokeStyle = (RVIEW==="dm"&&App.session.selToken===t.id) ? "#E9E2CE" : "rgba(7,9,8,.65)";
  ctx.stroke();
  ctx.fillStyle="#070908"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.font=`600 ${r*.78}px 'IBM Plex Mono', monospace`;
  ctx.fillText(t.letter,cx,cy-r*.46);
  ctx.font="500 11px 'IBM Plex Mono', monospace";
  ctx.fillStyle="#E9E2CE"; ctx.strokeStyle="rgba(7,9,8,.85)"; ctx.lineWidth=3; ctx.lineJoin="round";
  ctx.strokeText(t.name,cx,cy+r*.9+8); ctx.fillText(t.name,cx,cy+r*.9+8);
  ctx.restore();
}

/* ---------------- ruler ---------------- */
let ruler=null; // {x1,y1,x2,y2} world coords
function drawRuler(){
  if(!ruler) return;
  const c=cam();
  const [sx1,sy1]=toScreen(ruler.x1,ruler.y1);
  const [sx2,sy2]=toScreen(ruler.x2,ruler.y2);
  ctx.save();
  ctx.strokeStyle="#7FA8B8"; ctx.lineWidth=2; ctx.setLineDash([8,5]);
  ctx.beginPath(); ctx.moveTo(sx1,sy1); ctx.lineTo(sx2,sy2); ctx.stroke();
  ctx.setLineDash([]);
  let label;
  if(App.session.scene==="map"){
    const g=App.session.map.grid.size||70;
    const d=Math.hypot(ruler.x2-ruler.x1,ruler.y2-ruler.y1)/g;
    label=(d*5).toFixed(0)+" ft · "+d.toFixed(1)+" sq";
  }else{
    const [i1,j1]=unIso(ruler.x1,ruler.y1), [i2,j2]=unIso(ruler.x2,ruler.y2);
    const d=Math.hypot(i2-i1,j2-j1);
    label=(d*5).toFixed(0)+" ft · "+d.toFixed(1)+" tiles";
  }
  ctx.font="600 12px 'IBM Plex Mono', monospace";
  const mx=(sx1+sx2)/2,my=(sy1+sy2)/2;
  const tw=ctx.measureText(label).width;
  ctx.fillStyle="rgba(7,9,8,.85)";
  ctx.fillRect(mx-tw/2-7,my-22,tw+14,18);
  ctx.fillStyle="#7FA8B8"; ctx.textAlign="center";
  ctx.fillText(label,mx,my-9);
  ctx.restore();
}

Object.assign(App.services.model,{levelData,clientLevelData,loadLevel});
Object.assign(App.services.renderer,{resize,fitScene});

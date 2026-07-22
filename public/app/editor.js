"use strict";
/* ---------------- level editor (top-down) ----------------
   Rooms are drawn on a flat tile grid; play mode renders the same data iso. */
const ET=34;                                  // editor px per tile at zoom 1
const edCam={x:-120,y:-120,s:1};
let edTool="draw", edSel=null, edDraft=null, edDrag=null, edHover=null, edTemplate=0, edFitDone=false, edRoomN=0, edPropType="table", edPropSel=null, edStairDir="n", edStairFrom=0, edStairTo=1, edStairStyle="stone", edStairSel=null, edRosterSel=null;
const edSelection=new Set();
let edClipboard=[];
const ROOM_PRESET_KEY="palimpsest-room-presets-v1";
const BUILTIN_ROOM_PRESETS=[
  {id:"builtin-small",name:"Small Room",room:{name:"Small Room",rects:[{x:0,y:0,w:4,h:4}],floorA:"#4A4A4E",floorB:"#3F3F44",wall:"#2C2C30",read:"",dm:"",clues:[]}},
  {id:"builtin-hall",name:"Long Hall",room:{name:"Long Hall",rects:[{x:0,y:0,w:8,h:3}],floorA:"#5A2723",floorB:"#4D211E",wall:"#3A2E22",corridor:true,read:"",dm:"",clues:[]}},
  {id:"builtin-l",name:"L Room",room:{name:"L Room",rects:[{x:0,y:0,w:6,h:3},{x:0,y:3,w:3,h:3}],floorA:"#5C4630",floorB:"#4F3C29",wall:"#6B5A33",read:"",dm:"",clues:[]}},
];
let userRoomPresets=[];
try{userRoomPresets=JSON.parse(localStorage.getItem(ROOM_PRESET_KEY)||"[]");if(!Array.isArray(userRoomPresets))userRoomPresets=[];}catch(e){userRoomPresets=[];}
const isoPreview=$("iso-preview"), isoPreviewCanvas=$("iso-preview-cv"), isoPreviewCtx=isoPreviewCanvas.getContext("2d");
const isoPreviewHead=$("iso-preview-head");
const isoPreviewCam={x:0,y:0,s:1};
let isoPreviewFitDirty=true,isoPreviewDirty=true,isoPreviewGeometry="",isoPreviewSelection=null,isoPreviewLastDraw=0;
let isoPreviewDrag=null;
const edTile=(sx,sy)=>{const [wx,wy]=toWorld(sx,sy);return [wx/ET,wy/ET];};
function levelTouched(){markDirty();netMarkLevel();isoPreviewFitDirty=true;isoPreviewDirty=true;}
function newRoomId(){let id; do{id="room"+(++edRoomN);}while(App.document.rooms.some(r=>r.id===id)); return id;}
function newEntityId(prefix,items){
  let n=items.length+1,id=prefix+n;
  while(items.some(item=>item.id===id)) id=prefix+(++n);
  return id;
}
function setEdSelection(ids,primary){
  edSelection.clear();for(const id of ids||[])if(App.document.rooms.some(r=>r.id===id))edSelection.add(id);
  edSel=primary&&edSelection.has(primary)?primary:(edSelection.values().next().value||null);
  isoPreviewDirty=true;
}
function selectedRooms(){return App.document.rooms.filter(r=>edSelection.has(r.id));}
/* undo/redo: whole-level snapshots taken just before each editor mutation */
const edUndoStack=[],edRedoStack=[];
function edSnapshot(){
  edUndoStack.push(JSON.stringify(levelData()));
  if(edUndoStack.length>60) edUndoStack.shift();
  edRedoStack.length=0;
}
function edUndoPop(){
  if(!edUndoStack.length) return;
  edRedoStack.push(JSON.stringify(levelData()));
  loadLevel(JSON.parse(edUndoStack.pop()));
  setEdSelection([]);edDraft=null;edDrag=null;
  markDirty(); renderPanel();
}
function edRedoPop(){
  if(!edRedoStack.length)return;
  edUndoStack.push(JSON.stringify(levelData()));
  loadLevel(JSON.parse(edRedoStack.pop()));
  setEdSelection([]);edDraft=null;edDrag=null;
  markDirty();renderPanel();
}
const rcOverlap=(a,b)=>!(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
function overlapsOtherRooms(rects,excludeId){
  return App.document.rooms.some(o=>o.id!==excludeId && o.rects.some(orc=>rects.some(rc=>rcOverlap(rc,orc))));
}
function groupOverlapsOthers(rooms,selectedIds){
  return rooms.some(room=>App.document.rooms.some(other=>!selectedIds.has(other.id)&&other.rects.some(a=>room.rects.some(b=>rcOverlap(a,b)))));
}
function deleteSelection(){
  if(!edSelection.size)return;
  edSnapshot();
  App.document.rooms=App.document.rooms.filter(room=>!edSelection.has(room.id));
  for(const id of edSelection)delete App.session.verso.revealed[id];
  setEdSelection([]);pruneDoors();levelTouched();renderPanel();
}
function deleteSelectedStair(){
  if(!edStairSel)return false;
  const before=App.document.stairs.length;edSnapshot();App.document.stairs=App.document.stairs.filter(s=>s.id!==edStairSel);
  if(App.document.stairs.length===before){edUndoStack.pop();return false;}
  edStairSel=null;levelTouched();renderPanel();return true;
}
function copySelection(){edClipboard=selectedRooms().map(room=>JSON.parse(JSON.stringify(room)));}
function placeRoomCopies(source,nameSuffix=" Copy"){
  if(!source.length)return;
  const raw=source.map(room=>JSON.parse(JSON.stringify(room)));
  let offset=1,placed=null;
  while(offset<40){
    const candidate=raw.map(room=>({...room,id:newRoomId(),name:room.name+nameSuffix,rects:room.rects.map(r=>({...r,x:r.x+offset,y:r.y+offset}))}));
    if(!groupOverlapsOthers(candidate,new Set())&&!candidate.some((room,i)=>candidate.slice(i+1).some(other=>room.rects.some(a=>other.rects.some(b=>rcOverlap(a,b)))))){placed=candidate;break;}
    offset++;
  }
  if(!placed)return;
  edSnapshot();App.document.rooms.push(...placed);setEdSelection(placed.map(r=>r.id),placed[0].id);levelTouched();renderPanel();
}
function pasteSelection(){placeRoomCopies(edClipboard);}
function duplicateSelection(){const rooms=selectedRooms();if(rooms.length){edClipboard=rooms.map(r=>JSON.parse(JSON.stringify(r)));placeRoomCopies(edClipboard);}}
function roomPresets(){return [...BUILTIN_ROOM_PRESETS,...userRoomPresets];}
function saveRoomPreset(name){
  const rooms=selectedRooms();if(rooms.length!==1)return;
  name=String(name||rooms[0].name).trim();if(!name)return;
  const room=JSON.parse(JSON.stringify(rooms[0])),bb=roomBBox(room);
  delete room.id;room.name=name;room.rects=room.rects.map(r=>({...r,x:r.x-bb.x0,y:r.y-bb.y0}));
  const preset={id:"user-"+Date.now().toString(36),name:room.name,room};
  userRoomPresets.push(preset);try{localStorage.setItem(ROOM_PRESET_KEY,JSON.stringify(userRoomPresets));}catch(e){}
  renderPanel();
}
function placeRoomPreset(id){
  const preset=roomPresets().find(item=>item.id===id);if(!preset)return;
  const [fi,fj]=edTile(W/2,H/2),room=JSON.parse(JSON.stringify(preset.room));
  const bb=roomBBox(room),dx=Math.floor(fi)-bb.x0,dy=Math.floor(fj)-bb.y0;
  room.rects=room.rects.map(r=>({...r,x:r.x+dx,y:r.y+dy}));
  placeRoomCopies([room],"");
}
function deleteRoomPreset(id){
  if(!id.startsWith("user-"))return;
  userRoomPresets=userRoomPresets.filter(item=>item.id!==id);try{localStorage.setItem(ROOM_PRESET_KEY,JSON.stringify(userRoomPresets));}catch(e){}
  renderPanel();
}
function nudgeSelection(dx,dy){
  const rooms=selectedRooms();if(!rooms.length)return;
  const ids=new Set(rooms.map(r=>r.id)),orig=rooms.map(r=>r.rects.map(c=>({...c})));
  edSnapshot();
  rooms.forEach(r=>r.rects=r.rects.map(c=>({...c,x:c.x+dx,y:c.y+dy})));
  if(groupOverlapsOthers(rooms,ids)){rooms.forEach((r,i)=>r.rects=orig[i]);edUndoStack.pop();return;}
  pruneDoors();levelTouched();renderPanel();
}
function rectTouchesRoom(rc,r){ // shares an edge with (or overlaps) the room — keeps rooms contiguous
  const s=new Set(roomTiles(r).map(([i,j])=>i+","+j));
  for(let i=rc.x;i<rc.x+rc.w;i++)for(let j=rc.y;j<rc.y+rc.h;j++){
    if(s.has(i+","+j)||s.has((i+1)+","+j)||s.has((i-1)+","+j)||s.has(i+","+(j+1))||s.has(i+","+(j-1))) return true;
  }
  return false;
}
function pruneDoors(){ // drop doors left stranded when rooms move or die
  App.document.doors=App.document.doors.filter(d=>{
    const probes=d.dir==="h"?[[d.x+.5,d.y-.5],[d.x+.5,d.y+.5]]:[[d.x-.5,d.y+.5],[d.x+.5,d.y+.5]];
    return probes.some(([i,j])=>roomAtTile(i,j));
  });
}
function draftRect(){
  const a={i:Math.floor(edDraft.ai),j:Math.floor(edDraft.aj)};
  const b={i:Math.floor(edDraft.bi),j:Math.floor(edDraft.bj)};
  return {x:Math.min(a.i,b.i), y:Math.min(a.j,b.j), w:Math.abs(b.i-a.i)+1, h:Math.abs(b.j-a.j)+1};
}
function edFit(){
  if(!(W>0&&H>0)) return;
  let minX=0,minY=0,maxX=24,maxY=18;
  if(App.document.rooms.length){
    minX=1e9;minY=1e9;maxX=-1e9;maxY=-1e9;
    for(const r of App.document.rooms){
      const bb=roomBBox(r);
      minX=Math.min(minX,bb.x0); minY=Math.min(minY,bb.y0);
      maxX=Math.max(maxX,bb.x1); maxY=Math.max(maxY,bb.y1);
    }
  }
  const bw=(maxX-minX+4)*ET, bh=(maxY-minY+4)*ET;
  edCam.s=Math.min(W/bw,H/bh);
  edCam.x=(minX-2)*ET-(W/edCam.s-bw)/2;
  edCam.y=(minY-2)*ET-(H/edCam.s-bh)/2;
  updZoom();
}
function fitIsoPreview(width,height){
  if(!App.document.rooms.length&&!App.document.stairs.length){isoPreviewCam.x=-width/2;isoPreviewCam.y=-height/2;isoPreviewCam.s=1;return;}
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
  const rects=[...App.document.rooms.flatMap(room=>room.rects),...App.document.stairs];
  for(const rect of rects){
    for(const [i,j] of [[rect.x,rect.y],[rect.x+rect.w,rect.y],[rect.x+rect.w,rect.y+rect.h],[rect.x,rect.y+rect.h]]){
      minX=Math.min(minX,isoX(i,j));maxX=Math.max(maxX,isoX(i,j));
      minY=Math.min(minY,isoY(i,j));maxY=Math.max(maxY,isoY(i,j));
    }
  }
  const bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY+70);
  isoPreviewCam.s=Math.min(width/bw,height/bh)*.82;
  isoPreviewCam.x=minX-(width/isoPreviewCam.s-bw)/2;
  isoPreviewCam.y=minY-42-(height/isoPreviewCam.s-bh)/2;
}
function renderEditorPreview(){
  if(App.session.mode!=="edit"||isoPreview.classList.contains("collapsed")) return;
  const rect=isoPreviewCanvas.getBoundingClientRect(),width=rect.width,height=rect.height;
  if(!(width>0&&height>0)) return;
  const geometry=App.document.rooms.map(room=>room.rects.map(r=>[r.x,r.y,r.w,r.h])).flat(2).join(",")+"|"+App.document.stairs.map(s=>[s.x,s.y,s.w,s.h,s.dir,s.from,s.to]).flat().join(",");
  if(geometry!==isoPreviewGeometry){isoPreviewGeometry=geometry;isoPreviewFitDirty=true;isoPreviewDirty=true;}
  const selectionKey=[...edSelection].sort().join(",");
  if(selectionKey!==isoPreviewSelection){isoPreviewSelection=selectionKey;isoPreviewDirty=true;}
  const dpr=Math.min(devicePixelRatio||1,2),pixelW=Math.round(width*dpr),pixelH=Math.round(height*dpr);
  if(isoPreviewCanvas.width!==pixelW||isoPreviewCanvas.height!==pixelH){
    isoPreviewCanvas.width=pixelW;isoPreviewCanvas.height=pixelH;isoPreviewFitDirty=true;isoPreviewDirty=true;
  }
  if(!isoPreviewDirty&&tNow-isoPreviewLastDraw<100) return;
  if(isoPreviewFitDirty){fitIsoPreview(width,height);isoPreviewFitDirty=false;}
  isoPreviewDirty=false;isoPreviewLastDraw=tNow;
  isoPreview.classList.toggle("empty",!App.document.rooms.length&&!App.document.stairs.length);
  const oldCtx=ctx,oldW=W,oldH=H,oldView=RVIEW,oldCam=CAMOVR,oldSel=App.session.selRoom,oldTokens=App.session.verso.tokens;
  ctx=isoPreviewCtx;W=width;H=height;RVIEW="dm";CAMOVR=isoPreviewCam;App.session.selRoom=edSel;App.session.verso.tokens=[];
  try{
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    drawVerso();
  }finally{
    ctx=oldCtx;W=oldW;H=oldH;RVIEW=oldView;CAMOVR=oldCam;App.session.selRoom=oldSel;App.session.verso.tokens=oldTokens;
  }
}
function clampIsoPreview(){
  if(!isoPreview.classList.contains("floating")) return;
  const rect=isoPreview.getBoundingClientRect(),pad=8;
  isoPreview.style.left=Math.max(pad,Math.min(innerWidth-rect.width-pad,rect.left))+"px";
  isoPreview.style.top=Math.max(pad,Math.min(innerHeight-rect.height-pad,rect.top))+"px";
}
$("iso-preview-pop").onclick=()=>{
  const button=$("iso-preview-pop"),floating=!isoPreview.classList.contains("floating");
  if(floating){
    const rect=isoPreview.getBoundingClientRect();
    isoPreview.classList.add("floating");
    isoPreview.style.left=rect.left+"px";isoPreview.style.top=rect.top+"px";
    isoPreview.style.right="auto";isoPreview.style.bottom="auto";
  }else{
    isoPreview.classList.remove("floating");
    isoPreview.style.left="";isoPreview.style.top="";isoPreview.style.right="";isoPreview.style.bottom="";
  }
  button.textContent=floating?"↙":"↗";button.title=floating?"Dock preview":"Pop out preview";
  button.setAttribute("aria-label",button.title);button.setAttribute("aria-pressed",String(floating));
  isoPreviewFitDirty=true;isoPreviewDirty=true;requestAnimationFrame(clampIsoPreview);
};
$("iso-preview-expand").onclick=()=>{
  const button=$("iso-preview-expand"),expanded=isoPreview.classList.toggle("expanded");
  if(isoPreview.classList.contains("collapsed")) $("iso-preview-collapse").click();
  button.title=expanded?"Restore preview size":"Expand preview size";
  button.setAttribute("aria-label",button.title);button.setAttribute("aria-pressed",String(expanded));
  isoPreviewFitDirty=true;isoPreviewDirty=true;requestAnimationFrame(clampIsoPreview);
};
$("iso-preview-collapse").onclick=()=>{
  const collapsed=isoPreview.classList.toggle("collapsed"),button=$("iso-preview-collapse");
  button.textContent=collapsed?"▴":"▾";button.title=collapsed?"Show preview canvas":"Collapse preview canvas";
  button.setAttribute("aria-label",button.title);button.setAttribute("aria-pressed",String(collapsed));
  if(!collapsed){isoPreviewFitDirty=true;isoPreviewDirty=true;}
};
isoPreviewHead.addEventListener("pointerdown",e=>{
  if(!isoPreview.classList.contains("floating")||e.target.closest("button")) return;
  const rect=isoPreview.getBoundingClientRect();
  isoPreviewDrag={dx:e.clientX-rect.left,dy:e.clientY-rect.top};
  isoPreviewHead.setPointerCapture(e.pointerId);e.preventDefault();
});
addEventListener("pointermove",e=>{
  if(!isoPreviewDrag) return;
  const rect=isoPreview.getBoundingClientRect(),pad=8;
  isoPreview.style.left=Math.max(pad,Math.min(innerWidth-rect.width-pad,e.clientX-isoPreviewDrag.dx))+"px";
  isoPreview.style.top=Math.max(pad,Math.min(innerHeight-rect.height-pad,e.clientY-isoPreviewDrag.dy))+"px";
});
const stopIsoPreviewDrag=e=>{
  if(!isoPreviewDrag) return;
  isoPreviewDrag=null;
  if(isoPreviewHead.hasPointerCapture(e.pointerId)) isoPreviewHead.releasePointerCapture(e.pointerId);
};
addEventListener("pointerup",stopIsoPreviewDrag);
addEventListener("pointercancel",stopIsoPreviewDrag);
addEventListener("resize",()=>{clampIsoPreview();isoPreviewFitDirty=true;isoPreviewDirty=true;});
function drawEditor(){
  const c=edCam;
  ctx.fillStyle="#0C1310"; ctx.fillRect(0,0,W,H);
  ctx.save();
  ctx.scale(c.s,c.s); ctx.translate(-c.x,-c.y);
  const i0=Math.floor(c.x/ET)-1, i1=Math.ceil((c.x+W/c.s)/ET)+1;
  const j0=Math.floor(c.y/ET)-1, j1=Math.ceil((c.y+H/c.s)/ET)+1;
  ctx.lineWidth=1/c.s; ctx.strokeStyle="rgba(200,161,78,.09)";
  ctx.beginPath();
  for(let i=i0;i<=i1;i++){ctx.moveTo(i*ET,j0*ET);ctx.lineTo(i*ET,j1*ET);}
  for(let j=j0;j<=j1;j++){ctx.moveTo(i0*ET,j*ET);ctx.lineTo(i1*ET,j*ET);}
  ctx.stroke();
  // origin cross
  ctx.strokeStyle="rgba(200,161,78,.3)";
  ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(6,0);ctx.moveTo(0,-6);ctx.lineTo(0,6);ctx.stroke();
  // rooms (unions of rects, boundary-stroked)
  for(const r of App.document.rooms){
    const rev=!!App.session.verso.revealed[r.id];
    ctx.fillStyle=r.floorA; ctx.globalAlpha=.92;
    for(const rc of r.rects) ctx.fillRect(rc.x*ET,rc.y*ET,rc.w*ET,rc.h*ET);
    ctx.globalAlpha=1;
    if(r.battleGrid==="square"){
      ctx.strokeStyle="rgba(233,226,206,.2)";ctx.lineWidth=1/c.s;ctx.beginPath();
      for(const [i,j]of roomTiles(r))ctx.rect(i*ET,j*ET,ET,ET);ctx.stroke();
    }
    ctx.beginPath();
    for(const [x1,y1,x2,y2] of roomEdges(r)){ctx.moveTo(x1*ET,y1*ET);ctx.lineTo(x2*ET,y2*ET);}
    ctx.lineWidth=(edSelection.has(r.id)?3:2)/c.s;
    ctx.strokeStyle=edSelection.has(r.id)?"#E9E2CE":r.wall;
    ctx.stroke();
    const bb=roomBBox(r);
    ctx.font="600 10px 'IBM Plex Mono', monospace";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillStyle="rgba(7,9,8,.85)";
    ctx.fillText(r.name.toUpperCase()+(rev?"":" ○"),(bb.x0+bb.x1)/2*ET,(bb.y0+bb.y1)/2*ET);
  }
  // doors / openings (line widths in screen px so they stay clickable targets at any zoom)
  for(const d of App.document.doors){
    const len=d.len||1;
    const x2=d.dir==="h"?d.x+len:d.x, y2=d.dir==="h"?d.y:d.y+len;
    ctx.beginPath();
    ctx.moveTo(d.x*ET,d.y*ET); ctx.lineTo(x2*ET,y2*ET);
    if(d.type==="open"){ctx.strokeStyle="#2B2125";ctx.lineWidth=7/c.s;}
    else{ctx.strokeStyle="#C8A14E";ctx.lineWidth=4/c.s;ctx.setLineDash([6/c.s,4/c.s]);}
    ctx.stroke(); ctx.setLineDash([]);
  }
  // door tool: highlight the edge a click would toggle
  if(edTool==="door" && edHover){
    const hx2=edHover.dir==="h"?edHover.x+1:edHover.x, hy2=edHover.dir==="h"?edHover.y:edHover.y+1;
    const existing=App.document.doors.find(o=>o.x===edHover.x&&o.y===edHover.y&&o.dir===edHover.dir);
    ctx.beginPath();
    ctx.moveTo(edHover.x*ET,edHover.y*ET); ctx.lineTo(hx2*ET,hy2*ET);
    ctx.strokeStyle=existing?"#8A2E25":"#E9E2CE";
    ctx.lineWidth=6/c.s; ctx.globalAlpha=.85; ctx.stroke(); ctx.globalAlpha=1;
  }
  // furniture glyphs
  ctx.font="600 9px 'IBM Plex Mono', monospace";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  for(const pr of (App.document.level.props||[])){
    if(pr.footprint){
      const fp=pr.footprint,x=pr.x*ET,y=pr.y*ET,w=fp.w*ET,h=fp.h*ET;
      ctx.fillStyle=pr.terrain==="hazard"?"rgba(138,46,37,.34)":pr.terrain==="overhead"?"rgba(127,168,184,.18)":"rgba(200,161,78,.22)";
      ctx.strokeStyle=pr.id===edPropSel?"#E9E2CE":"#C8A14E";ctx.lineWidth=2/c.s;ctx.beginPath();
      if(fp.shape==="circle")ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,7);else ctx.rect(x,y,w,h);ctx.fill();ctx.stroke();
    }
    ctx.fillStyle=pr.id===edPropSel?"#E9E2CE":"rgba(200,161,78,.75)";
    ctx.fillRect((pr.x+.2)*ET,(pr.y+.2)*ET,ET*.6,ET*.6);
    if(pr.focus){ctx.strokeStyle="#C8A14E";ctx.lineWidth=2/c.s;ctx.strokeRect((pr.x+.12)*ET,(pr.y+.12)*ET,ET*.76,ET*.76);}
    ctx.fillStyle="#070908";
    ctx.fillText(PROP_LIB[pr.t]?PROP_LIB[pr.t].n[0]:"?",(pr.x+.5)*ET,(pr.y+.55)*ET);
  }
  for(const stair of (App.document.stairs||[])){
    const stairColors={stone:"rgba(119,113,104,.62)",wood:"rgba(118,91,62,.68)",metal:"rgba(105,114,122,.68)"};
    ctx.fillStyle=stairColors[stair.style]||stairColors.stone;ctx.fillRect(stair.x*ET,stair.y*ET,stair.w*ET,stair.h*ET);
    const alongX=stair.dir==="e"||stair.dir==="w",steps=(alongX?stair.w:stair.h)*3;
    ctx.strokeStyle="rgba(7,9,8,.48)";ctx.lineWidth=1/c.s;ctx.beginPath();
    for(let k=1;k<steps;k++){
      if(alongX){const x=(stair.x+k/3)*ET;ctx.moveTo(x,stair.y*ET);ctx.lineTo(x,(stair.y+stair.h)*ET);}
      else{const y=(stair.y+k/3)*ET;ctx.moveTo(stair.x*ET,y);ctx.lineTo((stair.x+stair.w)*ET,y);}
    }
    ctx.stroke();
    ctx.strokeStyle=stair.id===edStairSel?"#E9E2CE":"#7FA8B8";ctx.lineWidth=(stair.id===edStairSel?4:2)/c.s;ctx.strokeRect(stair.x*ET,stair.y*ET,stair.w*ET,stair.h*ET);
    const arrows={n:"↑",e:"→",s:"↓",w:"←"};ctx.fillStyle="#E9E2CE";ctx.font=`600 ${Math.max(12,18/c.s)}px 'IBM Plex Mono', monospace`;
    ctx.fillText(arrows[stair.dir],(stair.x+stair.w/2)*ET,(stair.y+stair.h/2)*ET);
    if(stair.id===edStairSel){const hs=12/c.s;ctx.fillStyle="#E9E2CE";ctx.fillRect((stair.x+stair.w)*ET-hs/2,(stair.y+stair.h)*ET-hs/2,hs,hs);}
  }
  // draft rect
  if(edDraft){
    const rc=draftRect();
    ctx.fillStyle="rgba(200,161,78,.2)";
    ctx.fillRect(rc.x*ET,rc.y*ET,rc.w*ET,rc.h*ET);
    ctx.strokeStyle="#C8A14E"; ctx.lineWidth=2/c.s; ctx.setLineDash([6/c.s,4/c.s]);
    ctx.strokeRect(rc.x*ET,rc.y*ET,rc.w*ET,rc.h*ET); ctx.setLineDash([]);
  }
  // resize handles: one per rect of the selected room
  const sr=edSelection.size===1?App.document.rooms.find(r=>r.id===edSel):null;
  if(sr){
    const hs=9/c.s;
    ctx.fillStyle="#E9E2CE";
    for(const rc of sr.rects){
      ctx.fillRect((rc.x+rc.w)*ET-hs/2,(rc.y+rc.h)*ET-hs/2,hs,hs);
    }
  }
  // token ghosts for reference
  for(const t of App.session.verso.tokens){
    ctx.globalAlpha=.55;
    ctx.beginPath(); ctx.arc(t.x*ET,t.y*ET,6/Math.max(c.s,.5),0,7);
    ctx.fillStyle=t.color; ctx.fill();
    ctx.globalAlpha=1;
  }
  ctx.restore();
}
function edDown(e){
  const [fi,fj]=edTile(e.offsetX,e.offsetY);
  if(edTool==="door" && e.button===2){edRemoveDoor(fi,fj);return;}
  if(edTool==="prop" && e.button===2){edProp(fi,fj,true);return;}
  if(edTool==="stair" && e.button===2){edRemoveStair(fi,fj);return;}
  if(e.button===1 || e.button===2 || spaceDown){
    panRef={x:e.offsetX,y:e.offsetY,cx:cam().x,cy:cam().y};
    return;
  }
  // Existing props are directly selectable regardless of the active room tool.
  // Use their visible editor glyph rather than the whole tile as the hit target.
  const hitProp=App.document.level.props.find(pr=>{
    const [sx,sy]=toScreen((pr.x+.5)*ET,(pr.y+.5)*ET);
    return Math.hypot(e.offsetX-sx,e.offsetY-sy)<=Math.max(12,ET*edCam.s*.38);
  });
  if(hitProp){
    edTool="prop";edPropSel=hitProp.id;edPropType=hitProp.t;edStairSel=null;setEdSelection([]);
    $("st-hint").textContent="Edit the selected prop in the panel · click an empty tile to place another · right-click to remove";
    renderPanel();
    requestAnimationFrame(()=>$("ed-prop-editor")?.scrollIntoView({block:"nearest",behavior:"smooth"}));
    return;
  }
  if(edTool==="door"){edToggleDoor(fi,fj);return;}
  if(edTool==="prop"){edProp(fi,fj,false);return;}
  if(edTool==="stair"){
    const selected=App.document.stairs.find(s=>s.id===edStairSel);
    if(selected){
      const [sx,sy]=toScreen((selected.x+selected.w)*ET,(selected.y+selected.h)*ET);
      if(Math.hypot(e.offsetX-sx,e.offsetY-sy)<18){edSnapshot();edDrag={mode:"stairresize",stair:selected,fi,fj,orig:{...selected}};return;}
    }
    const tol=Math.max(.2,12/(ET*edCam.s));
    const stair=App.document.stairs.find(s=>fi>=s.x-tol&&fi<=s.x+s.w+tol&&fj>=s.y-tol&&fj<=s.y+s.h+tol);
    if(stair){edStairSel=stair.id;edStairDir=stair.dir;edStairFrom=stair.from;edStairTo=stair.to;edStairStyle=stair.style||"stone";edSnapshot();edDrag={mode:"stairmove",stair,fi,fj,orig:{...stair}};renderPanel();return;}
    edStairSel=null;
    edDraft={ai:fi,aj:fj,bi:fi,bj:fj,sx:e.offsetX,sy:e.offsetY,moved:false,stair:true};return;
  }
  // resize handles of current selection: one per rect (both draw & select tools)
  const sr=App.document.rooms.find(r=>r.id===edSel);
  if(sr){
    const lim=Math.min(14, ET*edCam.s*.75);   // don't let handles eat room-drags when zoomed out
    for(let ri=0;ri<sr.rects.length;ri++){
      const rc=sr.rects[ri];
      const [sx,sy]=toScreen((rc.x+rc.w)*ET,(rc.y+rc.h)*ET);
      if(Math.hypot(e.offsetX-sx,e.offsetY-sy)<lim){
        edSnapshot();
        edDrag={mode:"resize",room:sr,ri,orig:sr.rects.map(c=>({...c}))};
        return;
      }
    }
  }
  const r=roomAtTile(fi,fj);
  // alt/option-click a section of the selected room removes that rect
  if(e.altKey && r && sr && r===sr && sr.rects.length>1){
    const ri=sr.rects.findIndex(rc=>fi>=rc.x&&fi<rc.x+rc.w&&fj>=rc.y&&fj<rc.y+rc.h);
    if(ri>=0){edSnapshot(); sr.rects.splice(ri,1); pruneDoors(); levelTouched();}
    return;
  }
  if(r){
    if(e.shiftKey){
      if(edSelection.has(r.id))edSelection.delete(r.id);else edSelection.add(r.id);
      edSel=edSelection.has(r.id)?r.id:(edSelection.values().next().value||null);isoPreviewDirty=true;renderPanel();return;
    }
    if(!edSelection.has(r.id))setEdSelection([r.id],r.id);
    edSnapshot();
    const rooms=selectedRooms();
    edDrag={mode:"groupmove",rooms,ids:new Set(rooms.map(room=>room.id)),fi,fj,orig:rooms.map(room=>room.rects.map(c=>({...c})))};
    renderPanel();
    return;
  }
  if(edTool==="draw"){
    // shift+drag on empty grid extends the selected room (L-shapes etc.)
    edDraft={ai:fi,aj:fj,bi:fi,bj:fj,sx:e.offsetX,sy:e.offsetY,moved:false,
             addTo:(e.shiftKey&&sr)?sr.id:null};
    return;
  }
  if(edSel){setEdSelection([]);renderPanel();}
  panRef={x:e.offsetX,y:e.offsetY,cx:cam().x,cy:cam().y};
}
function edMove(e){
  const [fi,fj]=edTile(e.offsetX,e.offsetY);
  $("st-pos").textContent=`tile ${Math.floor(fi)}, ${Math.floor(fj)}`;
  edHover = edTool==="door" ? edNearestEdge(fi,fj) : null;
  if(!e.buttons) return;
  if(edDraft){
    if(Math.hypot(e.offsetX-edDraft.sx,e.offsetY-edDraft.sy)>4) edDraft.moved=true;
    edDraft.bi=fi; edDraft.bj=fj;
    return;
  }
  if(edDrag){
    if(edDrag.mode==="groupmove"){
      const di=Math.round(fi-edDrag.fi), dj=Math.round(fj-edDrag.fj);
      edDrag.rooms.forEach((room,i)=>room.rects=edDrag.orig[i].map(c=>({x:c.x+di,y:c.y+dj,w:c.w,h:c.h})));
    }else if(edDrag.mode==="stairmove"){
      edDrag.stair.x=edDrag.orig.x+Math.round(fi-edDrag.fi);edDrag.stair.y=edDrag.orig.y+Math.round(fj-edDrag.fj);
    }else if(edDrag.mode==="stairresize"){
      edDrag.stair.w=Math.max(1,Math.round(fi)-edDrag.stair.x);edDrag.stair.h=Math.max(1,Math.round(fj)-edDrag.stair.y);
    }else{
      const r=edDrag.room;
      const rc=r.rects[edDrag.ri];
      rc.w=Math.max(1,Math.round(fi)-rc.x);
      rc.h=Math.max(1,Math.round(fj)-rc.y);
    }
    return;
  }
  if(panRef){
    const c=cam();
    c.x=panRef.cx-(e.offsetX-panRef.x)/c.s;
    c.y=panRef.cy-(e.offsetY-panRef.y)/c.s;
  }
}
function edUp(){
  if(edDraft){
    if(!edDraft.moved){ // a plain click isn't a room — deselect instead
      edDraft=null;
      if(edSel){setEdSelection([]);renderPanel();}
      return;
    }
    const rc=draftRect(), addTo=edDraft.addTo;
    const isStair=edDraft.stair;
    edDraft=null;
    if(isStair){
      edSnapshot();const stair={id:newEntityId("stair",App.document.stairs),...rc,dir:edStairDir,from:edStairFrom,to:edStairTo,style:edStairStyle};App.document.stairs.push(stair);edStairSel=stair.id;levelTouched();renderPanel();return;
    }
    if(addTo){
      const room=App.document.rooms.find(r=>r.id===addTo);
      if(room && !overlapsOtherRooms([rc],room.id) && rectTouchesRoom(rc,room)){
        edSnapshot(); room.rects.push(rc); levelTouched();
      }
    }else if(!overlapsOtherRooms([rc],null)){
      edSnapshot();
      const t=TEMPLATES[edTemplate];
      const room={id:newRoomId(), name:"New Room", sub:"", rects:[rc],
        floorA:t.floorA, floorB:t.floorB, wall:t.wall, read:"", dm:"", clues:[]};
      if(t.corridor) room.corridor=true;
      App.document.rooms.push(room);setEdSelection([room.id],room.id);
      levelTouched();
    }
    renderPanel();
    return;
  }
  if(edDrag){
    if(edDrag.mode==="groupmove"){
      if(groupOverlapsOthers(edDrag.rooms,edDrag.ids))edDrag.rooms.forEach((room,i)=>room.rects=edDrag.orig[i]);
      const changed=edDrag.rooms.some((room,i)=>JSON.stringify(room.rects)!==JSON.stringify(edDrag.orig[i]));
      if(!changed)edUndoStack.pop();else{pruneDoors();levelTouched();}
    }else if(edDrag.mode==="stairmove"||edDrag.mode==="stairresize"){
      const changed=JSON.stringify(edDrag.stair)!==JSON.stringify(edDrag.orig);
      if(!changed)edUndoStack.pop();else levelTouched();
    }else{
      const r=edDrag.room;
      if(overlapsOtherRooms(r.rects,r.id))r.rects=edDrag.orig;
      if(JSON.stringify(r.rects)===JSON.stringify(edDrag.orig))edUndoStack.pop();else{pruneDoors();levelTouched();}
    }
    edDrag=null;
    return;
  }
  panRef=null;
}
function edNearestEdge(fi,fj){
  // tolerance in tiles, but never less than ~12 screen px — zoomed out, a
  // fixed tile fraction becomes an unclickably thin band
  const tol=Math.min(.5, Math.max(.35, 12/(ET*edCam.s)));
  const dv=Math.abs(fi-Math.round(fi)), dh=Math.abs(fj-Math.round(fj));
  if(Math.min(dv,dh)>tol) return null;
  return dv<=dh ? {x:Math.round(fi),y:Math.floor(fj),dir:"v"} : {x:Math.floor(fi),y:Math.round(fj),dir:"h"};
}
function edToggleDoor(fi,fj){
  const d=edNearestEdge(fi,fj);
  if(!d) return;
  edSnapshot();
  const i=App.document.doors.findIndex(o=>o.x===d.x&&o.y===d.y&&o.dir===d.dir);
  if(i<0) App.document.doors.push({...d,id:newEntityId("door",App.document.doors),type:"door"}); // none -> door
  else if(App.document.doors[i].type==="door") App.document.doors[i].type="open";     // door -> opening
  else App.document.doors.splice(i,1);                                   // opening -> none
  levelTouched();
}
function edRemoveDoor(fi,fj){
  const d=edNearestEdge(fi,fj);
  if(!d) return;
  const i=App.document.doors.findIndex(o=>o.x===d.x&&o.y===d.y&&o.dir===d.dir);
  if(i>=0){edSnapshot(); App.document.doors.splice(i,1); levelTouched();}
}
function edProp(fi,fj,removeOnly){
  const x=Math.floor(fi), y=Math.floor(fj);
  const i=App.document.level.props.findIndex(p=>Math.floor(p.x)===x&&Math.floor(p.y)===y);
  if(i>=0){
    if(removeOnly){edSnapshot();if(App.document.level.props[i].id===edPropSel)edPropSel=null;App.document.level.props.splice(i,1);levelTouched();renderPanel();}
    else{edPropSel=App.document.level.props[i].id;edPropType=App.document.level.props[i].t;renderPanel();}
    return;
  }
  if(removeOnly) return;
  edSnapshot();
  const prop={id:newEntityId("prop",App.document.level.props),t:edPropType,x,y,scale:1};
  App.document.level.props.push(prop);edPropSel=prop.id;
  levelTouched();renderPanel();
}
function edRemoveStair(fi,fj){
  const i=App.document.stairs.findIndex(s=>fi>=s.x&&fi<s.x+s.w&&fj>=s.y&&fj<s.y+s.h);
  if(i>=0){edSnapshot();if(App.document.stairs[i].id===edStairSel)edStairSel=null;App.document.stairs.splice(i,1);levelTouched();renderPanel();}
}
function edSetTool(t){
  edTool=t; edDraft=null; edDrag=null; edHover=null;
  if(t!=="stair")edStairSel=null;
  if(t!=="prop")edPropSel=null;
  const hints={draw:"Drag empty grid = new room · Shift+drag extends selection · Alt+click removes a section · scroll pans · pinch zooms",
    select:"Click selects · drag moves · corner squares resize each section · Delete removes room · Ctrl/Cmd+Z undoes",
    door:"Click an edge: once = door, twice = open passage, thrice = remove · right-click = remove",
    stair:"Click stairs to edit · drag stairs to move · drag the corner handle to resize · right-click = remove",
    prop:"Click furniture to edit it · click an empty tile to place · right-click to remove"};
  $("st-hint").textContent=hints[t];
  renderPanel();
}
function setMode(m){
  if(m==="edit" && NET.mode==="client") return;
  App.session.mode=m;
  document.body.classList.toggle("editing",m==="edit");
  $("tab-edit").classList.toggle("on",m==="edit");
  if(m==="edit"){
    App.session.scene="verso"; App.session.selToken=null;
    $("tab-map").classList.remove("on"); $("tab-verso").classList.remove("on");
    if(!edFitDone || !isFinite(edCam.s) || edCam.s<=0){edFit();edFitDone=true;}
    $("st-hint").textContent="Drag empty grid to draw a room · click to select · scroll pans · pinch (or ⌘+scroll) zooms";
    $("st-view").textContent="EDITOR";
  }else{
    $("tab-verso").classList.toggle("on",App.session.scene==="verso");
    $("tab-map").classList.toggle("on",App.session.scene==="map");
    setView(App.session.view);
    setTool(App.session.tool);
  }
  updZoom(); renderPanel();
}

/* ---------------- tools / tabs / view ---------------- */
function setTool(t){
  App.session.tool=t;
  for(const id of ["select","ruler","fogr","fogh"]) $("t-"+id).classList.toggle("on",id===t);
  cv.className = "tool-"+t;
  const hints={select:"Drag tokens · drag space to pan · wheel to zoom",
    ruler:"Drag to measure (5 ft per square/tile)",
    fogr:"Paint to reveal the map to players",
    fogh:"Paint to hide the map again"};
  $("st-hint").textContent=hints[t];
}
$("t-select").onclick=()=>setTool("select");
$("t-ruler").onclick=()=>setTool("ruler");
$("t-fogr").onclick=()=>setTool("fogr");
$("t-fogh").onclick=()=>setTool("fogh");
$("t-fit").onclick=()=>{if(App.session.mode==="edit")edFit();else fitScene();};

function setScene(s){
  if(App.session.mode==="edit"){ App.session.mode="play";document.body.classList.remove("editing");$("tab-edit").classList.remove("on");setView(App.session.view);setTool(App.session.tool); }
  App.session.scene=s; App.session.selToken=null;
  document.body.classList.toggle("mapscene",s==="map");
  $("tab-map").classList.toggle("on",s==="map");
  $("tab-verso").classList.toggle("on",s==="verso");
  const fogOK = s==="map";
  $("t-fogr").disabled=!fogOK; $("t-fogh").disabled=!fogOK;
  if(!fogOK && (App.session.tool==="fogr"||App.session.tool==="fogh")) setTool("select");
  fitScene(); updZoom(); renderPanel();
}
$("tab-map").onclick=()=>setScene("map");
$("tab-verso").onclick=()=>setScene("verso");
$("tab-edit").onclick=()=>setMode("edit");

function setView(v){
  App.session.view=v;
  document.body.classList.toggle("playerview",v==="pl");
  $("st-view").textContent = v==="dm" ? "DM VIEW" : "PLAYER VIEW";
  renderPanel();
}
function setLevelView(v,focus){
  if(NET.mode==="client")return;
  App.session.verso.view=v==="tactical"?"tactical":"isometric";
  document.body.classList.toggle("tacticalscene",App.session.verso.view==="tactical");
  $("view-iso").classList.toggle("on",App.session.verso.view==="isometric");
  $("view-tactical").classList.toggle("on",App.session.verso.view==="tactical");
  if(App.session.scene==="verso"){
    if(focus&&App.session.verso.view==="tactical")focusRoom(focus);else fitScene();
    updZoom();netMark();
  }
}
$("view-iso").onclick=()=>setLevelView("isometric");
$("view-tactical").onclick=()=>setLevelView("tactical",App.document.rooms.find(r=>r.id===App.session.selRoom));
$("stage-view-toggle").onclick=()=>setLevelView("isometric");

/* ---------------- map import ---------------- */
function loadImageFile(file){
  const rd=new FileReader();
  rd.onload=()=>loadImageURL(rd.result,file.name);
  rd.readAsDataURL(file);
}
function loadImageURL(url,name){
  const img=new Image();
  img.onload=()=>{
    App.session.map.img=img; App.session.map.imgURL=url; App.session.map.name=name||"map";
    const f=document.createElement("canvas");
    f.width=img.width; f.height=img.height;
    const fc=f.getContext("2d");
    fc.fillStyle="#04130C"; fc.fillRect(0,0,f.width,f.height);
    App.session.map.fog=f;
    if(App.session.map.tokens.length===0){
      const g=App.session.map.grid.size;
      App.document.level.roster.filter(p=>p.pc).slice(0,6).forEach((p,i)=>{
        App.session.map.tokens.push(mkTok(p.name,p.letter,p.color,g*(1.5+i),g*1.5,1,true));
      });
    }
    setScene("map"); markDirty();
  };
  img.src=url;
}
$("file-img").onchange=e=>{if(e.target.files[0]) loadImageFile(e.target.files[0]);e.target.value="";};
const stage=$("stage");
stage.addEventListener("dragover",e=>{e.preventDefault();stage.classList.add("dragging");});
stage.addEventListener("dragleave",()=>stage.classList.remove("dragging"));
stage.addEventListener("drop",e=>{
  e.preventDefault(); stage.classList.remove("dragging");
  const f=[...e.dataTransfer.files].find(f=>f.type.startsWith("image/"));
  if(f) loadImageFile(f);
});

/* ---------------- save / load ---------------- */
const LOCAL_SESSION_KEY="palimpsest-session-v2";
function hideStartScreen(){$("startscreen").classList.remove("show");}
function showStartScreen(){
  let hasLocal=false;
  try{hasLocal=!!localStorage.getItem(LOCAL_SESSION_KEY);}catch(e){}
  if(window.storage&&window.storage.get)hasLocal=true;
  $("start-resume").disabled=!hasLocal;
  $("startscreen").classList.add("show");
}
function newBlankLevel(){
  edUndoStack.length=0;edRedoStack.length=0;edClipboard=[];
  loadLevel({name:"Untitled Level",bg:"#0A0F0C",rooms:[],doors:[],roster:[]});
  App.session.verso.revealed={};App.session.verso.tokens=[];App.session.tracker={order:[],active:0};
  setEdSelection([]);edSetTool("draw");setMode("edit");edFit();levelTouched();hideStartScreen();
}
function startVerso(){
  loadLevel(App.content.VERSO_LEVEL);
  App.session.verso.revealed={...App.content.VERSO_START.revealed};
  App.session.verso.tokens=App.content.VERSO_START.tokens.map(t=>mkTok(t.name,t.letter,t.color,t.x,t.y,t.size,t.pc));
  setScene("verso");hideStartScreen();
}
function startVault(){
  loadLevel(App.content.VAULT_LEVEL);
  App.session.verso.revealed={...App.content.VAULT_START.revealed};
  App.session.verso.tokens=App.content.VAULT_START.tokens.map(t=>mkTok(t.name,t.letter,t.color,t.x,t.y,t.size,t.pc));
  setLevelView("isometric");setScene("verso");hideStartScreen();
}
async function resumeAutosave(){
  try{
    const local=localStorage.getItem(LOCAL_SESSION_KEY);
    if(local){deserialize(JSON.parse(local));hideStartScreen();return true;}
    if(window.storage&&window.storage.get){const remote=await window.storage.get("verso-session");if(remote&&remote.value){deserialize(JSON.parse(remote.value));hideStartScreen();return true;}}
  }catch(e){alert("The autosave could not be restored.");}
  return false;
}
function serialize(){
  return {
    schemaVersion:SESSION_SCHEMA_VERSION, scene:App.session.scene,
    map:{
      name:App.session.map.name, imgURL:App.session.map.imgURL,
      grid:App.session.map.grid, fogOn:App.session.map.fogOn, brush:App.session.map.brush,
      tokens:App.session.map.tokens,
      fogURL: App.session.map.fog ? App.session.map.fog.toDataURL("image/png") : null
    },
    verso:{view:App.session.verso.view,revealed:App.session.verso.revealed, tokens:App.session.verso.tokens},
    level:levelData()
  };
}
function deserialize(d){
    const session=normalizeSession(d,{fallbackRoster:PARTY,fallbackLevel:App.content.VERSO_LEVEL});
    loadLevel(session.level);
    App.session.verso.revealed=session.verso.revealed;
    App.session.verso.view=session.verso.view;
    document.body.classList.toggle("tacticalscene",App.session.verso.view==="tactical");
    $("view-iso").classList.toggle("on",App.session.verso.view==="isometric");
    $("view-tactical").classList.toggle("on",App.session.verso.view==="tactical");
    enforceAlwaysRoomReveal();
    App.session.verso.tokens=session.verso.tokens;
    uid=Math.max(uid,...App.session.verso.tokens.map(t=>t.id+1),1);
    Object.assign(App.session.map.grid,session.map.grid);
    App.session.map.fogOn=session.map.fogOn;
    App.session.map.brush=session.map.brush;
    App.session.map.tokens=session.map.tokens;
    uid=Math.max(uid,...App.session.map.tokens.map(t=>t.id+1),uid);
    // saves from before the PC/claimable flag existed have no `pc` on any token —
    // without a backfill that makes every character look like an NPC to the newer
    // claim-list and room-visibility logic, silently hiding the party from itself.
    // Only trust this for files where NO token has the field yet (a real legacy
    // file), so a deliberately-all-NPC scene loaded from a current save is untouched.
    for(const toks of [App.session.verso.tokens, App.session.map.tokens]){
      if(toks.length && toks.every(t=>t.pc===undefined)){
        const pcNames=new Set([...App.document.level.roster,...PARTY].filter(p=>p.pc).map(p=>p.name));
        for(const t of toks) if(pcNames.has(t.name)) t.pc=true;
      }
    }
    if(session.map.imgURL){
      const img=new Image();
      img.onload=()=>{
        App.session.map.img=img; App.session.map.imgURL=session.map.imgURL; App.session.map.name=session.map.name;
        const f=document.createElement("canvas");
        f.width=img.width;f.height=img.height;
        const fc=f.getContext("2d");
        if(session.map.fogURL){
          const fi=new Image();
          fi.onload=()=>{fc.drawImage(fi,0,0);};
          fi.src=session.map.fogURL;
        }else{fc.fillStyle="#04130C";fc.fillRect(0,0,f.width,f.height);}
        App.session.map.fog=f;
        setScene(session.scene);
      };
      img.src=session.map.imgURL;
    }else{ setScene(session.scene); }
    renderPanel();
}
$("btn-save").onclick=()=>{
  const blob=new Blob([JSON.stringify(serialize())],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="palimpsest-session.json";
  a.click(); URL.revokeObjectURL(a.href);
};
$("btn-load").onclick=()=>$("file-json").click();
$("file-json").onchange=e=>{
  const f=e.target.files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>{try{deserialize(JSON.parse(rd.result));hideStartScreen();}catch(err){alert("That file didn't parse as a saved session.");}};
  rd.readAsText(f); e.target.value="";
};

/* lightweight local autosave; artifact storage remains a compatibility fallback */
let dirty=false;
function markDirty(){dirty=true; netMark();}
async function autosave(){
  if(NET.mode==="client") return;
  if(!dirty) return; dirty=false;
  try{
    const d=serialize();
    try{localStorage.setItem(LOCAL_SESSION_KEY,JSON.stringify(d));}catch(e){}
    if(typeof window.storage!=="undefined" && window.storage && window.storage.set){
      const s=JSON.stringify(d);
      if(s.length>4500000){ d.map.imgURL=null; d.map.fogURL=null; }
      await window.storage.set("verso-session",JSON.stringify(d));
    }
  }catch(e){/* storage unavailable — file save still works */}
}
setInterval(autosave,8000);

Object.assign(App.services.editor,{setTool,setScene,setView,setLevelView,serialize,deserialize,newEntityId,renderEditorPreview,fitIsoPreview,showStartScreen,hideStartScreen,newBlankLevel,startVerso,startVault,resumeAutosave});

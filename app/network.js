"use strict";
/* ---------------- online table (WebRTC via PeerJS) ---------------- */
const NET={mode:null,peer:null,conns:new Map(),code:null,myToken:null,myId:null,
  dirty:false,fogDirty:false,imgStamp:0,diceStamp:0,lastDice:null};
function netMark(){NET.dirty=true;}
function netMarkFog(){NET.fogDirty=true;}
function netMarkLevel(){NET.levelDirty=true;}

/* TURN relay — the deploy worker mints Cloudflare Realtime credentials at /turn.
   Remote players (cellular, different networks) usually can't connect peer-to-peer
   without a relay; the public free TURN servers are all dead. Where /turn isn't
   available (local file, worker not configured) we fall back to STUN only,
   which works on a shared LAN but usually not across the internet. */
let ICE=null;
const ICE_READY=Promise.race([
  (async()=>{
    try{
      const r=await fetch("turn",{cache:"no-store"});
      if(!r.ok) return;
      const d=await r.json();
      let s=d.iceServers;
      if(s&&!Array.isArray(s)) s=[s];
      if(Array.isArray(s)&&s.length) ICE=[{urls:"stun:stun.l.google.com:19302"},...s];
    }catch(e){}
  })(),
  new Promise(r=>setTimeout(r,4000))
]);
function peerOpts(){return ICE?{config:{iceServers:ICE,sdpSemantics:"unified-plan"}}:{};}

function armedEntryAllowed(t,x,y,target){
  if(!t||!t.pc) return false;
  const dx=x-t.x,dy=y-t.y;
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))*4));
  for(let n=0;n<steps;n++){
    const r=roomAtTile(t.x+dx*n/steps,t.y+dy*n/steps);
    if(!r || (r.id!==target.id && !App.session.verso.revealed[r.id])) return false;
  }
  return true;
}
function moveAllowed(x,y,t){
  if(App.session.scene==="verso"){
    const r=roomAtTile(x,y);
    if(!r) return false;
    if(App.session.verso.revealed[r.id] || r.revealMode==="always") return true;
    return r.revealMode==="armed" && armedEntryAllowed(t,x,y,r);
  }
  const m=App.session.map;
  if(!m.img) return false;
  if(x<0||y<0||x>m.img.width||y>m.img.height) return false;
  if(!m.fog||!m.fogOn) return true;
  try{
    const px=m.fog.getContext("2d").getImageData(Math.floor(x),Math.floor(y),1,1).data;
    return px[3]<128; // blocked where fog is opaque
  }catch(e){return true;}
}
function revealRoomOnPcEntry(t,x,y){
  if(App.session.scene!=="verso"||!t||!t.pc) return false;
  const room=roomAtTile(x,y);
  if(!room) return false;
  if(room.revealMode==="always"){
    if(App.session.verso.revealed[room.id]) return false;
    App.session.verso.revealed[room.id]=true;
  }else if(room.revealMode==="armed"){
    App.session.verso.revealed[room.id]=true;
    room.revealMode="manual"; // armed reveal is intentionally one-shot
    netMarkLevel();
  }else return false;
  markDirty(); renderPanel();
  return true;
}

function clientToken(t){
  // NPC stat blocks (AC/HP/attacks/skills) are DM-only; patrol routes are always
  // DM staging info. Clone only when there's actually something to strip.
  if((!t.sheet||t.pc) && !t.patrol && t.pi==null) return t;
  const c={...t};
  if(!t.pc) delete c.sheet;
  delete c.patrol; delete c.pi;
  return c;
}
function lightSnapshot(){
  return {type:"sync",scene:App.session.scene,levelView:App.session.verso.view,revealed:App.session.verso.revealed,
    grid:App.session.map.grid,fogOn:App.session.map.fogOn,
    tokens:{map:App.session.map.tokens.map(clientToken),verso:App.session.verso.tokens.map(clientToken)},
    // hidden initiative entries: players get the position, never the number
    tracker:{order:App.session.tracker.order.map(e=>e.h?{name:e.name,h:1}:e), active:App.session.tracker.active},
    imgStamp:NET.imgStamp,dice:NET.lastDice};
}
function netBroadcast(msg){
  const s=JSON.stringify(msg);
  for(const c of NET.conns.values()){try{c.send(s);}catch(e){}}
}
function sendFullTo(c){
  try{
    c.send(JSON.stringify({type:"level",data:clientLevelData()}));
    c.send(JSON.stringify(lightSnapshot()));
    if(App.session.map.imgURL) c.send(JSON.stringify({type:"img",data:App.session.map.imgURL,stamp:NET.imgStamp}));
    if(App.session.map.fog) c.send(JSON.stringify({type:"fog",data:App.session.map.fog.toDataURL("image/png")}));
  }catch(e){}
}

/* ----- host ----- */
let hostStarting=false;
function hostTable(){
  if(NET.mode==="host"){navigator.clipboard&&navigator.clipboard.writeText(inviteLink());return;}
  if(typeof Peer==="undefined"){alert("Couldn't load the connection library — check your internet and reload.");return;}
  if(hostStarting) return;
  hostStarting=true;
  $("btn-host").textContent="STARTING…";
  ICE_READY.then(startHost);
}
function startHost(){
  NET.code="verso-"+Math.random().toString(36).slice(2,7);
  NET.peer=new Peer(NET.code,peerOpts());
  NET.peer.on("open",()=>{
    NET.mode="host";
    const el=$("net-status");
    el.style.display="inline";
    el.textContent="TABLE "+NET.code+" · 0 joined ⧉";
    el.onclick=()=>{if(navigator.clipboard)navigator.clipboard.writeText(inviteLink());el.textContent=el.textContent.replace("⧉","copied!");setTimeout(updNetStatus,1200);};
    $("btn-host").textContent="HOSTING";
  });
  NET.peer.on("connection",c=>{
    c.on("open",()=>{NET.conns.set(c.peer,c);updNetStatus();sendFullTo(c);});
    c.on("close",()=>{
      NET.conns.delete(c.peer);
      // release that player's claims
      for(const t of [...App.session.map.tokens,...App.session.verso.tokens]) if(t.owner===c.peer) delete t.owner;
      updNetStatus(); netMark(); renderPanel();
    });
    c.on("data",raw=>{
      let m; try{m=JSON.parse(raw);}catch(e){return;}
      hostHandle(c,m);
    });
  });
  NET.peer.on("error",e=>{console.warn("peer error",e);$("net-status").textContent="TABLE ERROR — re-host";});
  NET.peer.on("disconnected",()=>{try{NET.peer.reconnect();}catch(e){}}); // signaling blip: rejoin the broker
}
function inviteLink(){
  const base=location.origin.startsWith("http")?location.href.split("?")[0]:"(open the same file)";
  return base+"?join="+NET.code+"   (code: "+NET.code+")";
}
function updNetStatus(){
  const el=$("net-status");
  if(NET.mode==="host") el.textContent="TABLE "+NET.code+" · "+NET.conns.size+" joined ⧉";
}
function hostHandle(c,m){
  if(m.type==="claim"){
    const t=[...App.session.map.tokens,...App.session.verso.tokens].find(t=>t.id===m.id);
    if(!t || !t.pc) return;                                 // only designated player tokens
    if(t.owner && t.owner!==c.peer) return;                 // already someone else's
    for(const o of [...App.session.map.tokens,...App.session.verso.tokens]) if(o.owner===c.peer) delete o.owner;
    t.owner=c.peer; netMark(); renderPanel();
  }
  if(m.type==="move"){
    const t=S().tokens.find(t=>t.id===m.id);
    if(!t || t.owner!==c.peer) return;
    if(!moveAllowed(m.x,m.y,t)){netMark();return;}          // authority: reject and snap client back
    t.x=m.x; t.y=m.y; revealRoomOnPcEntry(t,m.x,m.y); netMark();
  }
  if(m.type==="roll"){
    const label=m.label?String(m.label).slice(0,48):null;
    if(m.expr){
      const pd=parseDice(m.expr);
      if(pd) roll(pd.d,pd.n,pd.mod,"player",label);
      return;
    }
    const die=(m.die==="adv"||m.die==="dis")?m.die:+m.die;
    if(die!=="adv" && die!=="dis" && ![4,6,8,10,12,20,100].includes(die)) return;
    const mod=Math.max(-30,Math.min(30,(+m.mod||0)|0));
    const e=roll(die,1,mod,"player",label);
    if(m.init){
      const t=[...App.session.map.tokens,...App.session.verso.tokens].find(t=>t.owner===c.peer);
      trackerSet(t?t.name:(label||"Player"), e.total, t&&t.id);
    }
  }
  if(m.type==="sheet"){
    const t=[...App.session.map.tokens,...App.session.verso.tokens].find(t=>t.id===m.id);
    if(!t || t.owner!==c.peer) return;                      // players edit only their own
    const sh=sanitizeSheet(m.sheet);
    if(sh){t.sheet=sh; netMark(); renderPanel();}
  }
  if(m.type==="ping"){
    const wx=+m.x, wy=+m.y;
    if(!isFinite(wx)||!isFinite(wy)) return;
    const p={x:wx,y:wy,scene:App.session.scene,color:"#7FA8B8",stamp:String(m.stamp||Math.random())};
    addPing(p);
    netBroadcast({type:"ping",x:p.x,y:p.y,color:p.color,stamp:p.stamp});
  }
}
function pulsePatrols(){ // advance every patrolling token one waypoint
  let moved=0;
  for(const t of S().tokens){
    if(!t.patrol || !t.patrol.length) continue;
    t.pi=((t.pi==null?-1:t.pi)+1)%t.patrol.length;
    t.x=t.patrol[t.pi][0]; t.y=t.patrol[t.pi][1];
    moved++;
  }
  if(moved) markDirty();
  return moved;
}
function trackerSet(name,total,tok,hidden){
  const tr=App.session.tracker;
  const en={name,total,tok};
  if(hidden) en.h=1;
  const i=tr.order.findIndex(e=>(tok&&e.tok===tok)||e.name===name);
  if(i>=0) tr.order[i]=en; else tr.order.push(en);
  tr.order.sort((a,b)=>b.total-a.total);
  if(tr.active>=tr.order.length) tr.active=0;
  netMark(); renderPanel();
}
function trackerAnnounce(){
  const en=App.session.tracker.order[App.session.tracker.active];
  if(!en) return;
  const f={head:"INITIATIVE",total:en.name,detail:"you're up"};
  NET.lastDice=Object.assign({},f,{stamp:++NET.diceStamp});
  netMark();
  clientBanner(NET.lastDice);
  pwinBanner(f,"");
}
/* host loops: light sync + fog */
setInterval(()=>{
  if(NET.mode!=="host") return;
  if(NET.dirty){NET.dirty=false; netBroadcast(lightSnapshot());}
},350);
setInterval(()=>{
  if(NET.mode!=="host"||!NET.fogDirty||!App.session.map.fog) return;
  NET.fogDirty=false;
  netBroadcast({type:"fog",data:App.session.map.fog.toDataURL("image/png")});
},1500);
/* heartbeat — lets clients detect a dead channel instead of showing a stale table */
setInterval(()=>{if(NET.mode==="host")netBroadcast({type:"hb"});},5000);
/* level edits stream to players (coarse — the editor marks this on every change) */
setInterval(()=>{
  if(NET.mode!=="host"||!NET.levelDirty) return;
  NET.levelDirty=false;
  netBroadcast({type:"level",data:clientLevelData()});
},1000);
$("btn-host").onclick=hostTable;

/* ----- client ----- */
let clientConn=null, clientDragging=false, cliOX=0, cliOY=0;
let cliWantTok=null, cliLastMsg=0, cliRetry=null, cliOpened=false, cliLevelFit=false;
function netStatus(t){const el=$("net-status");el.style.display="inline";el.textContent=t;}
function joinTable(code){
  if(typeof Peer==="undefined"){alert("Couldn't load the connection library — check your internet and reload.");return;}
  NET.mode="client"; NET.code=code.trim();
  document.body.classList.add("netclient");
  setDrawer(true);   // phones: start with the drawer up so players can claim a token
  setView("pl"); App.session.view="pl";
  resize(); fitScene(); updZoom();            // stage geometry changed with the netclient layout
  clientConnect(false);
  /* watchdog: the host heartbeats every 5s — silence means the channel died
     (locked phone, dropped Wi-Fi) even though PeerJS never fired close */
  setInterval(()=>{
    if(!cliOpened||!cliLastMsg) return;
    if(Date.now()-cliLastMsg>30000){cliLastMsg=Date.now();netStatus("CONNECTION LOST — RECONNECTING…");clientConnect(true);}
  },5000);
  document.addEventListener("visibilitychange",()=>{ // phone unlocked / back to Safari
    if(document.visibilityState!=="visible"||NET.mode!=="client") return;
    if(!clientConn||!clientConn.open){netStatus("RECONNECTING…");clientConnect(true);}
  });
}
function clientConnect(re){
  if(cliRetry){clearTimeout(cliRetry);cliRetry=null;}
  cliOpened=false;
  try{if(NET.peer)NET.peer.destroy();}catch(e){}
  clientConn=null;
  netStatus(re?"RECONNECTING…":"CONNECTING…");
  ICE_READY.then(()=>clientPeer());
}
function clientPeer(){
  const p=NET.peer=new Peer(peerOpts());
  p.on("open",id=>{
    NET.myId=id;
    const conn=clientConn=p.connect(NET.code,{reliable:true});
    conn.on("open",()=>{
      cliOpened=true; cliLastMsg=Date.now(); firstSync=true;
      netStatus("CONNECTED · "+NET.code);
      if(cliWantTok!=null) clientSend({type:"claim",id:cliWantTok}); // resume my token after a drop
    });
    conn.on("data",raw=>{
      cliLastMsg=Date.now();
      let m; try{m=JSON.parse(raw);}catch(e){return;}
      clientHandle(m);
    });
    conn.on("close",()=>{if(NET.peer===p){netStatus("CONNECTION LOST — RECONNECTING…");cliRescue();}});
    conn.on("error",()=>{if(NET.peer===p){netStatus("CONNECTION ERROR — RECONNECTING…");cliRescue();}});
  });
  p.on("disconnected",()=>{try{p.reconnect();}catch(e){}});
  p.on("error",e=>{
    if(NET.peer!==p) return;
    if(e.type==="peer-unavailable") netStatus("TABLE NOT FOUND — IS THE DM STILL HOSTING? RETRYING…");
    else netStatus("CONNECTION ERROR ("+(e.type||"?")+") — RETRYING…");
    cliRescue(e.type==="peer-unavailable"?8000:4000);
  });
  setTimeout(()=>{ // signaling worked but no P2P route
    if(!cliOpened && NET.mode==="client" && NET.peer===p){
      netStatus(ICE?"CAN'T REACH THE HOST — RETRYING…":"CAN'T REACH THE HOST (NO RELAY CONFIGURED) — RETRYING…");
      cliRescue();
    }
  },15000);
}
function cliRescue(delay){
  if(cliRetry) return;
  cliRetry=setTimeout(()=>{cliRetry=null;clientConnect(true);},delay||4000);
}
let firstSync=true;
function clientHandle(m){
  if(m.type==="sync"){
    let refit=false;
    if(m.scene!==App.session.scene){App.session.scene=m.scene;document.body.classList.toggle("mapscene",m.scene==="map");refit=true;}
    const levelView=m.levelView==="tactical"?"tactical":"isometric";
    if(levelView!==App.session.verso.view){App.session.verso.view=levelView;refit=true;}
    document.body.classList.toggle("tacticalscene",App.session.verso.view==="tactical");
    $("view-iso").classList.toggle("on",App.session.verso.view==="isometric");
    $("view-tactical").classList.toggle("on",App.session.verso.view==="tactical");
    if(refit){fitScene();updZoom();}
    App.session.verso.revealed=m.revealed||{};
    Object.assign(App.session.map.grid,m.grid||{});
    App.session.map.fogOn=m.fogOn!==false;
    if(m.tracker) App.session.tracker=m.tracker;
    // apply tokens, but never overwrite the token I'm actively dragging
    const apply=(dst,src)=>{
      dst.length=0;
      for(const t of src) dst.push(t);
    };
    const mineNow=S().tokens.find(t=>t.id===NET.myToken);
    const keep=(clientDragging&&mineNow)?{...mineNow}:null;
    apply(App.session.map.tokens,m.tokens.map||[]);
    apply(App.session.verso.tokens,m.tokens.verso||[]);
    if(keep){
      const t=S().tokens.find(t=>t.id===keep.id);
      if(t){t.x=keep.x;t.y=keep.y;dragTok=t;}   // rebind the live drag to the fresh object
    }
    // verify my claim still holds
    if(NET.myToken!=null){
      const t=[...App.session.map.tokens,...App.session.verso.tokens].find(t=>t.id===NET.myToken);
      if(!t||t.owner!==NET.myId) NET.myToken=null;
    }
    // claim sent but not yet confirmed (or re-sent after a reconnect): adopt it once the host agrees
    if(NET.myToken==null && cliWantTok!=null){
      const t=[...App.session.map.tokens,...App.session.verso.tokens].find(t=>t.id===cliWantTok);
      if(t && t.owner===NET.myId) NET.myToken=cliWantTok;
    }
    if(m.dice && (!NET.lastDice||m.dice.stamp!==NET.lastDice.stamp)){NET.lastDice=m.dice;clientBanner(m.dice);}
    if(firstSync){firstSync=false;fitScene();updZoom();}
    renderPanel();
  }
  if(m.type==="level" && m.data){
    loadLevel(m.data);
    if(!cliLevelFit){cliLevelFit=true; if(App.session.scene==="verso"){fitScene();updZoom();}}
  }
  if(m.type==="ping" && !PINGS.some(q=>q.stamp===String(m.stamp))){
    const wx=+m.x, wy=+m.y;
    if(isFinite(wx)&&isFinite(wy))
      addPing({x:wx,y:wy,scene:App.session.scene,color:m.color||"#7FA8B8",stamp:String(m.stamp)});
  }
  if(m.type==="img"){
    const img=new Image();
    img.onload=()=>{App.session.map.img=img;App.session.map.imgURL=m.data;if(App.session.scene==="map")fitScene();};
    img.src=m.data;
  }
  if(m.type==="fog"){
    const fi=new Image();
    fi.onload=()=>{
      if(!App.session.map.fog||App.session.map.fog.width!==fi.width){
        const f=document.createElement("canvas");f.width=fi.width;f.height=fi.height;App.session.map.fog=f;
      }
      const fc=App.session.map.fog.getContext("2d");
      fc.clearRect(0,0,fi.width,fi.height);fc.drawImage(fi,0,0);
    };
    fi.src=m.data;
  }
}
function clientBanner(d){
  const b=$("net-banner");
  setBannerContent(document,b,d);
  b.classList.remove("show");void b.offsetWidth;b.classList.add("show");
  setTimeout(()=>b.classList.remove("show"),4500);
}
function clientSend(msg){if(clientConn)try{clientConn.send(JSON.stringify(msg));}catch(e){}}

Object.assign(App.services.network,{hostTable,joinTable,netMark,netMarkFog,netMarkLevel,clientSend,trackerSet});

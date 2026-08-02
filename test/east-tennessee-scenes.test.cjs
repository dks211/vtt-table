const test=require("node:test");
const assert=require("node:assert/strict");
const Core=require("../app/core.js");
require("../content/catalog.js");
const Scenes=require("../content/east-tennessee-scenes.js");
require("../content/east-tennessee-health.js");
require("../content/east-tennessee-rounds.js");
require("../content/east-tennessee-characters.js");
require("../content/east-tennessee-talents.js");
require("../content/east-tennessee-npcs.js");
require("../content/east-tennessee-handouts.js");
require("../content/east-tennessee-finchs-nest.js");
require("../content/east-tennessee-lick-creek.js");
require("../content/east-tennessee-equipment.js");
require("../content/east-tennessee-combat.js");
require("../content/campaigns.js");

const campaign=globalThis.VTTCampaigns.get("east-tennessee-1861");

test("editable packages normalize with stable scene geometry and reusable props",()=>{
  assert.deepEqual(Object.keys(Scenes.LEVELS),["finchs-nest:exterior","finchs-nest:ground","finchs-nest:upper","lick-creek"]);
  for(const [key,pkg] of Object.entries(Scenes.LEVELS)){
    const level=Core.normalizeLevel(pkg.level);
    assert.equal(level.name,pkg.label);
    assert.ok(level.rooms.length>=5,key);
    assert.ok(level.doors.length>=1,key);
    assert.ok(level.stairs.length>=1,key);
    assert.ok(level.props.length>=8,key);
    assert.ok(level.rooms.every(room=>room.revealMode==="always"&&room.tokensAlways),key);
    assert.ok(level.rooms.every(room=>["interior","exterior"].includes(room.environment)),`${key} lacks environment semantics`);
    assert.ok(level.rooms.every(room=>typeof room.surface==="string"&&room.surface),`${key} lacks surface semantics`);
    assert.ok(level.props.every(prop=>globalThis.VTTContent.PROP_LIBRARY[prop.t]),`${key} has an unregistered prop`);
    assert.equal(new Set(level.rooms.map(room=>room.id)).size,level.rooms.length);
    assert.equal(new Set(level.doors.map(door=>door.id)).size,level.doors.length);
    assert.equal(new Set(level.props.map(prop=>prop.id)).size,level.props.length);
  }
  const under=Scenes.LEVELS["lick-creek"].level.rooms.find(room=>room.id==="et-lc-under");
  assert.ok(under.rects[0].w>=14&&under.rects[0].h>=7);
  assert.equal(under.surface,"mud");
  const lick=Scenes.LEVELS["lick-creek"].level;
  const bridge=lick.rooms.find(room=>room.id==="et-lc-bridge"),west=lick.rooms.find(room=>room.id==="et-lc-west"),east=lick.rooms.find(room=>room.id==="et-lc-east");
  assert.equal(bridge.elevation,3);
  assert.equal(west.elevation,bridge.elevation);
  assert.equal(east.elevation,bridge.elevation);
  assert.ok(lick.stairs.every(stair=>Math.abs(stair.to-stair.from)>=3));
  const creek=lick.props.filter(prop=>prop.t==="creek");
  assert.equal(creek.length,2);
  const creekBounds={x0:Math.min(...creek.map(prop=>prop.x)),x1:Math.max(...creek.map(prop=>prop.x+prop.footprint.w)),y0:Math.min(...creek.map(prop=>prop.y)),y1:Math.max(...creek.map(prop=>prop.y+prop.footprint.h))};
  assert.ok(creekBounds.y1-creekBounds.y0>creekBounds.x1-creekBounds.x0,"creek should cross the bridge rather than run alongside it");
  assert.ok(creek.every(prop=>prop.x>=under.rects[0].x&&prop.x+prop.footprint.w<=under.rects[0].x+under.rects[0].w));
  assert.equal(Scenes.LEVELS["finchs-nest:exterior"].level.rooms.find(room=>room.id==="et-fn-ext-inn").sceneRole,"building");
  const exterior=Scenes.LEVELS["finchs-nest:exterior"].level;
  assert.equal(exterior.props.some(prop=>prop.id==="et-fn-ext-yard-cart"),false);
  for(const id of ["et-fn-ext-front-gate","et-fn-ext-yard-gate","et-fn-ext-front-path","et-fn-ext-inn-chimney"])
    assert.ok(exterior.props.some(prop=>prop.id===id),`missing exterior visual cue: ${id}`);
  assert.ok(Scenes.LEVELS["finchs-nest:ground"].level.stairs.every(stair=>Math.abs(stair.to-stair.from)>=3));
});

test("scene packages are campaign-owned and do not enter Palimpsest sessions",()=>{
  const et=campaign.createSession(),pal=globalThis.VTTCampaigns.get("palimpsest").createSession();
  assert.deepEqual(et.campaignState.sceneLevels,{});
  assert.deepEqual(et.campaignState.sceneLevelStates,{});
  assert.equal(et.campaignState.activeSceneLevel,null);
  assert.equal(JSON.stringify(pal).includes("finchs-nest"),false);
  assert.equal(JSON.stringify(pal).includes("lick-creek"),false);
  assert.equal(JSON.stringify(pal).includes("sceneLevels"),false);
});

test("legacy state gains empty scene stores while edited stores round-trip idempotently",()=>{
  const legacy=campaign.normalizeCampaignState({namespace:"east-tennessee-1861",activeSceneLevel:null});
  assert.deepEqual(legacy.sceneLevels,{});
  assert.deepEqual(legacy.sceneLevelStates,{});
  const edited={...legacy,sceneLevels:{"finchs-nest:ground":{name:"Edited ground",rooms:[]}},sceneLevelStates:{"finchs-nest:ground":{revealed:{room:true},doorStates:{door:"open"}}},activeSceneLevel:"finchs-nest:ground"};
  const once=campaign.normalizeCampaignState(edited),twice=campaign.normalizeCampaignState(once);
  assert.deepEqual(twice,once);
  assert.equal(once.sceneLevels["finchs-nest:ground"].name,"Edited ground");
  assert.equal(once.sceneLevelStates["finchs-nest:ground"].doorStates.door,"open");
  assert.equal(once.activeSceneLevel,"finchs-nest:ground");
});

test("presentation refresh upgrades old package visuals without replacing edited geometry",()=>{
  const pkg=Scenes.LEVELS["finchs-nest:exterior"],legacy=Scenes.clone(pkg.level);
  for(const room of legacy.rooms){delete room.visualVersion;delete room.environment;delete room.surface;delete room.sceneRole;}
  for(const prop of legacy.props)delete prop.visualVersion;
  legacy.rooms[0].rects[0].w=27;
  legacy.props=legacy.props.filter(prop=>!prop.id.startsWith("et-fn-ext-inn-window-"));
  legacy.props.push({id:"et-fn-ext-inn-rug",t:"rug",x:6.2,y:5.5});
  legacy.props.push({id:"et-fn-ext-yard-cart",t:"cart",x:18,y:14});
  legacy.doors.push({id:"et-fn-ext-front-gate",x:7.2,y:1.6,dir:"h",type:"open",len:1});
  legacy.doors.push({id:"et-fn-ext-yard-gate",x:22.35,y:12,dir:"h",type:"open",len:1});
  const refreshed=Scenes.applyPresentation(legacy,pkg),again=Scenes.applyPresentation(refreshed,pkg);
  assert.equal(refreshed.rooms[0].rects[0].w,27);
  assert.equal(refreshed.rooms[0].environment,"exterior");
  assert.equal(refreshed.rooms.find(room=>room.id==="et-fn-ext-inn").sceneRole,"building");
  assert.equal(refreshed.props.some(prop=>prop.id==="et-fn-ext-inn-rug"),false);
  assert.equal(refreshed.props.some(prop=>prop.id==="et-fn-ext-yard-cart"),false);
  assert.equal(refreshed.props.filter(prop=>prop.id.startsWith("et-fn-ext-inn-window-")).length,2);
  assert.equal(refreshed.doors.some(door=>door.id==="et-fn-ext-front-gate"),false);
  assert.equal(refreshed.doors.some(door=>door.id==="et-fn-ext-yard-gate"),false);
  for(const id of ["et-fn-ext-front-gate","et-fn-ext-yard-gate","et-fn-ext-front-path","et-fn-ext-inn-chimney"])
    assert.ok(refreshed.props.some(prop=>prop.id===id),`presentation did not restore cue: ${id}`);
  assert.deepEqual(again,refreshed);
});

test("Lick Creek presentation refresh keeps edited geometry but upgrades trestles and creek orientation",()=>{
  const pkg=Scenes.LEVELS["lick-creek"],legacy=Scenes.clone(pkg.level);
  legacy.rooms.forEach(room=>{room.visualVersion=5;});
  legacy.props.forEach(prop=>{prop.visualVersion=5;});
  legacy.rooms.find(room=>room.id==="et-lc-bridge").rects[0].w=15;
  const refreshed=Scenes.applyPresentation(legacy,pkg);
  assert.equal(refreshed.rooms.find(room=>room.id==="et-lc-bridge").rects[0].w,15);
  const pier=refreshed.props.find(prop=>prop.id==="et-lc-pier-a");
  assert.equal(pier.bridgeSupport,true);
  assert.equal(pier.height,54);
  assert.equal(refreshed.props.filter(prop=>prop.t==="creek").length,2);
  const creek=refreshed.props.filter(prop=>prop.t==="creek"),creekHeight=Math.max(...creek.map(prop=>prop.y+prop.footprint.h))-Math.min(...creek.map(prop=>prop.y)),creekWidth=Math.max(...creek.map(prop=>prop.x+prop.footprint.w))-Math.min(...creek.map(prop=>prop.x));
  assert.ok(creekHeight>creekWidth);
});

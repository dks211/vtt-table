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
  assert.equal(under.rects.length,2);
  assert.ok(under.rects.every(rect=>rect.h>=7));
  assert.equal(under.surface,"mud");
  const lick=Scenes.LEVELS["lick-creek"].level;
  const bridge=lick.rooms.find(room=>room.id==="et-lc-bridge"),west=lick.rooms.find(room=>room.id==="et-lc-west"),east=lick.rooms.find(room=>room.id==="et-lc-east");
  assert.equal(bridge.elevation,3);
  assert.equal(west.elevation,bridge.elevation);
  assert.equal(east.elevation,bridge.elevation);
  assert.ok(lick.stairs.every(stair=>Math.abs(stair.to-stair.from)>=3));
  const northCreek=lick.rooms.find(room=>room.id==="et-lc-creek-north"),southCreek=lick.rooms.find(room=>room.id==="et-lc-creek-channel");
  assert.equal(northCreek.surface,"water");assert.equal(southCreek.surface,"water");
  assert.equal(northCreek.rects[0].x,southCreek.rects[0].x);
  assert.equal(northCreek.rects[0].w,southCreek.rects[0].w);
  assert.equal(northCreek.rects[0].y+northCreek.rects[0].h,bridge.rects[0].y);
  assert.equal(bridge.rects[0].y+bridge.rects[0].h,southCreek.rects[0].y);
  const railway=lick.props.find(prop=>prop.id==="et-lc-railway");
  assert.equal(railway.t,"railway");
  assert.equal(railway.x,west.rects[0].x);
  assert.equal(railway.x+railway.footprint.w,east.rects[0].x+east.rects[0].w);
  assert.equal(lick.props.some(prop=>["et-lc-west-track","et-lc-east-track","et-lc-creek-a","et-lc-creek-b"].includes(prop.id)),false);
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

test("Lick Creek presentation refresh keeps edited geometry while adding required crossing visuals",()=>{
  const pkg=Scenes.LEVELS["lick-creek"],legacy=Scenes.clone(pkg.level);
  legacy.rooms.forEach(room=>{room.visualVersion=6;});
  legacy.props.forEach(prop=>{prop.visualVersion=6;});
  legacy.rooms.find(room=>room.id==="et-lc-bridge").rects[0].w=15;
  const refreshed=Scenes.applyPresentation(legacy,pkg);
  assert.equal(refreshed.rooms.find(room=>room.id==="et-lc-bridge").rects[0].w,15);
  const pier=refreshed.props.find(prop=>prop.id==="et-lc-pier-a");
  assert.equal(pier.bridgeSupport,true);
  assert.equal(pier.height,54);
  assert.ok(refreshed.rooms.some(room=>room.id==="et-lc-creek-north"));
  assert.ok(refreshed.rooms.some(room=>room.id==="et-lc-creek-channel"));
  assert.ok(refreshed.props.some(prop=>prop.id==="et-lc-railway"));
});

test("stock version-six Lick Creek geometry migrates to a continuous river and railway",()=>{
  const pkg=Scenes.LEVELS["lick-creek"],legacy=Scenes.clone(pkg.level),room=id=>legacy.rooms.find(value=>value.id===id),prop=id=>legacy.props.find(value=>value.id===id);
  legacy.rooms=legacy.rooms.filter(value=>!["et-lc-creek-north","et-lc-creek-channel"].includes(value.id));
  const oldRooms={"et-lc-west":[{x:7,y:5,w:5,h:5}],"et-lc-bridge":[{x:9,y:4,w:14,h:5}],"et-lc-east":[{x:23,y:5,w:5,h:5}],"et-lc-under":[{x:9,y:9,w:14,h:7}],"et-lc-south":[{x:9,y:16,w:14,h:4}],"et-lc-road":[{x:28,y:5,w:4,h:5}]};
  for(const [id,rects] of Object.entries(oldRooms)){room(id).rects=rects;room(id).visualVersion=6;}
  legacy.props=legacy.props.filter(value=>value.id!=="et-lc-railway");
  legacy.props.push({id:"et-lc-west-track",t:"track",x:7,y:6.7,visualVersion:6,footprint:{w:7,h:1}},{id:"et-lc-east-track",t:"track",x:21,y:6.7,visualVersion:6,footprint:{w:7,h:1}},{id:"et-lc-creek-a",t:"creek",x:14.1,y:9.2,visualVersion:6,footprint:{w:4.8,h:4.1}},{id:"et-lc-creek-b",t:"creek",x:14.1,y:12.95,visualVersion:6,footprint:{w:4.8,h:2.85}});
  Object.assign(prop("et-lc-bridge-deck"),{x:10,y:5.2,visualVersion:6});Object.assign(prop("et-lc-pier-a"),{x:10.7,y:9.05,visualVersion:6});Object.assign(prop("et-lc-pier-b"),{x:15.2,y:9.05,visualVersion:6});Object.assign(prop("et-lc-pier-c"),{x:19.7,y:9.05,visualVersion:6});
  legacy.doors.push({id:"et-lc-west-to-bridge",x:9,y:7,dir:"h",type:"open",len:2},{id:"et-lc-east-to-bridge",x:22,y:7,dir:"h",type:"open",len:2});
  Object.assign(legacy.doors.find(value=>value.id==="et-lc-under-east"),{x:23,y:11});Object.assign(legacy.doors.find(value=>value.id==="et-lc-camp-road"),{x:28,y:9});
  Object.assign(legacy.stairs.find(stair=>stair.id==="et-lc-west-embankment"),{x:7.6,y:7,w:1.4,h:2,dir:"e",from:0,to:3});Object.assign(legacy.stairs.find(stair=>stair.id==="et-lc-east-embankment"),{x:22,y:7,w:1.4,h:2,dir:"w",from:0,to:3});
  const refreshed=Scenes.applyPresentation(legacy,pkg);
  assert.deepEqual(refreshed.rooms.find(value=>value.id==="et-lc-bridge").rects,[{x:12,y:5,w:9,h:4}]);
  assert.ok(refreshed.rooms.some(value=>value.id==="et-lc-creek-north"));assert.ok(refreshed.rooms.some(value=>value.id==="et-lc-creek-channel"));
  assert.ok(refreshed.props.some(value=>value.id==="et-lc-railway"));
  assert.equal(refreshed.props.some(value=>["et-lc-west-track","et-lc-east-track","et-lc-creek-a","et-lc-creek-b"].includes(value.id)),false);
  assert.equal(refreshed.doors.some(value=>["et-lc-west-to-bridge","et-lc-east-to-bridge"].includes(value.id)),false);
  assert.equal(refreshed.doors.find(value=>value.id==="et-lc-under-east").x,24);assert.equal(refreshed.doors.find(value=>value.id==="et-lc-camp-road").x,29);
  assert.equal(refreshed.stairs.find(value=>value.id==="et-lc-west-embankment").dir,"n");
});

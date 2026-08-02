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
    assert.ok(level.props.every(prop=>globalThis.VTTContent.PROP_LIBRARY[prop.t]),`${key} has an unregistered prop`);
    assert.equal(new Set(level.rooms.map(room=>room.id)).size,level.rooms.length);
    assert.equal(new Set(level.doors.map(door=>door.id)).size,level.doors.length);
    assert.equal(new Set(level.props.map(prop=>prop.id)).size,level.props.length);
  }
  const under=Scenes.LEVELS["lick-creek"].level.rooms.find(room=>room.id==="et-lc-under");
  assert.ok(under.rects[0].w>=14&&under.rects[0].h>=7);
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

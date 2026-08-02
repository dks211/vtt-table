const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const {
  DEFAULT_CAMPAIGN_ID,
  SESSION_SCHEMA_VERSION,
  normalizeCampaignId,
  normalizeSession,
} = require("../app/core.js");

require("../content/catalog.js");
require("../content/east-tennessee-health.js");
require("../content/east-tennessee-rounds.js");
require("../content/east-tennessee-characters.js");
require("../content/east-tennessee-talents.js");
require("../content/east-tennessee-npcs.js");
require("../content/east-tennessee-handouts.js");
require("../content/east-tennessee-finchs-nest.js");
require("../content/east-tennessee-lick-creek.js");
require("../content/east-tennessee-scenes.js");
require("../content/east-tennessee-equipment.js");
require("../content/east-tennessee-combat.js");
require("../content/campaigns.js");

const fixture = name => JSON.parse(readFileSync(join(__dirname, "fixtures", name), "utf8"));

test("legacy v1 and schema-6 saves default to Palimpsest", () => {
  for (const name of ["session-v1.json", "session-v6.json"]) {
    const session = normalizeSession(fixture(name));
    assert.equal(session.schemaVersion, SESSION_SCHEMA_VERSION);
    assert.equal(session.campaignId, DEFAULT_CAMPAIGN_ID);
    assert.equal(session.campaignPackageVersion, 1);
    assert.equal(session.campaignStateSchemaVersion, 1);
    assert.deepEqual(session.campaignState, {});
  }
});

test("campaign ids validate and explicit unknown ids fail closed", () => {
  assert.equal(normalizeCampaignId(), "palimpsest");
  assert.equal(normalizeCampaignId("palimpsest"), "palimpsest");
  assert.equal(normalizeCampaignId("east-tennessee-1861"), "east-tennessee-1861");
  assert.throws(
    () => normalizeSession({
      schemaVersion: SESSION_SCHEMA_VERSION,
      campaignId: "unknown-campaign",
      level: { rooms: [] },
    }),
    /Unknown campaign "unknown-campaign"/,
  );
});

test("campaign registry exposes isolated Palimpsest and East Tennessee packages", () => {
  const registry = globalThis.VTTCampaigns;
  const palimpsest = registry.get("palimpsest");
  const eastTennessee = registry.get("east-tennessee-1861");

  assert.equal(registry.defaultId, "palimpsest");
  assert.equal(palimpsest.content, globalThis.VTTContent);
  assert.equal(eastTennessee.title, "East Tennessee 1861");
  assert.equal(eastTennessee.packageVersion, 1);
  assert.equal(eastTennessee.stateSchemaVersion, 12);
  assert.equal(eastTennessee.scenePackages, globalThis.EastTennesseeScenes);

  const palimpsestSession = palimpsest.createSession();
  const eastTennesseeSession = eastTennessee.createSession();
  assert.equal(palimpsestSession.campaignId, "palimpsest");
  assert.deepEqual(palimpsestSession.campaignState, {});
  assert.equal(eastTennesseeSession.campaignId, "east-tennessee-1861");
  assert.equal(eastTennesseeSession.level.name, "East Tennessee 1861 · Opening Adventure");
  assert.ok(eastTennesseeSession.level.rooms[0].id.startsWith("east-tennessee-1861-"));
  assert.equal(eastTennesseeSession.campaignState.namespace, "east-tennessee-1861");
  assert.equal(Object.keys(eastTennesseeSession.campaignState.actors).length, 5);
  assert.equal(eastTennesseeSession.campaignState.actors["east-tennessee-1861:actor:clara-webb"].health.state, "unhurt");
  assert.equal(eastTennesseeSession.campaignState.actors["east-tennessee-1861:actor:jacob-sloane"].talents.fieldMedicine, true);
  assert.equal(eastTennessee.initialLevel.roster.length, 5);
  assert.equal(eastTennessee.initialStart.tokens.length, 5);
  assert.deepEqual(
    new Set(eastTennessee.initialStart.tokens.map(token => token.actorId)),
    new Set(Object.values(globalThis.EastTennesseeCharacters.DEFINITIONS).map(character => character.actorId)),
  );
  assert.equal(JSON.stringify(eastTennessee.initialLevel).includes("Placeholder"), false);
  assert.equal(JSON.stringify(eastTennessee.initialStart).includes("Placeholder"), false);
  assert.equal(eastTennesseeSession.campaignState.scene.immediateDanger, false);
  assert.deepEqual(eastTennesseeSession.campaignState.npcs, {});
  assert.equal(JSON.stringify(palimpsestSession).includes("east-tennessee"), false);
  assert.equal(JSON.stringify(eastTennesseeSession).includes("Randy Meisner"), false);
  assert.deepEqual(palimpsest.normalizeCampaignState({
    namespace: "east-tennessee-1861",
    actors: { leaked: true },
  }), {});
  const normalized=eastTennessee.normalizeCampaignState({
    namespace: "palimpsest",
    actors: {},
    legacyPalimpsestState: { leaked: true },
  });
  assert.equal(normalized.namespace,"east-tennessee-1861");
  assert.equal(Object.keys(normalized.actors).length,5);
  assert.equal("leaked" in normalized.actors,false);
  assert.equal("legacyPalimpsestState" in normalized,false);
  const schema7=JSON.parse(JSON.stringify(eastTennesseeSession.campaignState));
  const elias="east-tennessee-1861:actor:elias-rourke";
  schema7.actors[elias].health.state="wounded";
  schema7.actors[elias].ownerKey="legacy-owner";
  schema7.timers={legacy:{id:"legacy",definitionId:"custom",label:"Legacy timer",state:"paused",initialRounds:9,remainingRounds:7,visibility:"public"}};
  delete schema7.npcs;delete schema7.nextNpcSequence;
  const migrated=eastTennessee.normalizeCampaignState(schema7);
  assert.equal(migrated.actors[elias].health.state,"wounded");
  assert.equal(migrated.actors[elias].ownerKey,"legacy-owner");
  assert.equal(migrated.timers.legacy.remainingRounds,7);
  assert.deepEqual(migrated.npcs,{});
});

test("campaign descriptor precedes campaign state in initial join messages", () => {
  const messages = globalThis.VTTCampaigns.initialJoinMessages({
    campaignId: "east-tennessee-1861",
    campaignPackageVersion: 1,
    campaignStateSchemaVersion: 1,
  }, { type: "level" }, { type: "sync" });
  assert.deepEqual(messages.map(message => message.type), ["campaign", "level", "sync"]);
  assert.equal(messages[0].campaignId, "east-tennessee-1861");
});

test("East Tennessee presents campaign workspaces and plain-language controls", () => {
  const panel = readFileSync(join(__dirname, "..", "app", "panel.js"), "utf8");
  const editor = readFileSync(join(__dirname, "..", "app", "editor.js"), "utf8");
  for (const label of ["SCENE", "CAST", "ENCOUNTER", "DOCUMENTS", "TABLE", "START ENCOUNTER", "Who is in this encounter?", "Add someone to the scene…", "SHARE WITH SELECTED AUDIENCE", "INITIALIZE &amp; OPEN MAP"])
    assert.ok(panel.includes(label), `missing East Tennessee UI label: ${label}`);
  assert.equal(panel.includes("OPEN CLARA AWARENESS CHECK"), false);
  assert.equal(panel.includes("BEGIN IMMEDIATE DANGER"), false);
  assert.equal(panel.includes("et-npc-weapon"), false);
  assert.match(panel, /Abner Raines carries a revolver/);
  assert.match(editor, /campaignId==="east-tennessee-1861"\?"isometric":session\.verso\.view/);
  assert.match(editor, /setLevelView\("isometric"\);setScene\("verso"\)/);
  assert.match(panel, /East Tennessee uses one isometric player presentation/);
  assert.match(panel, /editable Verso room geometry/);
});

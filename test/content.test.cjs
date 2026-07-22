const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeLevel } = require("../app/core.js");

require("../content/catalog.js");

test("the Verso ships as a valid content pack", () => {
  const content = globalThis.VTTContent;
  const level = normalizeLevel(content.VERSO_LEVEL);
  assert.equal(level.name, "The Verso · Back of House");
  assert.ok(level.rooms.length >= 9);
  assert.ok(level.doors.length >= 8);
  assert.ok(level.roster.some(entry => entry.pc));
  assert.ok(content.VERSO_START.tokens.length >= 3);
});

test("content catalogs expose reusable room and prop choices", () => {
  const content = globalThis.VTTContent;
  assert.ok(content.ROOM_TEMPLATES.length >= 12);
  assert.ok(Object.keys(content.PROP_LIBRARY).length >= 10);
  assert.ok(content.SWATCHES.length >= 8);
});

test("Level 2 ships with a room-scoped tactical vault arena",()=>{
  const content=globalThis.VTTContent;
  const level=normalizeLevel(content.VAULT_LEVEL);
  const vault=level.rooms.find(room=>room.id==="vault2");
  assert.equal(level.name,"Level 2 · The Vault of the Bella Rosa");
  assert.equal(vault.battleGrid,"square");
  assert.ok(level.stairs.length>=1);
  assert.ok(level.props.filter(prop=>prop.terrain==="cover").length>=4);
  assert.ok(level.props.some(prop=>prop.terrain==="difficult"));
  assert.ok(level.props.some(prop=>prop.terrain==="overhead"));
  assert.equal(content.VAULT_START.tokens.filter(token=>token.pc).length,4);
});

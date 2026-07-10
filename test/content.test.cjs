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
  assert.ok(content.ROOM_TEMPLATES.length >= 8);
  assert.ok(Object.keys(content.PROP_LIBRARY).length >= 10);
  assert.ok(content.SWATCHES.length >= 8);
});

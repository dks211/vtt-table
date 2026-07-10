const test = require("node:test");
const assert = require("node:assert/strict");

require("../app/core.js");
require("../content/catalog.js");
require("../app/runtime.js");

test("runtime separates editable documents from live session state", () => {
  assert.equal(globalThis.App.core, globalThis.AppCore);
  assert.equal(globalThis.App.content, globalThis.VTTContent);
  assert.deepEqual(globalThis.App.document.rooms, []);
  assert.deepEqual(globalThis.App.document.doors, []);
  assert.equal(globalThis.App.session, null);
});

test("runtime exposes named service boundaries", () => {
  assert.deepEqual(Object.keys(globalThis.App.services), [
    "model",
    "renderer",
    "network",
    "table",
    "editor",
    "panel",
  ]);
});

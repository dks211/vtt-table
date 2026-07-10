const test = require("node:test");
const assert = require("node:assert/strict");
const {
  escapeHTML,
  parseDice,
  sanitizeSheet,
  spellAtkBonus,
  spellSaveDC,
  sanitizeLevelForClient,
  setBannerContent,
  LEVEL_SCHEMA_VERSION,
  SESSION_SCHEMA_VERSION,
  normalizeLevel,
  normalizeSession,
} = require("../app/core.js");

test("parseDice accepts supported notation and applies limits", () => {
  assert.deepEqual(parseDice("2d4 + 2"), { n: 2, d: 4, mod: 2 });
  assert.deepEqual(parseDice("99d6-3"), { n: 10, d: 6, mod: -3 });
  assert.deepEqual(parseDice("d20"), { n: 1, d: 20, mod: 0 });
  assert.equal(parseDice("2d5"), null);
  assert.equal(parseDice("alert(1)"), null);
});

test("sanitizeSheet constrains player-editable values", () => {
  const sheet = sanitizeSheet({
    prof: 99,
    hpMax: 50,
    hp: 80,
    spellAbil: "int",
    abil: { int: 4, dex: -20 },
    atks: [{ name: "<img src=x onerror=alert(1)>", hit: 99, dmg: "2d5" }],
    skills: { Arcana: 99 },
  });
  assert.equal(sheet.prof, 10);
  assert.equal(sheet.hp, 80);
  assert.equal(sheet.abil.dex, -10);
  assert.deepEqual(sheet.atks[0], {
    name: "<img src=x onerror=alert",
    hit: 25,
    dmg: "1d6",
  });
  assert.equal(sheet.skills.Arcana, 25);
});

test("spell attack and save DC derive from proficiency and casting ability", () => {
  const sheet = { prof: 3, spellAbil: "int", abil: { int: 2 } };
  assert.equal(spellAtkBonus(sheet), 5);
  assert.equal(spellSaveDC(sheet), 13);
  assert.equal(spellAtkBonus({ ...sheet, spellAbil: null }), null);
});

test("client level snapshots remove NPC sheets without mutating the host level", () => {
  const npcSheet = { ac: 15 };
  const level = { name: "Test", roster: [
    { name: "Player", pc: true, sheet: { ac: 12 } },
    { name: "NPC", sheet: npcSheet },
  ] };
  const client = sanitizeLevelForClient(level);
  assert.equal(client.roster[0].sheet.ac, 12);
  assert.equal(client.roster[1].sheet, undefined);
  assert.equal(level.roster[1].sheet, npcSheet);
});

test("escapeHTML neutralizes values used in HTML templates", () => {
  assert.equal(escapeHTML('<img src=x onerror="boom">'), "&lt;img src=x onerror=&quot;boom&quot;&gt;");
});

test("banner rendering treats connected-player labels as text", () => {
  const doc = { createElement: () => ({ className: "", textContent: "" }) };
  const banner = { replaceChildren: (...children) => { banner.children = children; } };
  const attack = '<img src=x onerror="boom">';
  setBannerContent(doc, banner, { head: attack, total: 12, detail: "[8, 4]" }, " crit");
  assert.equal(banner.children[0].textContent, attack);
  assert.equal(banner.children[1].className, "rb-total crit");
  assert.equal(banner.children[1].textContent, "12");
});

test("legacy levels migrate rectangles and receive stable object IDs", () => {
  const level = normalizeLevel({
    name: "Legacy",
    rooms: [{ id: "hall", name: "Hall", rect: { x: 1, y: 2, w: 3, h: 4 } }],
    doors: [{ x: 2, y: 2, dir: "h" }],
    props: [{ t: "table", x: 2.5, y: 3.5 }],
    roster: [{ name: "Hero", pc: true }],
  });
  assert.equal(level.schemaVersion, LEVEL_SCHEMA_VERSION);
  assert.deepEqual(level.rooms[0].rects, [{ x: 1, y: 2, w: 3, h: 4 }]);
  assert.equal(level.rooms[0].rect, undefined);
  assert.equal(level.doors[0].id, "door-1");
  assert.equal(level.props[0].id, "prop-1");
  assert.equal(level.roster[0].id, "roster-1");
});

test("level validation rejects unsupported versions and malformed geometry", () => {
  assert.throws(() => normalizeLevel({ schemaVersion: 99, rooms: [] }), /Unsupported level schema/);
  assert.throws(() => normalizeLevel({ rooms: [{ name: "Bad", rect: { x: 0, y: 0, w: 0, h: 2 } }] }), /at least one tile/);
  assert.throws(() => normalizeLevel({ rooms: "not an array" }), /rooms array/);
});

test("v1 sessions migrate to the current session and level schemas", () => {
  const session = normalizeSession({
    v: 1,
    scene: "map",
    map: { grid: { size: 50 }, tokens: [] },
    verso: { revealed: { room1: true }, tokens: [] },
    level: { rooms: [] },
  });
  assert.equal(session.schemaVersion, SESSION_SCHEMA_VERSION);
  assert.equal(session.level.schemaVersion, LEVEL_SCHEMA_VERSION);
  assert.equal(session.scene, "map");
  assert.equal(session.map.grid.size, 50);
});

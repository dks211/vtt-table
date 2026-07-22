const test = require("node:test");
const assert = require("node:assert/strict");
const {
  escapeHTML,
  parseDice,
  sanitizeSheet,
  spellAtkBonus,
  spellSaveDC,
  roomEntryReveal,
  cameraFocusFromViewport,
  cameraFromFocus,
  findRoomAt,
  doorIsOpen,
  tacticalMoveAllowed,
  tacticalMoveCost,
  shouldSnapLevelToken,
  tokenVisibleToPlayers,
  orderedLevelTokens,
  sanitizeLevelForClient,
  setBannerContent,
  LEVEL_SCHEMA_VERSION,
  SESSION_SCHEMA_VERSION,
  normalizeLevel,
  normalizeSession,
} = require("../app/core.js");

test("room entry reveal applies only to PCs and consumes armed rooms", () => {
  const pc = { pc: true };
  assert.deepEqual(roomEntryReveal({ revealMode: "armed" }, pc, false), {
    reveal: true,
    nextMode: "manual",
  });
  assert.deepEqual(roomEntryReveal({ revealMode: "always" }, pc, false), {
    reveal: true,
    nextMode: "always",
  });
  assert.equal(roomEntryReveal({ revealMode: "always" }, pc, true), null);
  assert.equal(roomEntryReveal({ revealMode: "armed" }, { pc: false }, false), null);
  assert.equal(roomEntryReveal({ revealMode: "manual" }, pc, false), null);
});

test("camera focus preserves the GM center across player viewport sizes", () => {
  const focus = cameraFocusFromViewport({ x: 100, y: 50, s: 2 }, 1200, 800, "verso", "tactical");
  assert.deepEqual(focus, {
    scene: "verso",
    levelView: "tactical",
    centerX: 400,
    centerY: 250,
    worldWidth: 600,
    worldHeight: 400,
  });
  assert.deepEqual(cameraFromFocus(focus, 600, 800), { x: 100, y: -150, s: 1 });
  assert.equal(cameraFromFocus({ worldWidth: 0, worldHeight: 20 }, 600, 800), null);
});

test("tactical movement stays in geometry and crosses rooms only through open doors", () => {
  const rooms = [
    { id: "a", rects: [{ x: 0, y: 0, w: 3, h: 3 }], revealMode: "always", battleGrid: "none" },
    { id: "b", rects: [{ x: 3, y: 0, w: 3, h: 3 }], revealMode: "armed", battleGrid: "square" },
  ];
  const doors = [{ id: "door-1", x: 3, y: 1, len: 1, dir: "v", type: "door" }];
  const base = { rooms, doors, revealed: { a: true }, doorStates: {}, props: [], effects: [] };
  const pc = { x: 1.5, y: 1.5, pc: true };
  assert.equal(tacticalMoveAllowed(base, pc, 4.5, 1.5).allowed, false);
  assert.equal(tacticalMoveAllowed({ ...base, doorStates: { "door-1": true } }, pc, 4.5, 1.5).allowed, true);
  assert.equal(tacticalMoveAllowed({ ...base, doorStates: { "door-1": true } }, pc, 4.5, 2.8).allowed, false);
  assert.equal(tacticalMoveAllowed({ ...base, doorStates: { "door-1": true }, props: [
    { x: 3.5, y: 1, terrain: "cover", footprint: { w: 1, h: 1, shape: "rect" } },
  ] }, pc, 4.5, 1.5).allowed, false);
});

test("tactical snapping, movement cost, visibility, and stacking follow play rules", () => {
  const rooms = [
    { id: "free", rects: [{ x: 0, y: 0, w: 2, h: 2 }], battleGrid: "none" },
    { id: "grid", rects: [{ x: 2, y: 0, w: 3, h: 3 }], battleGrid: "square" },
  ];
  assert.equal(shouldSnapLevelToken(rooms, 1, 1, true), false);
  assert.equal(shouldSnapLevelToken(rooms, 3, 1, false), false);
  assert.equal(shouldSnapLevelToken(rooms, 3, 1, true), true);
  const cost = tacticalMoveCost({ x: 2.5, y: .5 }, 4.5, .5, [
    { x: 3, y: 0, terrain: "difficult", footprint: { w: 1, h: 1, shape: "rect" } },
  ], []);
  assert.deepEqual(cost, { squares: 2, difficult: 1, feet: 15 });
  assert.equal(tokenVisibleToPlayers({ pc: false, x: 8, y: 8 }, rooms, {}, new Set()), false);
  assert.equal(tokenVisibleToPlayers({ pc: true, x: 8, y: 8 }, rooms, {}, new Set()), true);
  const tokens = [{ id: 1, x: 2, y: 2 }, { id: 2, x: 0, y: 0 }];
  assert.deepEqual(orderedLevelTokens(tokens, true).map(token => token.id), [1, 2]);
  assert.deepEqual(orderedLevelTokens(tokens, false).map(token => token.id), [2, 1]);
  assert.equal(findRoomAt(rooms, 3, 1).id, "grid");
  assert.equal(doorIsOpen({ id: "d", type: "door" }, { d: true }), true);
});

test("session tactical state normalizes temporary effects and door overrides", () => {
  const session = normalizeSession({ schemaVersion: SESSION_SCHEMA_VERSION, verso: {
    doorStates: { front: true, back: 0 }, tacticalFocus: "arena",
    effects: [{ id: "fire", terrain: "hazard", x: 2, y: 3, w: 2, h: 1 }],
  }, level: { rooms: [] } });
  assert.deepEqual(session.verso.doorStates, { front: true, back: false });
  assert.equal(session.verso.tacticalFocus, "arena");
  assert.deepEqual(session.verso.effects[0], {
    id: "fire", terrain: "hazard", x: 2, y: 3, w: 2, h: 1, shape: "rect", label: "Temporary effect",
  });
});

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
    props: [{ t: "table", x: 2.5, y: 3.5, scale: 99, label: "  Landmark  ", inspect: "Look closer", focus: 1 }],
    roster: [{ name: "Hero", pc: true }],
  });
  assert.equal(level.schemaVersion, LEVEL_SCHEMA_VERSION);
  assert.deepEqual(level.rooms[0].rects, [{ x: 1, y: 2, w: 3, h: 4 }]);
  assert.equal(level.rooms[0].rect, undefined);
  assert.equal(level.doors[0].id, "door-1");
  assert.equal(level.props[0].id, "prop-1");
  assert.equal(level.props[0].scale, 2);
  assert.equal(level.props[0].label, "Landmark");
  assert.equal(level.props[0].inspect, "Look closer");
  assert.equal(level.props[0].focus, true);
  assert.equal(level.roster[0].id, "roster-1");
});

test("isometric room properties and stairs are normalized to portable bounds", () => {
  const level = normalizeLevel({rooms:[{name:"Raised",rect:{x:0,y:0,w:2,h:2},elevation:99,wallHeight:-3,structure:"platform",cutaway:"front",revealMode:"armed"}],stairs:[{x:0,y:0,w:2,h:3,dir:"e",from:-2,to:99}]});
  const room=level.rooms[0];
  assert.equal(room.elevation,12);
  assert.equal(room.wallHeight,0);
  assert.equal(room.structure,"platform");
  assert.equal(room.cutaway,"front");
  assert.equal(room.revealMode,"armed");
  assert.deepEqual({...level.stairs[0],id:undefined},{id:undefined,x:0,y:0,w:2,h:3,dir:"e",from:0,to:12,style:"stone"});
});

test("tactical room grids and terrain footprints normalize safely", () => {
  const level=normalizeLevel({rooms:[
    {name:"Arena",rect:{x:0,y:0,w:8,h:8},battleGrid:"square"},
    {name:"Hall",rect:{x:8,y:0,w:2,h:2},battleGrid:"hex"},
  ],props:[
    {t:"pillar",x:1,y:1,terrain:"cover",footprint:{w:99,h:.1,shape:"circle"}},
    {t:"rug",x:2,y:2,terrain:"lava"},
  ]});
  assert.equal(level.rooms[0].battleGrid,"square");
  assert.equal(level.rooms[1].battleGrid,"none");
  assert.equal(level.props[0].terrain,"cover");
  assert.deepEqual(level.props[0].footprint,{w:20,h:.25,shape:"circle"});
  assert.equal(level.props[1].terrain,undefined);
});

test("room reveal policies default safely and reject unknown values", () => {
  const level=normalizeLevel({rooms:[
    {name:"Legacy",rect:{x:0,y:0,w:1,h:1}},
    {name:"Invalid",rect:{x:1,y:0,w:1,h:1},revealMode:"nearby"},
    {name:"Visible",rect:{x:2,y:0,w:1,h:1},revealMode:"always"},
  ]});
  assert.deepEqual(level.rooms.map(r=>r.revealMode),["manual","manual","always"]);
});

test("level validation rejects unsupported versions and malformed geometry", () => {
  assert.throws(() => normalizeLevel({ schemaVersion: 99, rooms: [] }), /Unsupported level schema/);
  assert.throws(() => normalizeLevel({ rooms: [{ name: "Bad", rect: { x: 0, y: 0, w: 0, h: 2 } }] }), /at least one tile/);
  assert.throws(() => normalizeLevel({ rooms: "not an array" }), /rooms array/);
});

test("sessions saved before the level system fall back to the provided level", () => {
  const legacy = {
    v: 1,
    scene: "verso",
    map: { grid: {}, tokens: [] },
    verso: { revealed: { white: true }, tokens: [{ id: 1, name: "Randy Meisner" }] },
  };
  const fallbackLevel = { name: "Bundled", rooms: [{ id: "white", name: "White", rect: { x: 0, y: 0, w: 2, h: 2 } }] };
  const session = normalizeSession(legacy, { fallbackLevel });
  assert.equal(session.level.name, "Bundled");
  assert.equal(session.level.rooms.length, 1);
  // without a fallback the level is empty rather than an error
  assert.equal(normalizeSession(legacy).level.rooms.length, 0);
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
  assert.equal(session.verso.view,"isometric");
});

test("sessions preserve the tactical renderer choice",()=>{
  const session=normalizeSession({schemaVersion:SESSION_SCHEMA_VERSION,scene:"verso",map:{},verso:{view:"tactical"},level:{rooms:[]}});
  assert.equal(session.verso.view,"tactical");
});

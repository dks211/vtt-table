(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AppCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LEVEL_SCHEMA_VERSION = 1;
  const SESSION_SCHEMA_VERSION = 2;

  const clone = value => JSON.parse(JSON.stringify(value));
  const objectOrNull = value => value && typeof value === "object" && !Array.isArray(value) ? value : null;
  const finite = (value, fallback = 0) => Number.isFinite(+value) ? +value : fallback;
  const integer = (value, fallback = 0) => Math.trunc(finite(value, fallback));

  function uniqueId(value, prefix, used, index) {
    let id = String(value || "").trim().replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 64);
    if (!id || used.has(id)) id = `${prefix}-${index + 1}`;
    while (used.has(id)) id = `${prefix}-${index + 1}-${used.size + 1}`;
    used.add(id);
    return id;
  }

  function normalizeRect(rect, roomName) {
    if (!objectOrNull(rect)) throw new Error(`Room "${roomName}" has invalid geometry.`);
    const normalized = {
      x: integer(rect.x),
      y: integer(rect.y),
      w: integer(rect.w),
      h: integer(rect.h),
    };
    if (normalized.w < 1 || normalized.h < 1)
      throw new Error(`Room "${roomName}" must be at least one tile wide and high.`);
    return normalized;
  }

  function normalizeLevel(input, options = {}) {
    const level = objectOrNull(input);
    if (!level) throw new Error("Level data must be a JSON object.");
    const version = level.schemaVersion == null ? 0 : integer(level.schemaVersion, -1);
    if (version < 0 || version > LEVEL_SCHEMA_VERSION)
      throw new Error(`Unsupported level schema version: ${level.schemaVersion}.`);
    if (!Array.isArray(level.rooms)) throw new Error("Level data must include a rooms array.");

    const roomIds = new Set();
    const rooms = level.rooms.map((source, index) => {
      const room = objectOrNull(source);
      if (!room) throw new Error(`Room ${index + 1} must be an object.`);
      const name = String(room.name || `Room ${index + 1}`).slice(0, 120);
      const rawRects = Array.isArray(room.rects) && room.rects.length ? room.rects : room.rect ? [room.rect] : [];
      if (!rawRects.length) throw new Error(`Room "${name}" has no geometry.`);
      const normalized = { ...clone(room), id: uniqueId(room.id, "room", roomIds, index), name };
      normalized.rects = rawRects.map(rect => normalizeRect(rect, name));
      normalized.clues = Array.isArray(room.clues) ? room.clues.map(value => String(value).slice(0, 1000)) : [];
      normalized.elevation = Math.max(0, Math.min(12, integer(room.elevation, 0)));
      normalized.wallHeight = Math.max(0, Math.min(3, integer(room.wallHeight, 1)));
      normalized.structure = ["floor", "platform"].includes(room.structure)
        ? room.structure : "floor";
      normalized.cutaway = room.cutaway === "front" ? "front" : "none";
      normalized.revealMode = ["manual", "armed", "always"].includes(room.revealMode)
        ? room.revealMode : "manual";
      delete normalized.rect;
      return normalized;
    });

    const doorIds = new Set();
    const doors = (Array.isArray(level.doors) ? level.doors : []).map((source, index) => {
      const door = objectOrNull(source);
      if (!door) throw new Error(`Door ${index + 1} must be an object.`);
      if (door.dir !== "h" && door.dir !== "v") throw new Error(`Door ${index + 1} has an invalid direction.`);
      return {
        ...clone(door),
        id: uniqueId(door.id, "door", doorIds, index),
        x: finite(door.x),
        y: finite(door.y),
        dir: door.dir,
        type: door.type === "open" ? "open" : "door",
        len: Math.max(1, integer(door.len, 1)),
      };
    });

    const propIds = new Set();
    const props = (Array.isArray(level.props) ? level.props : []).map((source, index) => {
      const prop = objectOrNull(source);
      if (!prop) throw new Error(`Prop ${index + 1} must be an object.`);
      return {
        ...clone(prop),
        id: uniqueId(prop.id, "prop", propIds, index),
        t: String(prop.t || "table").slice(0, 64),
        x: finite(prop.x),
        y: finite(prop.y),
      };
    });

    const stairIds = new Set();
    const stairs = (Array.isArray(level.stairs) ? level.stairs : []).map((source, index) => {
      const stair = objectOrNull(source);
      if (!stair) throw new Error(`Stair ${index + 1} must be an object.`);
      return {
        id: uniqueId(stair.id, "stair", stairIds, index),
        x: integer(stair.x), y: integer(stair.y),
        w: Math.max(1, integer(stair.w, 1)), h: Math.max(1, integer(stair.h, 1)),
        dir: ["n", "e", "s", "w"].includes(stair.dir) ? stair.dir : "n",
        from: Math.max(0, Math.min(12, integer(stair.from, 0))),
        to: Math.max(0, Math.min(12, integer(stair.to, 1))),
        style: ["stone", "wood", "metal"].includes(stair.style) ? stair.style : "stone",
      };
    });

    const rosterSource = Array.isArray(level.roster) ? level.roster : (options.fallbackRoster || []);
    const rosterIds = new Set();
    const roster = rosterSource.map((source, index) => {
      const entry = objectOrNull(source);
      if (!entry) throw new Error(`Roster entry ${index + 1} must be an object.`);
      const normalized = {
        ...clone(entry),
        id: uniqueId(entry.id, "roster", rosterIds, index),
        name: String(entry.name || `Token ${index + 1}`).slice(0, 120),
      };
      if (entry.sheet) normalized.sheet = sanitizeSheet(entry.sheet);
      return normalized;
    });

    return {
      schemaVersion: LEVEL_SCHEMA_VERSION,
      name: String(level.name || "Untitled Level").slice(0, 120),
      bg: /^#[0-9a-f]{6}$/i.test(level.bg || "") ? level.bg : "#0A0F0C",
      rooms,
      doors,
      props,
      stairs,
      roster,
    };
  }

  function normalizeSession(input, options = {}) {
    const session = objectOrNull(input);
    if (!session) throw new Error("Session data must be a JSON object.");
    const version = session.schemaVersion == null ? integer(session.v, 1) : integer(session.schemaVersion, -1);
    if (version < 1 || version > SESSION_SCHEMA_VERSION)
      throw new Error(`Unsupported session schema version: ${session.schemaVersion ?? session.v}.`);
    const map = objectOrNull(session.map) || {};
    const verso = objectOrNull(session.verso) || {};
    return {
      schemaVersion: SESSION_SCHEMA_VERSION,
      scene: session.scene === "map" ? "map" : "verso",
      map: {
        name: map.name == null ? null : String(map.name).slice(0, 200),
        imgURL: typeof map.imgURL === "string" ? map.imgURL : null,
        fogURL: typeof map.fogURL === "string" ? map.fogURL : null,
        grid: objectOrNull(map.grid) ? clone(map.grid) : {},
        fogOn: map.fogOn !== false,
        brush: Math.max(1, finite(map.brush, 90)),
        tokens: Array.isArray(map.tokens) ? clone(map.tokens) : [],
      },
      verso: {
        revealed: objectOrNull(verso.revealed) ? clone(verso.revealed) : {},
        tokens: Array.isArray(verso.tokens) ? clone(verso.tokens) : [],
      },
      // saves from before the level system carried no level at all — every one of
      // those was a Verso session, so callers pass the bundled pack as the fallback
      // rather than silently loading the party into an empty floor plan
      level: normalizeLevel(session.level || options.fallbackLevel || { rooms: [] }, options),
    };
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    })[char]);
  }

  function parseDice(expr) {
    const match = /^\s*(\d{0,2})d(\d{1,3})\s*([+-]\s*\d{1,3})?\s*$/i.exec(String(expr || ""));
    if (!match) return null;
    const die = +match[2];
    if (![2, 3, 4, 6, 8, 10, 12, 20, 100].includes(die)) return null;
    return {
      n: Math.max(1, Math.min(10, +match[1] || 1)),
      d: die,
      mod: match[3] ? +match[3].replace(/\s+/g, "") : 0,
    };
  }

  function sanitizeSheet(sheet) {
    if (!sheet || typeof sheet !== "object") return null;
    const num = (value, low, high) => Math.max(low, Math.min(high, (+value || 0) | 0));
    const out = {
      prof: num(sheet.prof, 0, 10),
      init: sheet.init == null || sheet.init === "" ? null : num(sheet.init, -10, 20),
      abil: {},
      atks: [],
      skills: {},
    };
    out.ac = sheet.ac == null || sheet.ac === "" ? null : num(sheet.ac, 0, 40);
    out.hpMax = sheet.hpMax == null || sheet.hpMax === "" ? null : num(sheet.hpMax, 0, 999);
    out.hp = sheet.hp == null || sheet.hp === "" ? out.hpMax : num(sheet.hp, 0, 999);
    out.spellAbil = ["str", "dex", "con", "int", "wis", "cha"].includes(sheet.spellAbil)
      ? sheet.spellAbil
      : null;
    for (const key of ["str", "dex", "con", "int", "wis", "cha"])
      out.abil[key] = num(sheet.abil && sheet.abil[key], -10, 15);
    out.atks = (Array.isArray(sheet.atks) ? sheet.atks : []).slice(0, 8).map(attack => ({
      name: String(attack && attack.name || "attack").slice(0, 24),
      hit: num(attack && attack.hit, -10, 25),
      dmg: parseDice(attack && attack.dmg) ? String(attack.dmg).trim().slice(0, 12) : "1d6",
    }));
    if (sheet.skills && typeof sheet.skills === "object") {
      for (const key of Object.keys(sheet.skills).slice(0, 30))
        out.skills[String(key).slice(0, 24)] = num(sheet.skills[key], -10, 25);
    }
    return out;
  }

  function spellAtkBonus(sheet) {
    return sheet.spellAbil == null ? null : sheet.prof + (sheet.abil[sheet.spellAbil] || 0);
  }

  function spellSaveDC(sheet) {
    const attack = spellAtkBonus(sheet);
    return attack == null ? null : 8 + attack;
  }

  function sanitizeLevelForClient(level) {
    const roster = (level.roster || []).map(entry => {
      if (entry.pc || !entry.sheet) return entry;
      const copy = { ...entry };
      delete copy.sheet;
      return copy;
    });
    return { ...level, roster };
  }

  function setBannerContent(doc, banner, data, totalClass) {
    const head = doc.createElement("div");
    const total = doc.createElement("div");
    const detail = doc.createElement("div");
    head.className = "rb-head";
    total.className = "rb-total" + (totalClass || "");
    detail.className = "rb-detail";
    head.textContent = String(data.head ?? "");
    total.textContent = String(data.total ?? "");
    detail.textContent = String(data.detail ?? "");
    banner.replaceChildren(head, total, detail);
  }

  return Object.freeze({
    LEVEL_SCHEMA_VERSION,
    SESSION_SCHEMA_VERSION,
    escapeHTML,
    parseDice,
    sanitizeSheet,
    spellAtkBonus,
    spellSaveDC,
    sanitizeLevelForClient,
    setBannerContent,
    normalizeLevel,
    normalizeSession,
  });
});

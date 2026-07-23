(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AppCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LEVEL_SCHEMA_VERSION = 3;
  const SESSION_SCHEMA_VERSION = 6;

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
      normalized.battleGrid = room.battleGrid === "square" || room.battleGrid === true
        ? "square" : "none";
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
      const normalized = {
        ...clone(prop),
        id: uniqueId(prop.id, "prop", propIds, index),
        t: String(prop.t || "table").slice(0, 64),
        x: finite(prop.x),
        y: finite(prop.y),
        scale: Math.max(.5, Math.min(2, finite(prop.scale, 1))),
        label: String(prop.label || "").trim().slice(0, 120),
        inspect: String(prop.inspect || "").trim().slice(0, 300),
        playerLabel: String(prop.playerLabel || "").trim().slice(0, 120),
        playerInspect: String(prop.playerInspect || "").trim().slice(0, 300),
        focus: !!prop.focus,
        rotation: ((integer(prop.rotation, 0) % 4) + 4) % 4,
      };
      delete normalized.terrain;
      delete normalized.footprint;
      const terrain = ["cover", "difficult", "hazard", "overhead"].includes(prop.terrain)
        ? prop.terrain : null;
      if (terrain) normalized.terrain = terrain;
      const footprint = objectOrNull(prop.footprint);
      if (footprint) normalized.footprint = {
        w: Math.max(.25, Math.min(20, finite(footprint.w, 1))),
        h: Math.max(.25, Math.min(20, finite(footprint.h, 1))),
        shape: footprint.shape === "circle" ? "circle" : "rect",
      };
      if (!normalized.label) delete normalized.label;
      if (!normalized.inspect) delete normalized.inspect;
      if (!normalized.playerLabel) delete normalized.playerLabel;
      if (!normalized.playerInspect) delete normalized.playerInspect;
      if (!normalized.focus) delete normalized.focus;
      if (!normalized.rotation) delete normalized.rotation;
      if (Array.isArray(prop.states) && prop.states.length) {
        normalized.states = prop.states.slice(0, 8).map((sourceState, stateIndex) => {
          const state = objectOrNull(sourceState) || {};
          const out = {
            ...clone(state),
            id: String(state.id || `state-${stateIndex + 1}`).replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 64),
            name: String(state.name || state.label || `State ${stateIndex + 1}`).slice(0, 80),
          };
          if (!state.label) delete out.label;
          if (state.t) out.t = String(state.t).slice(0, 64);
          if (state.terrain && !["cover", "difficult", "hazard", "overhead"].includes(state.terrain)) delete out.terrain;
          if (state.footprint) out.footprint = {
            w: Math.max(.25, Math.min(20, finite(state.footprint.w, 1))),
            h: Math.max(.25, Math.min(20, finite(state.footprint.h, 1))),
            shape: state.footprint.shape === "circle" ? "circle" : "rect",
          };
          out.rotation = ((integer(state.rotation, normalized.rotation || 0) % 4) + 4) % 4;
          return out;
        });
      }
      return normalized;
    });

    const encounterEffects = (Array.isArray(level.encounterEffects) ? level.encounterEffects : []).slice(0, 30).map((source, index) => {
      const effect = objectOrNull(source) || {};
      return {
        id: String(effect.id || `preset-${index + 1}`).replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 64),
        name: String(effect.name || `Encounter effect ${index + 1}`).slice(0, 80),
        terrain: ["cover", "difficult", "hazard"].includes(effect.terrain) ? effect.terrain : "hazard",
        shape: effect.shape === "circle" ? "circle" : "rect",
        w: Math.max(.25, Math.min(20, finite(effect.w, 1))),
        h: Math.max(.25, Math.min(20, finite(effect.h, 1))),
        duration: Math.max(0, Math.min(99, integer(effect.duration, 0))),
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
      encounterEffects,
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
    const doorStates = {};
    if (objectOrNull(verso.doorStates)) {
      for (const [id, open] of Object.entries(verso.doorStates).slice(0, 500))
        doorStates[String(id).slice(0, 64)] = !!open;
    }
    const effectIds = new Set();
    const effects = (Array.isArray(verso.effects) ? verso.effects : []).slice(0, 100).map((source, index) => {
      const effect = objectOrNull(source) || {};
      const id = uniqueId(effect.id, "effect", effectIds, index);
      return {
        id,
        terrain: ["cover", "difficult", "hazard"].includes(effect.terrain) ? effect.terrain : "hazard",
        x: finite(effect.x), y: finite(effect.y),
        w: Math.max(.25, Math.min(20, finite(effect.w, 1))),
        h: Math.max(.25, Math.min(20, finite(effect.h, 1))),
        shape: effect.shape === "circle" ? "circle" : "rect",
        label: String(effect.label || "Temporary effect").slice(0, 80),
        remaining: Math.max(0, Math.min(99, integer(effect.remaining, 0))),
        timed: !!effect.timed || integer(effect.remaining, 0) > 0,
      };
    });
    const propStates = {};
    if (objectOrNull(verso.propStates)) {
      for (const [id, state] of Object.entries(verso.propStates).slice(0, 500))
        propStates[String(id).slice(0, 64)] = String(state).slice(0, 64);
    }
    const trackerSource = objectOrNull(session.tracker) || {};
    const normalizeTokens = source => (Array.isArray(source) ? source : []).slice(0, 500).flatMap(token => {
      const item = objectOrNull(token);
      if (!item) return [];
      const normalized = clone(item);
      // Peer IDs are connection-scoped and must never survive a reload. ownerKey is
      // the durable, browser-local player assignment used to reclaim the token.
      delete normalized.owner;
      if (normalized.ownerKey != null) {
        normalized.ownerKey = String(normalized.ownerKey).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
        if (!normalized.ownerKey) delete normalized.ownerKey;
      }
      return [normalized];
    });
    const tracker = {
      order: (Array.isArray(trackerSource.order) ? trackerSource.order : []).slice(0, 100).map(entry => ({
        name: String(entry && entry.name || "Initiative").slice(0, 120),
        total: Math.max(-99, Math.min(999, integer(entry && entry.total, 0))),
        ...(entry && entry.tok != null ? { tok: integer(entry.tok) } : {}),
        ...(entry && entry.h ? { h: 1 } : {}),
        ...(entry && entry.marker ? { marker: true } : {}),
      })),
      active: Math.max(0, integer(trackerSource.active, 0)),
      round: Math.max(1, integer(trackerSource.round, 1)),
    };
    if (tracker.active >= tracker.order.length) tracker.active = 0;
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
        tokens: normalizeTokens(map.tokens),
      },
      verso: {
        view: verso.view === "tactical" ? "tactical" : "isometric",
        revealed: objectOrNull(verso.revealed) ? clone(verso.revealed) : {},
        tokens: normalizeTokens(verso.tokens),
        doorStates,
        effects,
        propStates,
        tacticalFocus: verso.tacticalFocus == null ? null : String(verso.tacticalFocus).slice(0, 64),
      },
      tracker,
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
      n: Math.max(1, Math.min(20, +match[1] || 1)),
      d: die,
      mod: match[3] ? +match[3].replace(/\s+/g, "") : 0,
    };
  }

  function doubleDiceExpression(expr) {
    const parsed = parseDice(expr);
    if (!parsed) return null;
    const count = Math.min(20, parsed.n * 2);
    const modifier = parsed.mod ? `${parsed.mod > 0 ? "+" : ""}${parsed.mod}` : "";
    return `${count}d${parsed.d}${modifier}`;
  }

  function isCriticalRoll(entry) {
    if (!entry || entry.d !== 20 || entry.n > 2) return false;
    return (entry.kept == null ? entry.results && entry.results[0] : entry.kept) === 20;
  }

  function migratePartyTokens(currentTokens, destinationTokens) {
    const identity = token => String(token && (token.actorId || token.name) || "").trim().toLowerCase();
    const current = new Map();
    for (const token of Array.isArray(currentTokens) ? currentTokens : []) {
      if (token && token.pc) current.set(identity(token), token);
    }
    return (Array.isArray(destinationTokens) ? destinationTokens : []).map(token => {
      const next = clone(token);
      if (!next.pc) return next;
      const previous = current.get(identity(next));
      if (!previous) return next;
      for (const key of ["sheet", "statuses", "z", "ownerKey", "owner"]) {
        if (previous[key] != null) next[key] = clone(previous[key]);
      }
      return next;
    });
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

  function roomEntryReveal(room, token, revealed) {
    if (!room || !token || !token.pc) return null;
    if (room.revealMode === "armed") return { reveal: true, nextMode: "manual" };
    if (room.revealMode === "always" && !revealed) return { reveal: true, nextMode: "always" };
    return null;
  }

  function cameraFocusFromViewport(camera, width, height, scene, levelView) {
    const scale = Math.max(0.0001, finite(camera && camera.s, 1));
    const viewportWidth = Math.max(1, finite(width, 1));
    const viewportHeight = Math.max(1, finite(height, 1));
    const x = finite(camera && camera.x, 0);
    const y = finite(camera && camera.y, 0);
    return {
      scene: scene === "map" ? "map" : "verso",
      levelView: levelView === "tactical" ? "tactical" : "isometric",
      centerX: x + viewportWidth / (2 * scale),
      centerY: y + viewportHeight / (2 * scale),
      worldWidth: viewportWidth / scale,
      worldHeight: viewportHeight / scale,
    };
  }

  function cameraFromFocus(focus, width, height) {
    if (!objectOrNull(focus)) return null;
    const worldWidth = finite(focus.worldWidth, 0);
    const worldHeight = finite(focus.worldHeight, 0);
    if (worldWidth <= 0 || worldHeight <= 0) return null;
    const viewportWidth = Math.max(1, finite(width, 1));
    const viewportHeight = Math.max(1, finite(height, 1));
    const scale = Math.min(viewportWidth / worldWidth, viewportHeight / worldHeight);
    const centerX = finite(focus.centerX, 0);
    const centerY = finite(focus.centerY, 0);
    return {
      x: centerX - viewportWidth / (2 * scale),
      y: centerY - viewportHeight / (2 * scale),
      s: scale,
    };
  }

  function roomContainsPoint(room, x, y) {
    return !!room && Array.isArray(room.rects) && room.rects.some(rect =>
      x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h);
  }

  function findRoomAt(rooms, x, y) {
    return (rooms || []).find(room => roomContainsPoint(room, x, y)) || null;
  }

  function pointInFootprint(x, y, item) {
    const fp = item && (item.footprint || item);
    if (!item || !fp) return false;
    const rawW = finite(fp.w, 1), rawH = finite(fp.h, 1);
    const quarterTurn = ((integer(item.rotation, 0) % 4) + 4) % 4;
    const w = quarterTurn % 2 ? rawH : rawW, h = quarterTurn % 2 ? rawW : rawH;
    if (fp.shape === "circle") {
      const rx = w / 2, ry = h / 2;
      if (rx <= 0 || ry <= 0) return false;
      return ((x - item.x - rx) / rx) ** 2 + ((y - item.y - ry) / ry) ** 2 <= 1;
    }
    return x >= item.x && x < item.x + w && y >= item.y && y < item.y + h;
  }

  function resolvePropState(prop, propStates) {
    if (!prop) return prop;
    const stateId = propStates && propStates[prop.id];
    const state = stateId && Array.isArray(prop.states) ? prop.states.find(item => item.id === stateId) : null;
    if (!state) return prop;
    const merged = { ...prop, ...clone(state), id: prop.id, stateId: state.id, states: prop.states };
    delete merged.name;
    return merged;
  }

  function propFootprintBounds(prop) {
    const fp = prop && prop.footprint;
    if (!fp) return { x: prop.x, y: prop.y, w: 1, h: 1, shape: "rect" };
    const rotation = ((integer(prop.rotation, 0) % 4) + 4) % 4;
    return { x: prop.x, y: prop.y, w: rotation % 2 ? fp.h : fp.w, h: rotation % 2 ? fp.w : fp.h, shape: fp.shape };
  }

  function doorIsOpen(door, doorStates) {
    return Object.prototype.hasOwnProperty.call(doorStates || {}, door.id)
      ? !!doorStates[door.id]
      : door.type === "open";
  }

  function doorAdjoiningRooms(door, rooms) {
    const half = (door.len || 1) / 2;
    const probes = door.dir === "h"
      ? [[door.x + half, door.y - .1], [door.x + half, door.y + .1]]
      : [[door.x - .1, door.y + half], [door.x + .1, door.y + half]];
    return probes.map(([x, y]) => findRoomAt(rooms, x, y));
  }

  function segmentsIntersect(a, b, c, d) {
    const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
    const eps = 1e-7;
    const overlaps = Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <= Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) + eps &&
      Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <= Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) + eps;
    return overlaps && abC * abD <= eps && cdA * cdB <= eps;
  }

  function crossesOpenDoor(from, to, fromRoom, toRoom, doors, rooms, doorStates) {
    return (doors || []).some(door => {
      if (!doorIsOpen(door, doorStates)) return false;
      const adjoining = doorAdjoiningRooms(door, rooms);
      if (!(adjoining.includes(fromRoom) && adjoining.includes(toRoom))) return false;
      const end = door.dir === "h"
        ? { x: door.x + (door.len || 1), y: door.y }
        : { x: door.x, y: door.y + (door.len || 1) };
      return segmentsIntersect(from, to, { x: door.x, y: door.y }, end);
    });
  }

  function tacticalMoveAllowed(config, token, x, y) {
    const rooms = config.rooms || [], revealed = config.revealed || {};
    const target = findRoomAt(rooms, x, y);
    if (!target) return { allowed: false, reason: "outside the level" };
    const canEnter = revealed[target.id] || target.revealMode === "always" ||
      (target.revealMode === "armed" && token && token.pc);
    if (!canEnter) return { allowed: false, reason: "room is hidden" };
    const dx = x - token.x, dy = y - token.y;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 10));
    let previous = { x: token.x, y: token.y };
    let previousRoom = findRoomAt(rooms, previous.x, previous.y);
    if (!previousRoom) return { allowed: false, reason: "start is outside the level" };
    const blockers = [...(config.props || []), ...(config.effects || []).map(effect => ({...effect,footprint:effect}))]
      .filter(item => item.terrain === "cover" && !pointInFootprint(token.x, token.y, item));
    for (let n = 1; n <= steps; n += 1) {
      const point = { x: token.x + dx * n / steps, y: token.y + dy * n / steps };
      const room = findRoomAt(rooms, point.x, point.y);
      if (!room) return { allowed: false, reason: "wall blocks the path" };
      if (!revealed[room.id] && room !== target && room.revealMode !== "always")
        return { allowed: false, reason: "path crosses a hidden room" };
      if (room !== previousRoom && !crossesOpenDoor(previous, point, previousRoom, room,
        config.doors, rooms, config.doorStates))
        return { allowed: false, reason: "closed wall or door" };
      if (blockers.some(item => pointInFootprint(point.x, point.y, item)))
        return { allowed: false, reason: "full cover blocks the path" };
      previous = point;
      previousRoom = room;
    }
    return { allowed: true, room: target };
  }

  function tacticalMoveCost(token, x, y, props, effects) {
    const squares = Math.max(Math.abs(x - token.x), Math.abs(y - token.y));
    const steps = Math.max(1, Math.ceil(squares));
    let difficult = 0;
    const zones = [...(props || []), ...(effects || []).map(effect => ({...effect,footprint:effect}))]
      .filter(item => item.terrain === "difficult");
    for (let n = 1; n <= steps; n += 1) {
      const px = token.x + (x - token.x) * n / steps;
      const py = token.y + (y - token.y) * n / steps;
      if (zones.some(item => pointInFootprint(px, py, item))) difficult += 1;
    }
    return { squares, difficult, feet: (squares + difficult) * 5 };
  }

  function shouldSnapLevelToken(rooms, x, y, tactical) {
    const room = findRoomAt(rooms, x, y);
    return !!tactical && !!room && room.battleGrid === "square";
  }

  function tokenVisibleToPlayers(token, rooms, revealed, partyRoomIds) {
    const room = findRoomAt(rooms, token.x, token.y);
    if (!room) return !!token.pc;
    if (!revealed[room.id]) return false;
    return !!token.pc || !!room.tokensAlways || partyRoomIds.has(room.id);
  }

  function orderedLevelTokens(tokens, tactical) {
    return tactical ? [...tokens] : [...tokens].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  }

  function sanitizeLevelForClient(level) {
    const roster = (level.roster || []).map(entry => {
      const copy = { ...entry };
      if (!entry.pc) { delete copy.sheet; delete copy.phases; }
      return copy;
    });
    const props = (level.props || []).map(prop => {
      const copy = clone(prop);
      delete copy.label;
      delete copy.inspect;
      if (Array.isArray(copy.states)) copy.states = copy.states.map(state => {
        const safe = { ...state };
        delete safe.name;
        delete safe.label;
        delete safe.inspect;
        return safe;
      });
      return copy;
    });
    return { ...level, roster, props, encounterEffects: [] };
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
    doubleDiceExpression,
    isCriticalRoll,
    migratePartyTokens,
    sanitizeSheet,
    spellAtkBonus,
    spellSaveDC,
    roomEntryReveal,
    cameraFocusFromViewport,
    cameraFromFocus,
    roomContainsPoint,
    findRoomAt,
    pointInFootprint,
    resolvePropState,
    propFootprintBounds,
    doorIsOpen,
    doorAdjoiningRooms,
    tacticalMoveAllowed,
    tacticalMoveCost,
    shouldSnapLevelToken,
    tokenVisibleToPlayers,
    orderedLevelTokens,
    sanitizeLevelForClient,
    setBannerContent,
    normalizeLevel,
    normalizeSession,
  });
});

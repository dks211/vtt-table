(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AppCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

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
    escapeHTML,
    parseDice,
    sanitizeSheet,
    spellAtkBonus,
    spellSaveDC,
    sanitizeLevelForClient,
    setBannerContent,
  });
});

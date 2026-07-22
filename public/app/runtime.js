(function (root) {
  "use strict";

  const services = {
    model: {},
    renderer: {},
    network: {},
    table: {},
    editor: {},
    panel: {},
  };

  root.App = {
    core: root.AppCore,
    content: root.VTTContent,
    document: {
      level: {
        schemaVersion: root.AppCore.LEVEL_SCHEMA_VERSION,
        name: "Untitled Level",
        bg: "#0A0F0C",
        roster: [],
        props: [],
        encounterEffects: [],
      },
      rooms: [],
      doors: [],
      stairs: [],
    },
    session: null,
    services,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);

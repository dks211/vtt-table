(function (root) {
  "use strict";

  const PALIMPSEST_ID = "palimpsest";
  const EAST_TENNESSEE_ID = "east-tennessee-1861";
  const content = root.VTTContent;
  const clone = value => JSON.parse(JSON.stringify(value));

  const eastTennesseeLevel = Object.freeze({
    schemaVersion: 3,
    name: "East Tennessee 1861 · Placeholder Scene",
    bg: "#182019",
    rooms: [{
      id: "east-tennessee-1861-placeholder-room",
      name: "East Tennessee 1861 · Placeholder Scene",
      sub: "Campaign package isolation test",
      read: "This placeholder scene confirms that the East Tennessee campaign can load without importing unfinished adventure content.",
      dm: "Placeholder only. No final map, encounter, or hidden campaign material is included in this vertical slice.",
      rects: [{ x: 0, y: 0, w: 8, h: 6 }],
      floorA: "#4B4434",
      floorB: "#403A2E",
      wall: "#6A6250",
      revealMode: "always",
      battleGrid: "none",
      clues: [],
    }],
    doors: [],
    stairs: [],
    props: [],
    encounterEffects: [],
    roster: [{
      id: "east-tennessee-1861-actor-placeholder-operative",
      actorId: "east-tennessee-1861:actor:placeholder-operative",
      name: "Placeholder Operative",
      letter: "ET",
      color: "#8A6E36",
      pc: true,
    }],
  });

  const eastTennesseeStart = Object.freeze({
    revealed: { "east-tennessee-1861-placeholder-room": true },
    tracker: { order: [], active: 0, round: 1 },
    tokens: [{
      actorId: "east-tennessee-1861:actor:placeholder-operative",
      name: "Placeholder Operative",
      letter: "ET",
      color: "#8A6E36",
      x: 3.5,
      y: 2.5,
      size: 1,
      pc: true,
    }],
  });

  const packages = new Map();
  const register = campaign => {
    if (!campaign || !campaign.id || packages.has(campaign.id))
      throw new Error("Campaign packages require a unique id.");
    packages.set(campaign.id, Object.freeze(campaign));
  };

  register({
    id: PALIMPSEST_ID,
    title: "Palimpsest",
    packageVersion: 1,
    stateSchemaVersion: 1,
    assetNamespace: "campaigns/palimpsest",
    content,
    initialLevel: content.VERSO_LEVEL,
    initialStart: content.VERSO_START,
    createCampaignState: () => ({}),
    normalizeCampaignState: () => ({}),
    createSession() {
      return {
        campaignId: this.id,
        campaignPackageVersion: this.packageVersion,
        campaignStateSchemaVersion: this.stateSchemaVersion,
        campaignState: this.createCampaignState(),
        level: clone(this.initialLevel),
      };
    },
  });

  register({
    id: EAST_TENNESSEE_ID,
    title: "East Tennessee 1861",
    packageVersion: 1,
    stateSchemaVersion: 1,
    assetNamespace: "campaigns/east-tennessee-1861",
    initialLevel: eastTennesseeLevel,
    initialStart: eastTennesseeStart,
    createCampaignState: () => ({
      namespace: EAST_TENNESSEE_ID,
      actors: {},
      scenes: {
        "east-tennessee-1861-placeholder": { status: "placeholder" },
      },
      handouts: {},
      timers: {},
      adventure: {},
    }),
    normalizeCampaignState(state) {
      const source = state && typeof state === "object" && !Array.isArray(state) ? state : {};
      const safeObject = value => value && typeof value === "object" && !Array.isArray(value)
        ? clone(value) : {};
      return {
        namespace: EAST_TENNESSEE_ID,
        actors: safeObject(source.actors),
        scenes: safeObject(source.scenes),
        handouts: safeObject(source.handouts),
        timers: safeObject(source.timers),
        adventure: safeObject(source.adventure),
      };
    },
    createSession() {
      return {
        campaignId: this.id,
        campaignPackageVersion: this.packageVersion,
        campaignStateSchemaVersion: this.stateSchemaVersion,
        campaignState: this.createCampaignState(),
        level: clone(this.initialLevel),
      };
    },
  });

  function get(id) {
    const campaign = packages.get(id);
    if (!campaign) throw new Error(`Unknown campaign "${id}".`);
    return campaign;
  }

  function descriptor(session) {
    return {
      type: "campaign",
      campaignId: session.campaignId,
      campaignPackageVersion: session.campaignPackageVersion,
      campaignStateSchemaVersion: session.campaignStateSchemaVersion,
    };
  }

  function initialJoinMessages(session, levelMessage, syncMessage) {
    return [descriptor(session), levelMessage, syncMessage];
  }

  root.VTTCampaigns = Object.freeze({
    defaultId: PALIMPSEST_ID,
    get,
    list: () => [...packages.values()],
    descriptor,
    initialJoinMessages,
  });
})(typeof globalThis !== "undefined" ? globalThis : this);

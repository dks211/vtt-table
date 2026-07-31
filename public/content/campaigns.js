(function (root) {
  "use strict";

  const PALIMPSEST_ID = "palimpsest";
  const EAST_TENNESSEE_ID = "east-tennessee-1861";
  const content = root.VTTContent;
  const clone = value => JSON.parse(JSON.stringify(value));
  const etHealth = root.EastTennesseeHealth;
  const etRounds = root.EastTennesseeRounds;
  const etCombat = root.EastTennesseeCombat;
  const etEquipment = root.EastTennesseeEquipment;
  const etCharacters = root.EastTennesseeCharacters;
  const etTalents = root.EastTennesseeTalents;
  const eastTennesseeConditions=()=>Object.fromEntries(["exhausted","shaken","frightened","distracted"].map(id=>[id,{active:false,source:null,notes:null}]));

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
    },{
      id: "east-tennessee-1861-actor-jacob-sloane",
      actorId: "east-tennessee-1861:actor:jacob-sloane",
      name: "Jacob Sloane · Mechanical Placeholder",
      letter: "JS", color: "#546B54", pc: true,
    },{
      id: "east-tennessee-1861-actor-elias-rourke", actorId: "east-tennessee-1861:actor:elias-rourke",
      name: "Elias Rourke · Mechanical Placeholder", letter: "ER", color: "#70534A", pc: true,
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
    },{
      actorId: "east-tennessee-1861:actor:jacob-sloane",
      name: "Jacob Sloane · Mechanical Placeholder",
      letter: "JS", color: "#546B54", x: 4.5, y: 2.5, size: 1, pc: true,
    },{
      actorId: "east-tennessee-1861:actor:elias-rourke", name: "Elias Rourke · Mechanical Placeholder",
      letter: "ER", color: "#70534A", x: 5.5, y: 2.5, size: 1, pc: true,
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
        campaignState: this.normalizeCampaignState(this.createCampaignState()),
        level: clone(this.initialLevel),
      };
    },
  });

  register({
    id: EAST_TENNESSEE_ID,
    title: "East Tennessee 1861",
    packageVersion: 1,
    stateSchemaVersion: 7,
    assetNamespace: "campaigns/east-tennessee-1861",
    initialLevel: eastTennesseeLevel,
    initialStart: eastTennesseeStart,
    createCampaignState: () => ({
      namespace: EAST_TENNESSEE_ID,
      actors: {
        "east-tennessee-1861:actor:placeholder-operative": {
          actorId: "east-tennessee-1861:actor:placeholder-operative",
          ownerKey: null,
          identity: { name: "Placeholder Operative", publicExample: "publicExample" },
          owner: { ownerExample: "ownerExample" },
          party: { revealed: false, partyExample: "partyExample" },
          selected: { recipientIds: [], selectedExample: "selectedExample" },
          gm: { gmExample: "gmExample" },
          mechanics: { visibility: "public", data: { placeholder: true } },
          privateNotes: { visibility: "owner", data: {} },
          health: { state: "unhurt", stable: true, dyingFailures: 0, dead: false },
          injuries: [], skills: { athletics: 9, awareness: 11, fieldcraft: 10, firearms: 10, influence: 8, mechanics: 9, medicine: 8, melee: 10, mobility: 10, resolve: 10, riding: 8, stealth: 11 },
          conditions: eastTennesseeConditions(), medicalCapability: { hasPlausibleMaterials: true, hasProperSupplies: true },
          talents: { fieldMedicine: false },
          weaponIds: ["revolver", "knife"], healthClassification: "full", aim: { active: false },
          combatContext: { cover: "none", visibility: "clear", unaware: false, stationary: false, coverDescription: "" },
        },
        "east-tennessee-1861:actor:jacob-sloane": {
          actorId: "east-tennessee-1861:actor:jacob-sloane", ownerKey: null,
          identity: { name: "Jacob Sloane · Mechanical Placeholder" },
          mechanics: { visibility: "public", data: { placeholder: true } },
          privateNotes: { visibility: "owner", data: {} },
          health: { state: "unhurt", stable: true, dyingFailures: 0, dead: false }, injuries: [],
          skills: { athletics: 8, awareness: 11, fieldcraft: 10, firearms: 9, influence: 10, mechanics: 9, medicine: 14, melee: 8, mobility: 9, resolve: 12, riding: 8, stealth: 9 },
          conditions: eastTennesseeConditions(), medicalCapability: { hasPlausibleMaterials: true, hasProperSupplies: true },
          talents: { fieldMedicine: true },
          weaponIds: ["rifle-musket", "club"], healthClassification: "full", aim: { active: false },
          combatContext: { cover: "none", visibility: "clear", unaware: false, stationary: false, coverDescription: "" },
        },
        "east-tennessee-1861:actor:elias-rourke": {
          actorId: "east-tennessee-1861:actor:elias-rourke", ownerKey: null,
          identity: { name: "Elias Rourke · Mechanical Placeholder" }, mechanics: { visibility: "public", data: { placeholder: true } },
          privateNotes: { visibility: "owner", data: {} }, health: { state: "unhurt", stable: true, dyingFailures: 0, dead: false }, injuries: [],
          skills: { firearms: 14, melee: 10, resolve: 11 }, conditions: eastTennesseeConditions(), medicalCapability: { hasPlausibleMaterials: false, hasProperSupplies: false },
          talents: { fieldMedicine: false }, weaponIds: ["revolver"], healthClassification: "full", aim: { active: false },
          combatContext: { cover: "none", visibility: "clear", unaware: false, stationary: false, coverDescription: "" },
        },
      },
      scenes: {
        "east-tennessee-1861-placeholder": { status: "placeholder" },
      },
      handouts: {},
      timers: {},
      logs: [],
      scene: { id: "east-tennessee-1861-placeholder", immediateDanger: false, circumstanceId: 1, actions: [] },
      fieldMedicineUsage: {}, nextInjuryId: 1, nextLogId: 1,
      rolls: [], pendingPush: null, nextRollId: 1, pushSequence: 1,
      attacks: [], pendingAttack: null, nextAttackId: 1,
      weapons: null, cylinders: null, pendingExtendedReload: null, nextEquipmentSequence: 1,
      structuredPlay: { active: false, sceneId: null, roundNumber: 0, phase: "inactive", participants: [], initiativeEntries: [], currentEntryId: null, completedEntryIds: [], delayedEntryIds: [], unresolvedTieGroups: [], processedRoundNumbers: [], stateVersion: 1 },
      adventureFlags: { bridgeDisabled: false, sabotageSucceeded: false, fireUncontrollable: false, bridgeWillBeConsumed: false, missingPatrolNoticed: false, helpWarned: false, reinforcementsArrived: false },
      nextTimerId: 1,
      recipientGrants: {},
      adventure: {},
    }),
    normalizeCampaignState(state) {
      const source = state && typeof state === "object" && !Array.isArray(state) ? state : {};
      const safeObject = value => value && typeof value === "object" && !Array.isArray(value)
        ? clone(value) : {};
      const normalized = {
        namespace: EAST_TENNESSEE_ID,
        actors: safeObject(source.actors),
        scenes: safeObject(source.scenes),
        handouts: safeObject(source.handouts),
        timers: safeObject(source.timers),
        logs: Array.isArray(source.logs) ? clone(source.logs) : [],
        scene: safeObject(source.scene),
        fieldMedicineUsage: safeObject(source.fieldMedicineUsage),
        nextInjuryId: Number(source.nextInjuryId) || 1,
        nextLogId: Number(source.nextLogId) || 1,
        rolls: Array.isArray(source.rolls) ? clone(source.rolls) : [],
        pendingPush: null,
        attacks: Array.isArray(source.attacks) ? clone(source.attacks) : [],
        pendingAttack: null,
        nextAttackId: Number(source.nextAttackId) || 1,
        weapons: source.weapons == null ? null : safeObject(source.weapons), cylinders: source.cylinders == null ? null : safeObject(source.cylinders),
        pendingExtendedReload: safeObject(source.pendingExtendedReload), nextEquipmentSequence: Number(source.nextEquipmentSequence) || 1,
        nextRollId: Number(source.nextRollId) || 1,
        pushSequence: Number(source.pushSequence) || 1,
        structuredPlay: safeObject(source.structuredPlay),
        adventureFlags: safeObject(source.adventureFlags),
        nextTimerId: Number(source.nextTimerId) || 1,
        recipientGrants: safeObject(source.recipientGrants),
        adventure: safeObject(source.adventure),
        characterRoster: safeObject(source.characterRoster),
        activeRosterLimit: Number(source.activeRosterLimit) || 4,
        characterClaimSequence: Number(source.characterClaimSequence) || 1,
        characterContentVersion: Number(source.characterContentVersion) || 0,
        talentUsage: safeObject(source.talentUsage),
        nextTalentSequence: Number(source.nextTalentSequence) || 1,
      };
      const characterNormalized=etCharacters ? etCharacters.normalizeState(normalized) : normalized;
      const talentNormalized=etTalents ? etTalents.normalizeState(characterNormalized,{cancelPending:true}) : characterNormalized;
      const healthNormalized=etHealth ? etHealth.normalizeState(talentNormalized,{cancelPending:true}) : talentNormalized;
      const roundsNormalized=etRounds ? etRounds.normalizeState(healthNormalized) : healthNormalized;
      const equipmentNormalized=etEquipment ? etEquipment.normalizeState(roundsNormalized) : roundsNormalized;
      return etCombat ? etCombat.normalizeState(equipmentNormalized,{cancelPending:true}) : equipmentNormalized;
    },
    createSession() {
      return {
        campaignId: this.id,
        campaignPackageVersion: this.packageVersion,
        campaignStateSchemaVersion: this.stateSchemaVersion,
        campaignState: this.normalizeCampaignState(this.createCampaignState()),
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

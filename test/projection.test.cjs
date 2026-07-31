const test = require("node:test");
const assert = require("node:assert/strict");

const {
  authorizePlayerCampaignMutation,
  applyAuthorizedCampaignMutation,
  normalizeRecipientContext,
  recipientContextForConnection,
  projectSessionForRecipient,
} = require("../app/core.js");

function fixture() {
  return {
    session: {
      campaignId: "east-tennessee-1861",
      campaignPackageVersion: 1,
      campaignStateSchemaVersion: 1,
      campaignState: {
        namespace: "east-tennessee-1861",
        actors: {
          "actor-a": {
            actorId: "actor-a",
            ownerKey: "owner-a",
            identity: { name: "Actor A", publicExample: "public-a" },
            owner: { ownerExample: "owner-a-secret" },
            party: { revealed: true, partyExample: "party-a" },
            selected: { recipientIds: ["actor-b"], selectedExample: "selected-for-b" },
            gm: { gmExample: "gm-a-secret" },
            mechanics: { visibility: "public", data: { score: 10 } },
            privateNotes: { visibility: "owner", data: { note: "note-a" } },
          },
          "actor-b": {
            actorId: "actor-b",
            ownerKey: "owner-b",
            identity: { name: "Actor B", publicExample: "public-b" },
            owner: { ownerExample: "owner-b-secret" },
            party: { revealed: false, partyExample: "unrevealed-b" },
            selected: { recipientIds: ["owner-a"], selectedExample: "selected-for-a" },
            gm: { gmExample: "gm-b-secret" },
          },
        },
        handouts: {
          public: { id: "public", visibility: "public", title: "Public", body: "public-handout", attachments: [] },
          ownerA: { id: "ownerA", visibility: "owner", ownerActorId: "actor-a", title: "Owner A", body: "owner-handout", attachments: ["owner-file"] },
          selectedB: { id: "selectedB", visibility: "selected", recipientIds: ["actor-b"], title: "Selected B", body: "selected-handout", attachments: [] },
          partyHidden: { id: "partyHidden", visibility: "party", revealed: false, title: "Hidden party", body: "unrevealed-handout", attachments: [] },
          partyShown: { id: "partyShown", visibility: "party", revealed: true, title: "Shown party", body: "revealed-handout", attachments: [] },
          gm: { id: "gm", visibility: "gm", title: "GM", body: "gm-handout", attachments: [] },
        },
        timers: {
          public: { id: "public", label: "Public timer", labelVisibility: "public", remainingRounds: 4, valueVisibility: "public" },
          privateValue: { id: "privateValue", label: "Riders approach", labelVisibility: "public", remainingRounds: 12, valueVisibility: "gm" },
          hidden: { id: "hidden", label: "Secret timer", labelVisibility: "gm", remainingRounds: 8, valueVisibility: "gm" },
        },
        logs: [
          { id: "public-log", visibility: "public", message: "public-log-message" },
          { id: "gm-log", visibility: "gm", message: "gm-log-message" },
        ],
        adventure: { gmOnlyUnknownDomain: "must-not-project" },
      },
      scene: "verso",
      verso: {
        view: "isometric", revealed: { "visible-room": true }, doorStates: {}, effects: [], propStates: {}, tacticalFocus: null,
        tokens: [
          { id: 1, actorId: "actor-a", ownerKey: "owner-a", owner: "peer-current", pc: true, name: "Actor A", x: 3.5, y: .5, sheet: { hp: 8 } },
          { id: 2, actorId: "npc", name: "NPC", x: 4.5, y: .5, sheet: { hp: 12 }, phases: [{ name: "secret phase" }], patrol: [[1, 2]] },
        ],
      },
      map: { grid: {}, fogOn: true, tokens: [] },
      tracker: { order: [{ name: "Hidden", total: 18, h: 1 }], active: 0, round: 1 },
    },
    level: {
      name: "Projection fixture",
      rooms: [
        { id: "hidden-room", name: "Secret Room", sub: "secret sub", read: "secret read", dm: "secret dm", clues: ["secret clue"], rects: [{ x: 0, y: 0, w: 2, h: 2 }], revealMode: "manual" },
        { id: "visible-room", name: "Visible Room", read: "visible read", dm: "visible dm", clues: ["visible clue"], rects: [{ x: 3, y: 0, w: 3, h: 2 }], revealMode: "manual" },
      ],
      doors: [], stairs: [], encounterEffects: [{ name: "GM preset" }],
      roster: [{ name: "NPC", sheet: { hp: 12 } }],
      props: [{ id: "secret-prop", label: "GM label", inspect: "GM inspect", playerLabel: "Player label" }],
    },
  };
}

const player = (overrides = {}) => normalizeRecipientContext({
  role: "player",
  connectionId: "peer-current",
  playerKey: "owner-a",
  actorId: "actor-a",
  campaignId: "east-tennessee-1861",
  partyMember: true,
  ...overrides,
});

test("GM projection is complete while player projections omit restricted serialized values", () => {
  const { session, level } = fixture();
  const gm = projectSessionForRecipient(session, normalizeRecipientContext({ role: "gm", campaignId: session.campaignId }), { level });
  const ownerA = projectSessionForRecipient(session, player(), { level });
  const ownerB = projectSessionForRecipient(session, player({ playerKey: "owner-b", actorId: "actor-b" }), { level });
  const unassigned = projectSessionForRecipient(session, player({ playerKey: "unassigned", actorId: null }), { level });

  assert.match(JSON.stringify(gm), /gm-a-secret/);
  const aPayload = JSON.stringify(ownerA);
  assert.match(aPayload, /owner-a-secret/);
  assert.match(aPayload, /selected-for-a/);
  for (const secret of ["owner-b-secret", "gm-a-secret", "gm-b-secret", "unrevealed-b", "unrevealed-handout", "gm-handout", "gm-log-message", "must-not-project"])
    assert.equal(aPayload.includes(secret), false, secret);

  const bPayload = JSON.stringify(ownerB);
  assert.match(bPayload, /owner-b-secret/);
  assert.match(bPayload, /selected-for-b/);
  assert.equal(bPayload.includes("owner-a-secret"), false);

  const unassignedPayload = JSON.stringify(unassigned);
  assert.match(unassignedPayload, /public-a/);
  assert.match(unassignedPayload, /party-a/);
  assert.equal(unassignedPayload.includes("owner-a-secret"), false);
  assert.equal(unassignedPayload.includes("selected-for-a"), false);
});

test("handouts and timers project titles, bodies, attachments, and values consistently", () => {
  const { session, level } = fixture();
  const projection = projectSessionForRecipient(session, player(), { level });
  const state = projection.sync.campaignState;
  assert.deepEqual(Object.keys(state.handouts).sort(), ["ownerA", "partyShown", "public"]);
  assert.equal(state.handouts.partyHidden, undefined);
  assert.equal(state.handouts.selectedB, undefined);
  assert.equal(state.timers.public.remainingRounds, 4);
  assert.equal(state.timers.privateValue.label, "Riders approach");
  assert.equal("remainingRounds" in state.timers.privateValue, false);
  assert.equal(state.timers.hidden, undefined);
});

test("Palimpsest projection retains current player visibility sanitizers", () => {
  const { session, level } = fixture();
  session.campaignId = "palimpsest";
  session.campaignState = {};
  const projection = projectSessionForRecipient(session, player({ campaignId: "palimpsest" }), { level });
  const npc = projection.sync.tokens.verso.find(token => token.name === "NPC");
  assert.equal(npc.sheet, undefined);
  assert.equal(npc.phases, undefined);
  assert.equal(npc.patrol, undefined);
  assert.equal(projection.level.data.roster[0].sheet, undefined);
  assert.equal(projection.level.data.props[0].label, undefined);
  assert.equal(projection.level.data.props[0].inspect, undefined);
  assert.equal(projection.level.data.props[0].playerLabel, "Player label");
  assert.deepEqual(projection.level.data.encounterEffects, []);
  assert.equal(projection.level.data.rooms[0].name, "Unrevealed Area");
  assert.equal(projection.level.data.rooms[0].read, undefined);
  assert.equal(projection.level.data.rooms[0].dm, undefined);
  assert.equal(projection.level.data.rooms[0].clues, undefined);
  assert.equal(projection.sync.tracker.order[0].total, undefined);
});

test("reconnect and ownership transfer depend on durable ownership, not transient peer ids", () => {
  const { session, level } = fixture();
  session.verso.tokens[0].owner = "peer-new";
  const reconnectContext = recipientContextForConnection(session, { peer: "peer-new", playerKey: "owner-a", assertedActorId: "actor-b" });
  assert.equal(reconnectContext.actorId, "actor-a");
  const reconnect = projectSessionForRecipient(session, reconnectContext, { level });
  assert.match(JSON.stringify(reconnect), /owner-a-secret/);
  const copiedContext = recipientContextForConnection(session, { peer: "peer-new", playerKey: "wrong", assertedActorId: "actor-a" });
  assert.equal(copiedContext.actorId, null);
  const copiedPeer = projectSessionForRecipient(session, copiedContext, { level });
  assert.equal(JSON.stringify(copiedPeer).includes("owner-a-secret"), false);

  session.campaignState.actors["actor-a"].ownerKey = "owner-b";
  session.verso.tokens[0].ownerKey = "owner-b";
  session.verso.tokens[0].owner = "peer-b";
  const formerOwner = projectSessionForRecipient(session,
    recipientContextForConnection(session, { peer: "peer-new", playerKey: "owner-a" }), { level });
  const newOwner = projectSessionForRecipient(session,
    recipientContextForConnection(session, { peer: "peer-b", playerKey: "owner-b" }), { level });
  assert.equal(JSON.stringify(formerOwner).includes("owner-a-secret"), false);
  assert.match(JSON.stringify(newOwner), /owner-a-secret/);
});

test("player campaign mutations use host-side ownership and field allowlists", () => {
  const { session } = fixture();
  const ownerA = player();
  const allowed = authorizePlayerCampaignMutation(session, ownerA, {
    type: "actor.update", actorId: "actor-a", changes: { mechanics: { score: 11 }, privateNotes: { note: "updated" }, gm: { hacked: true } },
  });
  assert.deepEqual(allowed, {
    type: "actor.update", actorId: "actor-a", changes: { mechanics: { score: 11 }, privateNotes: { note: "updated" } },
  });
  assert.equal(authorizePlayerCampaignMutation(session, ownerA, { type: "actor.update", actorId: "actor-b", changes: { mechanics: { score: 99 } } }), null);
  assert.equal(authorizePlayerCampaignMutation(session, ownerA, { type: "handout.reveal", handoutId: "gm" }), null);
  assert.equal(authorizePlayerCampaignMutation(session, ownerA, { type: "timer.update", timerId: "hidden", remainingRounds: 0 }), null);
  assert.equal(authorizePlayerCampaignMutation(session, player({ actorId: null }), { type: "actor.update", actorId: "actor-a", changes: { mechanics: {} } }), null);

  assert.equal(applyAuthorizedCampaignMutation(session, allowed), true);
  assert.deepEqual(session.campaignState.actors["actor-a"].mechanics.data, { score: 11 });
  assert.deepEqual(session.campaignState.actors["actor-a"].privateNotes.data, { note: "updated" });
  assert.equal(session.campaignState.actors["actor-a"].gm.hacked, undefined);
});

test("campaign mismatch and malformed visibility fail closed", () => {
  const { session, level } = fixture();
  assert.throws(() => projectSessionForRecipient(session, player({ campaignId: "palimpsest" }), { level }), /Campaign mismatch/);
  session.campaignState.handouts.bad = { id: "bad", visibility: "probably-public", title: "Bad", body: "malformed-secret" };
  const projection = projectSessionForRecipient(session, player(), { level });
  assert.equal(JSON.stringify(projection).includes("malformed-secret"), false);
});

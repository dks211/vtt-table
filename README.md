# Palimpsest VTT

`index.html` and the scripts in `app/` are the canonical application sources.
Cloudflare serves their generated copies from `public/`.

The browser client is organized by responsibility:

- `app/core.js` contains pure, testable rules and safe rendering helpers.
- `app/runtime.js` creates the `App` boundary: editable data in `App.document`,
  live play state in `App.session`, and named module APIs in `App.services`.
- `app/state-render.js` owns level state, cameras, and canvas rendering.
- `app/network.js` owns PeerJS host/client synchronization.
- `app/table.js` owns dice, player-window behavior, and canvas interaction.
- `app/editor.js` owns level editing, map import, and session persistence.
- `app/panel.js` owns the DM and player control panels.
- `app/boot.js` wires initial state and the local DM screen lock.
- `content/catalog.js` is the bundled Verso content pack plus the reusable room,
  prop, color, and roster catalogs.

The level editor keeps the top-down plan as its primary workspace and displays a
collapsible, auto-fitting isometric preview. The preview renders document geometry
and props without live-session tokens, and is throttled to keep editing responsive.
It can be enlarged or popped out into a draggable, viewport-clamped floating tool.

The start screen offers a blank level, level/session file loading, local autosave
resume, and the bundled Verso example. Layout editing supports undo/redo,
Shift-click multi-selection, group movement, copy/paste, duplication, and reusable
room presets saved in the browser.

Rooms also carry isometric-native presentation properties: stepped elevation,
wall height, raised platform edges, front-wall cutaways, expanded lighting
modes, and grouped material packs. These properties travel with level exports and
session saves.

Play mode can render the same level and token state as either an isometric scene
or a tactical overhead map. Rooms opt into a five-foot square grid individually,
so exploration spaces remain representational while encounter arenas gain exact
movement and ruler distances. The switch is synchronized to connected players and
the separate player window.

Props can also carry tactical footprints for full cover, difficult terrain,
hazards, and overhead objects. Those footprints are editable in the prop panel and
remain ordinary atmospheric props in the isometric renderer.

Props support quarter-turn orientation, explicit player-safe names and descriptions,
and authored alternate states. Stateful scenery such as pillars and chandeliers can
change appearance, position, footprint, and tactical behavior during play without
modifying the reusable level.

In tactical play, player movement stays inside revealed room geometry and crosses
room boundaries only through open doors. Grid snapping applies only inside rooms
that opt into the five-foot square grid. Token drags show distance and difficult
terrain cost; the DM can toggle doors, place session-only cover/difficult/hazard
effects, mark token conditions and elevation, and emphasize the active encounter
room without modifying the reusable level.

The initiative tracker distinguishes creatures from custom markers such as lair
actions and keeps a synchronized round count. Named encounter-effect presets can
be placed as square or circular areas with persistent or round-based durations;
timed effects count down when a new round begins. The ruler supports line, radius,
and cone templates. Tokens may also carry authored phases that change their name,
size, color, and stat block while preserving position and initiative.

The bundled Level 2 pack lays out the stairs below the Verso, Mirror Gallery,
Counting Floor, Sarlossi's office/stage, and the Vault of the Bella Rosa. The vault
ships as a 70-foot square tactical arena with pillars, coin dunes, and the hanging
chandelier already authored. Its office is a private performance salon tied to
Clown Fart's failed audition, the Mirror Gallery uses opposing mirror banks, and
the vault includes named arena effects plus toggleable pillar and chandelier states.

Room reveal policies can be manual, armed, or always visible. Armed rooms stay
hidden until a PC enters through revealed space, then reveal and return to manual
as a one-shot cue; unrevealed manual rooms continue to block player movement.

Stairs are directional level objects with a dragged footprint and explicit bottom
and top elevations, rather than a room-wide surface treatment. Placed stairs can
be selected to change their direction, east-west width, north-south depth, rise,
or stone, wood, and metal style. Press `S` for the stairs tool; drag a selected
stair to move it or drag its corner handle to resize its footprint.

Level and session JSON carry independent schema versions. Imports are normalized
and validated by `app/core.js`; legacy rectangle-based levels and `v:1` session
saves migrate when loaded.

## Development

- `npm test` runs the rules/security smoke tests and verifies that deployed files
  match their canonical sources.
- `npm run sync-public` updates `public/index.html` and `public/app/` after an
  application change.

The in-browser DM word is a convenience screen lock for keeping the console out
of casual view. It is shipped to the browser and is not an authorization
boundary. Deployed access is enforced by HTTP Basic Auth in `src/worker.js`,
using the `PALIMPSEST_USER` and `PALIMPSEST_PASSWORD` Worker secrets.

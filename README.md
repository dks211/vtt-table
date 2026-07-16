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

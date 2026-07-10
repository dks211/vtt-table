# Palimpsest VTT

`index.html` and the scripts in `app/` are the canonical application sources.
Cloudflare serves their generated copies from `public/`.

The browser client is organized by responsibility:

- `app/core.js` contains pure, testable rules and safe rendering helpers.
- `app/state-render.js` owns level state, cameras, and canvas rendering.
- `app/network.js` owns PeerJS host/client synchronization.
- `app/table.js` owns dice, player-window behavior, and canvas interaction.
- `app/editor.js` owns level editing, map import, and session persistence.
- `app/panel.js` owns the DM and player control panels.
- `app/boot.js` wires initial state and the local DM screen lock.

## Development

- `npm test` runs the rules/security smoke tests and verifies that deployed files
  match their canonical sources.
- `npm run sync-public` updates `public/index.html` and `public/app/` after an
  application change.

The in-browser DM word is a convenience screen lock for keeping the console out
of casual view. It is shipped to the browser and is not an authorization
boundary. Deployed access is enforced by HTTP Basic Auth in `src/worker.js`,
using the `PALIMPSEST_USER` and `PALIMPSEST_PASSWORD` Worker secrets.

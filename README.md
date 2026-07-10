# Palimpsest VTT

`index.html` and `app-core.js` are the canonical application sources. Cloudflare
serves their generated copies from `public/`.

## Development

- `npm test` runs the rules/security smoke tests and verifies that deployed files
  match their canonical sources.
- `npm run sync-public` updates `public/index.html` and `public/app-core.js` after
  an application change.

The in-browser DM word is a convenience screen lock for keeping the console out
of casual view. It is shipped to the browser and is not an authorization
boundary. Deployed access is enforced by HTTP Basic Auth in `src/worker.js`,
using the `PALIMPSEST_USER` and `PALIMPSEST_PASSWORD` Worker secrets.

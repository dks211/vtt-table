const REALM = "The Palimpsest";

export default {
  async fetch(request, env) {
    const configuredUser = env.PALIMPSEST_USER;
    const configuredPassword = env.PALIMPSEST_PASSWORD;

    if (!configuredUser || !configuredPassword) {
      return textResponse("Site password is not configured.", 503);
    }

    const credentials = parseBasicAuth(request.headers.get("Authorization"));
    const authorized =
      credentials &&
      timingSafeEqual(credentials.user, configuredUser) &&
      timingSafeEqual(credentials.password, configuredPassword);

    if (!authorized) {
      return textResponse("Authentication required.", 401, {
        "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/turn") {
      return turnCredentials(env);
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

// Mint TURN credentials so remote players (cellular / different networks) can
// relay when a direct connection fails. Two providers, first configured wins:
//   Cloudflare Realtime — env TURN_KEY_ID + TURN_KEY_API_TOKEN (needs a card on file)
//   Metered.ca free plan — env METERED_DOMAIN (e.g. myapp.metered.live) + METERED_API_KEY
// With neither set this returns iceServers:null and the app falls back to STUN only.
async function turnCredentials(env) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  const fail = (error) =>
    new Response(JSON.stringify({ iceServers: null, error }), { status: 200, headers });
  // dashboard copy-paste often smuggles in whitespace or a scheme prefix
  const clean = (v) => (v || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const turnKeyId = (env.TURN_KEY_ID || "").trim();
  const turnKeyToken = (env.TURN_KEY_API_TOKEN || "").trim();
  const meteredDomain = clean(env.METERED_DOMAIN);
  const meteredKey = (env.METERED_API_KEY || "").trim();

  try {
    if (turnKeyId && turnKeyToken) {
      const response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${turnKeyToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl: 86400 }),
        },
      );
      if (!response.ok) return fail(`cloudflare turn api ${response.status}`);
      return new Response(JSON.stringify(await response.json()), { status: 200, headers });
    }

    if (meteredDomain && meteredKey) {
      const response = await fetch(
        `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(meteredKey)}`,
      );
      if (!response.ok) return fail(`metered turn api ${response.status}`);
      const servers = await response.json(); // metered returns a bare array
      return new Response(JSON.stringify({ iceServers: servers }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ iceServers: null }), { status: 200, headers });
  } catch {
    return fail("turn api unreachable");
  }
}

function parseBasicAuth(header) {
  if (!header || !header.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = atob(header.slice("Basic ".length).trim());
    const separator = decoded.indexOf(":");

    if (separator === -1) {
      return null;
    }

    return {
      user: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function timingSafeEqual(left, right) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }

  return diff === 0;
}

function textResponse(message, status, headers = {}) {
  return new Response(`${message}\n`, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=UTF-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

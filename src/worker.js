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

// Mint short-lived TURN credentials from Cloudflare Realtime so remote players
// (cellular / different networks) can relay when a direct connection fails.
// Requires env vars TURN_KEY_ID and TURN_KEY_API_TOKEN (dashboard: Realtime → TURN).
// Without them this returns iceServers:null and the app falls back to STUN only.
async function turnCredentials(env) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) {
    return new Response(JSON.stringify({ iceServers: null }), { status: 200, headers });
  }

  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 86400 }),
      },
    );

    if (!response.ok) {
      return new Response(JSON.stringify({ iceServers: null, error: `turn api ${response.status}` }), {
        status: 200,
        headers,
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ iceServers: null, error: "turn api unreachable" }), {
      status: 200,
      headers,
    });
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

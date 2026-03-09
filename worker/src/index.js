import { Api, JsonRpc } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig.js';

// Badge template definitions
const BADGES = {
  first_match: {
    template_id: 904584,
    name: "Blockchain Heroes WARS Badge",
    description: "Awarded for playing your first match",
  },
  // Add more badges here as they're created:
  // win_streak_5: { template_id: XXXXX, name: "...", description: "..." },
};

// CORS headers for cross-origin requests from the game
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Rate limiting: track recent mints per player (in-memory, resets on Worker restart)
const recentMints = new Map();
const RATE_LIMIT_MS = 60000; // 1 mint per badge per player per minute

function isRateLimited(player, badgeId) {
  const key = `${player}:${badgeId}`;
  const last = recentMints.get(key);
  if (last && Date.now() - last < RATE_LIMIT_MS) return true;
  recentMints.set(key, Date.now());
  return false;
}

// Validate WAX account name format
function isValidAccount(name) {
  return /^[a-z1-5.]{1,13}$/.test(name);
}

async function handleMint(request, env) {
  // Parse request
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { player, badge_id, api_secret } = body;

  // Validate API secret
  if (!api_secret || api_secret !== env.API_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Validate player account
  if (!player || !isValidAccount(player)) {
    return new Response(JSON.stringify({ error: "Invalid player account" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Validate badge ID
  const badge = BADGES[badge_id];
  if (!badge) {
    return new Response(JSON.stringify({ error: "Unknown badge: " + badge_id }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Rate limit check
  if (isRateLimited(player, badge_id)) {
    return new Response(JSON.stringify({ error: "Rate limited. Try again later." }), {
      status: 429,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Check if player already owns this badge (prevent duplicates)
  try {
    const checkUrl = `https://wax.api.atomicassets.io/atomicassets/v1/assets?owner=${player}&collection_name=officialhero&schema_name=herobadges&template_id=${badge.template_id}&limit=1`;
    const checkResp = await fetch(checkUrl);
    const checkData = await checkResp.json();
    if (checkData.data && checkData.data.length > 0) {
      return new Response(JSON.stringify({ error: "Player already owns this badge", already_owned: true }), {
        status: 409,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    // If check fails, proceed with mint anyway — better to mint than to block
    console.error("Duplicate check failed:", e.message);
  }

  // Set up eosjs
  const signatureProvider = new JsSignatureProvider([env.WAX_PRIVATE_KEY]);
  const rpc = new JsonRpc("https://wax.greymass.com", { fetch });
  const api = new Api({ rpc, signatureProvider });

  // Build and send the mint transaction
  try {
    const result = await api.transact(
      {
        actions: [
          {
            account: "atomicassets",
            name: "mintasset",
            authorization: [{ actor: "heroes", permission: "active" }],
            data: {
              authorized_minter: "heroes",
              collection_name: "officialhero",
              schema_name: "herobadges",
              template_id: badge.template_id,
              new_asset_owner: player,
              immutable_data: [],
              mutable_data: [],
              tokens_to_back: [],
            },
          },
        ],
      },
      { blocksBehind: 3, expireSeconds: 30 }
    );

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: result.transaction_id,
        badge: badge.name,
        player,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Mint failed:", e.message);
    return new Response(
      JSON.stringify({ error: "Mint transaction failed: " + e.message }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // POST /mint — mint a badge to a player
    if (request.method === "POST" && url.pathname === "/mint") {
      return handleMint(request, env);
    }

    // GET /health — simple health check
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", badges: Object.keys(BADGES) }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404, headers: CORS_HEADERS });
  },
};

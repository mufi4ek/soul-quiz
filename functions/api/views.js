const DAY = 24 * 60 * 60;
const COOKIE_NAME = "sq_vid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store, private",
      "Vary": "Cookie",
      ...headers,
    },
  });
}

function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function validVisitorId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{20,120}$/.test(value);
}

function makeVisitorId() {
  return crypto.randomUUID().replaceAll("-", "");
}

function isAllowedOrigin(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return false;
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite === "cross-site") return false;
  return true;
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return json({ error: "Views service is not configured" }, 503);
  }

  if (!isAllowedOrigin(request)) {
    return json({ error: "Forbidden" }, 403);
  }

  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - DAY;
  let visitorId = getCookie(request, COOKIE_NAME);
  const newCookie = !validVisitorId(visitorId);
  if (newCookie) visitorId = makeVisitorId();

  try {
    // A single SQLite UPSERT + trigger gives us an atomic 24-hour dedupe and
    // an exact global counter. There is no client-side trust involved.
    await env.DB.prepare(`
      INSERT INTO visitors (id, last_counted)
      VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET last_counted = excluded.last_counted
      WHERE visitors.last_counted <= ?
    `).bind(visitorId, now, cutoff).run();

    const row = await env.DB.prepare(
      "SELECT views FROM site_stats WHERE id = 'total'"
    ).first();

    const views = Number(row?.views);
    if (!Number.isSafeInteger(views) || views < 0) {
      return json({ error: "Invalid counter state" }, 500);
    }

    const headers = {};
    if (newCookie) {
      headers["Set-Cookie"] = `${COOKIE_NAME}=${encodeURIComponent(visitorId)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; Secure; HttpOnly; SameSite=Lax`;
    }

    return json({ views }, 200, headers);
  } catch (error) {
    console.error("Soul Quiz views API error", error);
    return json({ error: "Views service temporarily unavailable" }, 503);
  }
}

export async function onRequestOptions({ request }) {
  if (!isAllowedOrigin(request)) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": new URL(request.url).origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "no-store"
  }});
}

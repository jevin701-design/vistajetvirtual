/* VJG Infinite Flight Live API v2 proxy.
 * API-derived stats are returned on demand only; never persist them.
 */
export default async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: { "Cache-Control": "no-store" } });
  }

  const apiKey = Netlify.env.get("INFINITE_FLIGHT_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "api_key_not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  let body: { infiniteFlightUsername?: unknown; infiniteFlightUserId?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const username = typeof body.infiniteFlightUsername === "string" ? body.infiniteFlightUsername.trim() : "";
  const userId = typeof body.infiniteFlightUserId === "string" ? body.infiniteFlightUserId.trim() : "";
  if ((!username && !userId) || username.length > 64 || userId.length > 64) {
    return Response.json({ error: "provide_infinite_flight_username_or_user_id" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const apiResponse = await fetch("https://api.infiniteflight.com/public/v2/users", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(username ? { discourseNames: [username] } : { userIds: [userId] }),
      signal: AbortSignal.timeout(12000)
    });

    if (!apiResponse.ok) {
      return Response.json({ error: "infinite_flight_api_error", providerStatus: apiResponse.status }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const payload = await apiResponse.json();
    if (payload?.errorCode !== 0 || !Array.isArray(payload?.result)) {
      return Response.json({ error: "infinite_flight_response_error", providerErrorCode: payload?.errorCode ?? null }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const match = payload.result.find((item: any) =>
      username
        ? String(item?.discourseUsername ?? "").toLowerCase() === username.toLowerCase()
        : String(item?.userId ?? "").toLowerCase() === userId.toLowerCase()
    );

    if (!match || match.errorCode !== 0) {
      return Response.json({ error: "pilot_not_found_or_not_linked" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const flightMinutes = Number(match.flightTime);
    const multiplayerFlights = Number(match.onlineFlights);
    return Response.json({
      connected: true,
      provider: "infinite-flight-v2",
      username: match.discourseUsername ?? null,
      infiniteFlightUserId: match.userId ?? null,
      flightHours: Number.isFinite(flightMinutes) ? Math.max(0, flightMinutes / 60) : null,
      completedFlights: Number.isFinite(multiplayerFlights) ? Math.max(0, Math.floor(multiplayerFlights)) : null,
      grade: Number.isFinite(Number(match.grade)) ? Number(match.grade) : null,
      fetchedAt: new Date().toISOString()
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "infinite_flight_unreachable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
};

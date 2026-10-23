/* VJG Infinite Flight integration boundary.
 * Never place the Infinite Flight API key in this file or browser code.
 * Live API data is only for temporary caching; do not persist it in Supabase.
 * Connect this adapter to a secured server/Netlify Function after API access is approved.
 */
(function (root) {
  "use strict";
  const ENDPOINT = "/.netlify/functions/infinite-flight-pilot-progress";
  const state = { connected: false, provider: "demo", lastFetchedAt: null };
  async function getPilotProgress(vjgProfile) {
    if (!vjgProfile || (!vjgProfile.infiniteFlightUsername && !vjgProfile.infiniteFlightUserId)) {
      return { ...state, reason: "missing-linked-infinite-flight-user", flights: null, hours: null };
    }
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ infiniteFlightUsername: vjgProfile.infiniteFlightUsername, infiniteFlightUserId: vjgProfile.infiniteFlightUserId })
      });
      if (!response.ok) throw new Error("Flight data provider unavailable");
      const data = await response.json();
      if (!data || data.connected !== true || (!Number.isFinite(data.completedFlights) && !Number.isFinite(data.flightHours))) {
        throw new Error("Invalid provider response");
      }
      return {
        connected: true,
        provider: "infinite-flight",
        lastFetchedAt: data.fetchedAt || new Date().toISOString(),
        flights: Number.isFinite(data.completedFlights) ? Math.max(0, Math.floor(data.completedFlights)) : null,
        hours: Number.isFinite(data.flightHours) ? Math.max(0, data.flightHours) : null
      };
    } catch (_) {
      return { ...state, reason: "provider-not-configured", flights: null, hours: null };
    }
  }
  root.VJGFlightDataProvider = Object.freeze({ getPilotProgress, getState: () => ({ ...state }) });
})(window);

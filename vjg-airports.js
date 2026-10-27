/* Shared airport directory, METAR and runway lookup.
 * Does not invent missing data. Failures stay visible to the page.
 */
(function () {
  "use strict";
  const AIRPORTS_CSV = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv";
  const RUNWAYS_CSV = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/runways.csv";
  const found = Object.create(null);
  let airportPromise = null;
  let runwayPromise = null;

  function parseRow(line) {
    const out = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          value += '"';
          i++;
        } else quoted = !quoted;
      } else if (ch === "," && !quoted) {
        out.push(value);
        value = "";
      } else value += ch;
    }
    out.push(value);
    return out;
  }

  function indexOf(headers) {
    const ix = {};
    headers.forEach(function (h, i) { ix[h] = i; });
    return ix;
  }

  function loadAirports() {
    if (!airportPromise) {
      airportPromise = fetch(AIRPORTS_CSV).then(function (r) {
        if (!r.ok) throw new Error("airport-directory-unavailable");
        return r.text();
      }).then(function (csv) {
        const lines = csv.split(/\r?\n/);
        const ix = indexOf(parseRow(lines.shift() || ""));
        const db = Object.create(null);
        lines.forEach(function (line) {
          if (!line) return;
          const a = parseRow(line);
          const type = (a[ix.type] || "").toLowerCase();
          if (type === "closed") return;
          const icao = (a[ix.icao_code] || "").toUpperCase();
          const ident = (a[ix.ident] || "").toUpperCase();
          const code = /^[A-Z]{4}$/.test(icao) ? icao : (/^[A-Z]{4}$/.test(ident) ? ident : "");
          if (!code || db[code]) return;
          db[code] = {
            icao: code,
            name: a[ix.name] || code,
            municipality: a[ix.municipality] || "",
            country: a[ix.iso_country] || "",
            continent: (a[ix.continent] || "").toUpperCase(),
            latitude: Number(a[ix.latitude_deg]),
            longitude: Number(a[ix.longitude_deg]),
            elevationFt: Number(a[ix.elevation_ft])
          };
        });
        return db;
      }).catch(function (err) {
        airportPromise = null;
        throw err;
      });
    }
    return airportPromise;
  }

  function loadRunways() {
    if (!runwayPromise) {
      runwayPromise = fetch(RUNWAYS_CSV).then(function (r) {
        if (!r.ok) throw new Error("runway-directory-unavailable");
        return r.text();
      }).then(function (csv) {
        const lines = csv.split(/\r?\n/);
        const ix = indexOf(parseRow(lines.shift() || ""));
        const db = Object.create(null);
        lines.forEach(function (line) {
          if (!line) return;
          const a = parseRow(line);
          if (a[ix.closed] === "1") return;
          const code = (a[ix.airport_ident] || "").toUpperCase();
          const le = a[ix.le_ident] || "";
          const he = a[ix.he_ident] || "";
          if (!code || !le) return;
          const item = {
            le: le,
            he: he,
            lengthFt: Number(a[ix.length_ft]),
            widthFt: Number(a[ix.width_ft]),
            surface: a[ix.surface] || "",
            heading: Number(a[ix.le_heading_degT])
          };
          (db[code] || (db[code] = [])).push(item);
        });
        return db;
      }).catch(function (err) {
        runwayPromise = null;
        throw err;
      });
    }
    return runwayPromise;
  }

  async function lookup(code) {
    const icao = String(code || "").trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(icao)) throw new Error("invalid-icao");
    if (found[icao]) return found[icao];
    try {
      const res = await fetch("https://api.freeairportdb.com/v1/airports/" + encodeURIComponent(icao), { headers: { Accept: "application/json" } });
      if (res.ok) {
        const json = await res.json();
        const c = json && json.data;
        const id = String((c && (c.icao || c.icao_code || c.code)) || "").toUpperCase();
        if (c && id === icao) {
          found[icao] = {
            icao: icao,
            name: c.name || icao,
            municipality: c.municipality || "",
            country: c.country_name || c.iso_country || "",
            continent: String(c.continent_code || c.continent || "").toUpperCase(),
            latitude: Number(c.latitude != null ? c.latitude : c.latitude_deg),
            longitude: Number(c.longitude != null ? c.longitude : c.longitude_deg),
            elevationFt: Number(c.elevation_ft != null ? c.elevation_ft : c.elevation)
          };
          return found[icao];
        }
      }
    } catch (e) {}
    const db = await loadAirports();
    if (!db[icao]) throw new Error("not-found");
    found[icao] = db[icao];
    return found[icao];
  }

  async function metar(code) {
    const icao = String(code || "").trim().toUpperCase();
    const res = await fetch("https://aviationweather.gov/api/data/metar?ids=" + encodeURIComponent(icao) + "&format=json&hours=2");
    if (!res.ok) throw new Error("metar-unavailable");
    const arr = await res.json();
    if (!arr || !arr.length) return null;
    return arr[0];
  }

  async function runways(code) {
    const icao = String(code || "").trim().toUpperCase();
    const db = await loadRunways();
    return db[icao] || [];
  }

  window.VJGAirports = { lookup: lookup, metar: metar, runways: runways };
})();

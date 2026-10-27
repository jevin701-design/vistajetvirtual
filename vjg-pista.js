(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const t = (es, en) => (window.VJGLang ? window.VJGLang.t(es, en) : (document.documentElement.lang === "en" ? en : es));
  const n = (id) => Number($(id).value);
  const fmt = (v) => Math.round(v).toLocaleString(document.documentElement.lang === "en" ? "en-US" : "es-MX");
  let airportIndex = null;
  let runwayIndex = null;
  let airportLoading = null;
  let didCalc = false;
  let airportState = { kind: "loading" };

  function parseCSVLine(line) {
    const out = [];
    let v = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && quoted && line[i + 1] === '"') { v += '"'; i++; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) { out.push(v); v = ""; }
      else v += ch;
    }
    out.push(v);
    return out;
  }
  async function loadAirportData() {
    if (airportIndex && runwayIndex) return;
    if (!airportLoading) {
      airportLoading = Promise.all([
        fetch("https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv").then((r) => { if (!r.ok) throw Error("airports"); return r.text(); }),
        fetch("https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/runways.csv").then((r) => { if (!r.ok) throw Error("runways"); return r.text(); })
      ]).then(([ac, rc]) => {
        const parse = (csv) => { const lines = csv.split(/\r?\n/); const headers = parseCSVLine(lines.shift()); const ix = Object.fromEntries(headers.map((h, i) => [h, i])); return { lines, ix }; };
        const A = parse(ac);
        const airports = {};
        const byId = {};
        for (const line of A.lines) {
          if (!line) continue;
          const a = parseCSVLine(line);
          const icao = (a[A.ix.icao_code] || "").toUpperCase();
          const ident = (a[A.ix.ident] || "").toUpperCase();
          const code = icao || (/^[A-Z]{4}$/.test(ident) ? ident : "");
          if (code.length === 4 && a[A.ix.type] !== "closed") {
            const item = { id: a[A.ix.id], code, name: a[A.ix.name] || "", city: a[A.ix.municipality] || "", country: a[A.ix.iso_country] || "", elev: Number(a[A.ix.elevation_ft]) };
            if (!airports[code]) airports[code] = item;
            byId[item.id] = item;
          }
        }
        const R = parse(rc);
        const runways = {};
        for (const line of R.lines) {
          if (!line) continue;
          const a = parseCSVLine(line);
          const airport = byId[a[R.ix.airport_ref]];
          if (!airport || a[R.ix.closed] === "1") continue;
          const item = { le: a[R.ix.le_ident] || "", he: a[R.ix.he_ident] || "", length: Number(a[R.ix.length_ft]), width: Number(a[R.ix.width_ft]), heading: Number(a[R.ix.le_heading_degT]), surface: a[R.ix.surface] || "" };
          if (!item.le) continue;
          (runways[airport.code] || (runways[airport.code] = [])).push(item);
        }
        airportIndex = airports;
        runwayIndex = runways;
      }).catch((e) => { airportLoading = null; throw e; });
    }
    return airportLoading;
  }
  function paintAirport() {
    const s = airportState;
    if (s.kind === "invalid") {
      $("airportStatus").textContent = t("Introduce un código OACI de cuatro letras.", "Enter a four-letter ICAO code.");
      $("airportName").value = "";
      return;
    }
    if (s.kind === "loading") {
      $("airportStatus").textContent = t("Consultando el directorio de aeropuertos…", "Looking up the airport directory…");
      $("airportName").value = t("Buscando…", "Searching…");
      return;
    }
    if (s.kind === "missing") {
      $("airportStatus").textContent = t("Código OACI no encontrado. Verifica las cuatro letras.", "ICAO code not found. Check the four letters.");
      $("airportName").value = t("No encontrado", "Not found");
      return;
    }
    if (s.kind === "offline") {
      $("airportStatus").textContent = t("No se pudo cargar el directorio. Revisa la conexión; puedes introducir los datos a mano.", "The directory could not be loaded. Check the connection; you can enter the data manually.");
      $("airportName").value = t("Sin verificación en línea", "No online verification");
      return;
    }
    if (s.kind === "manual-runway") {
      $("airportStatus").textContent = t("Aeropuerto detectado; no hay una pista con ese designador. Introduce los datos a mano.", "Airport found; no runway uses that designator. Enter the data manually.");
      return;
    }
    if (s.kind === "runway") {
      $("airportStatus").textContent = t("Aeropuerto y pista encontrados. Datos de OurAirports; confirma que sigan vigentes.", "Airport and runway found. OurAirports data; confirm it is still current.");
      return;
    }
    if (s.kind === "found") {
      const list = (runwayIndex && runwayIndex[s.code]) || [];
      $("airportName").value = [s.airport.name, s.airport.city, s.airport.country].filter(Boolean).join(" · ") || s.code;
      $("runwayOptions").innerHTML = list.map((r) => '<option value="' + r.le.replace(/&/g, "&" + "amp;").replace(/"/g, "&" + "quot;") + '">' + r.le + " · " + (r.length ? Math.round(r.length).toLocaleString(document.documentElement.lang === "en" ? "en-US" : "es-MX") + " ft" : t("longitud n/d", "length n/a")) + "</option>").join("");
      $("airportStatus").textContent = t("Aeropuerto OACI detectado", "ICAO airport found") + (list.length ? " · " + list.length + t(" registros de pista.", " runway records.") : t(" · sin registros de pista.", " · no runway records."));
    }
  }
  function applyRunway() {
    const code = $("icao").value.trim().toUpperCase();
    const designator = $("runway").value.trim().toUpperCase();
    const list = (runwayIndex && runwayIndex[code]) || [];
    const r = list.find((x) => x.le.toUpperCase() === designator || x.he.toUpperCase() === designator);
    if (!r) {
      if (designator && airportState.kind !== "loading" && airportState.kind !== "offline") {
        airportState = { kind: "manual-runway" };
        paintAirport();
      }
      return;
    }
    if (r.length > 0) $("length").value = Math.round(r.length);
    if (r.width > 0) $("width").value = Math.round(r.width);
    if (Number.isFinite(r.heading)) $("heading").value = Math.round(r.heading);
    airportState = { kind: "runway" };
    paintAirport();
  }
  async function detectAirport() {
    const code = $("icao").value.trim().toUpperCase();
    $("icao").value = code;
    if (!/^[A-Z]{4}$/.test(code)) {
      airportState = { kind: "invalid" };
      $("runwayOptions").innerHTML = "";
      paintAirport();
      return;
    }
    airportState = { kind: "loading" };
    paintAirport();
    try {
      await loadAirportData();
      const a = airportIndex[code];
      if (!a) {
        airportState = { kind: "missing" };
        $("runwayOptions").innerHTML = "";
        paintAirport();
        return;
      }
      airportState = { kind: "found", code, airport: a };
      if (Number.isFinite(a.elev)) $("elev").value = Math.round(a.elev);
      paintAirport();
      const list = runwayIndex[code] || [];
      if (list.length === 1) { $("runway").value = list[0].le; applyRunway(); }
      else if ($("runway").value) applyRunway();
    } catch (e) {
      airportState = { kind: "offline" };
      paintAirport();
    }
  }

  const specs = {
    "777f": { name: "Boeing 777F · IF-FVZV", oew: 139010, mtow: 347815, mlw: 260810, fuelCapacity: 145540, burn: 7000, range: 4968, vSpeeds: { mtow: 347815, b1: 154, br: 166, b2: 176 }, flaps: ["5", "15", "20"], defaultFuel: 60000, defaultCargo: 50000, sourceEs: "Consumo de crucero provisional: 7.000 kg/h, estimación externa; no es un valor confirmado del modelo de Infinite Flight.", sourceEn: "Provisional cruise burn: 7,000 kg/h, an external estimate; not a confirmed Infinite Flight model value." },
    challenger: { name: "Bombardier Challenger 350 · IF-DUOA", oew: 11000, mtow: 18416, mlw: 15490, fuelCapacity: 6350, burn: 853, range: 3200, vSpeeds: { mtow: 18416, b1: 108, br: 115, b2: 123 }, flaps: ["10", "20"], defaultFuel: 4000, defaultCargo: 1000, sourceEs: "Consumo de crucero de referencia: aproximadamente 853 kg/h; puede variar con altitud, peso y potencia.", sourceEn: "Reference cruise burn: about 853 kg/h; it can vary with altitude, weight, and power." },
    a380: { name: "Airbus A380-800 · IF-JNPB", oew: 277000, mtow: 560000, mlw: 386000, fuelCapacity: 254760, burn: 15300, range: 7991, vSpeeds: { mtow: 560000, b1: 150, br: 165, b2: 175 }, flaps: ["1+F", "2", "3"], defaultFuel: 100000, defaultCargo: 50000, sourceEs: "Consumo de crucero provisional: aproximadamente 15.300 kg/h, estimado a partir de capacidad y alcance nominales; no es un valor confirmado del modelo de Infinite Flight.", sourceEn: "Provisional cruise burn: about 15,300 kg/h, estimated from nominal capacity and range; not a confirmed Infinite Flight model value." }
  };
  function updateAircraft(reset) {
    const s = specs[$("aircraft").value];
    const old = $("flaps").value;
    $("flaps").innerHTML = s.flaps.map((f) => '<option value="' + f + '">Flaps ' + f + "</option>").join("");
    if (s.flaps.includes(old)) $("flaps").value = old;
    if (reset) { $("cargo").value = s.defaultCargo; $("fuel").value = s.defaultFuel; }
    updateWeight();
  }
  function updateWeight() {
    const s = specs[$("aircraft").value];
    const cargo = n("cargo");
    const fuel = n("fuel");
    const total = s.oew + cargo + fuel;
    let html = '<div class="summary"><div class="metric"><span>' + t("Peso vacío de referencia", "Reference empty weight") + "</span><b>" + fmt(s.oew) + ' kg</b></div><div class="metric"><span>' + t("Peso total estimado", "Estimated total weight") + "</span><b>" + fmt(total) + ' kg</b></div><div class="metric"><span>' + t("MTOW de VJG/IF", "VJG/IF MTOW") + "</span><b>" + fmt(s.mtow) + " kg</b></div></div>";
    html += "<p><b>" + t("Desglose:", "Breakdown:") + "</b> " + fmt(s.oew) + t(" kg operativo + ", " kg operating + ") + fmt(cargo) + t(" kg carga + ", " kg payload + ") + fmt(fuel) + t(" kg combustible = ", " kg fuel = ") + "<b>" + fmt(total) + " kg</b>.</p>";
    html += "<p><b>" + t("Capacidad máxima de combustible de referencia:", "Reference maximum fuel capacity:") + "</b> " + fmt(s.fuelCapacity) + " kg.</p>";
    if (fuel > s.fuelCapacity) html += '<div class="alert bad">' + t("El combustible supera la capacidad de referencia en ", "Fuel exceeds the reference capacity by ") + fmt(fuel - s.fuelCapacity) + " kg.</div>";
    else if (total > s.mtow) html += '<div class="alert bad">' + t("El peso total supera el MTOW en ", "Total weight exceeds MTOW by ") + fmt(total - s.mtow) + " kg.</div>";
    else html += '<div class="alert good">' + t("Peso total dentro del MTOW de referencia.", "Total weight is within the reference MTOW.") + "</div>";
    $("weightSummary").innerHTML = html;
  }
  function calculate() {
    const s = specs[$("aircraft").value];
    const cargo = n("cargo");
    const fuel = n("fuel");
    const total = s.oew + cargo + fuel;
    const elev = n("elev");
    const temp = n("temp");
    const qnh = n("qnh");
    const wd = n("windDir");
    const ws = n("windSpeed");
    const hdg = n("heading");
    const len = n("length");
    const invalid = [cargo, fuel, elev, temp, qnh, wd, ws, hdg, len, n("width")].some((v) => !Number.isFinite(v)) || cargo < 0 || fuel < 0 || elev < 0 || ws < 0 || len <= 0 || n("width") <= 0 || wd < 0 || wd > 360 || hdg < 0 || hdg > 360 || qnh <= 0;
    if (invalid) {
      $("result").innerHTML = '<div class="alert bad">' + t("Revisa los datos. Carga y combustible no pueden ser negativos; pista, ancho y QNH deben ser positivos.", "Check the data. Payload and fuel cannot be negative; runway, width, and QNH must be positive.") + "</div>";
      return;
    }
    const hours = fuel / s.burn;
    const mins = Math.round((hours % 1) * 60);
    const headwind = ws * Math.cos((wd - hdg) * Math.PI / 180);
    const crosswind = Math.abs(ws * Math.sin((wd - hdg) * Math.PI / 180));
    const pressureAlt = elev + (1013.25 - qnh) * 27;
    const isaTemp = 15 - 1.98 * (elev / 1000);
    const densityAlt = pressureAlt + 120 * (temp - isaTemp);
    const speedFactor = Math.sqrt(Math.max(0.01, total) / s.vSpeeds.mtow);
    const b1 = Math.round(s.vSpeeds.b1 * speedFactor);
    const br = Math.round(s.vSpeeds.br * speedFactor);
    const b2 = Math.round(s.vSpeeds.b2 * speedFactor);
    let html = "<p><b>" + t("Aeronave:", "Aircraft:") + "</b> " + s.name + "</p>";
    html += "<p><b>" + t("Aeropuerto:", "Airport:") + "</b> " + $("icao").value.trim().toUpperCase() + " · <b>" + t("Pista:", "Runway:") + "</b> " + $("runway").value.trim().toUpperCase() + " · <b>" + t("Longitud:", "Length:") + "</b> " + fmt(len) + " ft (" + fmt(len * 0.3048) + " m)</p>";
    html += '<div class="summary"><div class="metric"><span>' + t("Peso total", "Total weight") + "</span><b>" + fmt(total) + ' kg</b></div><div class="metric"><span>' + t("Autonomía teórica", "Theoretical endurance") + "</span><b>" + Math.floor(hours) + " h " + mins + ' min</b></div><div class="metric"><span>' + t("Alcance de referencia", "Reference range") + "</span><b>" + fmt(s.range) + " NM</b></div></div>";
    html += "<h3>" + t("Velocidades de despegue estimadas", "Estimated takeoff speeds") + "</h3>";
    html += '<div class="summary"><div class="metric"><span>' + t("B1 · Decisión", "B1 · Decision") + "</span><b>" + b1 + ' KIAS</b></div><div class="metric"><span>' + t("BR · Rotación", "BR · Rotation") + "</span><b>" + br + ' KIAS</b></div><div class="metric"><span>' + t("B2 · Seguridad", "B2 · Safety") + "</span><b>" + b2 + " KIAS</b></div></div>";
    html += '<p class="muted">' + t("Estimación orientativa a partir de perfiles de referencia, ajustada por la raíz cuadrada del peso relativo. No son tablas certificadas ni datos verificados de Infinite Flight.", "An indicative estimate from reference profiles, adjusted by the square root of relative weight. These are not certified tables or verified Infinite Flight data.") + "</p>";
    html += "<p><b>" + t("Consumo estimado en crucero:", "Estimated cruise burn:") + "</b> " + fmt(s.burn) + " kg/h.</p>";
    html += "<p><b>" + t("Combustible introducido:", "Fuel entered:") + "</b> " + fmt(fuel) + " kg. <b>" + t("Autonomía matemática:", "Mathematical endurance:") + "</b> " + t("combustible ÷ consumo horario. No incluye reservas, rodaje, ascenso, descenso ni contingencia.", "fuel ÷ hourly burn. It does not include reserves, taxi, climb, descent, or contingency.") + "</p>";
    html += '<p class="muted">' + t(s.sourceEs, s.sourceEn) + "</p>";
    html += "<h3>" + t("Comprobaciones", "Checks") + "</h3><p><b>MTOW:</b> " + fmt(s.mtow) + " kg · <b>MLW:</b> " + fmt(s.mlw) + " kg.</p>";
    if (fuel > s.fuelCapacity) html += '<div class="alert bad">' + t("El combustible supera la capacidad de referencia por ", "Fuel exceeds the reference capacity by ") + fmt(fuel - s.fuelCapacity) + " kg.</div>";
    if (total > s.mtow) html += '<div class="alert bad">' + t("PESO EXCESIVO: supera el MTOW por ", "OVERWEIGHT: exceeds MTOW by ") + fmt(total - s.mtow) + t(" kg. Reduce carga o combustible y vuelve a calcular.", " kg. Reduce payload or fuel and calculate again.") + "</div>";
    else html += '<div class="alert good">' + t("El peso total calculado está dentro del MTOW de referencia.", "The calculated total weight is within the reference MTOW.") + "</div>";
    html += "<p><b>" + t("Altitud de presión estimada:", "Estimated pressure altitude:") + "</b> " + fmt(pressureAlt) + " ft · <b>" + t("Altitud-densidad aproximada:", "Approximate density altitude:") + "</b> " + fmt(densityAlt) + " ft.</p>";
    html += "<p><b>" + t("Componente de viento:", "Wind component:") + "</b> " + (headwind >= 0 ? fmt(headwind) + t(" kt de frente", " kt headwind") : fmt(Math.abs(headwind)) + t(" kt de cola", " kt tailwind")) + " · <b>" + t("Componente cruzada:", "Crosswind component:") + "</b> " + fmt(crosswind) + " kt.</p>";
    html += "<p><b>" + t("Flaps seleccionados:", "Selected flaps:") + "</b> " + $("flaps").value + " · <b>" + t("Superficie:", "Surface:") + "</b> " + $("surface").selectedOptions[0].textContent + " · <b>" + t("Estado:", "Condition:") + "</b> " + $("condition").selectedOptions[0].textContent + ".</p>";
    html += '<p class="muted">' + t("La autonomía es una estimación teórica de crucero, no la duración de una ruta. No se calcula la distancia exacta de despegue ni se certifica la pista.", "Endurance is a theoretical cruise estimate, not a route duration. Exact takeoff distance is not calculated and the runway is not certified.") + "</p>";
    $("result").innerHTML = html;
  }

  $("icao").addEventListener("change", detectAirport);
  $("icao").addEventListener("blur", detectAirport);
  $("runway").addEventListener("change", applyRunway);
  $("runway").addEventListener("blur", applyRunway);
  $("aircraft").addEventListener("change", () => updateAircraft(true));
  ["cargo", "fuel"].forEach((id) => $(id).addEventListener("input", updateWeight));
  $("calculate").addEventListener("click", () => { didCalc = true; calculate(); });
  document.addEventListener("vjg-lang", () => {
    $("calculate").textContent = t("Calcular rendimiento", "Calculate performance");
    paintAirport();
    updateWeight();
    if (didCalc) calculate();
    else $("result").textContent = t("Selecciona la aeronave e introduce carga, combustible y condiciones para evaluar la configuración.", "Select the aircraft and enter payload, fuel, and conditions to evaluate the setup.");
  });
  $("calculate").textContent = t("Calcular rendimiento", "Calculate performance");
  updateAircraft(false);
  detectAirport();
})();

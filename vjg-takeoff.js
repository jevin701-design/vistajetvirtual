(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const t = (es, en) => (window.VJGLang ? window.VJGLang.t(es, en) : (document.documentElement.lang === "en" ? en : es));
  const num = (id) => Number($(id).value);
  const fmt = (v) => Math.round(v).toLocaleString(document.documentElement.lang === "en" ? "en-US" : "es-MX");
  const validNum = (id) => $(id).value.trim() !== "" && Number.isFinite(num(id));
  let airportIndex = null;
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
  async function loadAirportIndex() {
    if (airportIndex) return airportIndex;
    if (!airportLoading) {
      airportLoading = fetch("https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv").then((r) => {
        if (!r.ok) throw Error("directory");
        return r.text();
      }).then((csv) => {
        const lines = csv.split(/\r?\n/);
        const headers = parseCSVLine(lines.shift());
        const ix = Object.fromEntries(headers.map((h, i) => [h, i]));
        const db = {};
        for (const line of lines) {
          if (!line) continue;
          const a = parseCSVLine(line);
          const icao = (a[ix.icao_code] || "").toUpperCase();
          const ident = (a[ix.ident] || "").toUpperCase();
          const code = icao || (/^[A-Z]{4}$/.test(ident) ? ident : "");
          if (code.length === 4 && a[ix.type] !== "closed" && !db[code]) db[code] = { name: a[ix.name] || "", city: a[ix.municipality] || "", country: a[ix.iso_country] || "", elev: Number(a[ix.elevation_ft]) || 0 };
        }
        airportIndex = db;
        return db;
      }).catch((e) => { airportLoading = null; throw e; });
    }
    return airportLoading;
  }
  function paintAirport() {
    const s = airportState;
    if (s.kind === "invalid") { $("airportStatus").textContent = t("Introduce un código OACI de cuatro letras.", "Enter a four-letter ICAO code."); $("airportName").value = ""; return; }
    if (s.kind === "loading") { $("airportStatus").textContent = t("Consultando el directorio de aeropuertos…", "Looking up the airport directory…"); $("airportName").value = t("Buscando…", "Searching…"); return; }
    if (s.kind === "missing") { $("airportStatus").textContent = t("Código no encontrado en el directorio. Verifica el OACI.", "Code not found in the directory. Check the ICAO."); $("airportName").value = t("No encontrado", "Not found"); return; }
    if (s.kind === "offline") { $("airportStatus").textContent = t("No se pudo consultar el directorio. Comprueba la conexión o introduce los datos a mano.", "The directory could not be reached. Check the connection or enter the data manually."); $("airportName").value = t("Sin verificación en línea", "No online verification"); return; }
    $("airportName").value = [s.airport.name, s.airport.city, s.airport.country].filter(Boolean).join(" · ");
    $("airportStatus").textContent = t("Aeropuerto OACI verificado en OurAirports.", "ICAO airport verified in OurAirports.");
  }
  async function detectAirport() {
    const code = $("icao").value.trim().toUpperCase();
    $("icao").value = code;
    if (!/^[A-Z]{4}$/.test(code)) { airportState = { kind: "invalid" }; paintAirport(); return; }
    airportState = { kind: "loading" };
    paintAirport();
    try {
      const db = await loadAirportIndex();
      const a = db[code];
      if (!a) { airportState = { kind: "missing" }; paintAirport(); return; }
      airportState = { kind: "found", airport: a };
      if (Number.isFinite(a.elev) && a.elev !== 0) $("elev").value = a.elev;
      paintAirport();
    } catch (e) {
      airportState = { kind: "offline" };
      paintAirport();
    }
  }
  function weightSummary() {
    const total = num("empty") + num("cargo") + num("fuel");
    const mtow = num("mtow");
    let h = '<div class="metrics"><div class="metric"><span>' + t("Peso total calculado", "Calculated total weight") + "</span><b>" + fmt(total) + ' kg</b></div><div class="metric"><span>MTOW</span><b>' + fmt(mtow) + ' kg</b></div><div class="metric"><span>MLW</span><b>' + fmt(num("mlw")) + ' kg</b></div><div class="metric"><span>' + t("Margen hasta MTOW", "Margin to MTOW") + "</span><b>" + fmt(mtow - total) + " kg</b></div></div>";
    if (total > mtow) h += '<div class="notice bad">' + t("Sobrepeso de ", "Overweight by ") + fmt(total - mtow) + t(" kg respecto al MTOW de referencia. Reduce carga o combustible.", " kg versus the reference MTOW. Reduce payload or fuel.") + "</div>";
    else h += '<div class="notice good">' + t("El peso está dentro del MTOW de referencia registrado.", "Weight is within the recorded reference MTOW.") + "</div>";
    if (num("fuel") > 145000) h += '<div class="notice bad">' + t("El combustible supera 145,000 kg, capacidad de referencia registrada para VJG. Confirma la capacidad del modelo de Infinite Flight.", "Fuel exceeds 145,000 kg, the reference capacity recorded for VJG. Confirm the Infinite Flight model capacity.") + "</div>";
    $("weight").innerHTML = h;
  }
  function calc() {
    const ids = ["empty", "mtow", "mlw", "cargo", "fuel", "length", "slope", "elev", "temp", "qnh", "humidity", "heading", "windDir", "windSpeed"];
    if (ids.some((id) => !validNum(id)) || num("empty") <= 0 || num("mtow") <= 0 || num("mlw") <= 0 || num("cargo") < 0 || num("fuel") < 0 || num("length") <= 0 || num("qnh") <= 0 || num("humidity") < 0 || num("humidity") > 100 || num("windSpeed") < 0 || num("heading") < 0 || num("heading") > 360 || num("windDir") < 0 || num("windDir") > 360) {
      $("result").innerHTML = '<div class="notice bad">' + t("Revisa los campos: peso y pista deben ser positivos; carga, combustible y viento no pueden ser negativos; la humedad debe estar entre 0 y 100%.", "Check the fields: weight and runway must be positive; payload, fuel, and wind cannot be negative; humidity must be between 0 and 100%.") + "</div>";
      return;
    }
    const total = num("empty") + num("cargo") + num("fuel");
    const mtow = num("mtow");
    if (total > mtow) {
      $("result").innerHTML = '<div class="notice bad">' + t("No se estiman velocidades: el peso total supera el MTOW de referencia. Corrige carga o combustible primero.", "Speeds are not estimated: total weight exceeds the reference MTOW. Correct payload or fuel first.") + "</div>";
      weightSummary();
      return;
    }
    const elev = num("elev");
    const temp = num("temp");
    const qnh = num("qnh");
    const hdg = num("heading");
    const wd = num("windDir");
    const ws = num("windSpeed");
    const delta = (wd - hdg) * Math.PI / 180;
    const head = ws * Math.cos(delta);
    const cross = Math.abs(ws * Math.sin(delta));
    const pressureAlt = elev + (1013.25 - qnh) * 27;
    const densityAlt = pressureAlt + 120 * (temp - (15 - 1.98 * (elev / 1000)));
    const factor = Math.sqrt(total / mtow);
    const vr = Math.round(160 * factor);
    const v2 = Math.round(175 * factor);
    const tasVr = Math.round(vr * Math.sqrt(Math.max(0.2, (temp + 273.15) / (288.15 - 0.0065 * Math.max(-500, pressureAlt) * 0.3048))));
    const flap = num("flaps");
    const surface = $("surface").value;
    const thrust = $("thrust").value;
    const runway = $("runway").value.trim().toUpperCase() || t("sin designador", "no designator");
    let h = "<p><strong>" + t("Aeronave:", "Aircraft:") + "</strong> Boeing 777F · IF-FVZV &nbsp; <strong>" + t("Aeropuerto:", "Airport:") + "</strong> " + $("icao").value.trim().toUpperCase() + " &nbsp; <strong>" + t("Pista:", "Runway:") + "</strong> " + runway + "</p>";
    h += '<div class="metrics"><div class="metric"><span>' + t("Peso total", "Total weight") + "</span><b>" + fmt(total) + ' kg</b></div><div class="metric"><span>' + t("VR preliminar", "Preliminary VR") + "</span><b>" + vr + ' KIAS</b></div><div class="metric"><span>' + t("V2 preliminar", "Preliminary V2") + "</span><b>" + v2 + " KIAS</b></div></div>";
    h += '<div class="metrics"><div class="metric"><span>' + t("Altitud de presión aprox.", "Approx. pressure altitude") + "</span><b>" + fmt(pressureAlt) + ' ft</b></div><div class="metric"><span>' + t("Altitud de densidad aprox.", "Approx. density altitude") + "</span><b>" + fmt(densityAlt) + ' ft</b></div><div class="metric"><span>' + t("Viento cruzado", "Crosswind") + "</span><b>" + cross.toFixed(1) + " kt</b></div></div>";
    h += "<p><strong>" + t("Componente longitudinal:", "Longitudinal component:") + "</strong> " + (head >= 0 ? head.toFixed(1) + t(" kt de frente", " kt headwind") : Math.abs(head).toFixed(1) + t(" kt de cola", " kt tailwind")) + ". <strong>" + t("Flaps:", "Flaps:") + "</strong> " + flap + "°. <strong>" + t("Empuje:", "Thrust:") + "</strong> " + (thrust === "reduced" ? t("reducido", "reduced") : t("normal/máximo disponible", "normal/maximum available")) + ".</p>";
    h += "<p><strong>" + t("Velocidad TAS aproximada asociada a VR:", "Approximate TAS associated with VR:") + "</strong> " + tasVr + t(" kt; conversión orientativa mediante temperatura y altitud de presión, no una velocidad objetivo certificada.", " kt; an indicative conversion from temperature and pressure altitude, not a certified target speed.") + "</p>";
    h += '<div class="notice">' + t("V1: no calculada. Requiere información de aceleración-parada y despegue continuado con falla de motor. No es correcto derivarla solo del peso.", "V1: not calculated. It requires accelerate-stop and continued-takeoff data with an engine failure. It should not be derived from weight alone.") + "</div>";
    const warnings = [];
    if (num("length") < 2500) warnings.push(t("La longitud declarada es menor de 2,500 m; verifica las distancias y el rendimiento real del 777F.", "The declared length is under 2,500 m; verify the distances and the real 777F performance."));
    if (head < 0) warnings.push(t("El viento de cola normalmente aumenta la distancia de despegue.", "A tailwind normally increases takeoff distance."));
    if (surface === "wet") warnings.push(t("La pista mojada puede afectar el frenado y el rendimiento; hace falta el método específico de la aeronave.", "A wet runway can affect braking and performance; the aircraft-specific method is required."));
    if (surface === "contaminated") warnings.push(t("Pista contaminada: esta calculadora no estima la distancia. Consulta los datos del simulador.", "Contaminated runway: this calculator does not estimate the distance. Use simulator data."));
    if (surface === "grass") warnings.push(t("Superficie no pavimentada: este modelo no tiene correcciones cuantitativas validadas.", "Unpaved surface: this model has no validated quantitative corrections."));
    if (thrust === "reduced") warnings.push(t("El empuje reducido puede aumentar la distancia y reducir el ascenso; no se aplica una corrección numérica sin datos calibrados.", "Reduced thrust can increase distance and reduce climb; no numeric correction is applied without calibrated data."));
    if (flap === 5) warnings.push(t("Confirma que flaps 5 es apropiado para el peso, la pista y los obstáculos de este vuelo.", "Confirm that flaps 5 is appropriate for this flight’s weight, runway, and obstacles."));
    if (num("slope") > 0) warnings.push(t("Pendiente ascendente: puede aumentar la distancia requerida.", "Upslope: it can increase the required distance."));
    if (num("slope") < 0) warnings.push(t("Pendiente descendente: el efecto exacto depende del perfil y de los datos de rendimiento.", "Downslope: the exact effect depends on the profile and the performance data."));
    if (warnings.length) h += "<h3>" + t("Advertencias", "Warnings") + "</h3><ul>" + warnings.map((w) => "<li>" + w + "</li>").join("") + "</ul>";
    h += "<p><strong>" + t("Longitud de pista introducida:", "Entered runway length:") + "</strong> " + fmt(num("length")) + t(" m. Esta página no determina si esa longitud es suficiente.", " m. This page does not decide whether that length is sufficient.") + "</p>";
    h += '<p class="muted">' + t("Método: VR = 160 × √(peso/MTOW); V2 = 175 × √(peso/MTOW). Es una heurística preliminar basada en referencias comunitarias, no un modelo validado. El viento no corrige la IAS; cambia la velocidad sobre el terreno y las distancias.", "Method: VR = 160 × √(weight/MTOW); V2 = 175 × √(weight/MTOW). This is a preliminary heuristic from community references, not a validated model. Wind does not correct IAS; it changes groundspeed and distances.") + "</p>";
    $("result").innerHTML = h;
  }
  ["empty", "mtow", "mlw", "cargo", "fuel"].forEach((id) => $(id).addEventListener("input", weightSummary));
  $("calculate").addEventListener("click", () => { didCalc = true; calc(); });
  $("icao").addEventListener("change", detectAirport);
  $("icao").addEventListener("blur", detectAirport);
  document.addEventListener("vjg-lang", () => {
    $("calculate").textContent = t("Calcular perfil preliminar", "Calculate preliminary profile");
    paintAirport();
    weightSummary();
    if (didCalc) calc();
    else $("result").textContent = t("Introduce los datos de tu vuelo y pulsa calcular.", "Enter your flight data and press calculate.");
  });
  $("calculate").textContent = t("Calcular perfil preliminar", "Calculate preliminary profile");
  weightSummary();
  detectAirport();
})();

(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const t = (es, en) => (window.VJGLang ? window.VJGLang.t(es, en) : (document.documentElement.lang === "en" ? en : es));
  const LOG_KEY = "vjg-flight-assignments";
  const regionRanges = {
    private: { na: [100, 150], eu: [151, 200], as: [201, 250], sa: [251, 300], af: [301, 350], me: [351, 400], oc: [401, 449], reserve: [450, 499] },
    cargo: { na: [500, 550], eu: [551, 600], as: [601, 650], sa: [651, 700], af: [701, 750], me: [751, 800], oc: [801, 849], reserve: [850, 899] }
  };
  const regionByContinent = { NA: "na", SA: "sa", EU: "eu", AS: "as", OC: "oc", AF: "af" };
  const divisionByAircraft = { challenger: "private", "777f": "cargo", a380: "charter" };
  const purposeByDivision = { private: "executive", cargo: "cargo", charter: "charter" };
  const aircraftRanges = { "777f": 4968, challenger: 3200, a380: 7991 };
  const middleEast = /united arab emirates|saudi arabia|qatar|bahrain|kuwait|oman|yemen|iraq|iran|israel|jordan|lebanon|syria|palestine|turkey|türkiye|cyprus/;
  const middleEastCodes = /^(AE|SA|QA|BH|KW|OM|YE|IQ|IR|IL|JO|LB|SY|PS|TR|CY)$/;

  let originAirport = null;
  let destinationAirport = null;
  let lastAssignment = null;
  let calcDone = false;

  function readLog() {
    try {
      const data = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      return Array.isArray(data) ? data.filter((row) => row && Number.isInteger(row.number)) : [];
    } catch (e) {
      return [];
    }
  }
  function writeLog(rows) {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(rows)); } catch (e) {}
  }
  function nextFree(start, end) {
    const used = new Set(readLog().map((row) => row.number));
    for (let n = start; n <= end; n++) if (!used.has(n)) return n;
    return null;
  }
  function place(airport) {
    return [airport.municipality, airport.country].filter(Boolean).join(", ");
  }
  function selectedText(id) {
    const el = $(id);
    const opt = el.selectedOptions && el.selectedOptions[0];
    return opt ? opt.textContent : "";
  }

  function paintChrome() {
    $("generateBtn").textContent = t("Generar número VJT", "Generate VJT Number");
    $("calcRun").textContent = t("Calcular", "Calculate");
    $("region").disabled = $("division").value === "charter";
    $("regionNote").textContent = $("division").value === "charter"
      ? t("Chárter usa el rango global VJT 900–999. No usa los subrangos regionales.", "Charter uses the global range VJT 900–999. It does not use the regional sub-ranges.")
      : t("La región corresponde al aeropuerto de salida. El selector se actualiza al identificar el origen y puedes corregirlo.", "The region follows the departure airport. The selector updates when the origin is identified, and you can correct it.");
    if (!originAirport && !$("origin").value.trim()) {
      $("originInfo").textContent = t("Introduce el código OACI para identificar el aeropuerto.", "Enter the ICAO code to identify the airport.");
      $("originConditions").textContent = t("El tiempo y las pistas aparecerán aquí cuando el aeropuerto esté identificado.", "Weather and runways will appear here once the airport is identified.");
    }
    if (!destinationAirport && !$("destination").value.trim()) {
      $("destinationInfo").textContent = t("Introduce el código OACI para identificar el aeropuerto.", "Enter the ICAO code to identify the airport.");
      $("destinationConditions").textContent = t("El tiempo y las pistas aparecerán aquí cuando el aeropuerto esté identificado.", "Weather and runways will appear here once the airport is identified.");
    }
    if (!lastAssignment) {
      $("result").innerHTML = '<span class="muted">' + t("Completa los campos para generar el número de vuelo.", "Complete the fields to generate the flight number.") + "</span>";
    } else paintAssignment();
    if (!calcDone) {
      $("calcResult").innerHTML = '<span class="muted">' + t("Introduce ruta, combustible y carga, y luego calcula.", "Enter route, fuel and cargo, then calculate.") + "</span>";
    } else runCalc();
  }

  function suggestDivision() {
    const division = divisionByAircraft[$("aircraft").value];
    if (division) $("division").value = division;
    const purpose = purposeByDivision[$("division").value];
    if (purpose) $("purpose").value = purpose;
    if (window.VJGLang) window.VJGLang.apply();
    paintChrome();
  }

  async function loadConditions(code, field) {
    const box = $(field + "Conditions");
    box.innerHTML = '<span class="airport-line">' + t("Cargando METAR y pistas…", "Loading weather and runways…") + "</span>";
    const parts = [];
    try {
      const m = await window.VJGAirports.metar(code);
      if (m) {
        const wind = m.wspd != null ? t("Viento ", "Wind ") + m.wspd + " kt" + (m.wdir != null ? " " + t("desde ", "from ") + m.wdir + "°" : "") : "";
        const bits = [m.rawOb, m.temp != null ? t("Temp. ", "Temp. ") + m.temp + " °C" : "", wind, m.visib != null ? t("Visibilidad ", "Visibility ") + m.visib + " SM" : ""].filter(Boolean);
        parts.push('<span class="airport-line"><b>' + t("Tiempo / METAR:", "Weather / METAR:") + "</b> " + bits.join(" · ") + "</span>");
        parts.push('<span class="airport-line muted">' + t("Reporte: ", "Report: ") + (m.reportTime || m.obsTime || t("hora no disponible", "time unavailable")) + "</span>");
      } else parts.push('<span class="airport-line">' + t("No hay METAR reciente para este aeropuerto.", "No recent METAR for this airport.") + "</span>");
    } catch (e) {
      parts.push('<span class="airport-line">' + t("El METAR no está disponible ahora.", "Weather is unavailable right now.") + "</span>");
    }
    try {
      const rows = await window.VJGAirports.runways(code);
      if (rows.length) {
        rows.slice(0, 4).forEach(function (row) {
          const length = Number.isFinite(row.lengthFt) && row.lengthFt > 0
            ? Math.round(row.lengthFt * 0.3048) + " m (" + Math.round(row.lengthFt) + " ft)"
            : t("longitud no disponible", "length unavailable");
          const ends = [row.le, row.he].filter(Boolean).join("/");
          parts.push('<span class="airport-line"><b>' + t("Pista ", "Runway ") + (ends || "—") + ":</b> " + length + (row.surface ? " · " + row.surface : "") + "</span>");
        });
      } else parts.push('<span class="airport-line">' + t("La fuente no tiene pistas para este código.", "The source has no runways for this code.") + "</span>");
    } catch (e) {
      parts.push('<span class="airport-line">' + t("Pistas: no disponibles temporalmente.", "Runways: temporarily unavailable.") + "</span>");
    }
    parts.push('<span class="airport-line muted">' + t("Dato informativo. Verifica METAR/NOTAM oficiales antes de operar.", "Informational data. Verify official METAR/NOTAM before operating.") + "</span>");
    box.innerHTML = parts.join("");
  }

  function applyRegion(airport) {
    const country = String(airport.country || "").toLowerCase();
    const code = String(airport.country || "").toUpperCase();
    if (middleEast.test(country) || middleEastCodes.test(code)) $("region").value = "me";
    else if (regionByContinent[airport.continent]) $("region").value = regionByContinent[airport.continent];
  }

  async function lookupField(field) {
    const code = $(field).value.trim().toUpperCase();
    $(field).value = code;
    const info = $(field + "Info");
    if (!code) {
      if (field === "origin") originAirport = null;
      else destinationAirport = null;
      info.textContent = t("Introduce el código OACI para identificar el aeropuerto.", "Enter the ICAO code to identify the airport.");
      $(field + "Conditions").textContent = t("El tiempo y las pistas aparecerán aquí cuando el aeropuerto esté identificado.", "Weather and runways will appear here once the airport is identified.");
      return null;
    }
    if (!/^[A-Z]{4}$/.test(code)) {
      info.textContent = t("Introduce un código OACI válido de cuatro letras.", "Enter a valid four-letter ICAO code.");
      return null;
    }
    info.textContent = t("Buscando aeropuerto…", "Looking up airport…");
    try {
      const airport = await window.VJGAirports.lookup(code);
      const label = [airport.name, airport.municipality, airport.country].filter(Boolean).join(" · ");
      info.textContent = "✓ " + label;
      if (field === "origin") {
        originAirport = airport;
        applyRegion(airport);
      } else destinationAirport = airport;
      loadConditions(code, field);
      return airport;
    } catch (err) {
      if (field === "origin") originAirport = null;
      else destinationAirport = null;
      const missing = String(err && err.message || "") === "not-found";
      info.textContent = missing
        ? t("Código no encontrado en el directorio.", "Code not found in the airport directory.")
        : t("No se pudo consultar el directorio. Revisa el código o la conexión.", "Airport lookup failed. Check the ICAO code or the connection.");
      $(field + "Conditions").textContent = "";
      return null;
    }
  }

  function distanceNm(a, b) {
    const lat1 = Number(a.latitude);
    const lon1 = Number(a.longitude);
    const lat2 = Number(b.latitude);
    const lon2 = Number(b.longitude);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
    const rad = (x) => x * Math.PI / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const q = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 3440.065 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(Math.max(0, 1 - q)));
  }

  function paintAssignment() {
    const row = lastAssignment;
    if (!row) return;
    const originTxt = row.origin + " · " + row.originName + (row.originPlace ? " (" + row.originPlace + ")" : "");
    const destTxt = row.destination + " · " + row.destinationName + (row.destinationPlace ? " (" + row.destinationPlace + ")" : "");
    let html = '<div class="muted">' + t("NÚMERO VJT PROPUESTO", "SUGGESTED VJT NUMBER") + "</div><strong>VJT " + row.number + "</strong>";
    html += "<p><b>" + originTxt + " → " + destTxt + "</b></p>";
    html += "<p>" + row.direction + " · " + selectedPurpose(row.purpose) + "</p>";
    if (row.nm == null) {
      html += '<p class="muted">' + t("No se pudieron leer coordenadas del directorio; no se validó distancia ni alcance.", "Could not read coordinates from the airport directory; distance and range were not validated.") + "</p>";
    } else {
      const model = row.aircraft === "777f" ? "Boeing 777F" : row.aircraft === "challenger" ? "Bombardier Challenger 350" : "Airbus A380-800";
      const exceeds = row.nm > row.referenceRange;
      html += "<p><b>" + t("Distancia ortodrómica estimada:", "Estimated great-circle distance:") + "</b> " + Math.round(row.nm).toLocaleString() + " NM · <b>" + model + " · " + t("alcance de referencia:", "reference range:") + "</b> " + row.referenceRange.toLocaleString() + " NM.</p>";
      html += '<div class="range-alert ' + (exceeds ? "exceeded" : "within") + '" role="status">' + (exceeds ? t("EXCEDE EL LÍMITE", "EXCEEDS LIMIT") : t("DENTRO DEL ALCANCE", "WITHIN RANGE")) + "</div>";
      html += '<p class="muted">' + (exceeds
        ? t("La distancia directa supera el alcance de referencia de la aeronave. La ruta real puede ser más larga y exige reservas, alternos y condiciones adecuadas.", "The direct distance exceeds the selected aircraft’s reference range. The real route may be longer and still requires reserves, alternates, and suitable conditions.")
        : t("La distancia directa está dentro del alcance de referencia. La ruta real puede ser más larga y exige reservas, alternos y condiciones adecuadas.", "The direct distance is within the reference range. The real route may be longer and still requires reserves, alternates, and suitable conditions.")) + "</p>";
    }
    html += '<p class="muted">' + (row.division === "charter"
      ? t("Chárter: rango global VJT 900–999. Propuesta guardada en este navegador.", "Charter: global range VJT 900–999. Proposal saved in this browser.")
      : t("Región tomada del aeropuerto de salida. Propuesta guardada en este navegador.", "Region taken from the departure airport. Proposal saved in this browser.")) + "</p>";
    $("result").innerHTML = html;
  }

  function selectedPurpose(value) {
    const opt = Array.from($("purpose").options).find((item) => item.value === value);
    return opt ? opt.textContent : value;
  }

  async function generate(event) {
    event.preventDefault();
    const division = $("division").value;
    const from = $("origin").value.trim().toUpperCase();
    const to = $("destination").value.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(from) || !/^[A-Z]{4}$/.test(to)) {
      $("result").innerHTML = '<p class="range-alert exceeded">' + t("Origen y destino deben ser códigos OACI de cuatro letras.", "Origin and destination must be four-letter ICAO codes.") + "</p>";
      lastAssignment = null;
      return;
    }
    const airports = await Promise.all([lookupField("origin"), lookupField("destination")]);
    if (airports.some((a) => !a)) {
      $("result").innerHTML = '<p class="range-alert exceeded">' + t("No se asigna número: falta un aeropuerto válido.", "No number was assigned: a valid airport is missing.") + "</p>";
      lastAssignment = null;
      return;
    }
    let start;
    let end;
    if (division === "charter") {
      start = 900;
      end = 999;
    } else {
      const range = (regionRanges[division] || {})[$("region").value];
      if (!range) {
        $("result").innerHTML = '<p class="range-alert exceeded">' + t("No hay un rango regional para esa combinación.", "There is no regional range for that combination.") + "</p>";
        lastAssignment = null;
        return;
      }
      start = range[0];
      end = range[1];
    }
    const number = nextFree(start, end);
    if (number == null) {
      $("result").innerHTML = '<p class="range-alert exceeded">' + t("Rango agotado en este navegador (" + start + "–" + end + "). No se inventa un número fuera de las reglas.", "Range exhausted in this browser (" + start + "–" + end + "). No number outside the rules was invented.") + "</p>";
      lastAssignment = null;
      return;
    }
    const aircraft = $("aircraft").value;
    const nm = distanceNm(airports[0], airports[1]);
    const row = {
      number: number,
      origin: from,
      destination: to,
      originName: airports[0].name,
      destinationName: airports[1].name,
      originPlace: place(airports[0]),
      destinationPlace: place(airports[1]),
      division: division,
      region: $("region").value,
      direction: $("direction").value,
      purpose: $("purpose").value,
      aircraft: aircraft,
      nm: nm,
      referenceRange: aircraftRanges[aircraft]
    };
    const log = readLog();
    log.push({ number: number, origin: from, destination: to, division: division });
    writeLog(log);
    lastAssignment = row;
    paintAssignment();
  }

  function alertBox(ok, yes, no) {
    return '<div class="range-alert ' + (ok ? "within" : "exceeded") + '">' + (ok ? yes : no) + "</div>";
  }
  function runCalc() {
    const distance = Number($("calcDistance").value);
    const empty = Number($("calcEmpty").value);
    const mtow = Number($("calcMtow").value);
    const mlw = Number($("calcMlw").value);
    const mzfw = Number($("calcMZfw").value);
    const fuelCap = Number($("calcFuelCap").value);
    const fuel = Number($("calcFuel").value);
    const fuelLanding = Number($("calcFuelLanding").value);
    const main = Number($("calcMain").value);
    const front = Number($("calcFront").value);
    const back = Number($("calcBack").value);
    const range = Number($("calcRange").value);
    const values = [distance, empty, mtow, mlw, mzfw, fuelCap, fuel, fuelLanding, main, front, back, range];
    if (values.some((v) => !Number.isFinite(v) || v < 0) || mtow <= 0 || mlw <= 0 || mzfw <= 0 || fuelCap <= 0 || range <= 0) {
      $("calcResult").innerHTML = '<p class="range-alert exceeded">' + t("Revisa los valores introducidos.", "Check the values entered.") + "</p>";
      return;
    }
    const cargo = main + front + back;
    const takeoff = empty + fuel + cargo;
    const landing = empty + fuelLanding + cargo;
    const zfw = empty + cargo;
    const fmt = (n) => Math.round(n).toLocaleString();
    let html = "<p><b>" + t("Distancia de ruta:", "Route distance:") + "</b> " + fmt(distance) + " NM · <b>" + t("Alcance de referencia Boeing:", "Boeing reference range:") + "</b> " + fmt(range) + " NM</p>";
    html += alertBox(distance <= range, t("DENTRO DEL ALCANCE PUBLICADO", "WITHIN PUBLISHED RANGE"), t("SUPERA EL ALCANCE PUBLICADO EN ", "EXCEEDS PUBLISHED RANGE BY ") + fmt(distance - range) + " NM");
    html += "<p><b>" + t("Combustible al despegue:", "Fuel at takeoff:") + "</b> " + fmt(fuel) + " / " + fmt(fuelCap) + " kg</p>";
    html += alertBox(fuel <= fuelCap, t("CAPACIDAD DE COMBUSTIBLE CORRECTA", "FUEL CAPACITY OK"), t("SUPERA LA CAPACIDAD DE COMBUSTIBLE EN ", "EXCEEDS FUEL CAPACITY BY ") + fmt(fuel - fuelCap) + " kg");
    html += "<p><b>" + t("Carga total:", "Total cargo:") + "</b> " + fmt(cargo) + " kg</p>";
    html += alertBox(cargo <= 107000, t("CARGA DENTRO DE LA REFERENCIA ESTRUCTURAL DE 107,000 KG", "CARGO WITHIN 107,000 KG STRUCTURAL PAYLOAD REFERENCE"), t("LA CARGA SUPERA LA REFERENCIA ESTRUCTURAL DE 107,000 KG", "CARGO EXCEEDS 107,000 KG STRUCTURAL PAYLOAD REFERENCE"));
    html += "<p><b>" + t("Peso sin combustible (ZFW):", "Zero-fuel weight (ZFW):") + "</b> " + fmt(zfw) + " kg · <b>MZFW:</b> " + fmt(mzfw) + " kg</p>";
    html += alertBox(zfw <= mzfw, t("ZFW DENTRO DEL MZFW", "ZFW WITHIN MZFW"), t("EL ZFW SUPERA EL MZFW EN ", "ZFW EXCEEDS MZFW BY ") + fmt(zfw - mzfw) + " kg");
    html += "<p><b>" + t("Peso de despegue calculado:", "Calculated takeoff weight:") + "</b> " + fmt(takeoff) + " kg · <b>MTOW:</b> " + fmt(mtow) + " kg</p>";
    html += alertBox(takeoff <= mtow, t("PESO DE DESPEGUE DENTRO DEL MTOW · MARGEN ", "TAKEOFF WEIGHT WITHIN MTOW · MARGIN ") + fmt(mtow - takeoff) + " kg", t("SUPERA EL MTOW EN ", "OVER MTOW BY ") + fmt(takeoff - mtow) + " kg");
    html += "<p><b>" + t("Peso estimado de aterrizaje:", "Estimated landing weight:") + "</b> " + fmt(landing) + " kg · <b>MLW:</b> " + fmt(mlw) + " kg</p>";
    html += alertBox(landing <= mlw, t("PESO DE ATERRIZAJE DENTRO DEL MLW · MARGEN ", "LANDING WEIGHT WITHIN MLW · MARGIN ") + fmt(mlw - landing) + " kg", t("SUPERA EL MLW EN ", "OVER MLW BY ") + fmt(landing - mlw) + " kg");
    html += '<p class="muted">' + t("El alcance es una referencia publicada, no una garantía para esta carga. El peso de aterrizaje usa el combustible restante que escribiste. El OEW varía según la configuración; edítalo para coincidir con la documentación de la aeronave.", "Range is a published reference, not a guarantee for this payload. Landing weight uses the estimated fuel remaining you entered. OEW varies by configuration; edit the reference weight to match the aircraft documentation.") + "</p>";
    $("calcResult").innerHTML = html;
  }

  $("origin").addEventListener("change", () => lookupField("origin"));
  $("destination").addEventListener("change", () => lookupField("destination"));
  $("origin").addEventListener("blur", () => { if ($("origin").value.trim()) lookupField("origin"); });
  $("destination").addEventListener("blur", () => { if ($("destination").value.trim()) lookupField("destination"); });
  $("aircraft").addEventListener("change", suggestDivision);
  $("division").addEventListener("change", () => {
    const purpose = purposeByDivision[$("division").value];
    if (purpose) $("purpose").value = purpose;
    if (window.VJGLang) window.VJGLang.apply();
    paintChrome();
  });
  $("flightForm").addEventListener("submit", generate);
  $("calcRun").addEventListener("click", () => { calcDone = true; runCalc(); });
  document.addEventListener("vjg-lang", () => {
    if (originAirport) $("originInfo").textContent = "✓ " + [originAirport.name, originAirport.municipality, originAirport.country].filter(Boolean).join(" · ");
    if (destinationAirport) $("destinationInfo").textContent = "✓ " + [destinationAirport.name, destinationAirport.municipality, destinationAirport.country].filter(Boolean).join(" · ");
    if (originAirport) loadConditions(originAirport.icao, "origin");
    if (destinationAirport) loadConditions(destinationAirport.icao, "destination");
    paintChrome();
  });
  suggestDivision();
})();

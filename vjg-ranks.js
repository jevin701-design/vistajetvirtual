(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const t = (es, en) => (window.VJGLang ? window.VJGLang.t(es, en) : (document.documentElement.lang === "en" ? en : es));
  const LIFT_USD = 4.99;
  const ranks = [
    { es: "Cadete VJG", en: "VJG Cadet", minFlights: 15, minHours: 30, emoji: "🛫", descEs: "Rango inicial: al menos 15 vuelos y 30 horas registradas.", descEn: "Initial rank: at least 15 flights and 30 logged hours." },
    { es: "Segundo oficial", en: "Second Officer", minFlights: 30, minHours: 75, emoji: "🎖️", descEs: "Al menos 30 vuelos y 75 horas registradas.", descEn: "At least 30 flights and 75 logged hours." },
    { es: "Primer oficial", en: "First Officer", minFlights: 60, minHours: 150, emoji: "✈️", descEs: "Al menos 60 vuelos y 150 horas registradas.", descEn: "At least 60 flights and 150 logged hours." },
    { es: "Primer oficial senior", en: "Senior First Officer", minFlights: 100, minHours: 300, emoji: "🪽", descEs: "Al menos 100 vuelos y 300 horas registradas.", descEn: "At least 100 flights and 300 logged hours." },
    { es: "Capitán", en: "Captain", minFlights: 160, minHours: 600, emoji: "🧑‍✈️", descEs: "Al menos 160 vuelos y 600 horas registradas.", descEn: "At least 160 flights and 600 logged hours." },
    { es: "Capitán senior", en: "Senior Captain", minFlights: 250, minHours: 1000, emoji: "⭐", descEs: "Al menos 250 vuelos y 1,000 horas registradas.", descEn: "At least 250 flights and 1,000 logged hours." },
    { es: "Comandante VJG", en: "VJG Commander", minFlights: 400, minHours: 1800, emoji: "🦅", descEs: "Al menos 400 vuelos y 1,800 horas registradas.", descEn: "At least 400 flights and 1,800 logged hours." },
    { es: "Embajador VJG", en: "VJG Ambassador", minFlights: 600, minHours: 3000, emoji: "👑", descEs: "Al menos 600 vuelos y 3,000 horas registradas.", descEn: "At least 600 flights and 3,000 logged hours." }
  ];
  const pilots = [
    { name: "AlexVJG", emoji: "👨‍✈️", hours: 128.5, flights: 74, aircraft: "Boeing 777F", es: "Carga", en: "Cargo" },
    { name: "SkyMia", emoji: "👩‍✈️", hours: 34.2, flights: 21, aircraft: "Airbus A320", es: "Aviación privada", en: "Private Aviation" },
    { name: "CargoFox", emoji: "🦊", hours: 246, flights: 132, aircraft: "Boeing 747-8F", es: "Carga", en: "Cargo" },
    { name: "JetNova", emoji: "🧑‍✈️", hours: 69.8, flights: 43, aircraft: "Gulfstream G650", es: "Chárter", en: "Charter" },
    { name: "PacificWing", emoji: "🌐", hours: 12.4, flights: 8, aircraft: "Boeing 787-9", es: "Chárter", en: "Charter" }
  ];
  const rankName = (r) => t(r.es, r.en);
  const rankDesc = (r) => t(r.descEs, r.descEn);
  let apiStatsLoaded = false;
  let syncing = false;
  let statusFn = () => t("Las estadísticas siguen en modo demostración hasta conectar Infinite Flight.", "Statistics remain in demo mode until Infinite Flight is connected.");

  function values() {
    return {
      flights: Math.max(0, Math.floor(+$("flights").value || 0)),
      hours: Math.max(0, +$("hours").value || 0),
      lifts: Math.max(0, Math.floor(+$("lifts").value || 0)),
      username: $("username").value.trim() || "KevinVJG",
      photoUrl: $("photoUrl").value.trim()
    };
  }
  function getRank(v) {
    let n = 0;
    ranks.forEach((r, i) => { if (v.flights >= r.minFlights && v.hours >= r.minHours) n = i; });
    return n;
  }
  function hoursText(n) {
    return n.toLocaleString(document.documentElement.lang === "en" ? "en-US" : "es-MX", { maximumFractionDigits: 1 });
  }
  function setStatus(fn) {
    statusFn = fn;
    $("infiniteFlightStatus").textContent = fn();
  }
  function paintButtons() {
    $("syncInfiniteFlightBtn").textContent = syncing ? t("Consultando Infinite Flight…", "Querying Infinite Flight…") : t("Conectar / actualizar Infinite Flight", "Connect / Refresh Infinite Flight");
    if (!$("saveBtn").dataset.saved) $("saveBtn").textContent = t("Guardar datos de demostración", "Save Demo Data");
    $("resetBtn").textContent = t("Restablecer", "Reset");
    $("myNameStickers").setAttribute("aria-label", t("Rangos desbloqueados", "Unlocked ranks"));
  }
  function render() {
    const v = values();
    const i = getRank(v);
    const r = ranks[i];
    const next = ranks[i + 1];
    $("myName").textContent = v.username;
    $("myUsername").textContent = "@" + v.username.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() + " · " + t("Piloto VJG", "VJG Pilot");
    $("myNameStickers").innerHTML = ranks.slice(0, i + 1).map((x) => '<span class="rank-sticker-inline" title="' + rankName(x) + '" aria-label="' + rankName(x) + '">' + x.emoji + "</span>").join("");
    $("myRankName").textContent = rankName(r);
    $("myHours").textContent = hoursText(v.hours) + " h";
    $("myFlights").textContent = String(v.flights);
    $("myLifts").textContent = v.lifts + " · US$" + (v.lifts * LIFT_USD).toFixed(2);
    if (v.photoUrl) $("myAvatar").innerHTML = '<img alt="' + t("Foto de perfil", "Profile photo") + '" src="' + v.photoUrl.replace(/"/g, "&" + "quot;") + '">';
    else $("myAvatar").textContent = "👨‍✈️";
    const pct = next ? Math.max(0, Math.min(100, ((v.flights - r.minFlights) / (next.minFlights - r.minFlights)) * 65 + ((v.hours - r.minHours) / (next.minHours - r.minHours)) * 35)) : 100;
    $("rankProgressLabel").textContent = next
      ? t("Te faltan " + Math.max(0, next.minFlights - v.flights) + " vuelos y " + hoursText(Math.max(0, next.minHours - v.hours)) + " h para el siguiente rango", "You still need " + Math.max(0, next.minFlights - v.flights) + " flights and " + hoursText(Math.max(0, next.minHours - v.hours)) + " h to reach the next rank")
      : t("Has alcanzado el rango más alto.", "You’ve reached the highest rank.");
    $("rankProgressPct").textContent = Math.round(pct) + "%";
    $("rankProgressBar").style.width = pct + "%";
    $("rankCurrentText").textContent = rankName(r);
    $("rankNextText").textContent = next ? rankName(next) : t("Rango máximo", "Maximum Rank");
    $("rankList").innerHTML = ranks.map((x, j) => {
      const achieved = j <= i;
      const active = j === i;
      const n = ranks[j + 1];
      const miss = n
        ? t("Te faltan " + Math.max(0, n.minFlights - v.flights) + " vuelos y " + hoursText(Math.max(0, n.minHours - v.hours)) + " h para " + rankName(n), "You still need " + Math.max(0, n.minFlights - v.flights) + " flights and " + hoursText(Math.max(0, n.minHours - v.hours)) + " h to reach " + rankName(n))
        : t("Rango máximo alcanzado", "Maximum rank reached");
      const state = active ? t(" · ACTUAL", " · CURRENT") : achieved ? t(" · DESBLOQUEADO", " · UNLOCKED") : "";
      const bar = (value, need, ok) => '<div class="rank-progress ' + (ok ? "complete" : "missing") + '"><span style="width:' + Math.min(100, value / need * 100) + '%"></span></div>';
      return '<article class="rank-line ' + (active ? "current" : "") + '"><div class="rank-icon">' + x.emoji + '</div><div><h3>' + rankName(x) + state + "</h3><p>" + rankDesc(x) + "</p><p>" + t("Requisito propuesto: ", "Proposed requirement: ") + x.minFlights + t(" vuelos · ", " flights · ") + x.minHours + " h</p><div class=\"progress-pair\"><div class=\"progress-item\"><div class=\"progress-label\"><span>" + t("Horas", "Hours") + "</span><strong>" + Math.min(100, Math.round(v.hours / x.minHours * 100)) + "% · " + hoursText(v.hours) + "/" + x.minHours + " h</strong></div>" + bar(v.hours, x.minHours, v.hours >= x.minHours) + "</div><div class=\"progress-item\"><div class=\"progress-label\"><span>" + t("Vuelos", "Flights") + "</span><strong>" + Math.min(100, Math.round(v.flights / x.minFlights * 100)) + "% · " + v.flights + "/" + x.minFlights + "</strong></div>" + bar(v.flights, x.minFlights, v.flights >= x.minFlights) + "</div></div><p class=\"rank-summary\">" + (achieved ? t("Requisitos de este rango cumplidos.", "Requirements for this rank completed.") : miss) + "</p></div><div class=\"rank-hours\"><strong>" + x.minHours + " h</strong>" + x.minFlights + t(" vuelos", " flights") + "</div></article>";
    }).join("");
    $("pilotsGrid").innerHTML = pilots.slice().sort((a, b) => b.hours - a.hours).map((p) => {
      const pi = getRank(p);
      const stickers = ranks.slice(0, pi + 1).map((x) => '<span class="rank-sticker-inline" title="' + rankName(x) + '">' + x.emoji + "</span>").join("");
      return '<article class="pilot-card"><div class="pilot-card-top"><div class="pilot-photo">' + p.emoji + '</div><div><h3><span>' + p.name + '</span><span class="rank-stickers-inline" aria-label="' + t("Rangos desbloqueados", "Unlocked ranks") + '">' + stickers + '</span></h3><div class="muted">' + rankName(ranks[pi]) + '</div></div></div><div class="pilot-card-stats"><div><small>' + t("Horas de vuelo", "Flight Hours") + "</small><strong>" + p.hours + " h</strong></div><div><small>" + t("Vuelos", "Flights") + "</small><strong>" + p.flights + "</strong></div></div><div class=\"pilot-pref\"><b>" + t("Aeronave preferida:", "Preferred aircraft:") + "</b> " + p.aircraft + "</div><div class=\"pilot-pref\"><b>" + t("Tipo de vuelo preferido:", "Preferred flight type:") + "</b> " + t(p.es, p.en) + "</div></article>";
    }).join("");
    paintButtons();
    $("infiniteFlightStatus").textContent = statusFn();
  }

  document.querySelectorAll(".portal-nav button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".portal-nav button").forEach((x) => x.classList.toggle("active", x === b));
    document.querySelectorAll(".portal-section").forEach((x) => x.classList.toggle("active", x.id === b.dataset.tab));
  }));
  ["username", "photoUrl", "flights", "hours", "lifts"].forEach((id) => $(id).addEventListener("input", render));
  $("saveBtn").addEventListener("click", () => {
    if (apiStatsLoaded) {
      setStatus(() => t("Las estadísticas en vivo no se guardan. Vuelve a consultar Infinite Flight para actualizarlas.", "Live statistics are not saved. Query Infinite Flight again to refresh them."));
      return;
    }
    localStorage.setItem("vJGpilotProgress", JSON.stringify(values()));
    $("saveBtn").dataset.saved = "1";
    $("saveBtn").textContent = t("✓ Guardado", "✓ Saved");
    setTimeout(() => { delete $("saveBtn").dataset.saved; paintButtons(); }, 1300);
  });
  $("syncInfiniteFlightBtn").addEventListener("click", async () => {
    const user = $("infiniteFlightUsername").value.trim();
    if (!user) {
      setStatus(() => t("Introduce tu usuario de Infinite Flight.", "Enter your Infinite Flight username."));
      return;
    }
    const b = $("syncInfiniteFlightBtn");
    syncing = true;
    b.disabled = true;
    paintButtons();
    setStatus(() => t("Solicitando estadísticas en tiempo real…", "Requesting real-time statistics…"));
    try {
      const result = await window.VJGFlightDataProvider.getPilotProgress({ infiniteFlightUsername: user });
      if (!result.connected) throw new Error(result.reason || "Could not connect");
      apiStatsLoaded = true;
      localStorage.removeItem("vJGpilotProgress");
      if (Number.isFinite(result.flights)) $("flights").value = result.flights;
      if (Number.isFinite(result.hours)) $("hours").value = result.hours.toFixed(1);
      $("saveBtn").disabled = true;
      const when = new Date(result.lastFetchedAt).toLocaleString(document.documentElement.lang === "en" ? "en-US" : "es-MX");
      setStatus(() => t(
        "Conectado a Infinite Flight. Estadísticas actualizadas: " + (Number.isFinite(result.flights) ? result.flights + " vuelos" : "vuelos no disponibles") + " · " + (Number.isFinite(result.hours) ? result.hours.toFixed(1) + " h" : "horas no disponibles") + ". Consultado " + when + ". Estos datos no se almacenan.",
        "Connected to Infinite Flight. Statistics updated: " + (Number.isFinite(result.flights) ? result.flights + " flights" : "flights unavailable") + " · " + (Number.isFinite(result.hours) ? result.hours.toFixed(1) + " hours" : "hours unavailable") + ". Checked " + when + ". This data is not stored."
      ));
    } catch (e) {
      setStatus(() => t("No se pudo obtener el perfil. Revisa el usuario IFC y que la clave de API esté activa en Netlify. Las estadísticas no cambiaron.", "Could not retrieve the profile. Check the IFC username and ensure the API key is enabled in Netlify. Statistics were not changed."));
    } finally {
      syncing = false;
      b.disabled = false;
      render();
    }
  });
  $("resetBtn").addEventListener("click", () => {
    $("username").value = "KevinVJG";
    $("infiniteFlightUsername").value = "uriel00290";
    $("photoUrl").value = "";
    $("flights").value = 0;
    $("hours").value = 0;
    $("lifts").value = 0;
    apiStatsLoaded = false;
    $("saveBtn").disabled = false;
    localStorage.removeItem("vJGpilotProgress");
    setStatus(() => t("Las estadísticas siguen en modo demostración hasta conectar Infinite Flight.", "Statistics remain in demo mode until Infinite Flight is connected."));
    render();
  });
  document.addEventListener("vjg-lang", render);
  try {
    const s = JSON.parse(localStorage.getItem("vJGpilotProgress") || "null");
    if (s) {
      $("username").value = s.username || "KevinVJG";
      $("photoUrl").value = s.photoUrl || "";
      $("lifts").value = s.lifts || 0;
    }
  } catch (e) {}
  render();
  setStatus(() => t("Conectando automáticamente con Infinite Flight para cargar tus estadísticas reales…", "Automatically connecting to Infinite Flight to load your real statistics…"));
  $("syncInfiniteFlightBtn").click();
})();

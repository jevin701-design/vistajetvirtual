/* VJG language switch.
 * Explicit es/en content only. No DOM dictionary and no MutationObserver.
 * Static copy uses .vjg-es / .vjg-en. Leaf nodes and form controls use data-es/data-en.
 */
(function () {
  "use strict";
  var KEY = "vjg-lang";

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "es";
  }

  function t(es, en) {
    return lang() === "en" ? en : es;
  }

  function textOf(el) {
    return lang() === "en" ? el.getAttribute("data-en") : el.getAttribute("data-es");
  }

  function applyControls() {
    document.querySelectorAll("title[data-es][data-en]").forEach(function (el) {
      document.title = textOf(el);
    });
    document.querySelectorAll("meta[data-es][data-en]").forEach(function (el) {
      el.setAttribute("content", textOf(el));
    });
    document.querySelectorAll("option[data-es][data-en]").forEach(function (el) {
      el.textContent = textOf(el);
    });
    document.querySelectorAll("[data-ph-es][data-ph-en]").forEach(function (el) {
      el.placeholder = lang() === "en" ? el.getAttribute("data-ph-en") : el.getAttribute("data-ph-es");
    });
    document.querySelectorAll("[data-aria-es][data-aria-en]").forEach(function (el) {
      el.setAttribute("aria-label", lang() === "en" ? el.getAttribute("data-aria-en") : el.getAttribute("data-aria-es"));
    });
    document.querySelectorAll("[data-i18n-text][data-es][data-en]").forEach(function (el) {
      el.textContent = textOf(el);
    });
    var btn = document.getElementById("vjgLangBtn");
    if (btn) {
      btn.setAttribute("aria-label", t("Cambiar el idioma a inglés", "Switch language to Spanish"));
    }
  }

  function setLang(next) {
    var value = next === "en" ? "en" : "es";
    document.documentElement.lang = value;
    try {
      localStorage.setItem(KEY, value);
    } catch (e) {}
    applyControls();
    document.dispatchEvent(new CustomEvent("vjg-lang", { detail: { lang: value } }));
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest && event.target.closest("#vjgLangBtn");
    if (!btn) return;
    event.preventDefault();
    setLang(lang() === "en" ? "es" : "en");
  });

  applyControls();
  window.VJGLang = { t: t, lang: lang, setLang: setLang, apply: applyControls };
})();

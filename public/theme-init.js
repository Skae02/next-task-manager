(function () {
  var saved;
  try {
    saved = localStorage.getItem("tm_theme");
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
  document.documentElement.dataset.theme = saved === "light" || saved === "dark"
    ? saved
    : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
})();

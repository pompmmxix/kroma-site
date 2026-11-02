/* Kroma free colour analysis quiz.
   Runs entirely in the browser: no network requests, no storage,
   nothing leaves the page. Scores three traits (temperature, depth,
   chroma) and maps the strongest one to a 12-season result. */
(function () {
  "use strict";
  var form = document.getElementById("quiz-form");
  if (!form) return;

  var SEASONS = {
    "light-spring":  "Light Spring",
    "warm-spring":   "Warm Spring",
    "bright-spring": "Bright Spring",
    "light-summer":  "Light Summer",
    "cool-summer":   "Cool Summer",
    "soft-summer":   "Soft Summer",
    "soft-autumn":   "Soft Autumn",
    "warm-autumn":   "Warm Autumn",
    "deep-autumn":   "Deep Autumn",
    "deep-winter":   "Deep Winter",
    "cool-winter":   "Cool Winter",
    "bright-winter": "Bright Winter"
  };
  var MAX = 6; // max absolute score per axis, set by the answer weights in the HTML

  function seasonFor(axis, t, v, c) {
    // axis = the leading trait; the other two pick the family.
    if (axis === "t") {
      // Autumn = deeper and softer than spring; winter = deeper and
      // brighter than summer. Weigh both traits, not depth alone.
      if (t >= 0) return v - c > 0 ? "warm-autumn" : "warm-spring";
      return v + c > 0 ? "cool-winter" : "cool-summer";
    }
    if (axis === "v") {
      if (v < 0) return t > 0 || (t === 0 && c > 0) ? "light-spring" : "light-summer";
      return t > 0 || (t === 0 && c < 0) ? "deep-autumn" : "deep-winter";
    }
    if (c >= 0) return t > 0 || (t === 0 && v < 0) ? "bright-spring" : "bright-winter";
    return t > 0 || (t === 0 && v > 0) ? "soft-autumn" : "soft-summer";
  }

  var groups = Array.prototype.slice.call(form.querySelectorAll("fieldset"));
  var submit = form.querySelector("button[type=submit]");
  var progress = document.getElementById("quiz-progress");

  function answered() {
    return groups.filter(function (g) { return g.querySelector("input:checked"); }).length;
  }
  function update() {
    var n = answered();
    progress.textContent = n + " of " + groups.length + " answered";
    submit.disabled = n < groups.length;
  }
  form.addEventListener("change", update);
  update();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var t = 0, v = 0, c = 0;
    groups.forEach(function (g) {
      var i = g.querySelector("input:checked");
      if (!i) return;
      t += parseFloat(i.dataset.t || 0);
      v += parseFloat(i.dataset.v || 0);
      c += parseFloat(i.dataset.c || 0);
    });

    var ranked = [["t", Math.abs(t)], ["v", Math.abs(v)], ["c", Math.abs(c)]]
      .sort(function (a, b) { return b[1] - a[1]; });
    var main = seasonFor(ranked[0][0], t, v, c);
    var alt = seasonFor(ranked[1][0], t, v, c);

    var out = document.getElementById("quiz-result");
    out.querySelector("[data-season]").textContent = SEASONS[main];
    var link = out.querySelector("[data-link]");
    link.href = "/colour-analysis/" + main + "/";
    link.textContent = "See the " + SEASONS[main] + " palette →";

    var altWrap = out.querySelector("[data-alt-wrap]");
    if (alt !== main) {
      var altLink = out.querySelector("[data-alt]");
      altLink.href = "/colour-analysis/" + alt + "/";
      altLink.textContent = SEASONS[alt];
      altWrap.hidden = false;
    } else {
      altWrap.hidden = true;
    }

    function place(id, score) {
      var pct = Math.max(0, Math.min(100, (score / MAX + 1) * 50));
      document.getElementById(id).style.left = pct + "%";
    }
    place("bar-t", t);
    place("bar-v", v);
    place("bar-c", c);

    out.hidden = false;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
    out.focus({ preventScroll: true });
  });
})();

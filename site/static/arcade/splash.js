/*!
 * Pink Horse Arcade — splash screen helper
 * -----------------------------------------
 * Drop-in full-screen 80s-box-art splash before gameplay.
 *
 *   <script>
 *     window.ARCADE_SPLASH = {
 *       image: '/arcade/splashes/worm.png',  // required
 *       title: 'WORM',                        // optional overlay text
 *       subtitle: 'Tap to start',             // optional
 *       music: '/arcade/sfx/worm-music.mp3', // optional
 *       onStart: function () { ... },         // optional callback
 *     };
 *   </script>
 *   <script src="/arcade/splash.js"></script>
 *
 * Hides itself on any pointer/key/gamepad Start. Dispatches
 * window event 'arcade-splash-done'. Idempotent.
 */
(function () {
  "use strict";
  if (window.__arcadeSplash) return;
  var cfg = window.ARCADE_SPLASH;
  if (!cfg || !cfg.image) return;
  window.__arcadeSplash = true;

  var root = document.createElement("div");
  root.id = "arcade-splash";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", (cfg.title || "Game") + " title screen");
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "99999",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    background: "#000 center/cover no-repeat",
    backgroundImage: 'url("' + cfg.image + '")',
    color: "#fff",
    fontFamily: 'Impact, "Arial Black", system-ui, sans-serif',
    textAlign: "center",
    cursor: "pointer",
    userSelect: "none",
    touchAction: "manipulation",
  });

  var shade = document.createElement("div");
  Object.assign(shade.style, {
    position: "absolute",
    inset: "0",
    background:
      "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.35) 100%)",
    pointerEvents: "none",
  });
  root.appendChild(shade);

  var panel = document.createElement("div");
  Object.assign(panel.style, {
    position: "relative",
    zIndex: "1",
    padding: "0 1.25rem 8vh",
    maxWidth: "920px",
    width: "100%",
  });

  if (cfg.title) {
    var h = document.createElement("div");
    h.textContent = cfg.title;
    Object.assign(h.style, {
      fontSize: "clamp(2rem, 8vw, 4.5rem)",
      letterSpacing: "0.06em",
      textShadow: "0 0 18px #ff2bd6, 0 4px 0 #1a0030, 0 8px 24px #000",
      marginBottom: "0.35rem",
      lineHeight: "1.05",
    });
    panel.appendChild(h);
  }

  var sub = document.createElement("div");
  sub.textContent = cfg.subtitle || "TAP / PRESS START";
  Object.assign(sub.style, {
    fontFamily: 'ui-monospace, "Courier New", monospace',
    fontSize: "clamp(0.85rem, 2.6vw, 1.25rem)",
    letterSpacing: "0.28em",
    opacity: "0.95",
    textShadow: "0 2px 8px #000",
    animation: "arcadeSplashBlink 1.1s steps(2, end) infinite",
  });
  panel.appendChild(sub);

  if (cfg.credit || cfg.cred) {
    var cr = document.createElement("div");
    cr.textContent = cfg.credit || cfg.cred;
    Object.assign(cr.style, {
      marginTop: "0.75rem",
      fontFamily: "system-ui, sans-serif",
      fontSize: "0.75rem",
      opacity: "0.7",
      letterSpacing: "0.08em",
    });
    panel.appendChild(cr);
  }

  root.appendChild(panel);

  var style = document.createElement("style");
  style.textContent =
    "@keyframes arcadeSplashBlink{0%,100%{opacity:1}50%{opacity:0.25}}";
  document.head.appendChild(style);

  var audio = null;
  function tryMusic() {
    if (!cfg.music || audio) return;
    try {
      audio = new Audio(cfg.music);
      audio.loop = !!cfg.musicLoop || cfg.musicLoop == null;
      audio.volume = cfg.musicVolume != null ? cfg.musicVolume : 0.45;
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  var done = false;
  function finish(ev) {
    if (done) return;
    done = true;
    if (ev && ev.preventDefault) ev.preventDefault();
    tryMusic();
    root.style.transition = "opacity 0.45s ease";
    root.style.opacity = "0";
    setTimeout(function () {
      if (root.parentNode) root.parentNode.removeChild(root);
      if (typeof cfg.onStart === "function") {
        try {
          cfg.onStart();
        } catch (e) {}
      }
      try {
        window.dispatchEvent(new CustomEvent("arcade-splash-done"));
      } catch (e) {}
    }, 480);
    window.removeEventListener("keydown", finish, true);
    window.removeEventListener("pointerdown", finish, true);
  }

  function mount() {
    (document.body || document.documentElement).appendChild(root);
    // Soft autoplay attempt after first gesture only — music starts on dismiss
    window.addEventListener("keydown", finish, true);
    window.addEventListener("pointerdown", finish, true);
    // Gamepad Start
    var gpTimer = setInterval(function () {
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < pads.length; i++) {
        var p = pads[i];
        if (!p) continue;
        if (p.buttons[9] && p.buttons[9].pressed) {
          clearInterval(gpTimer);
          finish();
          return;
        }
        for (var b = 0; b < Math.min(4, p.buttons.length); b++) {
          if (p.buttons[b] && p.buttons[b].pressed) {
            clearInterval(gpTimer);
            finish();
            return;
          }
        }
      }
      if (done) clearInterval(gpTimer);
    }, 100);
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();

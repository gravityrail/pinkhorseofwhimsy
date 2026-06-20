/*!
 * Pink Horse Arcade — universal controls shim
 * --------------------------------------------
 * Drop-in touch + gamepad support for keyboard-driven web games.
 *
 * Include once, near the end of <body>:
 *   <script>window.ARCADE_CONTROLS = { ...optional config... };</script>
 *   <script src="/arcade/controls.js" defer></script>
 *
 * It renders an on-screen D-pad + action buttons on touch devices, polls the
 * Gamepad API for plugged-in controllers, and translates BOTH into synthetic
 * KeyboardEvents dispatched on window/document/canvas — so any game that reads
 * the keyboard becomes playable with a touchscreen or a controller, no game
 * code changes required.
 *
 * Config (all optional) via window.ARCADE_CONTROLS:
 * {
 *   dpad:   { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' },
 *   // Up to 4 face buttons. `keys` may be a single key or an array.
 *   buttons: [
 *     { label:'A', keys:' ' },          // primary  (gamepad A / button 0)
 *     { label:'B', keys:'x' },          // gamepad B / button 1
 *     { label:'X', keys:'z' },          // gamepad X / button 2
 *     { label:'Y', keys:'Shift' },      // gamepad Y / button 3
 *   ],
 *   start:  'Enter',                     // gamepad Start (button 9)
 *   select: 'Escape',                    // gamepad Select (button 8)
 *   showOnDesktop: false,                // also show the touch overlay on desktop
 *   disableTouch: false,                 // don't render the on-screen overlay
 *   disableGamepad: false,               // don't poll the Gamepad API
 * }
 *
 * Games with their own native touch UI (e.g. Worm) can set
 * window.ARCADE_CONTROLS = { disableTouch: true } and still get gamepad support.
 */
(function () {
  "use strict";
  if (window.__arcadeControls) return; // singleton
  var cfg = window.ARCADE_CONTROLS || {};

  // ---- key mapping -------------------------------------------------------
  // Default directions send BOTH arrow keys and WASD so games using either
  // scheme respond. Override per-game via window.ARCADE_CONTROLS.dpad.
  var DPAD = Object.assign(
    {
      up: ["ArrowUp", "w"],
      down: ["ArrowDown", "s"],
      left: ["ArrowLeft", "a"],
      right: ["ArrowRight", "d"],
    },
    cfg.dpad || {}
  );
  var BUTTONS = cfg.buttons || [
    { label: "A", keys: " " },
    { label: "B", keys: "x" },
    { label: "X", keys: "z" },
    { label: "Y", keys: "Shift" },
  ];
  var START = cfg.start || "Enter";
  var SELECT = cfg.select || "Escape";

  // Best-effort key/code/keyCode table so games reading any of them respond.
  var KEYCODES = {
    ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
    " ": 32, Enter: 13, Escape: 27, Shift: 16, Control: 17, Tab: 9,
  };
  function codeFor(key) {
    if (key.indexOf("Arrow") === 0) return key;
    if (key === " ") return "Space";
    if (key === "Enter") return "Enter";
    if (key === "Escape") return "Escape";
    if (key === "Shift") return "ShiftLeft";
    if (key === "Control") return "ControlLeft";
    if (/^[a-zA-Z]$/.test(key)) return "Key" + key.toUpperCase();
    if (/^[0-9]$/.test(key)) return "Digit" + key;
    return key;
  }
  function keyCodeFor(key) {
    if (KEYCODES[key] != null) return KEYCODES[key];
    if (/^[a-z]$/.test(key)) return key.toUpperCase().charCodeAt(0);
    if (/^[A-Z]$/.test(key)) return key.charCodeAt(0);
    if (/^[0-9]$/.test(key)) return key.charCodeAt(0);
    return 0;
  }

  var held = {}; // key -> true while pressed (de-dupes repeats)

  function targets() {
    var t = [document, window];
    var c = document.querySelector("canvas");
    if (c) t.push(c);
    if (document.activeElement && document.activeElement !== document.body) {
      t.push(document.activeElement);
    }
    return t;
  }
  function fire(type, key) {
    var ev;
    var init = {
      key: key,
      code: codeFor(key),
      keyCode: keyCodeFor(key),
      which: keyCodeFor(key),
      bubbles: true,
      cancelable: true,
      composed: true,
    };
    try {
      ev = new KeyboardEvent(type, init);
    } catch (e) {
      ev = document.createEvent("Event");
      ev.initEvent(type, true, true);
      Object.assign(ev, init);
    }
    targets().forEach(function (t) {
      try { t.dispatchEvent(ev); } catch (e) {}
    });
  }
  function press(keys) {
    (Array.isArray(keys) ? keys : [keys]).forEach(function (k) {
      if (held[k]) return;
      held[k] = true;
      fire("keydown", k);
    });
  }
  function release(keys) {
    (Array.isArray(keys) ? keys : [keys]).forEach(function (k) {
      if (!held[k]) return;
      held[k] = false;
      fire("keyup", k);
    });
  }

  // ---- touch / on-screen overlay ----------------------------------------
  var isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

  function buildOverlay() {
    if (cfg.disableTouch) return;
    if (!isTouch && !cfg.showOnDesktop) return;

    var style = document.createElement("style");
    style.textContent =
      ".phx-pad{position:fixed;inset:0;z-index:2147483000;pointer-events:none;" +
      "font-family:system-ui,sans-serif;-webkit-user-select:none;user-select:none;touch-action:none}" +
      ".phx-cluster{position:absolute;bottom:max(14px,env(safe-area-inset-bottom));display:grid;gap:8px}" +
      ".phx-dpad{left:max(14px,env(safe-area-inset-left));grid-template-columns:repeat(3,56px);grid-template-rows:repeat(3,56px)}" +
      ".phx-btns{right:max(14px,env(safe-area-inset-right));grid-template-columns:repeat(2,64px);grid-template-rows:repeat(2,64px)}" +
      ".phx-k{pointer-events:auto;display:flex;align-items:center;justify-content:center;" +
      "border:none;border-radius:14px;color:#fff;font-size:22px;font-weight:800;" +
      "background:rgba(20,22,40,.42);box-shadow:0 2px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.18);" +
      "backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);transition:transform .05s,background .1s}" +
      ".phx-k:active,.phx-k.on{transform:scale(.9);background:rgba(120,150,255,.6)}" +
      ".phx-up{grid-area:1/2}.phx-left{grid-area:2/1}.phx-right{grid-area:2/3}.phx-down{grid-area:3/2}" +
      ".phx-mini{position:absolute;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));" +
      "display:flex;gap:6px;pointer-events:none}" +
      ".phx-mini .phx-k{width:auto;padding:4px 10px;font-size:13px;border-radius:10px}" +
      ".phx-hide{display:none!important}";
    document.head.appendChild(style);

    var pad = document.createElement("div");
    pad.className = "phx-pad";

    function mkKey(cls, label, keys, onName) {
      var b = document.createElement("button");
      b.className = "phx-k " + cls;
      b.type = "button";
      b.textContent = label;
      b.setAttribute("aria-label", onName || label);
      var down = function (e) { e.preventDefault(); b.classList.add("on"); press(keys); };
      var up = function (e) { if (e) e.preventDefault(); b.classList.remove("on"); release(keys); };
      b.addEventListener("pointerdown", down);
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
      b.addEventListener("pointerleave", up);
      b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      return b;
    }

    var dpad = document.createElement("div");
    dpad.className = "phx-cluster phx-dpad";
    dpad.appendChild(mkKey("phx-up", "▲", DPAD.up, "Up"));
    dpad.appendChild(mkKey("phx-left", "◀", DPAD.left, "Left"));
    dpad.appendChild(mkKey("phx-right", "▶", DPAD.right, "Right"));
    dpad.appendChild(mkKey("phx-down", "▼", DPAD.down, "Down"));

    var btns = document.createElement("div");
    btns.className = "phx-cluster phx-btns";
    // arrange A bottom, B right, X left, Y top (SNES-ish) for the first four
    var slots = ["grid-area:2/1", "grid-area:2/2", "grid-area:1/1", "grid-area:1/2"];
    BUTTONS.slice(0, 4).forEach(function (def, i) {
      var k = mkKey("phx-face", def.label, def.keys, def.label);
      k.style.cssText += slots[i];
      btns.appendChild(k);
    });

    var mini = document.createElement("div");
    mini.className = "phx-mini";
    mini.appendChild(mkKey("", "Start", START, "Start"));

    pad.appendChild(dpad);
    pad.appendChild(btns);
    pad.appendChild(mini);
    document.body.appendChild(pad);
    api.overlay = pad;
  }

  // ---- gamepad -----------------------------------------------------------
  function gamepadLoop() {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    var gp = null;
    for (var i = 0; i < pads.length; i++) if (pads[i]) { gp = pads[i]; break; }
    if (gp) {
      var DZ = 0.5;
      var ax = gp.axes || [];
      var b = gp.buttons || [];
      var pressedNow = function (idx) { return b[idx] && (b[idx].pressed || b[idx].value > 0.5); };
      // d-pad + left stick -> directions
      setDir(DPAD.left, (ax[0] < -DZ) || pressedNow(14));
      setDir(DPAD.right, (ax[0] > DZ) || pressedNow(15));
      setDir(DPAD.up, (ax[1] < -DZ) || pressedNow(12));
      setDir(DPAD.down, (ax[1] > DZ) || pressedNow(13));
      // face buttons 0..3 -> configured keys
      BUTTONS.slice(0, 4).forEach(function (def, i) {
        setDir(def.keys, pressedNow(i));
      });
      setDir(START, pressedNow(9));
      setDir(SELECT, pressedNow(8));
    }
    requestAnimationFrame(gamepadLoop);
  }
  function setDir(keys, on) {
    if (on) press(keys); else release(keys);
  }

  // ---- escape hatch: release pointer lock / exit fullscreen --------------
  // First-person games (e.g. Bean Simulator) call requestPointerLock(), which
  // captures the mouse. On a touchscreen with no keyboard there's no way to hit
  // Esc to get out, so the browser chrome stops responding. This on-screen
  // button restores control.
  var exitBtn = null;
  function exitCapture(e) {
    if (e) e.preventDefault();
    try { if (document.exitPointerLock) document.exitPointerLock(); } catch (_) {}
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (_) {}
    fire("keydown", "Escape");
    fire("keyup", "Escape");
    refreshExit();
  }
  function makeExitButton() {
    var b = document.createElement("button");
    b.id = "phx-exit";
    b.type = "button";
    b.textContent = "⎋ Exit";
    b.setAttribute("aria-label", "Release mouse and exit full screen");
    b.style.cssText =
      "position:fixed;top:max(8px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left));" +
      "z-index:2147483600;pointer-events:auto;border:none;border-radius:10px;padding:7px 13px;" +
      "font:800 14px system-ui,sans-serif;color:#fff;background:rgba(206,58,72,.82);cursor:pointer;" +
      "box-shadow:0 2px 10px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.2);" +
      "backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);" +
      "-webkit-user-select:none;user-select:none;touch-action:manipulation;display:none";
    b.addEventListener("click", exitCapture);
    b.addEventListener("touchend", exitCapture);
    document.body.appendChild(b);
    return b;
  }
  function refreshExit() {
    if (!exitBtn) return;
    var locked = !!document.pointerLockElement;
    var fs = !!document.fullscreenElement;
    // Always reachable on touch (unless the game opted out of the touch UI),
    // and always shown whenever the page has actually grabbed pointer/fullscreen.
    var show = (isTouch && !cfg.disableTouch) || cfg.showOnDesktop || locked || fs;
    exitBtn.style.display = show ? "block" : "none";
  }

  // ---- public API + boot -------------------------------------------------
  var api = {
    press: press,
    release: release,
    config: cfg,
    overlay: null,
    hideOverlay: function () { if (api.overlay) api.overlay.classList.add("phx-hide"); },
    showOverlay: function () { if (api.overlay) api.overlay.classList.remove("phx-hide"); },
  };
  window.__arcadeControls = api;

  function boot() {
    buildOverlay();
    exitBtn = makeExitButton();
    refreshExit();
    document.addEventListener("pointerlockchange", refreshExit);
    document.addEventListener("fullscreenchange", refreshExit);
    api.exitCapture = exitCapture;
    if (!cfg.disableGamepad) {
      window.addEventListener("gamepadconnected", function () {});
      requestAnimationFrame(gamepadLoop);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

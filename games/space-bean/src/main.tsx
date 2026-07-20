import { createRoot } from "react-dom/client";
import SpaceBeanGame from "./space-bean-game";
import "./globals.css";

/** Load Pink Horse Arcade splash + gamepad shim (root-absolute paths). */
function loadArcadeScript(src: string, marker: string) {
  if (document.querySelector(`script[${marker}]`)) return;
  const s = document.createElement("script");
  s.src = src;
  s.defer = true;
  s.setAttribute(marker, "1");
  document.body.appendChild(s);
}

const w = window as Window & {
  ARCADE_CONTROLS?: Record<string, unknown>;
  ARCADE_SPLASH?: Record<string, unknown>;
};

w.ARCADE_SPLASH = {
  image: "/arcade/splashes/star-bean.png",
  title: "SPACE BEAN",
  subtitle: "TAP / PRESS START",
  credit: "PINK HORSE ARCADE",
};
w.ARCADE_CONTROLS = {
  disableTouch: true,
  buttons: [
    { label: "Fire", keys: " " },
    { label: "Bomb", keys: "Shift" },
    { label: "Fire", keys: " " },
    { label: "Bomb", keys: "Shift" },
  ],
  select: "Escape",
};
loadArcadeScript("/arcade/splash.js", "data-arcade-splash");
loadArcadeScript("/arcade/controls.js", "data-arcade-controls");

// No <StrictMode>: the game sets up a single WebGL renderer + audio graph in an
// effect, and StrictMode's double-invoke in dev would create/tear-down it twice.
const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");
createRoot(container).render(<SpaceBeanGame />);

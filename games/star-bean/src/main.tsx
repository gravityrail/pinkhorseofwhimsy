import { createRoot } from "react-dom/client";
import SpaceBeanGame from "./space-bean-game";
import "./globals.css";

// No <StrictMode>: the game sets up a single WebGL renderer + audio graph in an
// effect, and StrictMode's double-invoke in dev would create/tear-down it twice.
const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");
createRoot(container).render(<SpaceBeanGame />);

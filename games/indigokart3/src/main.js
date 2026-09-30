import './styles.css';
import { Game } from './game/Game.js';
import { loadEnvironmentKit } from './game/assets.js';
const app = document.querySelector('#app');
app.innerHTML = `<div class="loading"><span class="wordmark">INDIGO<span>KART</span> <b>3</b></span><p>THE GOOD KIND OF CHAOS</p><progress max="1" value="0" aria-label="Loading environments"></progress><small>Warming up the engines…</small></div>`;
try {
  await loadEnvironmentKit(progress => { app.querySelector('progress').value = progress; });
  const game = new Game(app);
  game.mount();
  if (import.meta.env.DEV) window.__INDIGO_KART__ = game;
} catch (error) {
  console.error(error);
  app.innerHTML = `<div class="loading"><h1>Let’s try that again.</h1><p>The graphics or scenery could not load. Check your connection and enable WebGL.</p><button onclick="location.reload()">RETRY</button><a href="/arcade/">Back to the arcade</a></div>`;
}

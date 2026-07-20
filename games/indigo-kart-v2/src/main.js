/** Load Pink Horse Arcade splash + touch/gamepad shims (root-absolute paths). */
function loadArcadeScript(src, marker) {
  if (document.querySelector(`script[${marker}]`)) return;
  const s = document.createElement('script');
  s.src = src;
  s.defer = true;
  s.setAttribute(marker, '1');
  document.body.appendChild(s);
}

window.ARCADE_SPLASH = {
  image: '/arcade/splashes/indigokart2.png',
  title: 'INDIGO KART',
  subtitle: 'TAP / PRESS START',
  credit: 'PINK HORSE ARCADE',
};
window.ARCADE_CONTROLS = {
  disableTouch: false,
  buttons: [
    { label: 'A', keys: ' ' },
    { label: 'B', keys: 'x' },
    { label: 'X', keys: 'z' },
    { label: 'Y', keys: 'Shift' },
  ],
};
loadArcadeScript('/arcade/splash.js', 'data-arcade-splash');
loadArcadeScript('/arcade/controls.js', 'data-arcade-controls');

import './styles.css';
import { Game } from './game/Game.js';

const app = document.querySelector('#app');
const game = new Game(app);
game.mount();

window.__INDIGO_KART__ = game;

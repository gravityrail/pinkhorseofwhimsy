/**
 * Pink Horse Pinball — entry point.
 * three.js + cannon.js loaded as globals from CDN (no bundler).
 */

import { PinballGame } from './game.js';

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}

ready(() => {
  if (typeof THREE === 'undefined' || typeof CANNON === 'undefined') {
    document.body.innerHTML =
      '<p style="color:#fff;font-family:system-ui;padding:2rem">Failed to load three.js / cannon.js</p>';
    return;
  }

  let game = null;

  // Music is started by AudioBus on unlock (user gesture via splash) so we can
  // duck/boost volume during multiball & pink horse mode.
  window.ARCADE_SPLASH = {
    image: '/arcade/splashes/pinball.png',
    title: 'PINBALL',
    subtitle: 'TAP / PRESS START',
    credit: 'Pink Horse Arcade',
    onStart: () => {
      if (!game) {
        game = new PinballGame(THREE, CANNON);
        window.__pinball = game;
      }
      game.unlockAudio();
      document.getElementById('touch-ui')?.classList.add('ready');
      document.getElementById('hud')?.classList.add('ready');
    },
  };

  // Load splash after config is set
  const s = document.createElement('script');
  s.src = '/arcade/splash.js';
  document.body.appendChild(s);

  // If splash already dismissed somehow, boot anyway after a tick
  window.addEventListener('arcade-splash-done', () => {
    if (!game) {
      game = new PinballGame(THREE, CANNON);
      window.__pinball = game;
      game.unlockAudio();
    }
    document.getElementById('touch-ui')?.classList.add('ready');
    document.getElementById('hud')?.classList.add('ready');
  });
});

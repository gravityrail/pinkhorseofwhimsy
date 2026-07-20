import { Engine } from './core/Engine';
import './styles.css';

/** Load Pink Horse Arcade touch/gamepad shim (root-absolute path). */
function loadArcadeControls(config: Record<string, unknown> = {}) {
  const w = window as Window & { ARCADE_CONTROLS?: Record<string, unknown> };
  w.ARCADE_CONTROLS = { ...(w.ARCADE_CONTROLS || {}), ...config };
  if (document.querySelector('script[data-arcade-controls]')) return;
  const s = document.createElement('script');
  s.src = '/arcade/controls.js';
  s.defer = true;
  s.dataset.arcadeControls = '1';
  document.body.appendChild(s);
}

document.addEventListener('DOMContentLoaded', () => {
  loadArcadeControls();
  try {
    new Engine('container');
  } catch (e) {
    console.error('Failed to initialize Vibekart Engine:', e);
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '20px';
    errorDiv.innerText = `Error initializing application: ${(e as Error).message}. Check console for details.`;
    document.body.innerHTML = '';
    document.body.appendChild(errorDiv);
  }
});

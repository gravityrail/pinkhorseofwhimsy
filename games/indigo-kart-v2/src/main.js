import './styles.css';
import { Game } from './game/Game.js';

const app = document.querySelector('#app');
const game = new Game(app);
game.mount();

window.__INDIGO_KART__ = game;

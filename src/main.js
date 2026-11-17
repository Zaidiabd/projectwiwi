import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  // Expose handle only for live diagnostics (?debug=1)
  if (new URLSearchParams(window.location.search).get('debug') === '1') {
    window.__FELIS__ = game;
  }
});

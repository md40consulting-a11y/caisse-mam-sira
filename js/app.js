// app.js — bootstrap, navigation entre écrans, enregistrement du Service Worker.

import { getPoste, setPoste, isConfigured } from './config.js';
import { initCaisse, renderCaisse } from './screens/caisse.js';
import { initEspeces, openEspeces } from './screens/especes.js';
import { initHistorique, renderHistorique } from './screens/historique.js';
import { initBilan, renderBilan } from './screens/bilan.js';
import { initExport, renderExport } from './screens/export.js';

const SCREENS = ['config', 'caisse', 'especes', 'historique', 'bilan', 'export'];

// Écrans accessibles via la navigation du bas (config & especes en sont exclus).
const renderers = {
  caisse: renderCaisse,
  historique: renderHistorique,
  bilan: renderBilan,
  export: renderExport,
};

let _toastTimer = null;

const app = {
  get poste() {
    return getPoste();
  },

  navigate(name) {
    for (const s of SCREENS) {
      document.getElementById(`screen-${s}`).hidden = s !== name;
    }
    // Surbrillance de l'onglet de navigation correspondant.
    for (const btn of document.querySelectorAll('.nav-btn')) {
      btn.classList.toggle('actif', btn.dataset.screen === name);
    }
    // Rafraîchit le contenu de l'écran si nécessaire.
    const r = renderers[name];
    if (r) r();
  },

  openEspeces,
  refreshCaisse: renderCaisse,

  toast(message) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    requestAnimationFrame(() => el.classList.add('visible'));
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('visible'), 1800);
  },
};

function demarrerCaisse() {
  document.getElementById('nav-bas').hidden = false;
  app.navigate('caisse');
}

function initConfig() {
  const input = document.getElementById('poste-input');
  const valider = () => {
    try {
      setPoste(input.value);
      demarrerCaisse();
    } catch (_) {
      input.focus();
    }
  };
  document.getElementById('poste-valider').addEventListener('click', valider);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') valider();
  });
}

function initNavigation() {
  for (const btn of document.querySelectorAll('.nav-btn')) {
    btn.addEventListener('click', () => app.navigate(btn.dataset.screen));
  }
}

function enregistrerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Service Worker non enregistré :', err);
    });
  });
}

function main() {
  // Initialise tous les écrans une fois (listeners, DOM statique).
  initCaisse(app);
  initEspeces(app);
  initHistorique(app);
  initBilan(app);
  initExport(app);
  initConfig();
  initNavigation();

  if (isConfigured()) {
    demarrerCaisse();
  } else {
    app.navigate('config');
    document.getElementById('poste-input').focus();
  }

  enregistrerServiceWorker();
}

main();

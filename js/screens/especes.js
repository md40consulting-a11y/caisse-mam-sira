// especes.js — Écran 2. Pavé numérique tactile + calcul de la monnaie à rendre.
// La saisie accumule en centimes (logique caisse) : taper 2,0,0,0 → 20,00 €.

import * as cart from '../cart.js';
import { putCommande } from '../db.js';
import { formatEuros } from '../utils.js';

let app;
let elDu, elRecu, elRendu, elRenduBloc, elEncaisser;
let totalDu = 0;
let saisieCentimes = 0;

export function initEspeces(appRef) {
  app = appRef;
  elDu = document.getElementById('especes-du');
  elRecu = document.getElementById('especes-recu');
  elRendu = document.getElementById('especes-rendu');
  elRenduBloc = elRendu.closest('.especes-rendu-bloc');
  elEncaisser = document.getElementById('especes-encaisser');

  construirePave();
  construireRaccourcis();

  document.getElementById('especes-retour').addEventListener('click', () => {
    app.navigate('caisse');
  });

  elEncaisser.addEventListener('click', encaisser);
}

/** Ouvre l'écran espèces pour le panier courant. */
export function openEspeces() {
  totalDu = cart.totalCentimes();
  saisieCentimes = 0;
  app.navigate('especes');
  render();
}

function construirePave() {
  const pave = document.getElementById('pave-num');
  pave.innerHTML = '';
  const touches = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '00', '0', '⌫'];
  for (const t of touches) {
    const btn = document.createElement('button');
    btn.className = 'pave-touche' + (t === '⌫' ? ' efface' : '');
    btn.textContent = t;
    btn.addEventListener('click', () => appuyer(t));
    pave.appendChild(btn);
  }
}

function appuyer(touche) {
  if (touche === '⌫') {
    saisieCentimes = Math.floor(saisieCentimes / 10);
  } else if (touche === '00') {
    saisieCentimes = Math.min(saisieCentimes * 100, 99_999_99);
  } else {
    saisieCentimes = Math.min(saisieCentimes * 10 + Number(touche), 99_999_99);
  }
  render();
}

function construireRaccourcis() {
  const zone = document.getElementById('especes-raccourcis');
  zone.innerHTML = '';
  const defs = [
    { label: 'Appoint', valeur: () => totalDu },
    { label: '10 €', valeur: () => 1000 },
    { label: '20 €', valeur: () => 2000 },
    { label: '50 €', valeur: () => 5000 },
  ];
  for (const d of defs) {
    const btn = document.createElement('button');
    btn.className = 'raccourci-btn';
    btn.textContent = d.label;
    btn.addEventListener('click', () => {
      saisieCentimes = d.valeur();
      render();
    });
    zone.appendChild(btn);
  }
}

function render() {
  elDu.textContent = formatEuros(totalDu);
  elRecu.textContent = formatEuros(saisieCentimes);
  const rendu = saisieCentimes - totalDu;
  elRendu.textContent = formatEuros(rendu);
  const insuffisant = saisieCentimes < totalDu;
  elRenduBloc.classList.toggle('negatif', insuffisant);
  // Encaisser possible dès que le montant reçu couvre le total.
  elEncaisser.disabled = saisieCentimes < totalDu;
}

async function encaisser() {
  if (saisieCentimes < totalDu) return;
  const commande = cart.construireCommande({
    poste: app.poste,
    paiement: 'especes',
    montantDonneCentimes: saisieCentimes,
  });
  await putCommande(commande);
  const rendu = commande.monnaie_rendue_centimes;
  cart.vider();
  app.navigate('caisse');
  app.refreshCaisse();
  app.toast(rendu > 0 ? `Rendre ${formatEuros(rendu)}` : 'Encaissé ✓');
}

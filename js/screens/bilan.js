// bilan.js — Écran 4. Bilan local du poste : CA, CB/espèces, par produit, par heure.

import { getCommandesByJour, getJoursDistincts } from '../db.js';
import { formatEuros, heureDe, dateJour } from '../utils.js';

let app;
let elJour, elContenu;

export function initBilan(appRef) {
  app = appRef;
  elJour = document.getElementById('bilan-jour');
  elContenu = document.getElementById('bilan-contenu');
  elJour.addEventListener('change', () => afficherJour(elJour.value));
}

export async function renderBilan() {
  await remplirSelecteurJours(elJour);
  await afficherJour(elJour.value);
}

async function afficherJour(jour) {
  const toutes = await getCommandesByJour(jour);
  const validees = toutes.filter((c) => c.statut === 'validee');

  if (validees.length === 0) {
    elContenu.innerHTML = '<p class="vide-msg">Aucune vente validée ce jour.</p>';
    return;
  }

  elContenu.innerHTML =
    cartesHaut(validees) +
    `<div class="bilan-section-titre">Ventes par produit</div>` +
    tableauProduits(validees) +
    `<div class="bilan-section-titre">Affluence par heure</div>` +
    histoHeures(validees);
}

const nbLabel = (n) => `${n} commande${n > 1 ? 's' : ''}`;

// Encaissement EFFECTIF d'une commande : une ardoise réglée bascule vers son moyen réel.
function effectif(c) {
  if (c.paiement === 'plus_tard') return c.regle_par || 'a_encaisser';
  return c.paiement;
}

function cartesHaut(validees) {
  const somme = (arr) => arr.reduce((s, c) => s + c.total_centimes, 0);
  const cb = validees.filter((c) => effectif(c) === 'cb');
  const esp = validees.filter((c) => effectif(c) === 'especes');
  const plusTard = validees.filter((c) => effectif(c) === 'a_encaisser');
  const caTotal = somme(validees);
  const caPlusTard = somme(plusTard);

  // Sous-titre du CA : rappelle la part non encaissée s'il y a des ardoises.
  const sousCa = caPlusTard > 0
    ? `${nbLabel(validees.length)} · dont ${formatEuros(caPlusTard)} à encaisser`
    : `${validees.length} commande${validees.length > 1 ? 's' : ''} validée${validees.length > 1 ? 's' : ''}`;

  const carteEncaisse = (libelle, montant, n, extraClass = '') =>
    `<div class="bilan-carte ${extraClass}">` +
      `<div class="libelle">${libelle}</div>` +
      `<div class="valeur">${formatEuros(montant)}</div>` +
      `<div class="sous">${nbLabel(n)}</div>` +
    `</div>`;

  return (
    `<div class="bilan-cartes">` +
      `<div class="bilan-carte large">` +
        `<div class="libelle">Chiffre d'affaires</div>` +
        `<div class="valeur">${formatEuros(caTotal)}</div>` +
        `<div class="sous">${sousCa}</div>` +
      `</div>` +
      carteEncaisse('CB', somme(cb), cb.length) +
      carteEncaisse('Espèces', somme(esp), esp.length) +
      (plusTard.length > 0
        ? carteEncaisse('À encaisser (plus tard)', caPlusTard, plusTard.length, 'large carte-ambre')
        : '') +
    `</div>`
  );
}

function tableauProduits(validees) {
  const map = new Map(); // nom -> { qte, ca }
  for (const c of validees) {
    for (const l of c.lignes) {
      const e = map.get(l.nom) || { qte: 0, ca: 0 };
      e.qte += l.quantite;
      e.ca += l.prix_unitaire_centimes * l.quantite;
      map.set(l.nom, e);
    }
  }
  const lignes = [...map.entries()].sort((a, b) => b[1].qte - a[1].qte);
  const corps = lignes
    .map(([nom, e]) => `<tr><td>${nom}</td><td class="num">${e.qte}</td><td class="num">${formatEuros(e.ca)}</td></tr>`)
    .join('');
  return (
    `<table class="bilan-table">` +
      `<thead><tr><th>Produit</th><th class="num">Qté</th><th class="num">CA</th></tr></thead>` +
      `<tbody>${corps}</tbody>` +
    `</table>`
  );
}

function histoHeures(validees) {
  const parHeure = new Array(24).fill(0); // nb d'articles par heure
  for (const c of validees) {
    const h = heureDe(c.horodatage);
    const articles = c.lignes.reduce((n, l) => n + l.quantite, 0);
    parHeure[h] += articles;
  }
  // On n'affiche que la plage utile (première → dernière heure avec ventes).
  let min = parHeure.findIndex((v) => v > 0);
  let max = 23 - [...parHeure].reverse().findIndex((v) => v > 0);
  if (min === -1) return '';
  const maxVal = Math.max(...parHeure);

  let cols = '';
  for (let h = min; h <= max; h++) {
    const v = parHeure[h];
    const hauteur = maxVal ? Math.round((v / maxVal) * 100) : 0;
    cols +=
      `<div class="heure-col">` +
        `<span class="heure-val">${v || ''}</span>` +
        `<div class="heure-bar ${v ? '' : 'vide'}" style="height:${v ? hauteur : 2}%"></div>` +
        `<span class="heure-label">${h}h</span>` +
      `</div>`;
  }
  return `<div class="histo-heures">${cols}</div>`;
}

/** Remplit un <select> avec les jours distincts (utilisé aussi par l'export). */
export async function remplirSelecteurJours(selectEl) {
  const jours = await getJoursDistincts();
  const aujourdhui = dateJour();
  if (!jours.includes(aujourdhui)) jours.unshift(aujourdhui);

  const avant = selectEl.value;
  selectEl.innerHTML = jours
    .map((j) => `<option value="${j}">${formatJourLisible(j)}</option>`)
    .join('');
  if (avant && jours.includes(avant)) selectEl.value = avant;
}

function formatJourLisible(jour) {
  const d = new Date(jour + 'T00:00:00');
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return jour === dateJour() ? `Aujourd'hui (${s})` : s;
}

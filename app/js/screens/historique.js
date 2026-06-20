// historique.js — Écran 3. Commandes du jour + annulation + règlement des ardoises.

import { getCommandesByJour, annulerCommande, reglerCommande, getArdoisesNonReglees } from '../db.js';
import { formatEuros, formatHeure, dateJour } from '../utils.js';

let app;
let elListe;

export function initHistorique(appRef) {
  app = appRef;
  elListe = document.getElementById('historique-liste');
}

export async function renderHistorique() {
  const aujourdhui = dateJour();
  const commandes = await getCommandesByJour(aujourdhui);

  // Ardoises non réglées des jours PRÉCÉDENTS (le multi-jours) : épinglées en haut.
  const ardoises = await getArdoisesNonReglees();
  const anciennes = ardoises.filter((c) => c.date_jour !== aujourdhui);

  elListe.innerHTML = '';

  if (anciennes.length > 0) {
    const titre = document.createElement('div');
    titre.className = 'histo-section-titre';
    titre.textContent = 'Ardoises en attente (jours précédents)';
    elListe.appendChild(titre);
    for (const c of anciennes) elListe.appendChild(creerItem(c, { avecDate: true }));

    const sep = document.createElement('div');
    sep.className = 'histo-section-titre';
    sep.textContent = "Aujourd'hui";
    elListe.appendChild(sep);
  }

  if (commandes.length === 0) {
    const vide = document.createElement('p');
    vide.className = 'vide-msg';
    vide.textContent = "Aucune commande aujourd'hui.";
    elListe.appendChild(vide);
    return;
  }

  for (const c of commandes) elListe.appendChild(creerItem(c));
}

const PAIEMENT_LABELS = { cb: 'CB', especes: 'Espèces', plus_tard: 'Plus tard' };

/** Échappe un texte libre avant insertion dans le HTML. */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatJourCourt(jour) {
  return new Date(jour + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function creerItem(c, { avecDate = false } = {}) {
  const nbArticles = c.lignes.reduce((n, l) => n + l.quantite, 0);
  const resume = c.lignes.map((l) => `${l.quantite}× ${l.nom}`).join(', ');
  const paiementLabel = PAIEMENT_LABELS[c.paiement] || c.paiement;
  const plusTard = c.paiement === 'plus_tard';
  const annulee = c.statut === 'annulee';
  const regle = plusTard && !!c.regle_le;
  const aPayer = plusTard && !regle && !annulee;

  const div = document.createElement('div');
  div.className = 'histo-item'
    + (annulee ? ' annulee' : '')
    + (plusTard ? ' plus-tard' : '')
    + (regle ? ' reglee' : '');

  const heure = (avecDate ? `${formatJourCourt(c.date_jour)} · ` : '') + formatHeure(c.horodatage);

  div.innerHTML =
    `<div class="histo-heure">${heure}</div>` +
    `<div>` +
      `<div class="histo-detail">${resume}</div>` +
      `<span class="histo-paiement${plusTard ? ' paiement-plustard' : ''}">${paiementLabel}</span> ` +
      `<span class="histo-detail">${nbArticles} art.</span>` +
      (aPayer ? ' <span class="badge-payer">À PAYER</span>' : '') +
      (regle ? ` <span class="badge-paye">PAYÉ · ${PAIEMENT_LABELS[c.regle_par] || ''}</span>` : '') +
      (annulee ? ' <span class="badge-annulee">ANNULÉE</span>' : '') +
      (c.note ? `<div class="histo-note">📝 ${escapeHtml(c.note)}</div>` : '') +
    `</div>` +
    `<div class="histo-droite">` +
      `<div class="histo-total">${formatEuros(c.total_centimes)}</div>` +
      (aPayer ? `<button class="histo-regler">Régler</button>` : '') +
      (annulee ? '' : `<button class="histo-annuler">Annuler</button>`) +
    `</div>`;

  if (aPayer) brancherReglement(div, c);
  if (!annulee) {
    div.querySelector('.histo-annuler').addEventListener('click', async () => {
      if (!confirm('Annuler cette commande ? Elle sera exclue des totaux.')) return;
      await annulerCommande(c.id);
      renderHistorique();
      app.toast('Commande annulée');
    });
  }
  return div;
}

/** « Marquer payé » → propose Espèces / CB, puis enregistre le règlement. */
function brancherReglement(div, c) {
  const btn = div.querySelector('.histo-regler');
  btn.addEventListener('click', () => {
    const choix = document.createElement('div');
    choix.className = 'histo-regler-choix';
    choix.innerHTML =
      `<span class="rc-label">Payé en :</span>` +
      `<button class="rc-btn rc-especes">Espèces</button>` +
      `<button class="rc-btn rc-cb">CB</button>` +
      `<button class="rc-btn rc-annuler" aria-label="annuler">✕</button>`;
    btn.replaceWith(choix);

    const regler = async (moyen) => {
      await reglerCommande(c.id, moyen);
      renderHistorique();
      app.toast(`Ardoise réglée (${PAIEMENT_LABELS[moyen]})`);
    };
    choix.querySelector('.rc-especes').addEventListener('click', () => regler('especes'));
    choix.querySelector('.rc-cb').addEventListener('click', () => regler('cb'));
    choix.querySelector('.rc-annuler').addEventListener('click', () => renderHistorique());
  });
}

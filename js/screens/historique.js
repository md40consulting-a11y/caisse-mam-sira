// historique.js — Écran 3. Commandes du jour courant + annulation (audit conservé).

import { getCommandesByJour, annulerCommande } from '../db.js';
import { formatEuros, formatHeure, dateJour } from '../utils.js';

let app;
let elListe;

export function initHistorique(appRef) {
  app = appRef;
  elListe = document.getElementById('historique-liste');
}

export async function renderHistorique() {
  const commandes = await getCommandesByJour(dateJour());
  elListe.innerHTML = '';

  if (commandes.length === 0) {
    elListe.innerHTML = '<p class="vide-msg">Aucune commande aujourd\'hui.</p>';
    return;
  }

  for (const c of commandes) {
    elListe.appendChild(creerItem(c));
  }
}

const PAIEMENT_LABELS = { cb: 'CB', especes: 'Espèces', plus_tard: 'Plus tard' };

/** Échappe un texte libre avant insertion dans le HTML. */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function creerItem(c) {
  const nbArticles = c.lignes.reduce((n, l) => n + l.quantite, 0);
  const resume = c.lignes.map((l) => `${l.quantite}× ${l.nom}`).join(', ');
  const paiementLabel = PAIEMENT_LABELS[c.paiement] || c.paiement;
  const plusTard = c.paiement === 'plus_tard';
  const annulee = c.statut === 'annulee';

  const div = document.createElement('div');
  div.className = 'histo-item' + (annulee ? ' annulee' : '') + (plusTard ? ' plus-tard' : '');
  div.innerHTML =
    `<div class="histo-heure">${formatHeure(c.horodatage)}</div>` +
    `<div>` +
      `<div class="histo-detail">${resume}</div>` +
      `<span class="histo-paiement${plusTard ? ' paiement-plustard' : ''}">${paiementLabel}</span> ` +
      `<span class="histo-detail">${nbArticles} art.</span>` +
      (plusTard && !annulee ? ' <span class="badge-payer">À PAYER</span>' : '') +
      (annulee ? ' <span class="badge-annulee">ANNULÉE</span>' : '') +
      (c.note ? `<div class="histo-note">📝 ${escapeHtml(c.note)}</div>` : '') +
    `</div>` +
    `<div class="histo-droite">` +
      `<div class="histo-total">${formatEuros(c.total_centimes)}</div>` +
      (annulee ? '' : `<button class="histo-annuler">Annuler</button>`) +
    `</div>`;

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

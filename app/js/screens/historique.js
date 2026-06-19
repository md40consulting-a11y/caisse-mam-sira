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

function creerItem(c) {
  const nbArticles = c.lignes.reduce((n, l) => n + l.quantite, 0);
  const resume = c.lignes.map((l) => `${l.quantite}× ${l.nom}`).join(', ');
  const paiementLabel = c.paiement === 'cb' ? 'CB' : 'Espèces';
  const annulee = c.statut === 'annulee';

  const div = document.createElement('div');
  div.className = 'histo-item' + (annulee ? ' annulee' : '');
  div.innerHTML =
    `<div class="histo-heure">${formatHeure(c.horodatage)}</div>` +
    `<div>` +
      `<div class="histo-detail">${resume}</div>` +
      `<span class="histo-paiement">${paiementLabel}</span> ` +
      `<span class="histo-detail">${nbArticles} art.</span>` +
      (annulee ? ' <span class="badge-annulee">ANNULÉE</span>' : '') +
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

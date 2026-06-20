// export.js — Écran 5. Export CSV (à plat, 1 ligne par ligne de commande) + JSON.

import { getCommandesByJour } from '../db.js';
import { csvCell, dateJour } from '../utils.js';
import { remplirSelecteurJours } from './bilan.js';

let app;
let elJour, elInfo;

export function initExport(appRef) {
  app = appRef;
  elJour = document.getElementById('export-jour');
  elInfo = document.getElementById('export-info');

  elJour.addEventListener('change', majInfo);
  document.getElementById('export-csv').addEventListener('click', exporterCsv);
  document.getElementById('export-json').addEventListener('click', exporterJson);
}

export async function renderExport() {
  await remplirSelecteurJours(elJour);
  await majInfo();
}

async function majInfo() {
  const commandes = await getCommandesByJour(elJour.value);
  const validees = commandes.filter((c) => c.statut === 'validee').length;
  elInfo.textContent =
    `${commandes.length} commande(s) — ${validees} validée(s), ` +
    `${commandes.length - validees} annulée(s).`;
}

// En-tête CSV — conforme §6 du CDC, + date_jour, paiement, statut & note en colonnes bonus.
const ENTETE_CSV = [
  'id_commande', 'horodatage', 'date_jour', 'poste', 'paiement',
  'product_id', 'nom', 'prix_unitaire', 'quantite', 'total_ligne', 'statut', 'note',
  'regle_par', 'regle_le',
];

async function exporterCsv() {
  const commandes = await getCommandesByJour(elJour.value);
  const lignes = [ENTETE_CSV.join(',')];

  for (const c of commandes) {
    for (const l of c.lignes) {
      lignes.push([
        c.id, c.horodatage, c.date_jour, c.poste, c.paiement,
        l.product_id, l.nom, l.prix_unitaire_centimes, l.quantite,
        l.prix_unitaire_centimes * l.quantite, c.statut, c.note || '',
        c.regle_par || '', c.regle_le || '',
      ].map(csvCell).join(','));
    }
  }

  // BOM UTF-8 pour qu'Excel ouvre correctement les accents.
  telecharger('﻿' + lignes.join('\r\n'), nomFichier('csv'), 'text/csv;charset=utf-8');
  app.toast('CSV exporté');
}

async function exporterJson() {
  const commandes = await getCommandesByJour(elJour.value);
  telecharger(JSON.stringify(commandes, null, 2), nomFichier('json'), 'application/json');
  app.toast('JSON exporté');
}

function nomFichier(ext) {
  const poste = (app.poste || 'poste').replace(/[^a-z0-9_-]/gi, '_');
  return `caisse_${poste}_${elJour.value || dateJour()}.${ext}`;
}

function telecharger(contenu, nom, type) {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

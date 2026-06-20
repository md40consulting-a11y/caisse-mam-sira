// cart.js — état du panier courant (en mémoire). Vidé après chaque encaissement.
// Ne touche jamais IndexedDB : la persistance se fait à la validation via db.js.

import { uuid, nowISO, dateJour } from './utils.js';

// Map product_id -> { product_id, nom, prix_unitaire_centimes, quantite }
const _lignes = new Map();

// Note libre attachée à la commande courante (ex. « Amadou, paie dimanche »).
let _note = '';

/** Définit la note de la commande courante. */
export function setNote(texte) {
  _note = String(texte || '');
}

/** Retourne la note courante. */
export function getNote() {
  return _note;
}

/** Ajoute +1 d'un produit (ou crée la ligne). */
export function ajouter(produit) {
  const existante = _lignes.get(produit.id);
  if (existante) {
    existante.quantite += 1;
  } else {
    _lignes.set(produit.id, {
      product_id: produit.id,
      nom: produit.nom,
      prix_unitaire_centimes: produit.prix_centimes,
      quantite: 1,
    });
  }
}

/** +1 sur une ligne existante. */
export function incrementer(productId) {
  const l = _lignes.get(productId);
  if (l) l.quantite += 1;
}

/** −1 sur une ligne ; supprime la ligne si la quantité tombe à 0. */
export function decrementer(productId) {
  const l = _lignes.get(productId);
  if (!l) return;
  l.quantite -= 1;
  if (l.quantite <= 0) _lignes.delete(productId);
}

/** Supprime entièrement une ligne. */
export function supprimer(productId) {
  _lignes.delete(productId);
}

/** Vide le panier (lignes + note). */
export function vider() {
  _lignes.clear();
  _note = '';
}

/** Quantité courante d'un produit (0 si absent) — pour le badge du bouton. */
export function quantiteDe(productId) {
  return _lignes.get(productId)?.quantite ?? 0;
}

/** Lignes du panier (copie, ordre d'insertion). */
export function getLignes() {
  return [..._lignes.values()].map((l) => ({ ...l }));
}

/** Nombre total d'articles. */
export function nbArticles() {
  let n = 0;
  for (const l of _lignes.values()) n += l.quantite;
  return n;
}

/** Vrai si le panier est vide. */
export function estVide() {
  return _lignes.size === 0;
}

/** Total en centimes. */
export function totalCentimes() {
  let t = 0;
  for (const l of _lignes.values()) t += l.prix_unitaire_centimes * l.quantite;
  return t;
}

/**
 * Construit l'objet commande à partir du panier courant.
 * `paiement` ∈ "cb" | "especes" | "plus_tard". Pour les espèces, fournir montant_donne_centimes.
 */
export function construireCommande({ poste, paiement, montantDonneCentimes = null }) {
  const total = totalCentimes();
  const estEspeces = paiement === 'especes';
  return {
    id: uuid(),
    horodatage: nowISO(),
    date_jour: dateJour(),
    poste,
    lignes: getLignes(),
    total_centimes: total,
    paiement,
    montant_donne_centimes: estEspeces ? montantDonneCentimes : null,
    monnaie_rendue_centimes: estEspeces ? montantDonneCentimes - total : null,
    note: _note.trim(),
    statut: 'validee',
  };
}

// db.js — seule couche qui touche IndexedDB. Stocke les commandes.
// Règle d'or : chaque commande validée est écrite immédiatement (durable).

import { nowISO } from './utils.js';

const DB_NAME = 'caisse_mam_sira';
const DB_VERSION = 1;
const STORE = 'commandes';

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('date_jour', 'date_jour', { unique: false });
        store.createIndex('horodatage', 'horodatage', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(mode) {
  return openDB().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

/** Écrit (ou remplace) une commande. Résout quand la transaction est commitée. */
export async function putCommande(commande) {
  const store = await tx('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(commande);
    req.onsuccess = () => resolve(commande);
    req.onerror = () => reject(req.error);
  });
}

/** Récupère une commande par id. */
export async function getCommande(id) {
  const store = await tx('readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/** Toutes les commandes d'un jour donné ("YYYY-MM-DD"), triées récent → ancien. */
export async function getCommandesByJour(dateJour) {
  const store = await tx('readonly');
  return new Promise((resolve, reject) => {
    const out = [];
    const idx = store.index('date_jour');
    const req = idx.openCursor(IDBKeyRange.only(dateJour));
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        out.push(cursor.value);
        cursor.continue();
      } else {
        out.sort((a, b) => (a.horodatage < b.horodatage ? 1 : -1));
        resolve(out);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Toutes les commandes (tous jours confondus). */
export async function getAllCommandes() {
  const store = await tx('readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** Liste triée des jours distincts présents en base (récent → ancien). */
export async function getJoursDistincts() {
  const all = await getAllCommandes();
  const set = new Set(all.map((c) => c.date_jour));
  return [...set].sort().reverse();
}

/** Passe une commande au statut "annulee" (conservée pour l'audit). */
export async function annulerCommande(id) {
  const commande = await getCommande(id);
  if (!commande) return null;
  commande.statut = 'annulee';
  return putCommande(commande);
}

/**
 * Marque une ardoise (paiement "plus_tard") comme réglée.
 * `moyen` ∈ "especes" | "cb" — comment le client a finalement payé.
 */
export async function reglerCommande(id, moyen) {
  const commande = await getCommande(id);
  if (!commande) return null;
  commande.regle_le = nowISO();
  commande.regle_par = moyen;
  return putCommande(commande);
}

/** Ardoises validées non encore réglées, tous jours confondus (récent → ancien). */
export async function getArdoisesNonReglees() {
  const all = await getAllCommandes();
  return all
    .filter((c) => c.statut === 'validee' && c.paiement === 'plus_tard' && !c.regle_le)
    .sort((a, b) => (a.horodatage < b.horodatage ? 1 : -1));
}

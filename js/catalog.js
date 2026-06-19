// catalog.js — catalogue produits pré-rempli (§4 du CDC), éditable, persisté en localStorage.
// Prix en centimes (entiers). Zéro configuration nécessaire au stand.

const LS_KEY = 'caisse_catalogue_v1';

/** Catalogue d'usine — copié tel quel au premier lancement. */
export const CATALOGUE_DEFAUT = [
  { id: 'canette',       nom: 'Canette',                categorie: 'boisson', prix_centimes: 150,  actif: true },
  { id: 'bissap',        nom: 'Bissap (50cl)',          categorie: 'boisson', prix_centimes: 300,  actif: true },
  { id: 'gingembre',     nom: 'Gingembre (50cl)',       categorie: 'boisson', prix_centimes: 300,  actif: true },
  { id: 'citronnade',    nom: 'Citronnade (50cl)',      categorie: 'boisson', prix_centimes: 300,  actif: true },
  { id: 'eau',           nom: 'Eau (50cl)',             categorie: 'boisson', prix_centimes: 100,  actif: true },
  { id: 'pastels',       nom: 'Pastels (8 pièces)',     categorie: 'plat',    prix_centimes: 700,  actif: true },
  { id: 'plat_jour',     nom: 'Plat du jour',           categorie: 'plat',    prix_centimes: 950,  actif: true },
  { id: 'plat_boisson',  nom: 'Plat + Boisson (25cl)',  categorie: 'plat',    prix_centimes: 1100, actif: true },
  { id: 'beignets_coco', nom: 'Beignets coco (6 pièces)', categorie: 'dessert', prix_centimes: 200, actif: true },
  { id: 'glace_bissap',  nom: 'Glace Bissap',           categorie: 'dessert', prix_centimes: 100,  actif: true },
];

/** Ordre et libellés d'affichage des catégories. */
export const CATEGORIES = [
  { id: 'boisson', label: 'Boissons' },
  { id: 'plat',    label: 'Plats' },
  { id: 'dessert', label: 'Desserts' },
];

/** Charge le catalogue depuis localStorage, en initialisant avec le défaut si vide. */
export function getCatalogue() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {
    /* localStorage corrompu : on repart du défaut */
  }
  saveCatalogue(CATALOGUE_DEFAUT);
  return structuredClone(CATALOGUE_DEFAUT);
}

/** Persiste le catalogue complet. */
export function saveCatalogue(catalogue) {
  localStorage.setItem(LS_KEY, JSON.stringify(catalogue));
}

/** Produits actifs uniquement, dans l'ordre des catégories puis du catalogue. */
export function getProduitsActifs() {
  const cat = getCatalogue();
  const ordre = new Map(CATEGORIES.map((c, i) => [c.id, i]));
  return cat
    .filter((p) => p.actif)
    .sort((a, b) => (ordre.get(a.categorie) ?? 99) - (ordre.get(b.categorie) ?? 99));
}

/** Recherche un produit par id (dans tout le catalogue, actif ou non). */
export function getProduit(id) {
  return getCatalogue().find((p) => p.id === id) || null;
}

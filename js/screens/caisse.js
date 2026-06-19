// caisse.js — Écran 1, le cœur de l'app. Grille produits + panier + encaissement.

import * as cart from '../cart.js';
import { getProduitsActifs, CATEGORIES } from '../catalog.js';
import { putCommande } from '../db.js';
import { formatEuros } from '../utils.js';

let app;
let elProduits, elPanier, elTotal;

export function initCaisse(appRef) {
  app = appRef;
  elProduits = document.getElementById('produits-zone');
  elPanier = document.getElementById('panier-lignes');
  elTotal = document.getElementById('total-caisse');

  construireGrille();

  document.getElementById('btn-annuler').addEventListener('click', () => {
    cart.vider();
    renderCaisse();
  });

  document.getElementById('btn-cb').addEventListener('click', async () => {
    if (cart.estVide()) return;
    const commande = cart.construireCommande({ poste: app.poste, paiement: 'cb' });
    await putCommande(commande);
    cart.vider();
    renderCaisse();
    app.toast('Encaissé CB ✓');
  });

  document.getElementById('btn-especes').addEventListener('click', () => {
    if (cart.estVide()) return;
    app.openEspeces();
  });
}

/** Construit la grille de boutons produits, groupés par catégorie. */
function construireGrille() {
  const produits = getProduitsActifs();
  elProduits.innerHTML = '';

  for (const cat of CATEGORIES) {
    const deLaCat = produits.filter((p) => p.categorie === cat.id);
    if (deLaCat.length === 0) continue;

    const titre = document.createElement('div');
    titre.className = 'cat-titre';
    titre.textContent = cat.label;
    elProduits.appendChild(titre);

    const grille = document.createElement('div');
    grille.className = 'produits-grille';
    for (const p of deLaCat) {
      grille.appendChild(creerBoutonProduit(p));
    }
    elProduits.appendChild(grille);
  }
}

function creerBoutonProduit(produit) {
  const btn = document.createElement('button');
  btn.className = 'produit-btn';
  btn.dataset.id = produit.id;
  btn.innerHTML =
    `<span class="produit-nom">${produit.nom}</span>` +
    `<span class="produit-prix">${formatEuros(produit.prix_centimes)}</span>` +
    `<span class="produit-badge" hidden>0</span>`;
  btn.addEventListener('click', () => {
    cart.ajouter(produit);
    renderCaisse();
  });
  return btn;
}

/** Rafraîchit badges produits, panier et total. */
export function renderCaisse() {
  // Badges sur les boutons produits
  for (const btn of elProduits.querySelectorAll('.produit-btn')) {
    const q = cart.quantiteDe(btn.dataset.id);
    const badge = btn.querySelector('.produit-badge');
    badge.textContent = q;
    badge.hidden = q === 0;
    btn.classList.toggle('actif', q > 0);
  }

  // Lignes du panier
  elPanier.innerHTML = '';
  for (const ligne of cart.getLignes()) {
    elPanier.appendChild(creerLignePanier(ligne));
  }

  elTotal.textContent = formatEuros(cart.totalCentimes());
}

function creerLignePanier(ligne) {
  const totalLigne = ligne.prix_unitaire_centimes * ligne.quantite;
  const div = document.createElement('div');
  div.className = 'panier-ligne';
  div.innerHTML =
    `<div class="pl-nom">${ligne.nom}</div>` +
    `<button class="pl-btn pl-moins" aria-label="moins">−</button>` +
    `<span class="pl-qte">${ligne.quantite}</span>` +
    `<button class="pl-btn pl-plus" aria-label="plus">+</button>` +
    `<span class="pl-total">${formatEuros(totalLigne)}</span>` +
    `<button class="pl-btn pl-suppr" aria-label="supprimer">✕</button>`;

  div.querySelector('.pl-moins').addEventListener('click', () => {
    cart.decrementer(ligne.product_id);
    renderCaisse();
  });
  div.querySelector('.pl-plus').addEventListener('click', () => {
    cart.incrementer(ligne.product_id);
    renderCaisse();
  });
  div.querySelector('.pl-suppr').addEventListener('click', () => {
    cart.supprimer(ligne.product_id);
    renderCaisse();
  });
  return div;
}

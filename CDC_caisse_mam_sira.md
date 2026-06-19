# Cahier des charges — Caisse mobile « Mam Sira Beignets »

> Fichier de contexte pour Claude Code. À placer à la racine du projet (le renommer `CLAUDE.md` ou le garder en référence). Décisions fermes en gras.

---

## 1. Contexte & objectif

Aminata vend de la nourriture sur un stand lors d'un événement (potentiellement sur plusieurs jours). Il faut une **caisse mobile** ultra-simple sur téléphone/tablette pour :

1. Prendre les commandes en quelques taps et calculer la somme due.
2. **Horodater** chaque commande validée.
3. Permettre l'**analyse des ventes** ensuite (CA, produits les plus vendus, créneaux d'affluence).
4. Aider à **prévoir les quantités à produire pour le lendemain**.

Critère n°1 : **rapidité et accessibilité de la saisie** pendant le coup de feu.

---

## 2. Contraintes structurantes (le « pourquoi » — à ne pas remettre en cause)

| Contrainte | Décision | Raison |
|---|---|---|
| Réseau du lieu = données mobiles / wifi incertain | **App offline-first.** Fonctionne à 100 % sans réseau pendant le service. | Une caisse qui dépend du réseau = ventes perdues si ça coupe. |
| 3-4 personnes, chacun prend ses commandes de son côté | **Chaque appareil est autonome.** Pas de synchro temps réel, pas de panier partagé. | Élimine toute contention/concurrence : les « 3-4 simultanés » deviennent un non-sujet par design. |
| Priorité = robuste & simple | Stack minimaliste, zéro dépendance externe au runtime, persistance locale immédiate. | Moins de pièces mobiles = moins de pannes le jour J. |
| Données analysées *après* l'événement | Le NAS sert à **distribuer** l'app et à **recevoir les exports**, pas comme point critique pendant le service. | Découple la capture (critique, temps réel) de l'analyse (à froid). |

**Conséquence directe :** ce n'est PAS une app serveur classique. C'est une **PWA (Progressive Web App) installable** qui tourne entièrement dans le navigateur du téléphone, stocke en local, et marche hors-ligne après le premier chargement.

---

## 3. Choix techniques

### Stack (ferme)
- **Front unique :** HTML + CSS + JavaScript vanilla. **Aucun framework, aucun build step, aucune dépendance chargée au runtime** (tout vendored localement → fonctionne hors-ligne).
- **Persistance :** **IndexedDB** pour les commandes (plus robuste que `localStorage` contre l'éviction mémoire sur iOS/Android). Catalogue + config du poste en `localStorage` (petit volume).
- **Offline :** **Service Worker** (cache l'app shell) + **`manifest.json`** (installable « Ajouter à l'écran d'accueil »).
- **Hébergement NAS :** conteneur `nginx:alpine` servant les fichiers statiques + exposition HTTPS publique via NPM + sous-domaine DuckDNS.

### Pourquoi pas Shiny / R ici
Shiny exige un serveur live permanent (R en backend), ne fonctionne pas hors-ligne, et son UX tactile rapide est médiocre. **R reste l'outil idéal — mais pour l'analyse à froid (§9), pas pour la capture.** Le bon outil pour chaque job.

### Pourquoi hébergement public DuckDNS (et pas Tailscale)
Un **Service Worker ne s'enregistre que dans un contexte sécurisé** (HTTPS valide). L'accès Tailscale en `http://100.x.x.x` n'est pas un contexte sécurisé → pas de PWA hors-ligne. Le couple **DuckDNS + NPM + Let's Encrypt** te donne déjà du HTTPS public valide → l'app s'installe et marche hors-ligne. Bonus : les téléphones de la famille n'ont pas besoin de Tailscale.
> Aucune donnée serveur sensible n'est exposée (tout est local à chaque appareil). Un PIN d'accès optionnel est prévu en phase 2 si besoin.

---

## 4. Catalogue produits (depuis la carte)

**Prix stockés en centimes (entiers)** — cohérent avec ta règle FamilyFinance.

| id | Nom affiché | Catégorie | Prix (centimes) |
|---|---|---|---|
| `canette` | Canette | boisson | 150 |
| `bissap` | Bissap (50cl) | boisson | 300 |
| `gingembre` | Gingembre (50cl) | boisson | 300 |
| `citronnade` | Citronnade (50cl) | boisson | 300 |
| `eau` | Eau (50cl) | boisson | 100 |
| `pastels` | Pastels (8 pièces) | plat | 700 |
| `plat_jour` | Plat du jour | plat | 950 |
| `plat_boisson` | Plat + Boisson (25cl) | plat | 1100 |
| `beignets_coco` | Beignets coco (6 pièces) | dessert | 200 |
| `glace_bissap` | Glace Bissap | dessert | 100 |

> **Décision tranchée par défaut (à confirmer) :** la ligne « Bissap / Gingembre / Citronnade (3 €) » est **éclatée en 3 boutons distincts** au même prix. Coût quasi nul, et ça permet de savoir quelle saveur produire en priorité le lendemain. Si Aminata s'en fiche → fusionner en un seul produit `boisson_50cl`.

Le catalogue doit être **éditable** dans l'app (ajout/désactivation/prix), mais pré-rempli avec ces valeurs → **zéro configuration au stand**.

---

## 5. Modèle de données

```js
// Product (catalogue)
{ id: "plat_jour", nom: "Plat du jour", categorie: "plat", prix_centimes: 950, actif: true }

// Commande (order) — écrite en IndexedDB à la validation
{
  id: "uuid",
  horodatage: "2026-06-20T12:34:56+02:00", // ISO 8601, fuseau Europe/Paris
  date_jour: "2026-06-20",                  // pour grouper par jour (multi-jours)
  poste: "Aminata",                          // nom du device, défini au 1er lancement
  lignes: [
    { product_id: "plat_jour", nom: "Plat du jour", prix_unitaire_centimes: 950, quantite: 2 }
  ],
  total_centimes: 1900,
  paiement: "especes",            // "cb" | "especes"
  montant_donne_centimes: 2000,   // renseigné seulement si paiement = "especes", sinon null
  monnaie_rendue_centimes: 100,   // calculée seulement si espèces, sinon null
  statut: "validee"               // "validee" | "annulee"
}
```

**Règle d'or robustesse :** chaque commande validée est **écrite immédiatement** en IndexedDB (pas de buffer en mémoire qui se perdrait si l'app crashe).

---

## 6. Spécifications fonctionnelles (écrans)

### Écran 0 — Premier lancement (config)
- Demander le **nom du poste** (« Aminata », « Poste 2 »…) → stocké, ne se redemande plus.
- Catalogue pré-chargé.

### Écran 1 — CAISSE (cœur de l'app, le plus soigné)
- **Grille de gros boutons produits** (nom + prix), groupés par catégorie (Boissons / Plats / Desserts).
- **Tap = +1** au panier. Le bouton montre un badge avec la quantité en cours.
- **Total courant affiché en GROS et en permanence** en haut ou en bas (zone fixe).
- Panier latéral/inférieur : liste des lignes avec **`+` / `−`** par ligne et **suppression** d'une ligne.
- **Deux boutons d'encaissement distincts** (larges, pouce-friendly) :
  - **« CB »** → encaisse **directement** (`paiement: "cb"`), écrit la commande horodatée, retour immédiat à la caisse. Pas d'écran intermédiaire.
  - **« Espèces »** → ouvre l'**écran 2** (saisie du montant donné + calcul du rendu).
- Bouton **« Annuler »** (vide le panier courant).

### Écran 2 — Encaissement espèces (uniquement si paiement = espèces)
- Affiche le total dû en gros.
- **Pavé numérique tactile** pour saisir le **montant donné** (saisie rapide, gros chiffres ; pas le clavier système).
- Affiche la **monnaie à rendre** en très gros, recalculée en temps réel.
- Raccourcis pratiques optionnels : boutons « appoint » (montant exact), 10 €, 20 €, 50 €.
- Bouton **« Encaisser »** → écrit la commande (`paiement: "especes"`, montant donné + rendu enregistrés, horodatée) + retour immédiat à la caisse, panier vidé.
- Bouton **« Retour »** pour revenir au panier sans encaisser.

### Écran 3 — Historique
- Liste des commandes du poste (jour courant), de la plus récente à la plus ancienne : heure, total, nb d'articles.
- **Annuler une commande** déjà validée → `statut = "annulee"` (on la garde pour l'audit, elle est exclue des totaux). Indispensable : les erreurs arrivent en plein rush.

### Écran 4 — Bilan (local au poste)
- **CA total** du jour (commandes validées).
- **Répartition CB / espèces** (montant + nombre de commandes) → aide au comptage du fond de caisse en fin de service.
- **Tableau par produit** : quantité vendue + CA.
- **Ventes par heure** (mini histogramme ou tableau) → repérer les créneaux d'affluence.
- Sélecteur de jour si multi-jours.

### Écran 5 — Export
- **« Exporter CSV »** et **« Exporter JSON »** → téléchargement local d'un fichier nommé `caisse_<poste>_<date>.csv`.
- CSV à plat : une ligne par **ligne de commande** (id_commande, horodatage, poste, product_id, nom, prix_unitaire, quantite, total_ligne, statut) → directement exploitable dans R/Excel.
- Bouton bien visible : encourager l'export à chaque pause.

---

## 7. UX / accessibilité (exigence n°1)

- **Mobile-first**, cibles tactiles ≥ 48px, espacées (éviter les fautes de frappe au pouce).
- Contraste élevé, gros chiffres pour le total.
- **Zéro scroll pour les produits courants** : les 10 produits tiennent sur un écran en grille.
- Feedback immédiat au tap (animation/son léger optionnel).
- Tout en **français**.
- Reprendre l'identité de la carte (bleu/crème) pour que ce soit familier — sobre, lisible avant tout.

---

## 8. Hébergement sur le NAS

```
/volume1/docker/caisse-mam-sira/
├── app/                 # fichiers statiques (index.html, app.js, sw.js, manifest.json, /vendor, /icons)
└── docker-compose.yml   # nginx:alpine servant ./app sur un port libre
```

- **Port :** prendre un port libre, ex. `8769`. ⚠️ **Vérifier d'abord avec `docker ps`** (8768 était Actual Budget dans la doc, mais Actual a été déplacé sur 8767 — port à confirmer en live).
- **NPM :** créer un Proxy Host → `caisse-mam-sira.duckdns.org` → `192.168.1.181:8769`, SSL Let's Encrypt (DNS Challenge DuckDNS, comme pour Gramps/finance-ami).
- **DuckDNS :** créer le sous-domaine `caisse-mam-sira` (gratuit), pointer vers l'IP publique.
- **NAT bbox :** déjà en place (443 externe → 8443 NPM). Rien à ajouter.

> Comme tout est local à l'appareil, le risque d'exposition publique est nul côté données. L'URL publique sert juste à charger l'app une fois.

---

## 9. Pipeline d'analyse post-événement (ton terrain : R / RStudio)

C'est ici que R brille. Chaque soir : récupérer les 3-4 CSV exportés (un par poste), les fusionner, analyser.

```r
library(tidyverse)

# 1. Lire et fusionner tous les exports du jour
ventes <- list.files("exports/", pattern = "\\.csv$", full.names = TRUE) |>
  map_df(read_csv) |>
  filter(statut == "validee")

# 2. CA total
ventes |> summarise(ca = sum(total_ligne) / 100)

# 3. Quantités par produit (= base pour prévoir la prod du lendemain)
prod <- ventes |>
  group_by(nom) |>
  summarise(qte = sum(quantite), ca = sum(total_ligne)/100) |>
  arrange(desc(qte))

# 4. Affluence par heure
ventes |>
  mutate(heure = lubridate::hour(horodatage)) |>
  count(heure, wt = quantite) |>
  ggplot(aes(heure, n)) + geom_col()
```

> Évolution naturelle : une petite **Shiny app de bilan** (lecture des CSV, tableaux + graphes interactifs) — *après* l'événement, sans contrainte temps réel. Là Shiny est parfaitement à sa place.

---

## 10. Plan de build avec Claude Code (pour ce soir)

Ordre recommandé — **mode « Accept » standard** (pas auto) sur les étapes 1-2 (structurantes), auto possible ensuite :

1. **Squelette** : `index.html` + `app.js` + modèle de données + catalogue pré-rempli + wrapper IndexedDB. → commit Git.
2. **Écran Caisse + panier + total + Valider** (le cœur). Tester à fond. → commit.
3. **Validation/monnaie + écriture horodatée IndexedDB.**
4. **Historique + annulation de commande.**
5. **Bilan local + Export CSV/JSON.**
6. **PWA** : `manifest.json` + `sw.js` (cache app shell) + icônes. Vérifier l'install + le mode avion.
7. **docker-compose nginx + conf NPM + DuckDNS.**

Commits préfixés `[claude-code]` comme d'habitude.

### ✅ Checklist de test J-1 (à faire CE SOIR, non négociable)
- [ ] Charger l'app sur **chaque téléphone** qui servira demain.
- [ ] **« Ajouter à l'écran d'accueil »** sur chacun.
- [ ] Activer le **mode avion** → vérifier que l'app s'ouvre et qu'on peut saisir + valider une commande.
- [ ] Vérifier l'**horodatage** correct (fuseau Europe/Paris).
- [ ] Passer 3-4 commandes test, vérifier l'**export CSV** et l'ouvrir dans R.
- [ ] Définir le **nom de poste** sur chaque appareil.
- [ ] Charger les téléphones à fond + prévoir une batterie externe.

---

## 11. Hors scope demain (phase 2)

- Synchro temps réel entre postes / vue consolidée live.
- Auto-backup des commandes vers le NAS (POST best-effort quand réseau dispo).
- PIN d'accès à l'app.
- Paiement carte (hors de portée en une nuit + contraintes réglementaires).
- Gestion de stock en temps réel / alertes rupture.
- Dashboard Shiny d'analyse (à faire après l'événement, à tête reposée).

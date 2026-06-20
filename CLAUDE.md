# CLAUDE.md — Caisse mobile « Mam Sira Beignets »

> Contexte de travail pour Claude Code. Le cahier des charges complet est dans
> [CDC_caisse_mam_sira.md](CDC_caisse_mam_sira.md). **Les décisions fermes du CDC ne se
> remettent pas en cause** (offline-first, PWA vanilla, IndexedDB, prix en centimes).

## En une phrase
Caisse mobile **offline-first** pour un stand de nourriture : saisie ultra-rapide des
commandes au pouce, horodatage, encaissement CB/espèces, bilan local et export CSV/JSON
pour analyse à froid sous R.

## Décisions techniques fermes
- **Front vanilla** : HTML + CSS + JS (ES modules). Aucun framework, aucun build step,
  aucune dépendance chargée au runtime.
- **Persistance** : IndexedDB pour les commandes (`db.js` est la seule couche qui y touche) ;
  catalogue + config du poste en `localStorage`.
- **Offline** : Service Worker (cache app shell) + `manifest.json` (installable).
- **Prix en centimes (entiers) partout** ; conversion en euros uniquement à l'affichage.
- **Chaque appareil est autonome** : pas de synchro, pas de backend. Le NAS sert juste à
  distribuer l'app et recevoir les exports.

## Architecture du code (`app/`)
- `js/utils.js` — format centimes→€, ISO 8601 Europe/Paris, uuid.
- `js/db.js` — wrapper IndexedDB (store `commandes`). **Écriture immédiate à la validation.**
- `js/catalog.js` — catalogue pré-rempli (§4 du CDC), éditable, persisté en localStorage.
- `js/config.js` — nom du poste (1er lancement), localStorage.
- `js/cart.js` — état du panier (ajout / + / − / suppr / total).
- `js/screens/*.js` — un module par écran (caisse, especes, historique, bilan, export).
- `js/app.js` — bootstrap, navigation entre écrans, enregistrement du Service Worker.

## Modèle de données
Voir §5 du CDC. Résumé : une `commande` = `{ id, horodatage, date_jour, poste, lignes[],
total_centimes, paiement, montant_donne_centimes, monnaie_rendue_centimes, note, statut }`.
`statut` ∈ `validee` | `annulee` (les annulées sont conservées pour l'audit, exclues des totaux).
`paiement` ∈ `cb` | `especes` | `plus_tard`. Le mode **`plus_tard`** (ardoise amis/famille) compte
dans le CA mais pas dans l'argent encaissé — affiché à part dans le bilan (« À encaisser »).
`note` = texte libre optionnel attaché à la commande (qui doit, commande spéciale…).

## Règles d'or
1. Chaque commande validée est **écrite immédiatement** en IndexedDB (pas de buffer mémoire).
2. La saisie doit rester instantanée même en plein rush : pas de réseau sur le chemin critique.
3. Tout en **français**, cibles tactiles ≥ 48px, gros total très lisible.

## Conventions
- Commits préfixés `[claude-code]`.
- Test obligatoire en **mode avion** avant l'événement (cf. checklist §10 du CDC).

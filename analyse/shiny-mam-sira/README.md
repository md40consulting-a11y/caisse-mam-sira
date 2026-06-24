# Tableau de bord Mam Sira (R Shiny)

Analyse des ventes des événements : vue d'ensemble, affluence horaire, produits, et **simulateur de ventes**.

## Lancer l'appli

Depuis R / RStudio, à la racine du projet :

```r
shiny::runApp("analyse/shiny-mam-sira")
```

(ou ouvrir `app.R` dans RStudio et cliquer **Run App**.)

Les packages manquants s'installent automatiquement au premier lancement
(`shiny, dplyr, tidyr, readr, ggplot2, lubridate, stringr, scales, DT`).

## Où mettre les données

Par défaut, l'appli lit tous les CSV du dossier **`analyse/`** (le parent de cette appli) :

- `caisse_*.csv` — exports de l'app de caisse (espèces + ardoises)
- `Rapport-ventes-*.csv` ou `*sumup*.csv` — exports SumUp (CB)

Pour **cumuler plusieurs événements**, dépose simplement les nouveaux exports dans `analyse/`
et relance l'appli — les graphiques et filtres se mettent à jour automatiquement.

Pour pointer un autre dossier :

```r
Sys.setenv(MAMSIRA_DATA = "C:/chemin/vers/mes/exports")
shiny::runApp("analyse/shiny-mam-sira")
```

## Onglets

| Onglet | Contenu |
|---|---|
| **Vue d'ensemble** | KPIs (CA, CB/espèces, plats), CA par jour & canal, répartition par famille |
| **Affluence** | CA par heure et par jour — pour caler la production sur les créneaux de rush |
| **Produits** | Top produits (qté + CA) et tableau détaillé |
| **Simulateur** | Projeter le CA en jouant sur les **prix** (glace, verre, plats, formule), la **fréquentation**, et le **nombre de formules supplémentaires préparées** (ex. modéliser les ~20 ventes loupées du samedi soir) |

## Notes

- Les prix de l'app sont en centimes (convertis en € à la lecture) ; SumUp est en € (décimale « , »).
- La normalisation fusionne les libellés des deux sources (ex. « Formule Thièb + boisson » + « Plat + Boisson » → *Formule (plat+boisson)*).
- Le simulateur, à réglages neutres (prix de référence, fréquentation ×1, 0 formule sup.), affiche un CA simulé = CA observé : c'est le contrôle de cohérence.

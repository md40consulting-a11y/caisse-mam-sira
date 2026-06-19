# analyse_ventes.R — Analyse à froid des ventes Mam Sira (post-événement).
# Place les CSV exportés (un par poste/jour) dans le dossier "exports/" puis lance ce script.
# Colonnes attendues (export CSV de l'app) :
#   id_commande, horodatage, date_jour, poste, paiement,
#   product_id, nom, prix_unitaire, quantite, total_ligne, statut
# Montants en CENTIMES.

library(tidyverse)

# 1. Lire et fusionner tous les exports, ne garder que les commandes validées --------
ventes <- list.files("exports/", pattern = "\\.csv$", full.names = TRUE) |>
  map_df(read_csv, show_col_types = FALSE) |>
  filter(statut == "validee")

# 2. Chiffre d'affaires total (en euros) ---------------------------------------------
ca_total <- ventes |> summarise(ca_euros = sum(total_ligne) / 100)
print(ca_total)

# 3. Quantités & CA par produit (base pour prévoir la prod du lendemain) --------------
prod <- ventes |>
  group_by(nom) |>
  summarise(
    qte      = sum(quantite),
    ca_euros = sum(total_ligne) / 100,
    .groups  = "drop"
  ) |>
  arrange(desc(qte))
print(prod)

# 4. Répartition CB / espèces (au niveau commande) -----------------------------------
paiements <- ventes |>
  distinct(id_commande, paiement, .keep_all = FALSE) |>
  count(paiement, name = "nb_commandes")
print(paiements)

# 5. Affluence par heure -------------------------------------------------------------
affluence <- ventes |>
  mutate(heure = lubridate::hour(lubridate::ymd_hms(horodatage))) |>
  count(heure, wt = quantite, name = "articles")

ggplot(affluence, aes(heure, articles)) +
  geom_col(fill = "#14507a") +
  labs(title = "Affluence par heure", x = "Heure", y = "Articles vendus") +
  theme_minimal()

# 6. (Optionnel) Comparaison par jour si multi-jours ---------------------------------
if (n_distinct(ventes$date_jour) > 1) {
  par_jour <- ventes |>
    group_by(date_jour) |>
    summarise(ca_euros = sum(total_ligne) / 100, .groups = "drop")
  print(par_jour)
}

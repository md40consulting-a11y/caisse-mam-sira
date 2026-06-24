# =====================================================================
#  Mam Sira — Tableau de bord d'analyse des ventes (R Shiny)
#  - Lit les exports de l'app (caisse_*.csv : espèces/ardoise)
#    et les rapports SumUp (Rapport-ventes-*.csv : CB)
#  - Vue d'ensemble, affluence horaire, produits, simulateur de ventes
#
#  Lancer :  shiny::runApp("analyse/shiny-mam-sira")
#  Déposer les nouveaux exports CSV dans le dossier pointé par DATA_DIR.
# =====================================================================

# ---- Dépendances (installe ce qui manque) ---------------------------
.pkgs <- c("shiny", "dplyr", "tidyr", "readr", "ggplot2", "lubridate",
           "stringr", "scales", "DT")
.miss <- setdiff(.pkgs, rownames(installed.packages()))
if (length(.miss)) install.packages(.miss, repos = "https://cloud.r-project.org")
suppressPackageStartupMessages(lapply(.pkgs, library, character.only = TRUE))

# Par défaut : le dossier "analyse" (parent de l'appli) contient les CSV.
DATA_DIR <- normalizePath(file.path(dirname(getwd()), ""), mustWork = FALSE)
if (!dir.exists(DATA_DIR)) DATA_DIR <- getwd()
# Permet de surcharger : Sys.setenv(MAMSIRA_DATA = "C:/.../analyse")
if (nzchar(Sys.getenv("MAMSIRA_DATA"))) DATA_DIR <- Sys.getenv("MAMSIRA_DATA")

PRIX <- list(glace = 1, verre = 1, plat_seul = 9.5, formule = 11)  # prix de référence (€)

# ---- Normalisation produits ----------------------------------------
NOM_APP <- c(
  plat_jour = "Plat seul", plat_boisson = "Formule (plat+boisson)", pastels = "Pastels (8)",
  canette = "Canette", bissap = "Bissap 50cl", gingembre = "Gingembre 50cl",
  citronnade = "Citronnade 50cl", eau = "Eau 50cl",
  beignets_coco = "Beignets coco", glace_bissap = "Glace bissap")
CAT_APP <- c(
  plat_jour = "Plats", plat_boisson = "Plats", pastels = "Plats",
  canette = "Boissons", bissap = "Boissons", gingembre = "Boissons",
  citronnade = "Boissons", eau = "Boissons",
  beignets_coco = "Desserts", glace_bissap = "Desserts")

classer_sumup <- function(desc) {
  d <- tolower(desc)
  if (str_detect(d, "formule"))            return(c("Plats", "Formule (plat+boisson)", "formule"))
  if (str_starts(d, "plat"))               return(c("Plats", "Plat seul", "plat_seul"))
  if (str_detect(d, "pastels"))            return(c("Plats", "Pastels (8)", NA))
  if (str_detect(d, "beignets"))           return(c("Desserts", "Beignets coco", NA))
  if (str_detect(d, "glace"))              return(c("Desserts", "Glace bissap", NA))
  if (str_detect(d, "verre de bissap"))    return(c("Boissons", "Verre bissap", "verre"))
  if (str_detect(d, "verre de jus"))       return(c("Boissons", "Verre gingembre", "verre"))
  if (str_detect(d, "bissap"))             return(c("Boissons", "Bissap 50cl", NA))
  if (str_detect(d, "gingembre"))          return(c("Boissons", "Gingembre 50cl", NA))
  if (str_detect(d, "citronnade 1l"))      return(c("Boissons", "Citronnade 1L", NA))
  if (str_detect(d, "citronnade"))         return(c("Boissons", "Citronnade 50cl", NA))
  if (str_detect(d, "boissons 25cl"))      return(c("Boissons", "Boisson 25cl", NA))
  if (str_detect(d, "canette"))            return(c("Boissons", "Canette", NA))
  if (str_detect(d, "eau"))                return(c("Boissons", "Eau 50cl", NA))
  c("Autre", desc, NA)
}

# ---- Chargement & fusion -------------------------------------------
charger_donnees <- function(dir = DATA_DIR) {
  res <- list()

  # 1) Exports app (espèces / ardoise)
  app_files <- list.files(dir, pattern = "^caisse_.*\\.csv$", full.names = TRUE)
  for (f in app_files) {
    d <- tryCatch(suppressWarnings(read_csv(f, show_col_types = FALSE,
                  locale = locale(encoding = "UTF-8"))), error = function(e) NULL)
    if (is.null(d) || !"statut" %in% names(d)) next
    d <- d %>% filter(statut == "validee")
    if (!nrow(d)) next
    res[[length(res) + 1]] <- tibble(
      datetime = ymd_hms(d$horodatage, quiet = TRUE),
      jour = as.character(d$date_jour),
      canal = "Espèces/Ardoise",
      produit = unname(ifelse(d$product_id %in% names(NOM_APP), NOM_APP[d$product_id], d$product_id)),
      categorie = unname(ifelse(d$product_id %in% names(CAT_APP), CAT_APP[d$product_id], "Autre")),
      qte = as.numeric(d$quantite),
      ca = as.numeric(d$total_ligne) / 100,
      tag = ifelse(d$product_id == "plat_boisson", "formule",
            ifelse(d$product_id == "plat_jour", "plat_seul", NA)))
  }

  # 2) Rapports SumUp (CB) — séparateur ; , encodage Latin1, décimale ,
  su_files <- list.files(dir, pattern = "sumup.*\\.csv$|Rapport-ventes.*\\.csv$",
                         full.names = TRUE, ignore.case = TRUE)
  for (f in su_files) {
    raw <- tryCatch(suppressWarnings(read_delim(f, delim = ";", show_col_types = FALSE,
                    locale = locale(encoding = "Latin1"), col_types = cols(.default = "c"))),
                    error = function(e) NULL)
    if (is.null(raw) || ncol(raw) < 5) next
    names(raw)[1:5] <- c("Date", "Quantite", "Description", "Prix", "Paiement")
    raw <- raw %>% filter(!is.na(Date), Date != "")
    cls <- t(sapply(raw$Description, classer_sumup))
    res[[length(res) + 1]] <- tibble(
      datetime = dmy_hm(raw$Date, quiet = TRUE),
      jour = format(dmy_hm(raw$Date, quiet = TRUE), "%Y-%m-%d"),
      canal = "CB",
      produit = cls[, 2],
      categorie = cls[, 1],
      qte = as.numeric(raw$Quantite),
      ca = as.numeric(str_replace(raw$Prix, ",", ".")),
      tag = cls[, 3])
  }

  if (!length(res)) return(tibble())
  bind_rows(res) %>%
    filter(!is.na(datetime)) %>%
    mutate(heure = hour(datetime),
           prix_unit = ifelse(qte > 0, ca / qte, NA_real_))
}

VENTES <- charger_donnees()

# =====================================================================
#  UI
# =====================================================================
ui <- fluidPage(
  tags$head(tags$style(HTML("
    body{background:#faf3e0;} .well{background:#fff;border:none;}
    h2,h3,h4{color:#14507a;} .kpi{background:#fff;border-radius:12px;padding:14px 18px;
      box-shadow:0 2px 6px rgba(0,0,0,.1);margin-bottom:10px;}
    .kpi .lab{color:#5f5e5a;font-size:13px;} .kpi .val{font-size:28px;font-weight:800;color:#14507a;}
    .kpi.ambre .val{color:#c87f1a;}"))),
  titlePanel("🥟 Mam Sira — Tableau de bord des ventes"),

  if (nrow(VENTES) == 0)
    div(style = "color:#b3402e;padding:20px;",
        strong("Aucune donnée trouvée."),
        p(paste("Déposez les exports CSV (caisse_*.csv et Rapport-ventes*.csv) dans :", DATA_DIR)))
  else
  sidebarLayout(
    sidebarPanel(width = 3,
      checkboxGroupInput("jours", "Jours analysés",
        choices = sort(unique(VENTES$jour)), selected = sort(unique(VENTES$jour))),
      checkboxGroupInput("canaux", "Canaux",
        choices = sort(unique(VENTES$canal)), selected = sort(unique(VENTES$canal))),
      hr(),
      helpText("Données :", tags$code(DATA_DIR)),
      helpText("Déposez-y les nouveaux exports puis relancez l'appli pour cumuler les événements.")
    ),
    mainPanel(width = 9,
      tabsetPanel(
        tabPanel("Vue d'ensemble",
          br(), uiOutput("kpis"),
          h4("CA par jour et par canal"), plotOutput("p_jour", height = 280),
          h4("Répartition par famille"), plotOutput("p_cat", height = 240)),
        tabPanel("Affluence",
          br(), h4("Chiffre d'affaires par heure"),
          plotOutput("p_heure", height = 380),
          helpText("Repère les créneaux de rush pour caler la production.")),
        tabPanel("Produits",
          br(), h4("Top produits"), plotOutput("p_prod", height = 420),
          h4("Détail"), DTOutput("t_prod")),
        tabPanel("Simulateur de ventes",
          br(),
          fluidRow(
            column(6,
              h4("Hypothèses de prix (€)"),
              numericInput("px_glace", "Glace bissap", PRIX$glace, 0, 5, 0.5),
              numericInput("px_verre", "Verre (bissap/gingembre)", PRIX$verre, 0, 5, 0.5),
              numericInput("px_plat", "Plat seul", PRIX$plat_seul, 0, 20, 0.5),
              numericInput("px_formule", "Formule plat+boisson", PRIX$formule, 0, 20, 0.5)),
            column(6,
              h4("Hypothèses de volume"),
              sliderInput("freq", "Fréquentation (× volume observé)", 0.5, 2, 1, 0.05),
              sliderInput("plats_sup", "Formules supplémentaires préparées",
                          0, 60, 0, 1),
              helpText("Ex. : le samedi soir, ~20 formules ont manqué."))),
          hr(),
          h4("Projection"),
          uiOutput("sim_kpis"),
          plotOutput("p_sim", height = 240))
      )
    )
  )
)

# =====================================================================
#  SERVER
# =====================================================================
server <- function(input, output, session) {

  filtre <- reactive({
    req(nrow(VENTES) > 0)
    VENTES %>% filter(jour %in% input$jours, canal %in% input$canaux)
  })

  euro <- function(x) paste0(format(round(x), big.mark = " "), " €")

  output$kpis <- renderUI({
    d <- filtre()
    ca <- sum(d$ca); cb <- sum(d$ca[d$canal == "CB"]); esp <- ca - cb
    plats <- sum(d$qte[d$categorie == "Plats" & d$tag %in% c("formule", "plat_seul")])
    fluidRow(
      column(3, div(class = "kpi", div(class = "lab", "CA total"), div(class = "val", euro(ca)))),
      column(3, div(class = "kpi", div(class = "lab", "dont CB"), div(class = "val", euro(cb)))),
      column(3, div(class = "kpi", div(class = "lab", "dont espèces/ardoise"), div(class = "val", euro(esp)))),
      column(3, div(class = "kpi ambre", div(class = "lab", "Plats vendus"), div(class = "val", round(plats))))
    )
  })

  output$p_jour <- renderPlot({
    filtre() %>% group_by(jour, canal) %>% summarise(ca = sum(ca), .groups = "drop") %>%
      ggplot(aes(jour, ca, fill = canal)) +
      geom_col(position = "stack") +
      geom_text(aes(label = euro(ca)), position = position_stack(vjust = .5), color = "white", size = 4) +
      scale_fill_manual(values = c("CB" = "#378ADD", "Espèces/Ardoise" = "#2e7d4f")) +
      labs(x = NULL, y = "CA (€)", fill = NULL) + theme_minimal(base_size = 13)
  })

  output$p_cat <- renderPlot({
    filtre() %>% group_by(categorie) %>% summarise(ca = sum(ca), .groups = "drop") %>%
      ggplot(aes(reorder(categorie, ca), ca, fill = categorie)) +
      geom_col(show.legend = FALSE) + coord_flip() +
      geom_text(aes(label = euro(ca)), hjust = -0.1, size = 4) +
      scale_fill_manual(values = c("Plats" = "#14507a", "Boissons" = "#2b6da3", "Desserts" = "#c87f1a", "Autre" = "#888")) +
      scale_y_continuous(expand = expansion(mult = c(0, .15))) +
      labs(x = NULL, y = "CA (€)") + theme_minimal(base_size = 13)
  })

  output$p_heure <- renderPlot({
    filtre() %>% group_by(jour, heure) %>% summarise(ca = sum(ca), .groups = "drop") %>%
      ggplot(aes(factor(heure), ca, fill = jour)) +
      geom_col(position = position_dodge(preserve = "single")) +
      scale_fill_brewer(palette = "Set1") +
      labs(x = "Heure", y = "CA (€)", fill = "Jour") + theme_minimal(base_size = 13)
  })

  prod_tbl <- reactive({
    filtre() %>% group_by(produit, categorie) %>%
      summarise(qte = sum(qte), ca = sum(ca), .groups = "drop") %>% arrange(desc(ca))
  })

  output$p_prod <- renderPlot({
    prod_tbl() %>% slice_max(ca, n = 12) %>%
      ggplot(aes(reorder(produit, ca), ca, fill = categorie)) +
      geom_col() + coord_flip() +
      geom_text(aes(label = paste0(round(ca), "€  (", round(qte), "u)")), hjust = -0.05, size = 3.6) +
      scale_fill_manual(values = c("Plats" = "#14507a", "Boissons" = "#2b6da3", "Desserts" = "#c87f1a", "Autre" = "#888")) +
      scale_y_continuous(expand = expansion(mult = c(0, .2))) +
      labs(x = NULL, y = "CA (€)", fill = NULL) + theme_minimal(base_size = 12)
  })

  output$t_prod <- renderDT({
    prod_tbl() %>% mutate(ca = round(ca, 1)) %>%
      datatable(rownames = FALSE, options = list(pageLength = 15, dom = "t"),
                colnames = c("Produit", "Catégorie", "Quantité", "CA (€)"))
  })

  # ---- Simulateur ----
  projection <- reactive({
    d <- filtre()
    req(nrow(d) > 0)
    px <- function(row) {
      p <- row$prix_unit
      if (!is.na(row$tag) && row$tag == "formule") return(input$px_formule)
      if (!is.na(row$tag) && row$tag == "verre")   return(input$px_verre)
      if (!is.na(row$tag) && row$tag == "plat_seul") return(input$px_plat)
      if (row$produit == "Glace bissap") return(input$px_glace)
      p
    }
    prix_sim <- mapply(function(i) px(d[i, ]), seq_len(nrow(d)))
    ca_obs <- sum(d$ca)
    ca_sim <- input$freq * sum(d$qte * prix_sim, na.rm = TRUE) +
              input$plats_sup * input$px_formule
    list(obs = ca_obs, sim = ca_sim, delta = ca_sim - ca_obs)
  })

  output$sim_kpis <- renderUI({
    p <- projection()
    pct <- if (p$obs > 0) round(100 * p$delta / p$obs, 1) else 0
    fluidRow(
      column(4, div(class = "kpi", div(class = "lab", "CA observé"), div(class = "val", euro(p$obs)))),
      column(4, div(class = "kpi ambre", div(class = "lab", "CA simulé"), div(class = "val", euro(p$sim)))),
      column(4, div(class = "kpi", div(class = "lab", "Écart"),
                    div(class = "val", paste0(ifelse(p$delta >= 0, "+", ""), euro(p$delta), " (", pct, "%)"))))
    )
  })

  output$p_sim <- renderPlot({
    p <- projection()
    data.frame(scenario = c("Observé", "Simulé"), ca = c(p$obs, p$sim)) %>%
      ggplot(aes(scenario, ca, fill = scenario)) +
      geom_col(show.legend = FALSE, width = .6) +
      geom_text(aes(label = euro(ca)), vjust = -0.4, size = 5) +
      scale_fill_manual(values = c("Observé" = "#5f5e5a", "Simulé" = "#c87f1a")) +
      scale_y_continuous(expand = expansion(mult = c(0, .15))) +
      labs(x = NULL, y = "CA (€)") + theme_minimal(base_size = 13)
  })
}

shinyApp(ui, server)

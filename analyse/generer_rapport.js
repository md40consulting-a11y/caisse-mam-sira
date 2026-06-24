const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
} = require('docx');

const BLEU = '14507A', AMBRE = 'C87F1A', CREME = 'F0E6CD', GRIS = '5F5E5A', ROUGE = 'B3402E', VERT = '2E7D4F';
const CW = 9026; // largeur de contenu A4, marges 1"

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function cell(text, w, { bold = false, fill = null, color = null, align = AlignmentType.LEFT } = {}) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text, bold, color: color || undefined })] })],
  });
}

function headerRow(labels, widths) {
  return new TableRow({
    tableHeader: true,
    children: labels.map((l, i) => cell(l, widths[i], { bold: true, fill: BLEU, color: 'FFFFFF' })),
  });
}
function row(cells, widths, opts = []) {
  return new TableRow({ children: cells.map((c, i) => cell(c, widths[i], opts[i] || {})) });
}
function makeTable(widths, rows) {
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths, rows });
}

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const P = (runs, opts = {}) => new Paragraph({ spacing: { after: 120 }, ...opts,
  children: Array.isArray(runs) ? runs : [new TextRun(runs)] });
const bullet = (t) => new Paragraph({ numbering: { reference: 'puces', level: 0 }, spacing: { after: 60 },
  children: Array.isArray(t) ? t : [new TextRun(t)] });
const spacer = () => new Paragraph({ children: [new TextRun('')] });
// ligne vierge à remplir (bord bas)
const blankLine = () => new Paragraph({ spacing: { before: 180 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA', space: 1 } },
  children: [new TextRun('')] });

// ---- Bloc témoignage réutilisable
function blocTemoignage(n) {
  const w = [2200, 6826];
  const ligneChamp = (label) => new TableRow({ children: [
    cell(label, w[0], { bold: true, fill: CREME }),
    cell('', w[1]),
  ]});
  const ligneQuestion = (q) => [
    P([new TextRun({ text: q, bold: true, color: BLEU })], { spacing: { before: 120, after: 40 } }),
    blankLine(), blankLine(),
  ];
  return [
    new Paragraph({ spacing: { before: 200, after: 80 }, children: [
      new TextRun({ text: `Témoignage n°${n}`, bold: true, color: AMBRE, size: 26 })] }),
    makeTable(w, [ligneChamp('Prénom'), ligneChamp('Rôle / poste'), ligneChamp('Jour(s) de présence')]),
    ...ligneQuestion('1. Qu’est-ce qui a bien fonctionné selon toi ?'),
    ...ligneQuestion('2. Qu’est-ce qui nous a ralentis ou posé problème ?'),
    ...ligneQuestion('3. Qu’avons-nous manqué de préparer (produits, quantités, matériel) ?'),
    ...ligneQuestion('4. Tes idées pour le prochain événement ?'),
    P([new TextRun({ text: 'Note globale de l’organisation : ', bold: true }),
       new TextRun({ text: '______ / 10', color: GRIS })], { spacing: { before: 80, after: 200 } }),
  ];
}

const doc = new Document({
  creator: 'Mam Sira',
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: BLEU, font: 'Arial' },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 25, bold: true, color: BLEU, font: 'Arial' },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: 'puces', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
  ]},
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Mam Sira Beignets — Bilan 20-21 juin 2026   |   page ', size: 16, color: GRIS }),
                 new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRIS })] })] }) },
    children: [
      // ---- Titre
      new Paragraph({ spacing: { before: 600, after: 60 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'MAM SIRA BEIGNETS', bold: true, size: 56, color: BLEU })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
        children: [new TextRun({ text: 'Bilan de l’événement', size: 40, color: AMBRE })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
        children: [new TextRun({ text: 'Stand des 20 & 21 juin 2026 — Petit-Couronne', size: 24, color: GRIS })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
        children: [new TextRun({ text: 'Document de synthèse à destination de la direction', italics: true, size: 20, color: GRIS })] }),

      // ---- 1. Synthèse
      H1('1. Synthèse'),
      P([new TextRun('Le premier stand Mam Sira sur deux jours a généré un chiffre d’affaires de '),
         new TextRun({ text: '2 193 €', bold: true }),
         new TextRun(', réparti de façon très équilibrée entre le samedi (1 115 €) et le dimanche (1 077 €). '),
         new TextRun('Les ventes par carte (SumUp) représentent '),
         new TextRun({ text: '67 % du total', bold: true }),
         new TextRun(' — le terminal de paiement est devenu un élément essentiel, et non un simple confort.')]),
      P([new TextRun('Le produit phare est sans conteste les '),
         new TextRun({ text: 'pastels', bold: true }),
         new TextRun(' : 103 paquets vendus pour 721 €, soit à eux seuls un tiers du chiffre d’affaires. '),
         new TextRun({ text: 'Principal point d’amélioration', bold: true, color: ROUGE }),
         new TextRun(' : une rupture de plats le samedi soir nous a fait perdre une vingtaine de ventes au moment le plus rentable de l’événement.')]),

      // ---- 2. Performance par jour
      H1('2. Performance par jour'),
      makeTable([3026, 2000, 2000, 2000], [
        headerRow(['Indicateur', 'Samedi 20', 'Dimanche 21', 'Total'], [3026, 2000, 2000, 2000]),
        row(['Chiffre d’affaires', '1 115,5 €', '1 077,5 €', '2 193 €'], [3026,2000,2000,2000],
            [{bold:true},{},{},{bold:true}]),
        row(['dont carte (SumUp)', '725,5 €', '742 €', '1 467,5 €'], [3026,2000,2000,2000]),
        row(['dont espèces + ardoise', '390 €', '335,5 €', '725,5 €'], [3026,2000,2000,2000]),
        row(['Part Plats', '69 %', '74 %', '71 %'], [3026,2000,2000,2000]),
      ]),
      spacer(),

      // ---- 3. Affluence
      H1('3. Affluence : quand vend-on ?'),
      P([new TextRun('Les deux journées ont des rythmes opposés : le '),
         new TextRun({ text: 'samedi se joue au dîner (19h-21h)', bold: true }),
         new TextRun(' avec un pic à ~400 €/heure, tandis que le '),
         new TextRun({ text: 'dimanche se concentre sur le déjeuner (12h) et le goûter (17h)', bold: true }),
         new TextRun('. L’après-midi du samedi est très calme.')]),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 },
        children: [new ImageRun({ type: 'png', data: fs.readFileSync('graph_ca_heure.png'),
          transformation: { width: 600, height: 280 },
          altText: { title: 'CA par heure', name: 'graph', description: 'Histogramme du CA par heure samedi et dimanche' } })] }),

      // ---- 4. Top produits
      H1('4. Produits les plus vendus (2 jours)'),
      makeTable([4526, 2250, 2250], [
        headerRow(['Produit', 'Quantité', 'CA'], [4526, 2250, 2250]),
        row(['Pastels (8 pièces) — produit star', '103', '721 €'], [4526,2250,2250], [{bold:true},{},{bold:true}]),
        row(['Formule plat + boisson', '44', '484 €'], [4526,2250,2250]),
        row(['Plat seul (thiéb, yassa, mafé)', '38', '359 €'], [4526,2250,2250]),
        row(['Beignets coco', '105', '210 €'], [4526,2250,2250]),
        row(['Bissap 50 cl', '44', '132 €'], [4526,2250,2250]),
        row(['Glace bissap', '60', '60 €'], [4526,2250,2250]),
      ]),
      spacer(),

      // ---- 5. Point critique
      H1('5. Le point critique : la rupture de plats du samedi soir'),
      P([new TextRun('Les '), new TextRun({ text: 'formules plat + boisson', bold: true }),
         new TextRun(' se sont vendues à 19h (10) et 20h (9), puis '),
         new TextRun({ text: 'plus aucune à partir de 21h', bold: true, color: ROUGE }),
         new TextRun(', alors que le stand est resté ouvert jusqu’à 22h30. Nous avons servi 19 formules ; la demande réelle était d’environ 40.')]),
      P([new TextRun({ text: 'Manque à gagner estimé : ~220 € directs', bold: true, color: ROUGE }),
         new TextRun(' (20 formules à 11 €), sans compter les desserts et boissons que ces clients auraient pris en plus. Le samedi aurait pu atteindre ~1 350 € au lieu de 1 115 €.')]),

      // ---- 6. Météo
      H1('6. Météo et impact sur les ventes'),
      P([new TextRun('Il a fait '), new TextRun({ text: 'très chaud les deux jours', bold: true }),
         new TextRun(' : 30 °C le samedi, 33 °C le dimanche. La pluie du dimanche n’est tombée que la nuit (3h-5h) : le service s’est déroulé au sec.')]),
      bullet('La chaleur a dopé la demande de boissons fraîches et de glaces (60 glaces bissap, 44 bissap 50 cl).'),
      bullet('Le creux du dimanche à 16h correspond au pic de chaleur (33 °C) qui coupe l’appétit pour les plats chauds — pas à la pluie.'),
      bullet('La douceur du samedi soir (solstice) a favorisé une forte affluence conviviale au dîner.'),

      // ---- 7 & 8 Forces / Faiblesses
      H1('7. Forces et faiblesses'),
      H2('Forces'),
      bullet('Les pastels : produit signature à fort volume et bonne marge, véritable moteur du stand.'),
      bullet('Deux journées équilibrées malgré des rythmes opposés.'),
      bullet('La formule plat + boisson fonctionne très bien, surtout au déjeuner du dimanche.'),
      bullet('Offre fraîche bien adaptée à la canicule (glaces, bissap).'),
      bullet('Encaissement carte (SumUp) fluide et majoritaire.'),
      H2('Faiblesses'),
      bullet([new TextRun({ text: 'Rupture de plats le samedi soir', bold: true }), new TextRun(' au moment le plus rentable (point n°1 à corriger).')]),
      bullet('Après-midi du samedi très calme (~65 € sur 14h-17h).'),
      bullet('Incohérences de prix (plat mafé à 9 € vs 9,50 € ; verre de boisson à 1 € qui concurrence la bouteille à 3 €).'),
      bullet('Catalogue de l’application de caisse incomplet par rapport à la vraie carte (yassa, mafé, verres, citronnade 1 L manquants).'),

      // ---- 9. Tarifs
      H1('8. Propositions d’évolution tarifaire'),
      makeTable([2400, 1300, 1300, 4026], [
        headerRow(['Produit', 'Actuel', 'Proposé', 'Pourquoi'], [2400,1300,1300,4026]),
        row(['Glace bissap', '1 €', '1,50 €', 'Très forte demande par la chaleur ; achat d’impulsion, hausse indolore.'], [2400,1300,1300,4026], [{},{},{bold:true,color:VERT},{}]),
        row(['Verre bissap / gingembre', '1 €', '1,50 € ou retrait', 'Concurrence la bouteille à 3 € pour un apport très faible.'], [2400,1300,1300,4026]),
        row(['Plats (thiéb/yassa/mafé)', '9 / 9,5 €', '9,50 € partout', 'Cohérence et rapidité d’encaissement.'], [2400,1300,1300,4026]),
        row(['Pastels', '7 €', 'Garder 7 €', 'C’est l’aimant à clients — ne pas y toucher, mais ne jamais en manquer.'], [2400,1300,1300,4026]),
        row(['Formule plat + boisson', '11 €', '11 € + tester +dessert à 12,50 €', 'Très bon ratio ; un upsell dessert capte la forte demande de beignets/glaces.'], [2400,1300,1300,4026]),
      ]),
      P([new TextRun({ text: 'Effet estimé (volumes identiques) : +50 à +70 € par événement', bold: true, color: VERT }),
         new TextRun(', sans résistance client, en ne touchant que les produits à achat d’impulsion.')], { spacing: { before: 120 } }),

      // ---- 10. Plan de production
      H1('9. Plan de production — prochain événement (Sam 14h-22h, Dim 11h-18h)'),
      makeTable([2426, 3300, 3300], [
        headerRow(['', 'Samedi (rush dîner 19h-21h)', 'Dimanche (déj. 12h + goûter 17h)'], [2426,3300,3300]),
        row(['Plats', '~70 (≈40 formules + 30 seuls), prêts AVANT 19h', '~40 (≈30 formules + 10 seuls), gros lot avant 12h + relance vers 16h'], [2426,3300,3300], [{bold:true},{},{}]),
        row(['Pastels', '~55 (ne jamais être en rupture)', '~55'], [2426,3300,3300]),
        row(['Beignets coco', '~55', '~55'], [2426,3300,3300]),
        row(['Glace bissap', '~30', '~40+ si forte chaleur'], [2426,3300,3300]),
        row(['Boissons fraîches', 'Stock large', 'Renforcé si forte chaleur'], [2426,3300,3300]),
        row(['Fond de caisse', 'Monnaie pour ~300 € d’espèces', 'Idem'], [2426,3300,3300]),
      ]),
      spacer(),
      P([new TextRun({ text: 'Règle d’or : ', bold: true }),
         new TextRun('le samedi se joue entre 19h et 21h — avoir le gros de la production de plats prête dès 18h30, et prévoir deux fois plus de formules que prévu pour ce créneau.')]),

      // ---- 11. Témoignages
      new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [new TextRun('10. Recueil des témoignages de l’équipe')] }),
      P([new TextRun('Cette section est à remplir par chaque membre de l’équipe ayant participé au stand. Leurs retours de terrain complètent les chiffres et nourrissent l’organisation du prochain événement.')], { spacing: { after: 200 } }),
      ...blocTemoignage(1),
      ...blocTemoignage(2),
      ...blocTemoignage(3),
      ...blocTemoignage(4),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('Bilan_Mam_Sira_20-21_juin_2026.docx', buf);
  console.log('DOCX écrit :', buf.length, 'octets');
});

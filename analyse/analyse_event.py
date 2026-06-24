# -*- coding: utf-8 -*-
"""Agrège les ventes Mam Sira (app espèces/ardoise + SumUp CB) sur les 2 jours."""
import csv, glob, os, re
from collections import defaultdict

DOSSIER = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- structures
# clé = (jour, categorie, produit) -> {qte, ca_euros}
ventes = []   # liste de dict: jour, heure, canal, produit, categorie, qte, ca

# ---------------------------------------------------------------- 1) APP (espèces + ardoise)
def classe_app(pid):
    plats = {'plat_jour', 'plat_boisson', 'pastels'}
    boissons = {'canette','bissap','gingembre','citronnade','eau'}
    desserts = {'beignets_coco','glace_bissap'}
    if pid in plats: return 'Plats'
    if pid in boissons: return 'Boissons'
    if pid in desserts: return 'Desserts'
    return 'Autre'

NOM_APP = {
 'plat_jour':'Plat du jour','plat_boisson':'Plat + Boisson','pastels':'Pastels (8)',
 'canette':'Canette','bissap':'Bissap 50cl','gingembre':'Gingembre 50cl',
 'citronnade':'Citronnade 50cl','eau':'Eau 50cl','beignets_coco':'Beignets coco',
 'glace_bissap':'Glace bissap'}

for f in glob.glob(os.path.join(DOSSIER, 'caisse_*.csv')):
    with open(f, encoding='utf-8-sig') as fh:
        for r in csv.DictReader(fh):
            if r.get('statut') != 'validee': continue
            jour = r['date_jour']
            heure = int(r['horodatage'][11:13])
            pid = r['product_id']
            qte = int(r['quantite'])
            ca = int(r['total_ligne'])/100.0
            ventes.append(dict(jour=jour, heure=heure, canal='Espèces/Ardoise',
                               produit=NOM_APP.get(pid,pid), categorie=classe_app(pid),
                               qte=qte, ca=ca, est_plat_boisson=(pid=='plat_boisson'),
                               est_plat_seul=(pid=='plat_jour'),
                               est_formule=(pid=='plat_boisson')))

# ---------------------------------------------------------------- 2) SUMUP (CB)
def classe_sumup(desc):
    d = desc.lower()
    if 'formule' in d:            return ('Plats','Formule (plat+boisson)', 'formule')
    if d.startswith('plat'):      return ('Plats','Plat seul', 'plat_seul')
    if 'pastels' in d:            return ('Plats','Pastels (8)', None)
    if 'beignets' in d:           return ('Desserts','Beignets coco', None)
    if 'glace' in d:              return ('Desserts','Glace bissap', None)
    if 'verre de bissap' in d:    return ('Boissons','Verre bissap', None)
    if 'verre de jus' in d:       return ('Boissons','Verre gingembre', None)
    if 'bissap' in d:             return ('Boissons','Bissap 50cl', None)
    if 'gingembre' in d:          return ('Boissons','Gingembre 50cl', None)
    if 'citronnade 1l' in d:      return ('Boissons','Citronnade 1L', None)
    if 'citronnade' in d:         return ('Boissons','Citronnade 50cl', None)
    if 'boissons 25cl' in d:      return ('Boissons','Boisson 25cl seule', None)
    if 'canette' in d:            return ('Boissons','Canette', None)
    if 'eau' in d:                return ('Boissons','Eau 50cl', None)
    return ('Autre', desc, None)

sumup = os.path.join(DOSSIER, 'Rapport-ventes-2026-06-20_2026-06-21_sumup_simplifie_cb.csv')
with open(sumup, encoding='cp1252') as fh:
    for r in csv.reader(fh, delimiter=';'):
        if not r or r[0].startswith('Date'): continue
        dt, qte, desc, prix, paie = r[0], r[1], r[2], r[3], r[4]
        jour = '2026-06-' + dt[0:2] if dt[3:5]=='06' else None
        jour = {'20':'2026-06-20','21':'2026-06-21'}[dt[0:2]]
        heure = int(dt[11:13])
        qte = int(qte); ca = float(prix.replace(',', '.'))
        cat, nom, tag = classe_sumup(desc)
        ventes.append(dict(jour=jour, heure=heure, canal='CB', produit=nom, categorie=cat,
                           qte=qte, ca=ca, est_plat_boisson=(tag=='formule'),
                           est_plat_seul=(tag=='plat_seul'), est_formule=(tag=='formule')))

# ---------------------------------------------------------------- AGRÉGATS
def somme(rows, champ='ca'): return round(sum(r[champ] for r in rows), 2)

print('='*64)
print('CA GLOBAL :', somme(ventes), '€   (', len(ventes), 'lignes )')
for jour in ['2026-06-20','2026-06-21']:
    rj = [r for r in ventes if r['jour']==jour]
    cb = [r for r in rj if r['canal']=='CB']; esp=[r for r in rj if r['canal']!='CB']
    print(f"\n--- {jour} : CA {somme(rj)} €  | CB {somme(cb)} €  | Espèces/Ardoise {somme(esp)} €")
    # par catégorie
    cats = defaultdict(float)
    for r in rj: cats[r['categorie']] += r['ca']
    for c,v in sorted(cats.items(), key=lambda x:-x[1]):
        print(f"     {c:10s} {round(v,2):>8} €")

print('\n'+'='*64)
print('CA PAR CANAL (2 jours) :')
for canal in ['CB','Espèces/Ardoise']:
    print(f"   {canal:18s} {somme([r for r in ventes if r['canal']==canal]):>9} €")

# ---------------------------------------------------------------- PLATS : focus
print('\n'+'='*64)
print('PLATS (plat seul + formule plat+boisson) par jour & heure :')
for jour in ['2026-06-20','2026-06-21']:
    print(f"\n  {jour}")
    print("   h  | plat seul | formule(plat+boisson) | total plats")
    for h in range(11,23):
        rs = [r for r in ventes if r['jour']==jour and r['heure']==h]
        ps = sum(r['qte'] for r in rs if r['est_plat_seul'])
        pf = sum(r['qte'] for r in rs if r['est_formule'])
        if ps or pf:
            print(f"   {h:2d}h | {ps:9d} | {pf:21d} | {ps+pf}")
    tot_ps = sum(r['qte'] for r in ventes if r['jour']==jour and r['est_plat_seul'])
    tot_pf = sum(r['qte'] for r in ventes if r['jour']==jour and r['est_formule'])
    print(f"   TOTAL plat seul={tot_ps}  formule={tot_pf}  -> plats={tot_ps+tot_pf}")

# ---------------------------------------------------------------- AFFLUENCE (CA/heure)
print('\n'+'='*64)
print('AFFLUENCE — CA par heure (€) :')
for jour in ['2026-06-20','2026-06-21']:
    print(f"\n  {jour}")
    for h in range(11,23):
        v = somme([r for r in ventes if r['jour']==jour and r['heure']==h])
        if v:
            bar = '#'*int(v/10)
            print(f"   {h:2d}h {v:7.1f} € {bar}")

# ---------------------------------------------------------------- TOP PRODUITS
print('\n'+'='*64)
print('TOP PRODUITS (qté, 2 jours) :')
prod = defaultdict(lambda:[0,0.0])
for r in ventes:
    prod[r['produit']][0]+=r['qte']; prod[r['produit']][1]+=r['ca']
for nom,(q,ca) in sorted(prod.items(), key=lambda x:-x[1][0]):
    print(f"   {nom:24s} qté {q:4d}   CA {round(ca,1):>7} €")

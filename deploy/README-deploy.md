# Déploiement sur le NAS — Caisse Mam Sira

Cible : conteneur `nginx:alpine` servant les fichiers statiques de `../app`, exposé en
HTTPS public via Nginx Proxy Manager (NPM) + sous-domaine DuckDNS. **Le HTTPS public est
indispensable** : un Service Worker ne s'enregistre qu'en contexte sécurisé (sinon pas de
PWA hors-ligne).

## Arborescence sur le NAS
```
/volume1/docker/caisse-mam-sira/
├── app/                  # copie du dossier app/ (index.html, js/, css/, sw.js, manifest.json, icons/)
├── docker-compose.yml
└── nginx.conf
```

## 1. Choisir le port
Le compose utilise `8769:80`. **Avant de lancer**, vérifier qu'il est libre :
```bash
docker ps --format '{{.Names}} -> {{.Ports}}' | grep 8769 || echo "8769 libre"
```
(8768 = Actual Budget dans la doc ; Actual a été déplacé sur 8767 → à confirmer en live.)
Si occupé, changer le port dans `docker-compose.yml` **et** dans le Proxy Host NPM.

## 2. Lancer le conteneur
```bash
cd /volume1/docker/caisse-mam-sira
docker compose up -d
docker compose logs -f   # vérifier le démarrage
```
Test local : `http://192.168.1.181:8769` doit afficher la caisse (l'écran de config au 1er accès).

## 3. DuckDNS
Créer le sous-domaine `caisse-mam-sira` (gratuit), pointer vers l'IP publique de la bbox.

## 4. Nginx Proxy Manager
Créer un **Proxy Host** :
- Domaine : `caisse-mam-sira.duckdns.org`
- Forward : `192.168.1.181` port `8769`, scheme `http`
- SSL : demander un certificat Let's Encrypt (DNS Challenge DuckDNS, comme Gramps/finance-ami)
- Cocher **Force SSL** et **HTTP/2**

## 5. NAT bbox
Déjà en place (443 externe → 8443 NPM). Rien à ajouter.

## 6. Vérification finale (depuis un téléphone)
1. Ouvrir `https://caisse-mam-sira.duckdns.org` → cadenas valide.
2. « Ajouter à l'écran d'accueil ».
3. Activer le **mode avion**, rouvrir l'app → elle doit s'ouvrir et permettre de saisir +
   valider une commande hors-ligne.

## Mettre à jour l'app plus tard
Remplacer le contenu de `app/`, puis **incrémenter `CACHE`** dans `app/sw.js`
(`caisse-mam-sira-v1` → `-v2`) pour forcer le rafraîchissement du cache sur les appareils.
Le conteneur n'a pas besoin d'être redémarré (volume monté en lecture seule).

# BIKA — commande à emporter

Mode d'emploi pour Seb. Tout est en français ici ; l'application, elle, parle portugais, anglais et français.

---

## 1. Ce que c'est

Un petit site pour téléphone. Le client regarde la carte, remplit son sac, donne son prénom, choisit une heure et son mode de paiement. WhatsApp s'ouvre alors avec la commande déjà rédigée en portugais, il appuie sur Envoyer.

La commande arrive sur ton WhatsApp. Tu réponds 👍, tu prépares, tu écris le prénom et le code sur le sac. Le client paie sur place, au comptoir ou au terminal que tu apportes au salon.

Aucun compte client, aucun cookie. Le prénom et le NIF du client ne quittent son téléphone que dans le message WhatsApp qu'il t'envoie.

---

## 2. Ce qu'il faut faire avant d'ouvrir

### a) Ton numéro WhatsApp, et l'équipe qui voit les commandes

Dans `data/config.json`, `whatsapp_number` est le numéro qui reçoit les commandes (aujourd'hui +351 918 880 291).

Tant que ce numéro n'est pas rempli, le site fonctionne en **mode vitrine** : la carte, les horaires et l'adresse s'affichent, mais on ne peut pas commander. C'est volontaire, tu peux publier le lien avant d'être prêt.

Conseil : prends un numéro dédié avec **WhatsApp Business** plutôt que ton numéro personnel. Tu y gagnes les réponses rapides et le message d'absence, et ton équipe ne voit pas tes conversations privées.

**Pour que l'équipe voie les commandes** (gratuit, 20 minutes) :

1. Le téléphone qui porte le numéro reste l'appareil principal. Le plus simple : un téléphone BIKA qui reste au café, branché, avec des données mobiles.
2. Au comptoir, prends une tablette Android, un vieux téléphone Android ou le PC du café, et installe **WhatsApp Business** (sur PC : l'appli WhatsApp pour Windows). Pas d'iPad : WhatsApp Business n'existe pas sur iPad.
3. Sur l'appareil du comptoir, ouvre l'appli : un QR code s'affiche. Sur un téléphone, passe d'abord par le menu › « Associar como dispositivo complementar » (*Link as companion device*).
4. Sur le téléphone principal : menu ⋮ (Android) ou Definições (iPhone) › **Dispositivos associados** › Associar um dispositivo, puis scanne le QR code.

Les deux appareils affichent alors les mêmes conversations. Tu peux relier jusqu'à 4 appareils sans rien payer.

Ce qu'il faut savoir :

- L'appareil du comptoir continue de marcher quand le téléphone principal est éteint. Mais si WhatsApp Business n'est pas ouvert sur le téléphone principal pendant **14 jours**, tous les appareils reliés se déconnectent.
- Les appels normaux et les SMS n'arrivent que sur le téléphone qui a la carte SIM.
- C'est l'appareil du comptoir qui doit sonner. Sur Android, sors WhatsApp Business de l'optimisation de batterie. Évite WhatsApp Web dans un navigateur : il ne sonne plus dès que l'onglet est fermé.
- Ne coupe jamais le son d'une conversation client : le couper sur le téléphone le coupe aussi sur le PC.
- **N'archive jamais la conversation d'un client.** Une conversation archivée reste cachée et muette quand le même client recommande.
- Le jour où quelqu'un quitte l'équipe, retire son appareil dans Dispositivos associados.

Avant le premier service, teste en 10 minutes avec un autre téléphone : téléphone principal éteint, écran du comptoir verrouillé, envoie une commande. L'appareil du comptoir doit sonner. Tape ensuite `/` dans une conversation pour vérifier que les réponses rapides y apparaissent.

Le protocole du comptoir, en portugais pour l'équipe, est dans `BALCAO.md`.

### b) Tes horaires réels

Toujours dans `data/config.json`, section `hours`. Un jour fermé s'écrit `[]`. Une pause déjeuner s'écrit avec deux périodes :

```json
"mon": [["08:00", "14:00"], ["16:00", "19:00"]]
```

Aujourd'hui : du lundi au samedi de 8h à 15h, fermé le dimanche. Ces horaires sont aussi les heures de retrait. Le client peut commander à toute heure, même la nuit, mais toujours pour un créneau pendant ces horaires. Le dernier créneau tombe 10 minutes avant la fermeture, donc à 14:50 (`last_order_minutes_before_close`).

### c) Vérifier

Ouvre `https://pedidos.bika.pt/check` (avant que le domaine soit branché : `….workers.dev/check`). Il te dit en vert si tout va bien, en rouge la ligne exactement fautive, et t'affiche les créneaux qui seraient proposés maintenant.

### d) Retirer le code de test

Avant d'ouvrir au public, dans la section `discounts` de `data/config.json`, supprime la ligne du code `TESTE10`. Sinon n'importe qui obtient 10 % de réduction.

La page `check.html` te le rappelle tant que le code de test est actif.

---

## 3. Modifier la carte au quotidien

Tout est dans `data/menu.json`. Tu n'as jamais besoin de toucher au code.

| Ce que tu veux faire | Ce que tu modifies |
|---|---|
| Changer un prix | `"price": 6.9` — un point, pas une virgule, jamais de guillemets autour du nombre |
| Changer le prix d'une option (lait végétal, topping, batata-doce…) | En haut du fichier, section `modifiers`. Mets aussi à jour la phrase sous la catégorie (`tagline`) : `check.html` te prévient si elle ne correspond plus. |
| Proposer une option sur un article | Ajoute son code dans la liste `"modifiers"` de l'article, par exemple `["plant_milk", "extra_shot"]` |
| Allergènes d'une option | Dans `modifiers`, `"allergens": [1, 6]`. Ils s'ajoutent à la ligne « Contém » quand le client coche l'option. |
| Quente ou gelado, parfum, soda… | Le bloc `"choice"` de l'article : le client en choisit un, sans supplément sauf si tu mets un `price` |
| Marquer un article ou une catégorie | `"tags": ["new"]` (Novo), `["hot"]` (♨), `["cold"]` (❄), `["veggie"]`. Sur une catégorie, le badge s'affiche à côté de son titre. |
| Épuisé aujourd'hui | Dans `config.json` : `"sold_out_today": { "date": "2026-09-09", "item_ids": ["crolado"] }`. Se désactive tout seul demain. |
| Épuisé pour un moment | Dans `menu.json`, ajoute `"available": false` à l'article |
| Préparer une nouveauté sans la publier | `"hidden": true` sur l'article. Tu enlèves la ligne le jour du lancement. |
| Couper les commandes ce matin | Dans `config.json` : `"paused": true` |
| Commandes le soir pour le lendemain | Dans `config.json` : `"allow_preorder_next_day": true` (oui) ou `false` (seulement le jour même) |
| Dernier créneau | `"last_order_minutes_before_close": 10` = 10 min avant la fermeture |
| Fermer un jour | Dans `closures` : `["2026-12-25"]` |
| Afficher un message en haut | `announcement` dans les trois langues |

Après chaque modification : ouvre `https://pedidos.bika.pt/check`. Si c'est vert, c'est en ligne.

**Ne touche pas** à `app.js`, `i18n.js`, `sw.js`, `_headers`, `index.html`, `salao.html`.

---

## 4. Le paiement

**Aucun frais, aucun prestataire, rien à configurer.**

Le client choisit dans l'appli comment il compte payer : espèces, carte ou Multibanco, ou MB WAY. Ce choix n'est qu'une indication, il apparaît dans le message WhatsApp que tu reçois. Rien n'est débité en ligne.

Le règlement se fait sur place :

- **À emporter** : au comptoir, comme d'habitude.
- **Au salon** : tu apportes le terminal en livrant la commande. Le client paie devant toi, ou en espèces.

Le message te dit à l'avance ce qu'il a choisi, donc tu sais s'il faut emporter le terminal ou non.

```
*SALÃO 10:35 · Ana · U-17*

1× Cheese & Ham

Total: 6,50 € · Cartão
```

### Codes de réduction

Tu crées les codes dans `data/config.json`, section `discounts`. Un code tient sur une ligne :

```json
{ "code": "BEMVINDO", "type": "amount", "value": 1, "min_order": 5, "active": true }
```

| Champ | Ce que ça fait |
|---|---|
| `code` | Ce que le client tape. Majuscules ou minuscules, peu importe. |
| `type` | `percent` pour un pourcentage, `amount` pour un montant en euros |
| `value` | `10` pour 10 %, ou `1` pour 1,00 € |
| `min_order` | Commande minimum en euros, facultatif |
| `valid_from`, `valid_until` | Début et fin, au format `2026-12-31`, facultatifs |
| `service` | `all`, `takeaway` ou `salon`, pour réserver un code au salon par exemple |
| `max_discount` | Plafond en euros pour un pourcentage, facultatif |
| `active` | `false` pour couper un code sans le supprimer |

Le client voit la remise et le nouveau total dans son panier. Ton message WhatsApp affiche le sous-total, le code et le montant de la remise. C'est toi qui l'appliques à l'encaissement.

```
Subtotal: 12,00 €
Desconto TESTE10 (-10 %): -1,20 €
Total: 10,80 € · Cartão
NIF: 123456789
```

Deux limites, parce que le site n'a pas de serveur :

- **Les codes sont lisibles** par quelqu'un qui ouvrirait le fichier de réglages dans son navigateur. Pour un code promo de café c'est acceptable, puisque tu vois chaque code passer dans le message avant d'encaisser.
- **Un code ne peut pas être limité à une seule utilisation par client.** Pour une offre ponctuelle, mets une date de fin courte.

### NIF sur la facture

Le client peut ajouter son NIF, dans un champ replié sous « Queres fatura com NIF? ». L'appli vérifie les 9 chiffres avec le contrôle officiel portugais : une faute de frappe est refusée avant l'envoi. Le NIF apparaît en bas du message, tu le saisis sur la facture. Il reste mémorisé sur le téléphone du client pour sa prochaine commande.

### Pourquoi pas de paiement en ligne

J'avais préparé une intégration Stripe, tu as choisi de ne pas la garder, et c'est le bon calcul. Un prestataire en ligne prélève une commission sur chaque commande, entre 0,70 % et 1,5 % plus une part fixe de 0,07 € à 0,25 €. Sur un café à 1,50 €, la part fixe seule peut représenter 17 % du ticket.

Ton terminal existant ne te coûte rien de plus que ce que tu paies déjà. Le code de paiement en ligne a été retiré, l'appli n'a plus aucune dépendance ni fonction serveur.

### Si un jour tu changes d'avis

Deux prestataires couvrent Apple Pay et MB WAY :

| | Frais MB WAY | Frais carte |
|---|---|---|
| ifthenpay (portugais) | 0,70 % + 0,07 € | 1,5 % + 0,20 € |
| Stripe | 1,5 % + 0,25 € | 1,5 % + 0,25 € |

Les deux exigent un hébergement avec fonctions serveur et un compte à ton nom avec IBAN.

---

## 5. Mettre le site en ligne (Cloudflare Workers)

L'app sera à l'adresse **https://pedidos.bika.pt**, hébergée sur ton compte Cloudflare sous forme de **Worker**. Ce Worker ne fait que servir des fichiers : les visites sont illimitées et ne coûtent rien de plus que ton abonnement.

Compte une heure, plus jusqu'à 24 heures d'attente pour le domaine. Dans l'ordre :

1. **GitHub** range les fichiers. C'est ce qui te permet de modifier la carte depuis ton téléphone.
2. **Cloudflare Workers** prend les fichiers sur GitHub et les met en ligne.
3. **Le DNS de bika.pt passe de one.com à Cloudflare.** C'est obligatoire pour qu'un Worker utilise `pedidos.bika.pt`.
4. **Cloudflare branche `pedidos.bika.pt`** sur le Worker, tout seul.

Les comptes, les mots de passe et les autorisations, c'est toi qui les crées et qui les valides.

### Étape 1 — Ranger les fichiers sur GitHub (15 min)

1. **github.com** › **+** › **New repository**. Nom `bika-app`, visibilité **Private**, rien d'autre. **Create repository**.
2. Clique le lien **uploading an existing file**.
3. Sur ton PC, ouvre `BIKA_app`, sélectionne tout ce qu'il contient (Ctrl+A) et glisse-le dans la page. Glisse le **contenu**, pas le dossier : `index.html` doit être tout en haut du dépôt.
4. **Commit changes**.

Vérifie que `wrangler.jsonc` et `.assetsignore` sont bien dans le dépôt : ce sont eux qui disent à Cloudflare quoi publier.

### Étape 2 — Créer le Worker (10 min)

1. **dash.cloudflare.com** › **Workers & Pages** › **Create application** › importer un dépôt GitHub › choisis ton dépôt.
2. Remplis :

| Champ | Ce que tu mets |
|---|---|
| Project name | `bika-pedidos`, exactement : c'est le nom écrit dans `wrangler.jsonc` |
| Build command | rien |
| Deploy command | `npx wrangler deploy` (déjà rempli) |
| Advanced settings › Non-production branch deploy command | `npx wrangler versions upload` (déjà rempli) |
| Advanced settings › Path | `/` |
| API token | **Create new token** si Cloudflare le propose, sinon celui déjà choisi |
| Variable name / value | rien |

3. **Deploy**. Une à deux minutes plus tard : **Success**, et une adresse technique en `….workers.dev`.

**Teste sur ton téléphone**, avec l'adresse `….workers.dev` :

- l'adresse seule : la carte s'affiche ;
- `/salao` : la version salon, « Café ao teu lugar. » ;
- `/check` : tout est vert, sauf l'avertissement sur `TESTE10` ;
- une vraie commande : elle doit arriver sur le WhatsApp de la BIKA.

### Étape 3 — Confier le DNS de bika.pt à Cloudflare (20 min, puis attente)

Le domaine reste chez one.com : c'est toujours là que tu le renouvelles. Seul son annuaire (le DNS) passe chez Cloudflare. Ton site `bika.pt` et tes e-mails continuent de marcher, **à condition de recopier toutes les lignes**.

**Tes e-mails passent par Google.** Ces lignes doivent se retrouver à l'identique chez Cloudflare, sinon les e-mails @bika.pt s'arrêtent :

| Type | Nom | Valeur |
|---|---|---|
| MX | `@` (bika.pt) | `smtp.google.com`, priorité `1` |
| TXT | `@` (bika.pt) | `v=spf1 include:_spf.google.com include:_custspf.one.com ~all` |
| TXT | `google._domainkey` | la longue clé qui commence par `v=DKIM1; k=rsa; p=` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:ola@bika.pt` |
| A | `@` (bika.pt) | `46.30.211.38` |
| A | `www` | `46.30.211.38` |

1. **Chez one.com, d'abord** : fais une capture d'écran de toute la liste Réglages DNS › Enregistrements DNS.
2. **Sur Cloudflare** : page d'accueil du compte › **Add a domain** (ou « Onboard a domain ») › `bika.pt` › recherche automatique des enregistrements DNS › plan **Free**.
3. Cloudflare affiche les lignes qu'il a trouvées. Compare avec ta capture et avec le tableau ci-dessus, et ajoute ce qui manque (**Add record**). La clé DKIM est souvent oubliée : vérifie-la. Mets toutes ces lignes en nuage gris (**DNS only**).
4. Cloudflare te donne **deux serveurs de noms**, du type `xxx.ns.cloudflare.com`.
5. **Chez one.com** : dans les réglages DNS du domaine, partie serveurs de noms, choisis tes propres serveurs de noms et colle les deux de Cloudflare. Enregistre.
6. **Attends** : de quelques heures à 24 heures. Cloudflare t'envoie un e-mail quand bika.pt est **Active**.

À partir de là, toute modification DNS de bika.pt se fait dans Cloudflare › bika.pt › **DNS**, plus chez one.com.

### Étape 4 — Brancher pedidos.bika.pt (5 min)

Quand bika.pt est **Active** sur Cloudflare : Workers & Pages › `bika-pedidos` › **Settings** › **Domains & Routes** › **Add** › **Custom domain** › `pedidos.bika.pt` › **Add**.

Cloudflare crée la ligne DNS et le cadenas HTTPS tout seul, en quelques minutes. Rien à faire chez one.com.

### Étape 5 — Avant d'ouvrir au public

1. Supprime le code `TESTE10` (§2 d).
2. Vérifie `"debug": false` dans `config.json`.
3. Ouvre `https://pedidos.bika.pt/check` : tout est vert.
4. Passe une commande depuis un téléphone qui n'est pas celui de la BIKA. La tablette du comptoir doit sonner (§2 a).
5. Envoie un e-mail à ton adresse @bika.pt depuis ton Gmail pour vérifier qu'il arrive toujours.
6. Imprime les QR codes (plus bas, et §6 pour le salon).
7. Si tu avais créé un projet Netlify ou Cloudflare Pages pour essayer, supprime-le : il ne doit pas rester deux cartes en ligne.

### Modifier la carte depuis ton téléphone

1. Ouvre **github.com** (ou l'appli GitHub), ton dépôt.
2. `data` › `menu.json` (ou `config.json`) › l'icône crayon ✏️.
3. Fais ta modification › **Commit changes…** › **Commit changes**.
4. Cloudflare publie tout seul en une à deux minutes. Tu le vois dans Workers & Pages › `bika-pedidos` › **Deployments**.
5. Ouvre `https://pedidos.bika.pt/check` : si c'est vert, c'est en ligne.

### Revenir en arrière en 30 secondes

Une modification a cassé quelque chose ? Workers & Pages › `bika-pedidos` › **Deployments** › sur la dernière version qui marchait : **⋯** › **Rollback**. Le site redevient comme avant, tout de suite. Corrige ensuite le fichier sur GitHub ; la correction se publie comme d'habitude.

### Bon à savoir

- Cloudflare enlève le `.html` des adresses : `/salao.html` devient `/salao`, `/check.html` devient `/check`. Les anciens liens restent valables, ils sont redirigés.
- Ce mode d'emploi, `BALCAO.md` et les fichiers techniques ne sont **pas** publiés : la liste est dans `.assetsignore`. Le reste du dépôt, oui.
- L'adresse technique `….workers.dev` reste accessible. Ne l'imprime nulle part : utilise toujours `pedidos.bika.pt`.

### Le QR code

Fabrique-le sur n'importe quel générateur gratuit, avec l'adresse complète :

- Pour le comptoir : `https://pedidos.bika.pt`
- Pour les cartes dans les Airbnb : `https://pedidos.bika.pt/?lang=en`. La page s'ouvre directement en anglais.
- Pour le salon de coiffure : un QR à part, voir §6.

Imprime en A6, plastifie, pose-le sur le comptoir.

### Récapitulatif

| Ce que tu veux | Ce que tu fais |
|---|---|
| Changer un prix, un épuisé, couper les commandes | GitHub › le fichier › ✏️ › Commit changes, puis `/check` |
| Savoir si c'est en ligne | Cloudflare › `bika-pedidos` › Deployments : « Success » |
| Annuler une erreur | Cloudflare › `bika-pedidos` › Deployments › ⋯ › Rollback |
| Toucher au DNS de bika.pt (e-mails, site) | Cloudflare › bika.pt › DNS |

---

## 6. La version pour le salon de coiffure

Deux versions, **un seul code et une seule carte**. Tu modifies `menu.json` une fois, les deux se mettent à jour.

| | À emporter | Salon |
|---|---|---|
| Adresse | `/` | `/salao` |
| Réglages | `data/config.json` | `data/config.json` **plus** `data/config.salao.json` |
| Titre | A tua gulodice pelo telemóvel. | Café ao teu lugar. |
| Délai | 15 min | 12 min, créneaux de 10 min |
| Commander | 24h/24, pour un créneau d'ouverture | seulement pendant l'ouverture |
| Le client | vient chercher au comptoir | reste assis, tu apportes |
| Message WhatsApp | `*BIKA 10:35 · Marta · R-72*` | `*SALÃO 10:35 · Ana · C-63*` |
| Paiement | au comptoir, en récupérant | à la livraison, avec le terminal |

**Le mot SALÃO en tête de message est l'essentiel.** Dans ta liste de conversations WhatsApp tu vois d'un coup d'œil ce qui est à emporter et ce qu'il faut porter à côté. Le reste du message est identique, même mise en page, mêmes blocs cuisine et bar.

Le client ne remplit que son prénom. Pas de numéro de fauteuil : tu entres, tu appelles le prénom, la coiffeuse te montre.

### Ce que tu peux régler pour le salon

Dans `data/config.salao.json`, uniquement ce qui diffère :

```json
"ordering": {
  "prep_minutes": 12,
  "slot_step_minutes": 10
}
```

Tout ce qui n'est pas dans ce fichier vient de `config.json` : les horaires, ton numéro WhatsApp, les plafonds. Tu ne les écris qu'une fois.

### Le QR code du salon

Un QR différent, pointant vers `https://pedidos.bika.pt/salao`. Donne-le à la coiffeuse : sur le miroir, sur la table du coin lecture, ou sur un petit chevalet à chaque poste.

Pour les clientes étrangères : `https://pedidos.bika.pt/salao?lang=en`.

Ne mélange pas les deux QR. Celui du salon envoie « SALÃO », celui du comptoir envoie « BIKA ». C'est ce qui te dit s'il faut traverser.

---

## 7. Tester sans attendre la bonne heure

Ajoute `?now=` à l'adresse pour simuler une date et une heure :

```
https://pedidos.bika.pt/?now=2026-09-12T09:07
```

Un bandeau rouge « MODE TEST » apparaît. Rien n'est enregistré. Ça marche aussi sur `/check`.

Pour que ça fonctionne, mets `"debug": true` dans `config.json`. Repasse-le à `false` avant de publier.

---

## 8. Les fichiers

```
index.html              l'application (à emporter)
salao.html              la même, version salon de coiffure
check.html              page de vérification (la tienne)
css/app.css             styles
js/app.js               logique
js/i18n.js              tous les textes de l'interface, en 3 langues
sw.js                   fonctionnement hors ligne
manifest.webmanifest    installation sur l'écran d'accueil
manifest.salao.webmanifest  la même, pour le salon
_headers                réglages de l'hébergement Cloudflare
wrangler.jsonc          configuration du Worker Cloudflare
.assetsignore           fichiers du dépôt à ne pas publier
netlify.toml            ancien réglage Netlify, ignoré par Cloudflare
data/menu.json          LA CARTE — tu modifies ici
data/config.json        LES RÉGLAGES — tu modifies ici
data/config.salao.json  les réglages qui changent pour le salon
assets/                 logos, mascotte, icônes
BALCAO.md               protocole du comptoir, en portugais, pour l'équipe
```

---

## 9. Ce qui reste à décider

La carte de l'appli suit tes fichiers du 11/09/2026 : `MENU A4 2026 PT.pdf` pour le portugais, `Menu 2026 A4 ENG.pdf` pour l'anglais. Le français est ma traduction. Je suis parti sur des hypothèses ; corrige-les si elles sont fausses.

1. **« Extras +0,50 € »** sur les Clássicos : je ne sais toujours pas ce que c'est. C'est nommé « Extra » dans l'appli, sur le Cappuccino et le Latte Macchiato. Dis-moi le vrai nom et je le change.
2. **Molho secreto** : ta fiche Shack Sauce contient de la mayonnaise (œufs, 3) et de la moutarde (10). Ta carte imprime 3·7·10 sur le Loaded Chips NY, mais pas le 10 sur le Frango Crocante ni le 3 et le 10 sur le Queijo e Fiambre. L'appli affiche les deux codes sur ces trois articles ; si la sauce des sandwichs est différente, dis-le moi. Sinon, corrige la carte.
3. **Bebida vegetal** : laquelle ? Avoine = gluten (1), soja = 6, amande ou cajou = fruits à coque (8). Dis-le moi et j'ajoute l'allergène à l'option.
4. **Coberturas** : j'ai mis gluten et soja sur Oreo et Speculoos, et gluten, œufs et lait sur Bolacha (ton cookie maison). À confirmer étiquette en main.
5. **Crolado** : ta carte le met à part, sans la ligne « Cobertura ». Il n'a donc plus de topping dans l'appli. S'il en prend, dis-le moi.
6. **Gelado italiano** : un seul parfum ? Sinon il faut la liste, comme pour le Gelado. Même question pour le **Chá** (quels thés ?).
7. **Affogato** : il est dans le bloc bar du message WhatsApp, avec les cafés. Si c'est la cuisine qui sert le gelato, dis-le moi.
8. **Pastelaria** : ta carte ne donne plus de prix (« está na vitrine »). L'appli garde les anciens : croissant 2 €, pastel de nata 2 €, brownie 3 €, cookie 3 €, cookie Biscoff 3,50 €. Le brownie a le soja en plus, d'après ta fiche.
9. **Ton playbook barista** parle d'un menu à +2 €, d'une taille Gourmand 47 cl et d'un Red Iced Matcha. Rien de tout ça n'est sur la carte 2026 ni dans l'appli. S'ils existent encore, dis-le moi.
10. **Préparation** : 15 minutes à emporter, 12 au salon, 25 le samedi matin. Dernières commandes 15 minutes avant la fermeture.
11. **Tutoiement** en portugais et en français. Si tu préfères le vouvoiement, c'est une trentaine de lignes dans `i18n.js`.
12. **Pas de précommande pour le lendemain.** Un client peut commander à partir d'une heure avant l'ouverture, pas la veille au soir.

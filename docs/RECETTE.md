# Yarnest V1 — guide de recette

Tous les lots L0 à L6 sont sur `main`. Ce guide liste comment lancer l'app, ce qu'il faut
vérifier à la main (ce que les tests automatiques ne couvrent pas) et les arbitrages en attente.

## 1. Lancer l'app

Le service worker, le Wake Lock et l'installation PWA exigent HTTPS (ou `localhost`).

**Hébergement OVH (mutualisé)** : `npm run build`, puis envoyer **le contenu** de `dist/`
(y compris le fichier caché `.htaccess`) dans le dossier racine du site par FTP. Le
`.htaccess` force HTTPS, renvoie toutes les routes vers `index.html` et règle le cache du
service worker. Le certificat SSL doit être actif : le domaine `.app` n'accepte que HTTPS.

**Option locale, sans HTTPS** (fonctions PWA, Wake Lock et hors ligne inactives) :

```sh
npm install
npm run build
npm run preview -- --host   # puis ouvrir http://<IP-de-l-ordinateur>:4173 sur le S26
```

## 2. Ce qui est déjà vérifié automatiquement

À chaque push (CI GitHub Actions) : lint, parité des clés fr/en, 176 tests unitaires
(couverture du domaine 100 %), build, et Playwright sur Chromium et WebKit :

- les critères CA1.x à CA7.x (sauf ceux listés en section 3), avec horloge simulée ;
- le scénario de référence de la section 10 ;
- axe-core (WCAG 2.2 AA) sur les 7 écrans, la pause, les 3 rappels et l'onboarding ;
- mise en page sans défilement horizontal à 360, 390 et 430 px ;
- fonctionnement hors ligne après la première visite (Chromium seulement : Playwright
  n'émule pas le hors ligne du service worker sous WebKit).

Lighthouse mobile (mesuré en local) : performance 95, accessibilité 100, bonnes pratiques 100.

## 3. À vérifier à la main sur le S26 et un iPhone

- [ ] Session d'1 h aiguilles en main : la zone +1 rang se tape sans regarder, d'une main.
- [ ] Écran qui reste allumé pendant la session (Wake Lock), y compris après être revenue
      sur l'onglet.
- [ ] Fin de pause au premier plan : carillon et vibration (le son se déverrouille au tap
      « Faire une pause »).
- [ ] Onglet en arrière-plan pendant une pause, retour après la fin : « Pause terminée
      (terminée il y a X min) », sans son.
- [ ] Rappels R1 (30 min), R2 (1 h), R3 (2 h) au bon moment, jamais répétés après un
      rechargement ; « Continuer » et « Ne plus » sur R3.
- [ ] Téléphone redémarré au milieu d'une session : temps et rangs exacts à la réouverture.
- [ ] Installation sur l'écran d'accueil (Chrome : bouton dans Réglages ; iOS : Partager >
      Sur l'écran d'accueil), puis usage en mode avion — **à vérifier en priorité sur iPhone**,
      non couvert automatiquement.
- [ ] Session laissée ouverte plus de 12 h : clôture à l'heure de la dernière action et
      carte « Faire le bilan » sur l'accueil.
- [ ] Export d'une sauvegarde puis import sur un autre navigateur.
- [ ] Lisibilité en lumière faible, interface intacte à 200 % de zoom.
- [ ] Écrans conformes aux wireframes et au DS A · Terracotta.

## 4. Arbitrages en attente

| Sujet                                      | Ce qui est en place                                                                                     | À décider                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Vocabulaire du bilan et de R3 (section 11) | Libellés provisoires entre crochets : « [Ça a tiré quelque part ?] », « [Message sérieux, à arbitrer] » | Option A (ton calme) ou B         |
| Hébergement (section 11)                   | Aucun déploiement                                                                                       | Netlify / Cloudflare Pages ou OVH |
| Taille du compteur de rangs                | Token `--text-counter` à 56 px (DS) ; la section 8 demande ≥ 64 px                                      | Ajuster le token ou la spec       |
| Clôture 12 h (RG10)                        | 12 h sans action depuis la dernière action (comme CA2.6)                                                | Confirmer                         |
| « Continuer » après R3 puis une pause      | Les paliers repartent de R1                                                                             | Confirmer                         |
| Session démarrée sur un projet « Terminé » | Le statut reste « Terminé » (RG13 ne cite que À faire / En pause)                                       | Confirmer                         |
| Bordures                                   | `1px` en dur pour les filets (pas de token d'épaisseur)                                                 | Ajouter un token ou accepter      |

## 5. Écarts et ajouts par rapport à la spec

- **Schéma** : champ `rowsAtEnd` sur les sessions (nécessaire à RG12 pour le journal) ;
  réglages `defaultPauseMinutes` (E7) et `pendingReviewSessionId` (carte de bilan après
  clôture automatique). Champs facultatifs, sans changement de version Dexie.
- **Domaine** : `sessions.ts`, `pauses.ts`, `format.ts`, `journal.ts`, `review.ts`,
  `counterReminders.ts` en plus des quatre fichiers prévus.
- **Bilan** : `zones: []` ne distingue pas « Aucune » de « rien coché » (section 4) ; en
  modification, le bilan se rouvre sans zone cochée.
- **Fiabilité (CA7.1)** : l'affichage ne change qu'une fois la transaction écrite ; un onglet
  tué dans les millisecondes qui suivent un tap, avant cet affichage, peut perdre ce tap.
- **Polices** : auto-hébergées (@fontsource) au lieu de Google Fonts, conformément à la
  section 8.
- **Versions** : React Router 7 (la v8 exige React 19), TypeScript 5.9 (typescript-eslint),
  ESLint 9, Playwright 1.63.

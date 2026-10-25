# Yarnest — Spécifications technico-fonctionnelles V1

Oct 25, 2026 · @Camille

Ce document est la source unique pour développer la V1 de Yarnest avec Claude Code : une PWA mobile-first, sans compte ni serveur, livrée en 7 lots. Il consolide les [User stories V1](https://claude.ai/artifact/ByPs1rUAxXoS8sphqH5Y4R), l'[Architecture technique V1](https://claude.ai/artifact/SS7eoAtdLW3X5GrWUhJufZ) et les [Wireframes V1](https://claude.ai/code/artifact/d5134f8f-0200-416c-9863-6e3dc4a6d2f8).

## 1. Objet et mode d'emploi avec Claude Code

Exporte ce doc en Markdown dans `docs/SPEC.md` à la racine du repo, puis ajoute le fichier `CLAUDE.md` ci-dessous. Claude Code le lit à chaque session et y trouve les règles qui ne se négocient pas.

```markdown
# Yarnest — consignes pour Claude Code

Spécification complète : docs/SPEC.md. La lire avant toute tâche.

## Règles non négociables
- Aucun chronomètre en mémoire : tout temps se recalcule depuis des horodatages stockés.
- Chaque action utilisateur s'écrit dans IndexedDB immédiatement, dans une transaction Dexie.
- Aucun texte en dur : toutes les chaînes passent par i18next (fr.json et en.json).
- La logique métier vit dans src/domain/ en fonctions pures, sans import React ni Dexie.
- Tests Vitest écrits avant le code pour tout ce qui est dans src/domain/.
- Mobile-first : valider à 360 px, 390 px et 430 px de large.
- Zones tactiles d'au moins 48 × 48 px ; le bouton +1 rang occupe au moins 1/3 de l'écran.

## Façon de travailler
- Un lot à la fois (docs/SPEC.md, section 9), sur une branche dédiée.
- Proposer un plan avant de coder, puis s'arrêter à la fin du lot pour validation.
- Une question ouverte (section 11) n'est jamais tranchée seul : appliquer le défaut indiqué et le signaler.

## Commandes
- npm run dev | npm test | npm run test:e2e | npm run lint | npm run build
```

Convention de lecture : les identifiants **US** renvoient aux user stories, les identifiants **RG** aux règles de gestion de la section 5, les identifiants **E** aux écrans de la section 6.

## 2. Contexte et périmètre V1

Yarnest V1 remplace le carnet papier et rythme les pauses pendant les sessions de tricot et de crochet. C'est un journal d'activité et un outil pratique, jamais une app santé ni une course à la performance.

- **Cible** : tricoteuses et crocheteuses débutantes à intermédiaires (jusqu'à 2-3 ans de pratique), y compris des sessions de 5 à 6 h d'affilée.
- **Usage** : personnel d'abord, sur Chrome Android (Samsung S26) puis Safari iOS.
- **Langues** : français et anglais dès le lancement.
- **Contrainte forte** : aucune perte de données après un rechargement, une fermeture d'onglet ou un retour plusieurs heures plus tard.

| Priorité | Périmètre |
| --- | --- |
| Must have | Projets, session avec reprise après rechargement, minuteur de pause, rappels de pause, compteurs de rangs et de mailles, bilan de fin de session, journal, FR/EN, sauvegarde automatique locale |
| Should have | Rappels liés au compteur (augmentation, diminution, couper la laine au rang X), onboarding de 3 écrans maximum, export et import JSON, installation PWA |
| Hors V1 | Compte et synchronisation, partage de projet fini, patrons, statistiques avancées, notifications push, communauté, dark mode |

## 3. Stack, architecture et arborescence

La V1 est 100 % côté client : une PWA React installée depuis un site statique, dont toutes les données vivent dans IndexedDB. Le framework et l'hébergement restent à arbitrer (section 11) ; la stack ci-dessous est le défaut recommandé par le tech lead.

| Brique | Choix | Rôle |
| --- | --- | --- |
| Framework | React 18 + TypeScript strict, build Vite | UI et build |
| Routage | React Router | 7 routes (section 6) |
| Stockage | Dexie + dexie-react-hooks sur IndexedDB | Données, requêtes réactives, migrations |
| État d'interface | Zustand | État éphémère uniquement (modales, tick) ; la vérité reste dans IndexedDB |
| PWA | vite-plugin-pwa (Workbox) | Installation, fonctionnement hors ligne |
| Langues | i18next + react-i18next | fr.json, en.json, formats de date et durée |
| Styles | CSS Modules + tokens en variables CSS | Design system appliqué au lot UI |
| Identifiants | `crypto.randomUUID()` | UUID pour une synchronisation future |
| Tests | Vitest + Testing Library, Playwright | Unitaires domaine, bout en bout reprise |
| Qualité | ESLint, Prettier, GitHub Actions | Lint, tests et build à chaque push |

Trois couches, dépendances dans un seul sens : **UI** (features, ui) → **accès aux données** (db, hooks) → **domaine** (fonctions pures). Le domaine n'importe jamais React ni Dexie.

```text
yarnest/
  CLAUDE.md
  docs/SPEC.md
  src/
    app/            routes, providers, layout, garde de session active
    features/
      projects/     E1 liste, E2 création/édition, E3 fiche
      sessions/     E4 session en cours, compteurs
      pauses/       E5 minuteur de pause
      reminders/    rappels 30 min, 1 h, 2 h (R1, R2, R3)
      reviews/      E6 bilan de fin de session
      settings/     E7 réglages, langue, export/import
    domain/
      time.ts       calcul des trois temps
      reminders.ts  paliers de rappel
      autoclose.ts  clôture à 12 h
      counters.ts   règles des compteurs
    db/
      schema.ts     tables Dexie, version, migrations
      repo.ts       écritures transactionnelles (une fonction par action)
    i18n/           fr.json, en.json, init
    ui/             Button, Pill, Card, Counter, Sheet, Dialog
    styles/         tokens.css, reset.css
  tests/e2e/        scénarios Playwright
```

## 4. Modèle de données IndexedDB

Six tables Dexie, identifiants UUID et dates en chaînes ISO 8601 UTC, pour qu'une future synchronisation serveur reprenne le schéma tel quel. Par rapport à l'architecture V1, deux champs s'ajoutent sur `sessions` (`reminderStage`, `lastReminderAt`) pour qu'un rappel déjà affiché ne revienne pas après un rechargement, et la table `counterReminders` couvre le Should have.

```ts
// src/db/schema.ts
export type ProjectStatus = 'todo' | 'active' | 'paused' | 'done';
export type Technique = 'knit' | 'crochet';
export type BodyZone = 'neck' | 'back' | 'shoulders' | 'elbows' | 'wrists' | 'hands' | 'eyes';

export interface Project {
  id: string;              // UUID
  name: string;            // obligatoire, 1 à 60 caractères
  technique?: Technique;
  note?: string;           // laine, aiguilles, crochet ; 500 caractères max
  status: ProjectStatus;   // défaut 'todo'
  rowCount: number;        // >= 0
  stitchCount: number;     // >= 0, remis à 0 à chaque +1 rang
  createdAt: string;
  updatedAt: string;       // sert au tri « dernière activité »
}

export interface Session {
  id: string;
  projectId: string;
  startedAt: string;
  endedAt?: string;        // absent = session active
  endReason?: 'manual' | 'auto12h';
  lastActivityAt: string;  // mis à jour par chaque action, même transaction
  rowsAtStart: number;
  remindersMode: 'on' | 'every30' | 'off';
  reminderStage: 0 | 1 | 2 | 3; // dernier palier affiché depuis la dernière pause
  lastReminderAt?: string;
  manualKnitSeconds?: number;   // correction manuelle (US6.2), prioritaire sur le calcul
}

export interface Pause {
  id: string;
  sessionId: string;
  startedAt: string;
  plannedMinutes: number;  // multiple de 5, de 5 à 60
  endedAt?: string;        // posé au tap « Reprendre » ou « Arrêter la pause »
}

export interface Review {
  sessionId: string;       // clé primaire, 1 bilan max par session
  mood?: 1 | 2 | 3 | 4 | 5;
  zones: BodyZone[];       // [] = « Aucune »
  note?: string;           // 500 caractères max
  createdAt: string;
}

export interface CounterReminder { // Should have
  id: string;
  projectId: string;
  atRow: number;
  kind: 'increase' | 'decrease' | 'cutYarn' | 'custom';
  label?: string;
  doneAt?: string;
}

export interface Setting { key: string; value: unknown; }
// clés : locale, remindersEnabled, storagePersisted, onboardingDone, schemaVersion

export const db = new Dexie('yarnest');
db.version(1).stores({
  projects: 'id, status, updatedAt',
  sessions: 'id, projectId, startedAt, endedAt',
  pauses: 'id, sessionId, startedAt',
  reviews: 'sessionId',
  counterReminders: 'id, projectId, atRow',
  settings: 'key',
});
```

Toute écriture passe par une fonction de `src/db/repo.ts` (par exemple `incrementRow(projectId)`, `startPause(sessionId, minutes)`) qui ouvre une transaction, écrit l'action et met à jour `project.updatedAt` et, en session, `session.lastActivityAt`.

## 5. Règles de gestion transverses

Toutes ces règles sont des fonctions pures de `src/domain/`, couvertes par des tests unitaires avant toute UI. `now` est toujours passé en paramètre, jamais lu dans la fonction, pour rendre les tests déterministes.

```latex
T_{session} = now - startedAt \quad T_{pause} = \sum_{p} (\min(p.endedAt, now) - p.startedAt) \quad T_{tricot} = T_{session} - T_{pause}
```

| ID | Règle |
| --- | --- |
| RG01 | Une seule session sans `endedAt` à la fois, tous projets confondus. Démarrer sur un autre projet demande de terminer la session active. |
| RG02 | Les trois temps se recalculent à chaque tick d'1 s et à chaque événement `visibilitychange`, depuis les horodatages ; pour une session terminée, `now` = `endedAt`. |
| RG03 | Une pause dont le minuteur est écoulé mais sans `endedAt` reste comptée en pause : le dépassement n'est jamais du temps de tricot. |
| RG04 | Une seule pause ouverte par session. Pendant la pause, le temps de tricot affiché est figé et les compteurs restent utilisables. |
| RG05 | Durée de pause : 5 min par défaut, de 5 à 60 min par paliers de 5 avec + et −. |
| RG06 | Rappels : décompte du tricot continu depuis la fin de la dernière pause, sinon depuis `startedAt`. Paliers R1 à 30 min, R2 à 1 h, R3 à 2 h, chacun affiché une seule fois (`reminderStage`). |
| RG07 | Après R3 : « Continuer de me le rappeler » passe `remindersMode` à `every30` (un R3 toutes les 30 min) ; « Ne plus me le rappeler » le passe à `off` pour la session. |
| RG08 | Une pause remet `reminderStage` à 0 sans réactiver un mode `off`. Le réglage `remindersEnabled = false` coupe tous les rappels. |
| RG09 | Si plusieurs paliers sont dépassés au retour sur l'onglet, seul le plus élevé s'affiche. |
| RG10 | Clôture automatique : à l'ouverture puis chaque minute, une session ouverte depuis 12 h est fermée avec `endedAt = lastActivityAt` et `endReason = auto12h` ; une pause ouverte est fermée à la même heure. Le bilan est proposé à l'ouverture suivante. |
| RG11 | +1 rang : `rowCount + 1` et `stitchCount = 0`. −1 ne descend jamais sous 0 et ne restaure pas les mailles. Remise à zéro d'un compteur : confirmation obligatoire. |
| RG12 | Rangs faits pendant une session = `rowCount` à la fin − `rowsAtStart`, plancher à 0. |
| RG13 | Démarrer une session sur un projet « À faire » ou « En pause » le passe « En cours ». |
| RG14 | Supprimer un projet supprime en cascade ses sessions, pauses, bilans et rappels de compteur, dans une seule transaction, après confirmation. |
| RG15 | Persistance : `navigator.storage.persist()` est demandé au premier lancement ; le résultat est stocké dans `settings.storagePersisted`. |
| RG16 | Langue : `navigator.language` commence par `fr` → français, sinon anglais. Durées via `Intl` au format « 1 h 05 » (fr) et « 1h 05m » (en). |
| RG17 | Format d'affichage : moins d'1 h → mm:ss ; 1 h et plus → h:mm:ss en session, « X h YY » dans le journal. |

## 6. Maquettes et spécifications écran par écran

Les maquettes ci-dessous sont des wireframes basse fidélité (UX), retranscrits en texte depuis les [Wireframes V1](https://claude.ai/code/artifact/d5134f8f-0200-416c-9863-6e3dc4a6d2f8) pour que Claude Code les lise. Elles fixent la structure, la hiérarchie et les comportements, pas le style : l'UI graphique viendra après validation des parcours (lot 6). Les libellés entre crochets sont à trancher (vocabulaire du bilan, section 11).

| Écran | Route | Stories |
| --- | --- | --- |
| E1 Mes projets | `/` | US1.2, US2.3 |
| E2 Nouveau / modifier un projet | `/projects/new`, `/projects/:id/edit` | US1.1, US1.4 |
| E3 Fiche projet | `/projects/:id` | US1.3, US4.2, US6.1, US6.2 |
| E4 Session en cours | `/session` | US2.1 à US2.5, US4.1 |
| E5 Pause | `/session` (état pause, plein écran) | US3.1, US3.2 |
| E6 Bilan de session | `/sessions/:id/review` | US5.1 |
| E7 Réglages | `/settings` | US3.3, US7.1, US7.2 |
| R1, R2, R3 Rappels | surcouches de E4 | US3.3 |

&#91;embedded content: navigation entre les écrans · 7 écrans + rappels\]

La fiche projet mène à la session ; la pause et les rappels se greffent sur elle, et le bilan ramène toujours à la fiche projet.

### E1 — Mes projets

```text
+------------------------------------+
| Yarnest                     [⚙]    |
|------------------------------------|
| ● Session en cours · Bonnet        |  <- bandeau si session active
|   Tricot 00:42:10      [Reprendre] |     tap = E4
|------------------------------------|
| [Tous] [En cours] [À faire]        |  <- filtre par statut (pills)
| [En pause] [Terminé]               |
|------------------------------------|
| +--------------------------------+ |
| | Bonnet côtelé      (En cours)  | |
| | Rang 34 · hier, 1 h 20         | |
| +--------------------------------+ |
| +--------------------------------+ |
| | Écharpe            (À faire)   | |
| | Rang 0 · aucune session        | |
| +--------------------------------+ |
|                                    |
|                  [ + Nouveau projet ]|
+------------------------------------+
```

- Tri par `updatedAt` décroissant. Tap sur une carte → E3.
- État vide : illustration neutre, texte d'invitation et bouton « Créer mon premier projet ».
- Si une session a été clôturée automatiquement (RG10) sans bilan, une carte « Faire le bilan de ta session » s'affiche en tête.

### E2 — Nouveau projet / modifier

```text
+------------------------------------+
| ←  Nouveau projet                  |
|------------------------------------|
| Nom *                              |
| [______________________________]   |
|                                    |
| Technique                          |
| ( Tricot )  ( Crochet )            |
|                                    |
| Laine, aiguilles, crochet          |
| [______________________________]   |
| [______________________________]   |
|                                    |
| Statut   [À faire ▾]               |  <- en édition seulement
|                                    |
| [        Créer le projet         ] |
| Supprimer le projet                |  <- en édition, lien rouge discret
+------------------------------------+
```

- Seul le nom est obligatoire ; bouton désactivé tant qu'il est vide. Validation → E3.
- Suppression : dialogue de confirmation qui rappelle le nombre de sessions effacées (RG14).

### E3 — Fiche projet

```text
+------------------------------------+
| ←  Bonnet côtelé        [✎]       |
|    [En cours ▾]  Tricot            |
|------------------------------------|
| Note : laine mérinos, aig. 4 mm    |
|------------------------------------|
|  Rangs            Mailles          |
|  [−]  34  [+1]    [−]  12  [+1]    |  <- utilisables hors session
|  Ràz              Ràz              |
|------------------------------------|
| [   ▶ Démarrer une session     ]   |
|------------------------------------|
| Journal · 9 h 40 de tricot         |
| 24 oct · 1 h 20 tricot · 15 min    |
|   pause · +12 rangs · ●●●●○ · cou |
| 22 oct · 45 min tricot · 5 min ... |
+------------------------------------+
```

- Si une session est active sur un autre projet, « Démarrer » ouvre un dialogue : « Terminer la session sur X ? » (RG01).
- Tap sur une ligne du journal → détail éditable : durée de tricot, bilan, suppression (US6.2).

### E4 — Session en cours

```text
+------------------------------------+
| ←  Bonnet côtelé      [Terminer]  |
|------------------------------------|
|          TRICOT 00:42:10           |  <- valeur principale
|  Pause 00:05:00 · Session 00:47:10 |
|  [██████████████░░]                |  <- part tricot / part pause
|------------------------------------|
|  Mailles  12        [−]   [ +1 ]   |
|------------------------------------|
|                                    |
|              RANG 34               |
|                                    |
|               + 1                  |  <- zone ≥ 1/3 de l'écran
|                                    |
|   [−] corriger                     |
|------------------------------------|
| [      ⏸ Faire une pause         ] |
+------------------------------------+
```

- Toute la zone RANG est tappable. +1 rang remet les mailles à 0 (RG11), vibration courte si disponible.
- Écran maintenu allumé (Wake Lock), redemandé au retour sur l'onglet.
- « Terminer » : dialogue de confirmation, puis E6.

### E5 — Pause

```text
+------------------------------------+
|              PAUSE                 |
|                                    |
|              04:12                 |  <- compte à rebours
|                                    |
|        [−]   5 min   [+]           |  <- paliers de 5, avant lancement
|                                    |
|  Tricot figé à 00:42:10            |
|                                    |
|  [ Arrêter la pause ]              |
+------------------------------------+
  Fin de pause : son + vibration +
+------------------------------------+
|        Pause terminée              |
|  (terminée il y a 3 min)           |  <- si retour depuis l'arrière-plan
|  [          Reprendre           ]  |
+------------------------------------+
```

- Le réglage de durée se fait dans une feuille au tap sur « Faire une pause », puis « Lancer » ; ce tap déverrouille l'audio.
- La reprise est toujours manuelle ; le dépassement compte en pause (RG03).

### R1, R2, R3 — Rappels de pause

```text
R1 · 30 min (encart discret en haut de E4, disparaît seul en 10 s)
+------------------------------------+
| 30 min de tricot. Une pause ? [Oui]|
+------------------------------------+

R2 · 1 h (feuille à mi-écran)
+------------------------------------+
|  1 h sans pause                    |
|  Tes mains et ton cou apprécieront |
|  [  Faire une pause  ] [Plus tard] |
+------------------------------------+

R3 · 2 h (plein écran)
+------------------------------------+
|          2 h sans pause            |
|  [Message sérieux, à arbitrer]     |
|  [      Faire une pause         ]  |
|  [ Continuer de me le rappeler  ]  |
|  [   Ne plus me le rappeler     ]  |
+------------------------------------+
```

### E6 — Bilan de session

```text
+------------------------------------+
|  Session terminée · Bonnet         |
|  Tricot 1 h 20 · Pause 15 min (2)  |
|  Session 1 h 35 · +12 rangs        |
|------------------------------------|
|  Comment tu te sens ?              |
|  ( 1 ) ( 2 ) ( 3 ) ( 4 ) ( 5 )     |
|------------------------------------|
|  [Ça a tiré quelque part ?]        |  <- libellé à arbitrer
|  (Cou) (Dos) (Épaules) (Coudes)    |
|  (Poignets) (Mains) (Yeux)         |
|  (Aucune)                          |
|------------------------------------|
|  Note  [________________________]  |
|                                    |
|  [          Enregistrer          ] |
|  Passer                            |
+------------------------------------+
```

- Validable en 2 taps (ressenti + Enregistrer). « Aucune » désélectionne les autres zones et inversement.
- « Passer » enregistre la session sans bilan. Sortie → E3.

### E7 — Réglages

```text
+------------------------------------+
| ←  Réglages                        |
|------------------------------------|
| Langue            [Français ▾]     |
| Rappels de pause  [●    ] activés  |
| Durée de pause par défaut  5 min   |
|------------------------------------|
| Mes données                        |
| Stockage protégé : oui / non       |
| [Exporter une sauvegarde]          |  <- Should have
| [Importer une sauvegarde]          |
|------------------------------------|
| Installer l'app sur l'écran d'accueil|
+------------------------------------+
```

## 7. Spécifications fonctionnelles et critères d'acceptation

Chaque critère est rédigé pour devenir un test : Claude Code écrit le test correspondant (unitaire ou Playwright) dans le lot qui livre la story. Le texte complet des stories reste dans les [User stories V1](https://claude.ai/artifact/ByPs1rUAxXoS8sphqH5Y4R).

### Epic 1 — Projets

| ID | Étant donné / Quand / Alors | Réf. |
| --- | --- | --- |
| CA1.1 | Sur E2, nom vide → bouton « Créer » désactivé ; nom saisi → projet créé en « À faire », compteurs à 0, affiché en tête de E1 | US1.1, E2 |
| CA1.2 | Trois projets modifiés à des heures différentes → E1 les liste du plus récent au plus ancien ; le filtre « En cours » masque les autres | US1.2, E1 |
| CA1.3 | Aucun projet → E1 affiche l'état vide et son bouton de création | US1.2 |
| CA1.4 | Changement de statut sur E3 → enregistré sans bouton, conservé après rechargement | US1.3 |
| CA1.5 | Suppression confirmée → projet, sessions, pauses, bilans et rappels de compteur absents d'IndexedDB | US1.4, RG14 |

### Epic 2 — Session

| ID | Étant donné / Quand / Alors | Réf. |
| --- | --- | --- |
| CA2.1 | Projet « À faire » → « Démarrer » crée une session avec `startedAt` et `rowsAtStart`, et passe le projet « En cours » | US2.1, RG13 |
| CA2.2 | Session active sur A → « Démarrer » sur B demande de terminer A ; jamais deux sessions ouvertes | US2.1, RG01 |
| CA2.3 | Session de 10 min avec 3 min de pause → E4 affiche tricot 07:00, pause 03:00, session 10:00 | US2.2, RG02 |
| CA2.4 | Session en cours, 3 rangs comptés, rechargement de la page 60 min plus tard (horloge simulée) → temps exacts, rang identique | US2.3 |
| CA2.5 | Pause en cours au moment du rechargement → E5 réaffiché avec le temps restant exact | US2.3 |
| CA2.6 | Dernière action à T, ouverture à T + 12 h 01 → session fermée `auto12h` avec `endedAt = T`, carte de bilan sur E1 | US2.3, RG10 |
| CA2.7 | Navigateur sans Wake Lock → aucune erreur visible, session utilisable | US2.4 |
| CA2.8 | « Terminer » puis « Passer » sur E6 → session enregistrée dans le journal sans bilan | US2.5 |

### Epic 3 — Pauses et rappels

| ID | Étant donné / Quand / Alors | Réf. |
| --- | --- | --- |
| CA3.1 | Feuille de pause → 5 min par défaut ; + et − bornent entre 5 et 60 min par paliers de 5 | US3.1, RG05 |
| CA3.2 | Pause lancée → le temps de tricot ne bouge plus jusqu'à « Reprendre » | US3.1, RG04 |
| CA3.3 | Fin du compte à rebours, app au premier plan → son, vibration si supportée, message et bouton « Reprendre » | US3.2 |
| CA3.4 | Pause de 5 min, retour sur l'onglet après 8 min → « Pause terminée il y a 3 min » ; 8 min comptées en pause | US3.2, RG03 |
| CA3.5 | 30 min de tricot continu → R1 une seule fois, même après rechargement | US3.3, RG06 |
| CA3.6 | Retour sur l'onglet après 1 h 10 de tricot → seul R2 s'affiche | RG09 |
| CA3.7 | R3 → « Continuer » : nouveau R3 toutes les 30 min ; « Ne plus » : aucun rappel jusqu'à la fin de la session, même après une pause | RG07, RG08 |
| CA3.8 | Rappels désactivés dans E7 → aucun rappel, quelle que soit la durée | RG08 |

### Epic 4 — Compteurs

| ID | Étant donné / Quand / Alors | Réf. |
| --- | --- | --- |
| CA4.1 | Rang 34, mailles 12 → +1 rang : rang 35, mailles 0 | US4.1, RG11 |
| CA4.2 | Rang 0 → −1 sans effet | RG11 |
| CA4.3 | Remise à zéro → dialogue de confirmation ; « Annuler » ne change rien | US4.2 |
| CA4.4 | Compteurs modifiés sur E3 hors session → valeurs reprises à la session suivante | US4.2 |
| CA4.5 | 20 taps rapides sur +1 → rang + 20 exactement, aucun tap perdu | US4.1 |

### Epic 5 — Bilan

| ID | Étant donné / Quand / Alors | Réf. |
| --- | --- | --- |
| CA5.1 | E6 affiche tricot, pause et nombre de pauses, session, rangs faits (RG12) | US5.1 |
| CA5.2 | Ressenti 4 + « Enregistrer » → bilan stocké en 2 taps, zones vides | US5.1 |
| CA5.3 | « Aucune » cochée puis « Cou » → « Aucune » se décoche | US5.1 |

### Epic 6 — Journal

| ID | Étant donné / Quand / Alors | Réf. |
| --- | --- | --- |
| CA6.1 | Projet avec 3 sessions → journal trié de la plus récente à la plus ancienne, cumul de tricot en tête | US6.1 |
| CA6.2 | Durée de tricot corrigée → `manualKnitSeconds` affiché partout à la place du calcul, cumul mis à jour | US6.2 |
| CA6.3 | Suppression confirmée d'une session → session, pauses et bilan supprimés, cumul recalculé | US6.2 |

### Epic 7 — Transverse

| ID | Étant donné / Quand / Alors | Réf. |
| --- | --- | --- |
| CA7.1 | Fermeture forcée de l'onglet juste après un tap → le tap est conservé | US7.1 |
| CA7.2 | Premier lancement → `navigator.storage.persist()` appelé, résultat visible dans E7 | US7.1, RG15 |
| CA7.3 | Navigateur en `en-US` → interface en anglais ; en `fr-CA` → français ; en `de-DE` → anglais | US7.2, RG16 |
| CA7.4 | Script de contrôle → aucune clé présente dans fr.json et absente de en.json, ni l'inverse | US7.2 |

## 8. Exigences non fonctionnelles

L'app doit rester utilisable aiguilles en main, d'une main, sous une lumière faible, et ne jamais perdre une donnée.

| Domaine | Exigence | Vérification |
| --- | --- | --- |
| Mobile | Mise en page valide de 360 à 430 px de large, sans défilement horizontal ; zones sensibles aux encoches (`env(safe-area-inset-*)`) | Playwright à 360, 390 et 430 px |
| Ergonomie | Cibles tactiles ≥ 48 × 48 px ; zone +1 rang ≥ 1/3 de la hauteur de E4 ; actions principales dans la moitié basse | Revue des écrans |
| Accessibilité | WCAG 2.2 AA : contraste ≥ 4,5:1, focus visible, `aria-live` pour les temps et le compteur (au plus une annonce par minute pour les temps), libellés sur tous les boutons icônes | axe-core dans Playwright |
| Taille de texte | Compteur de rangs ≥ 64 px ; texte courant ≥ 16 px ; interface intacte à 200 % de zoom | Revue |
| Performance | Premier affichage < 2 s en 4G ; JS initial < 200 Ko gzip ; réponse à un tap < 100 ms | Lighthouse mobile ≥ 90 |
| Hors ligne | Toutes les fonctions disponibles sans réseau après la première visite | Playwright en mode hors ligne |
| PWA | Manifeste (nom, icônes 192 et 512 px, `display: standalone`, couleur de thème), service worker, mise à jour proposée par un message « Nouvelle version » | Lighthouse PWA |
| Écran allumé | Wake Lock demandé au démarrage de session, redemandé sur `visibilitychange`, relâché en fin de session | Test manuel S26 et iPhone |
| Son et vibration | Contexte audio déverrouillé au tap « Faire une pause » ; `navigator.vibrate` seulement si disponible | Test manuel |
| Fiabilité | Chaque action écrite dans une transaction Dexie avant la mise à jour de l'affichage ; erreurs IndexedDB affichées dans un message non bloquant | Tests unitaires repo |
| Confidentialité | Aucune donnée envoyée hors du téléphone ; aucun traceur, aucune police chargée depuis un CDN tiers (polices auto-hébergées) | Onglet réseau vide après chargement |
| Navigateurs | Chrome Android récent (Samsung S26) et Safari iOS 16.4 ou plus | Test manuel |

Le risque principal est iOS : sans installation sur l'écran d'accueil, Safari peut effacer les données après 7 jours sans visite. E7 et l'onboarding (Should have) proposent donc l'installation tôt.

## 9. Plan de développement en lots pour Claude Code

Sept lots séquentiels, du socle à l'UI graphique. Chaque lot se termine par une démo sur le Samsung S26 et ta validation avant le suivant. Lance chaque lot en mode plan (Maj + Tab dans Claude Code) avec le prompt indiqué.

| Lot | Contenu | Stories | Terminé quand |
| --- | --- | --- | --- |
| L0 Socle | Vite + React + TS strict, ESLint, Prettier, Vitest, Playwright, CI GitHub Actions, i18n vide, schéma Dexie, routes vides, tokens.css provisoire en niveaux de gris | — | `npm run build` et la CI passent ; 7 routes affichent leur titre en FR et EN |
| L1 Domaine | `time.ts`, `reminders.ts`, `autoclose.ts`, `counters.ts` en fonctions pures | RG01 à RG12 | Tests unitaires verts, couverture du dossier domain ≥ 90 % |
| L2 Projets | E1, E2, E3 sans journal, `repo.ts` pour les projets | US1.1 à US1.4 | CA1.1 à CA1.5 verts |
| L3 Session | E4, E5, compteurs, reprise après rechargement, Wake Lock, son et vibration | US2.1 à US2.5, US3.1, US3.2, US4.1, US4.2 | CA2.x, CA3.1 à CA3.4, CA4.x verts ; test réel d'une heure sur le S26 |
| L4 Bilan et journal | R1 à R3, E6, journal de E3, correction de session, clôture 12 h | US3.3, US5.1, US6.1, US6.2 | CA3.5 à CA3.8, CA5.x, CA6.x verts |
| L5 Finitions | E7, PWA installable, hors ligne, accessibilité, déploiement | US7.1, US7.2 | CA7.x verts, Lighthouse ≥ 90, app installée sur le S26 |
| L6 UI et Should have | Maquettes graphiques appliquées, puis rappels de compteur, onboarding, export/import | Should have | Maquettes UI validées par la product designer |

### Prompts de lancement

```text
L0 — Lis CLAUDE.md et docs/SPEC.md sections 3 et 4. Initialise le projet
selon l'arborescence de la section 3, avec le schéma Dexie de la section 4
et les 7 routes de la section 6 (une page vide par route avec son titre
traduit). Configure Vitest, Playwright (viewports 360, 390, 430) et une CI
GitHub Actions lint + test + build. Propose ton plan avant de coder.
```

```text
L1 — Lis docs/SPEC.md section 5. Pour chaque règle RG01 à RG12, écris
d'abord les tests Vitest, puis l'implémentation en fonctions pures dans
src/domain/. `now` est toujours un paramètre. Aucun import React ni Dexie.
Inclus les cas limites : pause dépassée, paliers sautés, clôture à 12 h pile.
```

```text
L2 — Lis docs/SPEC.md sections 6 (E1, E2, E3) et 7 (Epic 1). Implémente
les écrans en respectant les wireframes, sans style graphique au-delà des
tokens provisoires. Chaque écriture passe par src/db/repo.ts. Ajoute un
test Playwright par critère CA1.x.
```

```text
L3 — Lis docs/SPEC.md sections 5, 6 (E4, E5) et 7 (Epics 2, 3, 4). C'est
le lot critique : aucune donnée perdue, aucun chronomètre en mémoire.
Implémente la session, la pause, les compteurs, le Wake Lock et la reprise
après rechargement. Écris le test Playwright CA2.4 avec une horloge simulée
(page.clock) avant le code.
```

```text
L4 — Lis docs/SPEC.md sections 5 (RG06 à RG10, RG12), 6 (R1 à R3, E6, E3)
et 7 (Epics 3, 5, 6). Implémente les rappels, le bilan, le journal et la
correction de session. Les libellés entre crochets restent des clés i18n
provisoires tant que la section 11 n'est pas tranchée.
```

```text
L5 — Lis docs/SPEC.md sections 6 (E7) et 8. Ajoute vite-plugin-pwa, le
mode hors ligne, le message de nouvelle version, axe-core dans Playwright
et le script de contrôle des clés i18n. Corrige tout ce que Lighthouse
mobile signale sous 90.
```

## 10. Stratégie de test et Definition of Done

La logique métier est testée sans navigateur, et la promesse « aucune perte de données » est testée de bout en bout à chaque push.

| Niveau | Outil | Périmètre | Quand |
| --- | --- | --- | --- |
| Unitaire | Vitest | `src/domain/` (couverture ≥ 90 %), `src/db/repo.ts` avec fake-indexeddb | Chaque push |
| Composant | Testing Library | Compteur, feuille de pause, sélection des zones du bilan | Chaque push |
| Bout en bout | Playwright, Chromium et WebKit, 390 px | Un scénario par critère CA, horloge simulée avec `page.clock` | Chaque push |
| Accessibilité | axe-core | Les 7 écrans et les 3 rappels | Chaque push |
| Réel | Samsung S26 et un iPhone | Session d'1 h aiguilles en main, écran en veille, onglet en arrière-plan, redémarrage du téléphone | Fin de L3, L4 et L5 |

Scénario de référence, à garder vert en permanence : créer un projet, démarrer une session, compter 3 rangs et 5 mailles, lancer une pause de 5 min, recharger la page, avancer l'horloge de 8 min, reprendre, terminer, faire le bilan, puis vérifier le journal.

### Definition of Done

- [ ] Tous les critères CA de la story ont un test automatisé vert.
- [ ] Testée sur Chrome Android (S26) et Safari iOS.
- [ ] Affichage validé à 360, 390 et 430 px.
- [ ] Textes présents en français et en anglais, aucun texte en dur.
- [ ] Un rechargement de page à n'importe quel moment ne perd aucune donnée.
- [ ] Aucune erreur axe-core, lint et build propres.
- [ ] Écran conforme au wireframe validé par la product designer.

## 11. Points ouverts à arbitrer

Trois arbitrages hérités de l'architecture bloquent des lots précis ; en attendant, Claude Code applique le défaut indiqué et le signale.

| Question | Option A | Option B | Ce qu'on perd | Défaut provisoire | Bloque |
| --- | --- | --- | --- | --- | --- |
| Framework | Vite + React en PWA : léger, PWA mature | Expo + React Native Web : même code pour les futures apps natives | A : réécrire les écrans pour le natif. B : bundle plus lourd, PWA moins aboutie | A | L0 |
| Hébergement | Cloudflare Pages ou Netlify : gratuit, prévisualisation par pull request | Hébergement OVH inclus avec yarnest.app | A : un compte de plus. B : déploiement manuel par FTP, sans prévisualisation | Aucun déploiement avant L5 | L5 |
| Vocabulaire du bilan et de R3 | Ton du design system : jamais « douleur », jamais inquiet (« Ça a tiré quelque part ? ») | Nommer les douleurs, rappel de 2 h franchement inquiet | A : signal moins explicite. B : entorse à l'identité « calme » | Clés i18n provisoires entre crochets | L4 |

Hypothèses ajoutées par cette spec, à confirmer ou corriger :

- [ ] Les wireframes V1 sont validés comme base UX du développement.
- [ ] Durée de pause plafonnée à 60 min.
- [ ] R1 disparaît seul après 10 s ; R2 et R3 attendent une action.
- [ ] La correction d'une session porte sur le temps de tricot (`manualKnitSeconds`), pas sur les heures de début et de fin.
- [ ] Champs `reminderStage` et `lastReminderAt` ajoutés aux sessions pour ne pas répéter un rappel après rechargement.
- [ ] Niveau d'accessibilité visé : WCAG 2.2 AA.
- [ ] Les maquettes graphiques (UI) arrivent au lot 6, après des lots 0 à 5 développés sur les wireframes.

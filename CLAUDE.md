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

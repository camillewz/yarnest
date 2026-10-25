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

## Consignes UI — DS A · Terracotta

- `src/styles/tokens.css` est la **source unique** des couleurs, typos, espacements, arrondis. Importé une fois à la racine (`src/main.tsx`).
- **Aucune valeur en dur** (couleur, taille, rayon) : toujours `var(--…)`. Si un token manque, demander avant d'en créer un.
- **Pas de dark mode.** Un seul thème clair.
- Polices auto-hébergées (`src/styles/fonts.css`, paquets @fontsource) : jamais de Google Fonts ni d'autre CDN.

### Règles d'usage

- Fond `--paper`, cartes `--surface` bordées `--line`, texte `--ink`, secondaire `--ink-muted`.
- `--primary` (terracotta) : **une seule action principale par écran** (démarrer/pause minuteur, +1 rang). Texte blanc dessus.
- `--accent` (sauge) : rappels de rangs, statut « en cours ». Fonds doux : `--primary-soft`, `--accent-soft`.
- `--alert` : douleurs et suppressions uniquement, toujours doublé d'une icône ou d'un libellé (jamais la couleur seule).
- Typo : `--font-display` (Fraunces) réservée au logo/landing ; `--text-h1`, `--text-h2`, `--text-label` (Figtree) ; `--text-body`, `--text-small` (Atkinson Hyperlegible Next) ; `.counter` pour minuteur et compteur de rangs (chiffres tabulaires).
- Formes : `--radius-md` cartes et boutons, `--radius-pill` minuteur, compteur, badges, `--radius-sm` champs.
- Espacements : `--space-1/2/4/6` uniquement ; marge latérale mobile `--space-4`.

### Mains occupées (non négociable)

- Toute cible tactile ≥ `--tap-min` (48px) ; minuteur et +1 rang ≥ `--tap-primary` (72px), en bas d'écran, atteignables au pouce.
- Contraste texte ≥ 4.5:1.

### Ton

Calme, pratique, tutoiement. Jamais santé ni performance : « Session terminée — 42 min tricotées. » plutôt que « Objectif atteint ! ».
Icônes linéaires arrondies (Lucide, `lucide-react`), couleur `--ink` ou `--ink-muted`. Formes abstraites, pas d'illustrations de pelotes.

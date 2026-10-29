# BRAIN — mémoire du projet

- 2026-10-28 · Icônes : Phosphor Regular (`@phosphor-icons/react`), plus Lucide. Taille par défaut 24 via `IconContext` (App.tsx), sinon 1em. Phosphor ne met pas `aria-hidden` seul : l'ajouter (ou sur le parent).
- 2026-10-28 · Logo : tracés de la maquette Figma « Logo » dans `src/ui/Logo.tsx` (`Wordmark`). Icône d'app : `public/icon.svg` (rx="22", attendu par `scripts/generate-icons.mjs`).
- 2026-10-28 · Minuteur et compteur de rangs en Fraunces (`--text-counter*`). Fraunces n'a pas de chiffres tabulaires (`tabular-nums` sans effet) : chiffres enveloppés par `Digits` (1ch chacun), largeur constante vérifiée.
- 2026-10-28 · WebKit absent du conteneur cloud : e2e locaux via `--project='chromium*'`.
- 2026-10-29 · Graisse Phosphor selon la taille : ≤ 32 px regular, 33–64 px light, > 64 px thin.

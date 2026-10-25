# yarnest

Web-app to track knitting and encourage breaks.

PWA mobile-first, sans compte ni serveur : toutes les données vivent dans IndexedDB.
Spécification : [docs/SPEC.md](docs/SPEC.md) · consignes de développement : [CLAUDE.md](CLAUDE.md).

## Démarrer

Node 22.12 ou plus.

```sh
npm install
npm run dev        # serveur de développement
npm test           # tests unitaires (Vitest)
npm run test:e2e   # tests bout en bout (Playwright, Chromium + WebKit, 360/390/430 px)
npm run lint       # ESLint + Prettier
npm run build      # build de production
```

Si seul Chromium est installé : `PW_PROJECTS=chromium npm run test:e2e`.

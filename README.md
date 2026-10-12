# KFlow Academy — kflow.academy

The kflow.academy site, built from its `.lolo` organism (`std-kflow-site` in `@almadar-io/behaviors`) by `orb`.

## Layout

```
package.json       # the toolchain: @almadar/orb, @almadar/core, @almadar/orb-shell-typescript, std, behaviors
scripts/           # build-site.mjs (compile → vite build → route documents → prerender) + site-lib
static/            # files copied beside the build (favicon, images)
firebase.json      # Hosting (target prod → build/) and the Firestore rules for the kflow-b3a39 project
firestore.rules    # Firestore security rules (+ firestore.indexes.json)
.github/workflows/deploy-site.yml   # build and deploy on push to main
```

## Build

```bash
pnpm install --ignore-workspace
pnpm test
pnpm build          # → build/
```

`pnpm build` compiles the organism with the installed `orb` through the installed TypeScript shell. Inside the
monorepo, set `ORB_BIN` to use a local `orb`.

## Deploy

Pushing to `main` runs `deploy-site.yml`: install, test, build, then `firebase deploy --only hosting:prod`.

The previous application (the Vite + React client, the Express server and its App Hosting backend
`kflow-academy-server`) was removed on 2026-10-12; it remains in this repo's git history.

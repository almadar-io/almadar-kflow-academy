# KFlow Academy — kflow.academy

The kflow.academy site and the KFlow app, built from their `.lolo` organisms (`std-kflow-site` and `std-kflow` in `@almadar-io/behaviors`) by `orb`.

## Layout

```
package.json       # the toolchain: @almadar/orb, @almadar/core, @almadar/orb-shell-typescript, std, behaviors
scripts/           # build-site.mjs (site: compile → vite build → route documents → prerender), build-app.mjs (app client: orb compile --web-client) + site-lib
Dockerfile         # the std-kflow app: dist/client + `orb serve std-kflow.lolo --no-mock` (its own http server)
static/            # files copied beside the build (favicon, images)
firebase.json      # Hosting (target prod → build/) and the Firestore rules for the kflow-b3a39 project
firestore.rules    # Firestore security rules (+ firestore.indexes.json)
.github/workflows/deploy-site.yml   # build and deploy on push to main
.github/workflows/deploy-app.yml    # build the app image and deploy it to Cloud Run (manual)
```

## Build

```bash
pnpm install --ignore-workspace
pnpm test
pnpm build          # → build/       (the public site)
pnpm build:app      # → dist/client  (the app's client; the app's server serves it)
```

`pnpm build:app` runs `orb compile <std-kflow> --mode client --web-client`, which lays out the TypeScript
shell's prebuilt web client with the app's runtime files over it (what `orb serve` prepares for apps without
their own server). It needs no vite build.

`pnpm build` compiles the organism with the installed `orb` through the installed TypeScript shell. Inside the
monorepo, set `ORB_BIN` to use a local `orb`.

## Deploy

Pushing to `main` runs `deploy-site.yml`: install, test, build, then `firebase deploy --only hosting:prod`.

The app runs on Cloud Run as service `kflow-app` (europe-west4, project `kflow-b3a39`), deployed by running
`deploy-app.yml` by hand. It needs, once: an Artifact Registry repository `kflow`, and the Secret Manager secrets
the workflow names (Firebase service account, OpenRouter, OpenAI, DeepSeek and embedding keys, API key salt).
Hosting sends the app's routes to the service with a `run` rewrite to `kflow-app`.

The previous application (the Vite + React client, the Express server and its App Hosting backend
`kflow-academy-server`) was removed on 2026-10-12; it remains in this repo's git history.

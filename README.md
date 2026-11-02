# KFlow Academy — kflow.academy

The KFlow app, served by its `.lolo` organism `std-kflow` (in `@almadar-io/behaviors`) through `orb serve`:
the landing page, the signed-in learning pages, the web client and the API all come from the one program.

## Layout

```
package.json       # the toolchain: @almadar/orb, @almadar/core, @almadar/orb-shell-typescript, std, behaviors
apphosting.yaml    # Firebase App Hosting backend kflow-academy-server: build, run, instance size, env and secrets
scripts/           # build-app.mjs (client + resolved program), start-app.sh + orb-binary.mjs (run the native orb),
                   # watch-apphosting.mjs (CI verdict on a rollout), site-lib (pure helpers, tested)
static/            # files copied beside the client (favicon, images)
firebase.json      # the Firestore rules and indexes for the kflow-b3a39 project (database `kflow`)
firestore.rules    # Firestore security rules (+ firestore.indexes.json)
.github/workflows/watch-apphosting.yml   # goes red when App Hosting fails to build or roll out a main commit
```

## Build and run

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build          # → dist/client (the web client) + dist/app.orb (the resolved program)
pnpm start          # the native orb binary serves dist/app.orb (needs the env apphosting.yaml declares)
```

`pnpm build` runs `orb compile <std-kflow> --mode client --web-client`, which lays out the TypeScript shell's
prebuilt web client with the app's runtime files over it, then `orb resolve <std-kflow> -o dist/app.orb`, so the
server boots the resolved program without resolving it at start. Inside the monorepo, set `ORB_BIN` to use a
local `orb`.

Local runs use `std-kflow-dev` instead (every std-kflow orbital, its rows in the Firestore emulator on
127.0.0.1:8080, mock data seeded on start); std-kflow itself writes to production Firestore.

## Deploy

App Hosting builds and rolls out `main` itself (backend `kflow-academy-server`, us-central1, project
`kflow-b3a39`); `watch-apphosting.yml` reports that rollout back to GitHub. The secrets `apphosting.yaml` names
live in the project's Secret Manager.

Earlier deploy paths (the static std-kflow-site build on Hosting, and a hand-run Cloud Run container) are in
the monorepo's `archive/apps/kflow/`; the Vite + React client and Express server removed on 2026-10-12 remain
in this repo's git history.

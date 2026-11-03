<div align="center">

# KFlow Academy

**The KFlow learning app at kflow.academy, served by one `.lolo` program.**

[![Watch App Hosting rollout](https://github.com/almadar-io/almadar-kflow-academy/actions/workflows/watch-apphosting.yml/badge.svg)](https://github.com/almadar-io/almadar-kflow-academy/actions/workflows/watch-apphosting.yml)

</div>

KFlow Academy is the signed-in learning product plus its landing page, web client and API. All of it comes from the `std-kflow` organism in `@almadar-io/behaviors`, served by `orb serve`. This repo is the thin assembler: toolchain pins, the build script, the App Hosting config and the Firestore rules.

## Where this fits

```mermaid
flowchart TB
  subgraph kernel["Kernel and substrate"]
    core["orbital-core<br/>IR · evaluator · kernel"]
    canvas["orbital-canvas<br/>2D/3D render primitives"]
  end
  subgraph lang["Language"]
    lolo["orbital-lolo<br/>.lolo → .orb"]
    compiler["orbital-compiler<br/>validate · codegen"]
  end
  subgraph hosts["Shells and hosts"]
    ts["orbital-shell-typescript<br/>web · node · @almadar/core"]
    rs["orbital-shell-rust<br/>desktop · tui"]
    py["orbital-shell-python"]
    ios["orbital-shell-ios"]
    android["orbital-shell-android"]
    os["orbital-shell-os"]
    wasm["orbital-wasm<br/>browser kernel"]
    ffi["orbital-ffi<br/>C ABI for mobile"]
    router["orbital-router"]
  end
  cli["orbital-cli<br/>the orb binary"]
  ws["orbital-rust<br/>workspace · cross-crate tests"]
  dist["orb<br/>npm · releases"]
  subgraph pkgs["Language packages"]
    std["almadar-std<br/>@almadar/std substrate"]
    beh["behaviors<br/>themed organisms"]
    langs["lolo-ar · lolo-sl<br/>language packs"]
  end
  subgraph apps["Apps and sites"]
    builder["builder (studio)"]
    kflow["kflow-academy"]
    nata["nata"]
    rawi["rawi"]
    site["almadar (websites)"]
  end
  core --> lolo & compiler & ts & rs & py & ios & android & os & wasm & ffi & router
  canvas --> ts & rs & ffi
  lolo --> compiler
  compiler --> cli
  ts & rs & py & ios & android & os --> cli
  cli --> dist
  ws -.pins.-> core & lolo & compiler & cli
  dist --> std
  std --> beh
  std --> langs
  beh --> builder & kflow & nata & rawi & site
  click core "https://github.com/almadar-io/orbital-core"
  click canvas "https://github.com/almadar-io/orbital-canvas"
  click lolo "https://github.com/almadar-io/orbital-lolo"
  click compiler "https://github.com/almadar-io/orbital-compiler"
  click ts "https://github.com/almadar-io/orbital-shell-typescript"
  click rs "https://github.com/almadar-io/orbital-shell-rust"
  click py "https://github.com/almadar-io/orbital-shell-python"
  click ios "https://github.com/almadar-io/orbital-shell-ios"
  click android "https://github.com/almadar-io/orbital-shell-android"
  click os "https://github.com/almadar-io/orbital-shell-os"
  click wasm "https://github.com/almadar-io/orbital-wasm"
  click ffi "https://github.com/almadar-io/orbital-ffi"
  click router "https://github.com/almadar-io/orbital-router"
  click cli "https://github.com/almadar-io/orbital-cli"
  click ws "https://github.com/almadar-io/orbital-rust"
  click dist "https://github.com/almadar-io/orb"
  click std "https://github.com/almadar-io/almadar-std"
  click beh "https://github.com/almadar-io/behaviors"
  click langs "https://github.com/almadar-io/lolo-ar"
  click builder "https://github.com/itechdom/almadar-studio"
  click kflow "https://github.com/almadar-io/almadar-kflow-academy"
  click nata "https://github.com/almadar-io/almadar-nata"
  click rawi "https://github.com/almadar-io/almadar-rawi"
  click site "https://github.com/almadar-io/almadar"
  classDef here fill:#2563eb,color:#fff,stroke:#1e40af,stroke-width:3px
  
  class kflow here
```

| Upstream (this repo depends on) | Downstream (depends on this repo) |
|---|---|
| [behaviors](https://github.com/almadar-io/behaviors): the `std-kflow` organism this app serves | none inside the monorepo (an end application) |
| [almadar-std](https://github.com/almadar-io/almadar-std): the `.lolo` substrate the organism composes |  |
| [orb](https://github.com/almadar-io/orb): `@almadar/orb`, the binary that compiles, resolves and serves the program |  |
| [orbital-shell-typescript](https://github.com/almadar-io/orbital-shell-typescript): `@almadar/core` and `@almadar/orb-shell-typescript` (the prebuilt web client) |  |

## Quick start

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build          # -> dist/client (the web client) + dist/app.orb (the resolved program)
pnpm start          # the native orb binary serves dist/app.orb (needs the env apphosting.yaml declares)
```

`pnpm build` runs `orb compile <std-kflow> --mode client --web-client`, which lays the TypeScript shell's prebuilt web client out with the app's runtime files over it, then `orb resolve <std-kflow> -o dist/app.orb`, so the server boots the resolved program without resolving it at start. Inside the monorepo, set `ORB_BIN` to use a local `orb`.

Local runs use `std-kflow-dev` instead: every std-kflow orbital, its rows in the Firestore emulator on 127.0.0.1:8080, mock data seeded on start. `std-kflow` itself writes to production Firestore.

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

## Deploy

App Hosting builds and rolls out `main` itself (backend `kflow-academy-server`, us-central1, project `kflow-b3a39`); `watch-apphosting.yml` reports that rollout back to GitHub. The secrets `apphosting.yaml` names live in the project's Secret Manager. The earlier deploy paths (the static std-kflow-site build on Hosting, a hand-run Cloud Run container) are in the monorepo's `archive/apps/kflow/`; the Vite + React client and Express server removed on 2026-10-12 remain in this repo's git history.

## Development
```bash
pnpm install --frozen-lockfile
pnpm test
pnpm exec eslint --no-warn-ignored --max-warnings 0 <files you touched>
```
The app has no logic of its own: change the organism in [behaviors](https://github.com/almadar-io/behaviors) (or the atoms in [almadar-std](https://github.com/almadar-io/almadar-std)) and validate it with `orb validate`. Open gaps for this repo are in `Almadar_Gaps.md`. Work on `main` only; never branch, never publish from here (releases go through CI).

## Docs

- [Orb documentation](https://orb.almadar.io/docs): the language, the `orb` CLI and how the pieces fit

## License
No license file and no `license` field in `package.json`; the package is `private: true`.

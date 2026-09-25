<!-- Gap ledger for this repo: the source of truth for its open gaps. Managed with scripts/gaps-ledger.mjs in the Almadar monorepo. -->
# kflow-academy — open gaps

Every open gap this repo owns lives here. This file is the source of truth; the monorepo's `docs/Almadar_Gaps.md` only rolls it up.

- **One entry per gap:** `- **<code>** — <what is wrong and where>. <owning package> [mechanical|architectural] — <evidence, prevention rung>`. `[mechanical]` = small and well-scoped; `[architectural]` = needs design judgment.
- **Codes:** new gaps use this repo's prefix `G-KFLOW-`. Take the "Next code" below, then bump it in the same edit. Codes are never reused or renamed.
- **Close by deleting.** Remove the entry in the same commit as the fix. There is no "closed" section; git history is the record.
- **Cross-repo gaps don't go here.** If fixing it needs another repo, describe it in your report or PR body; the monorepo coordinator files it.

Next code: `G-KFLOW-001`

## Open gaps

### Apps tier

- **G-APPS-001** — `apps/kflow/packages/server`'s test suite cannot run locally: `node --experimental-vm-modules node_modules/.bin/jest` mis-invokes the jest wrapper as JS; fixing that surfaces `jest.mock` used without `@jest/globals` under ESM, plus a `jose`/`firebase-admin` ESM-only import failure. `[mechanical but multi-step: fix the test script invocation, fix ESM jest config, resolve the jose import via transformIgnorePatterns or an ESM-compatible mock — never downgrade firebase-admin. Verify: suite RUNS with real pass/fail counts, doesn't need to be 100% green]` — orig: `Almadar_Kflow_Sdk_Gaps.md` → item 12

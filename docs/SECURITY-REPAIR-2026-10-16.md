# Dependency repair, 2026-10-16

Files to carry back: `package.json`, `pnpm-lock.yaml`. No remote mutation was performed.

Changes:
- Upgrade DOMPurify 3.3.3 → 3.4.16 and ws 8.19.0 → 8.21.0, within their existing major versions.
- Remove unused runtime dependency `mem0ai`. Current production `src/lib/memory.ts` explicitly supports only `honcho` and `none`; no production TypeScript imports Mem0. This removes its eager peer-SDK tree, including vulnerable protobufjs/proxy-addr/braces. Existing memory files/sentinel names are preserved.
- Pin development host SDK OpenClaw to its already-tested lock version 2026.3.23. Its newest release changes the SDK and is outside this repair.
- No security overrides, ignored advisories, or audit suppressions.

Verified:
- Isolated `pnpm install --ignore-scripts --prefer-offline`: PASS (pnpm 10.28.2).
- `pnpm audit --prod`: **0 advisories**, down from 156 (2 critical, 44 high, 97 moderate, 13 low). Raw result: `audit-after-runtime.json`.
- `node node_modules/typescript/bin/tsc --noEmit`: PASS.
- Full `pnpm build`: PASS, including native better-sqlite3 rebuild, UI build, plugin and standalone bundles, UI packaging.
- Existing Hermes/OpenRouter chat endpoint regressions: **5/5 PASS**. These mock providers and make no paid requests.

Remaining:
- All-dependency/dev audit still reports 456 advisories (13 critical, 155 high, 245 moderate, 43 low), with 268 advisories on the pinned OpenClaw itself. Raw result: `audit-after-all.json`. This repair clears the production dependency audit; it does not claim the old OpenClaw host or development toolchain is secure.
- The legacy manual `tests/smoke-memory.mjs` still imports `scripts/load-mem0-oss.mjs`. It tests a provider removed from the production facade; it is not part of CI or these passing regressions. Reintroducing Mem0 would require a separate dependency/security review. Do not run that legacy smoke test against live API keys.
- DOMPurify/ws latest releases are slightly newer (3.4.17/8.22.0); chosen versions are the minimum advisory-clearing compatible updates.
- No live deployment/provider verification was performed by this subtask.

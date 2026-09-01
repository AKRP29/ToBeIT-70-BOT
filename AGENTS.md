# Repository guidance for coding agents

Read `MCTOOL.md` before making changes. This repository operates the ToBeIT — IT KMITL Discord bot and is handed between MC Tool generations.

## Product priority

Camper verification is the critical path. Preserve the behavior and security of `func/verify.ts`, `func/force-verify.ts`, and `api/get-discord.ts`. Do not change the camper role, guild IDs, nickname format, ToBeIT API contract, or required Discord permissions without explicitly documenting and validating the operational impact.

## Safety and privacy

- Never commit `.env`, Discord tokens, API keys, SSH private keys, or camper personal data.
- Do not log secrets or full camper records.
- Use a test bot and test guild for behavior changes when possible.
- Production `.env` lives only at `/opt/tobeit-70-bot/.env` on the VPS.
- Public pull requests must remain isolated from the GitHub `production` Environment and all VPS secrets.

## Runtime and validation

- Runtime: Bun; entrypoint: `index.ts`.
- Development: `bun run dev`; production: `bun index.ts` through systemd.
- Keep `bun.lock` synchronized and use `bun install --frozen-lockfile` in CI/deployment.
- Do not claim `bun run test` is a real test: it is currently a failing placeholder.
- Repository-wide TypeScript checking currently fails because the standalone `discord-role-assigner.ts` has undeclared dependencies. Report this honestly or fix it deliberately; do not hide it by weakening TypeScript settings.
- After changes to verification, manually validate the end-to-end checklist in `MCTOOL.md` or add automated coverage.

## Documentation

Update `MCTOOL.md` whenever architecture, commands, Discord IDs, environment variables, deployment, operations, known issues, or ownership expectations change. Optimize documentation for the next student team, not only the current implementation.

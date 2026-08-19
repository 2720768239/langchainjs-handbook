# Repository Guidelines

## Project Structure & Module Organization

This repository is a Chinese LangChain.js handbook built with VitePress. Chapters live in `docs/guide/`; the home page, glossary, playground, and compatibility notes are under `docs/`. Static WebP assets belong in `docs/public/images/` or `docs/public/screenshots/`.

Site configuration and the browser playground live in `docs/.vitepress/`. Vue components are in `theme/components/`, exercises in `theme/playground/exercises/chNN.ts`, and deterministic offline substitutes in `theme/playground/sandbox/`. Runnable real-SDK examples live in `examples/`; repository checks live in `scripts/`.

## Build, Test, and Development Commands

- `npm ci` installs lockfile-pinned dependencies; use Node.js 22+.
- `npm run dev` starts VitePress on `http://127.0.0.1:5173/`.
- `npm run check` runs type checking, Oxlint, Prettier verification, local-link and documentation-snippet checks, plus all tests.
- `npm run ci` adds the production build and bundle-size budget; run it before submitting.
- `npm run format` formats TypeScript, Vue, CSS, JSON, and YAML.
- `npm run optimize:images` converts new PNG/JPEG assets to WebP and updates references.

## Coding Style & Naming Conventions

Use strict TypeScript, ES modules, two-space indentation, semicolons, and double quotes. Prettier and Oxlint enforce style. Use `camelCase` for values/functions and `PascalCase` for Vue components/types. Name chapter files and exercise IDs consistently, for example `ch05.ts` and `ch05-agent-memory`. Keep handbook prose concise and in Chinese.

## Testing Guidelines

The playground uses a custom deterministic harness. Every exercise needs a working `solution`, meaningful assertions, and a demo with visible output. Real SDK and MCP examples must pass `npm run test:samples`. Do not weaken tests to accommodate nondeterministic network behavior.

## Commit & Pull Request Guidelines

History favors short, imperative summaries such as `Simplify README for readers`. Keep commits focused. Pull requests should explain reader-facing behavior, list validation performed, link relevant issues, and include screenshots for visual changes. Call out navigation, dependency, asset, or deployment changes.

## Security & Performance

Never commit API keys or `.env` files. Keep network-backed examples outside browser exercise verification. Respect the CI budgets: 8 MB total output, 1,300 KB maximum JavaScript chunk, and 100 KB maximum image.

# AGENTS.md

Bootstrap guide for contributors and coding agents working in this repository.

## Stack

- Framework: Next.js 15 (App Router) + React 18.
- Language: TypeScript (`strict: true`).
- Styling: Tailwind CSS + `tailwindcss-animate`.
- UI primitives: Radix UI + shadcn/ui structure (`components.json`).
- Data/Auth: Supabase (`@supabase/ssr`, `@supabase/supabase-js`).
- AI: OpenRouter runtime client (`src/lib/ai/openrouter.ts`) with AI flows in (`src/ai/*`).
- Email: Resend integration (`src/lib/email`).
- Payments: Kashier integration (`src/lib/kashier.ts`).
- Runtime requirement: Node.js >= 20.

## Architecture At A Glance

- App Router entrypoint is under `src/app`.
- Public site routes live in `src/app/(main)`.
- Admin panel lives in `src/app/admin`.
- Super admin area lives in `src/app/super-admin`.
- API handlers live in `src/app/api`.
- Cross-route auth/session guard is in `src/middleware.ts`.
- Shared UI components live in `src/components`.
- Business/data helpers live in `src/lib` (Supabase, email, PDF, payment, utilities).
- AI flows live in `src/ai`; OpenRouter runtime helper lives in `src/lib/ai/openrouter.ts`.

## Key Directories

- `src/app`: App Router pages, layouts, route groups, server actions.
- `src/components`: Reusable UI and feature components.
- `src/lib`: Service clients and domain helpers.
- `src/lib/supabase`: Supabase clients, auth/session helpers, data access.
- `src/locales`: Translation JSON and locale loader.
- `supabase/migrations`: SQL migrations for schema changes (currently empty in this workspace).
- `public`: Static assets.
- `docs`: Planning and documentation artifacts.

## Coding Conventions

- Use path alias imports with `@/*` (configured in `tsconfig.json`).
- Keep TypeScript strictness intact; do not bypass with `any` unless justified.
- Follow App Router conventions:
  - Server components by default.
  - Add `'use client'` only when browser APIs/state are required.
  - Add `'use server'` in server action modules.
- Keep server-only secrets in server-side code paths (`src/lib/supabase/server.ts`, API routes, server actions).
- Use existing lint/format rules before merging:
  - ESLint extends `next/core-web-vitals` and `next/typescript`.
  - Prettier: single quotes, semicolons, width 100, trailing commas `es5`.

## Environments And Secrets

- Local env file used in this repo: `.env.local`.
- Create and maintain `.env.example` with non-secret placeholders. [TODO]

Known env keys referenced in code:

- Core app/Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_AGENCY_SLUG` (optional/tenant context)
  - `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` (fallback super-admin check)
- Email:
  - `RESEND_API_KEY`
  - `RESEND_FROM_NAME`
  - `RESEND_FROM_EMAIL`
- Payments (Kashier):
  - `KASHIER_MERCHANT_ID`
  - `KASHIER_SECRET_KEY`
  - `KASHIER_API_KEY`
  - `KASHIER_MERCHANT_REDIRECT_URL`
  - `KASHIER_MODE` (`test` or `live`)
  - `KASHIER_CURRENCY` (defaults to `EGP`)
  - `KASHIER_HPP_BASE_URL`
  - `KASHIER_ALLOWED_METHODS`
  - `KASHIER_DISPLAY`
- AI (OpenRouter):
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_BASE_URL` (optional; defaults to `https://openrouter.ai/api/v1`)
  - `OPENROUTER_FREE_MODELS` (optional CSV model list)
  - `OPENROUTER_HTTP_REFERER` (optional)
  - `OPENROUTER_APP_NAME` (optional)
- Translation (Lingva):
  - `LINGVA_BASE_URL` (optional; defaults to `https://lingva-translatevercel.vercel.app`)

## Commands

- Install deps: `npm install`
- Run app locally: `npm run dev` (port `9003`)
- AI runtime executes in-process via server actions; no separate AI dev server is required.
- Build production bundle: `npm run build`
- Start production server: `npm run start`
- Lint: `npm run lint`
- Strict lint (no warnings): `npm run lint:check`
- Type-check: `npm run typecheck`
- Format: `npm run format` or `npm run format:fix`
- CI quality gate: `npm run ci`

## Testing

- No dedicated test runner script is currently defined in `package.json`.
- No `*.test.*` / `*.spec.*` files were found at the time this file was created.
- Current quality baseline:
  - `npm run lint:check`
  - `npm run typecheck`
  - `npm run ci`
- Test strategy placeholders:
  - Unit test framework: [TODO]
  - E2E test framework: [TODO]
  - Required coverage threshold: [TODO]

## Deployment

- Hosting config exists in `apphosting.yaml` (Firebase App Hosting style config).
- Current run config sets `maxInstances: 1`.
- Production build/start commands are standard Next.js (`npm run build`, `npm run start`).
- Deployment pipeline details (provider, environments, rollout policy): [TODO]
- Required production env inventory and ownership: [TODO]

## Gotchas

- `next.config.ts` currently ignores TypeScript and ESLint build errors:
  - `typescript.ignoreBuildErrors: true`
  - `eslint.ignoreDuringBuilds: true`
    This can allow bad builds unless `npm run ci` is enforced.
- `npm run dev` uses port `9003` (not Next.js default `3000`).
- `src/middleware.ts` enforces admin/super-admin redirects; route changes should be checked against auth flow.
- `src/locales/index.ts` and `use-language` metadata must both be updated when adding a language.
- `supabase/migrations` is present but currently empty; establish migration workflow before schema changes. [TODO]

## Quick Change Checklist

- Run `npm run ci` before opening a PR.
- Verify env vars for any feature touching Supabase, email, payments, or AI.
- If routing/auth changed, manually test `/admin`, `/admin/dashboard`, and `/super-admin` flows.
- If localization changed, verify keys exist across all locale JSON files.

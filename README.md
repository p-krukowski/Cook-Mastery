# Cook Mastery

![version](https://img.shields.io/badge/version-0.0.1-blue)
![node](https://img.shields.io/badge/node-22.14.0-339933?logo=node.js&logoColor=white)
![astro](https://img.shields.io/badge/Astro-5-FF5D01?logo=astro&logoColor=white)
![license](https://img.shields.io/badge/license-TBD-lightgrey)

## Project description

Cook Mastery is a web app that helps people learn cooking fundamentals by combining curated tutorials and knowledge articles that explain not only *how* to do something, but *why it works*.

Core product idea (MVP):
- Learn through structured, plain-text tutorials and articles organized by **level** and **difficulty weight (1–5)**.
- Track progress with simple actions: **“Mark as passed”** (tutorials) and **“Mark as read”** (articles). No quizzes/validation.
- Keep a private **cookbook** of saved internet recipe links with your own title and notes.
- Get **recommendations based on your manually selected level**, with **new content surfaced first**.

**Table of contents**
- [Tech stack](#tech-stack)
- [Hosting platform analysis process](#hosting-platform-analysis-process)
- [Hosting & deployment (Cloudflare)](#hosting--deployment-cloudflare)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

> **📦 Deployment Guide**: For detailed instructions on deploying to Cloudflare Pages, see [.github/CLOUDFLARE_DEPLOYMENT.md](.github/CLOUDFLARE_DEPLOYMENT.md)

## Tech stack

- **Astro 5** (static-first; Cloudflare Pages target; optional SSR via Workers) + sitemap
- **TypeScript 5**
- **React 19**
- **Tailwind CSS 4**
- **shadcn/ui** (UI components approach)

Developer tooling:
- ESLint + TypeScript ESLint + Astro/React plugins
- Prettier (incl. `prettier-plugin-astro`)
- Husky + lint-staged (pre-commit formatting/lint fixing)

Testing:
- Unit: **Vitest** (with Testing Library + jsdom)
- E2E: **Playwright** (Chromium/Desktop Chrome)

## Hosting platform analysis process

This project started as a free side project, but may evolve into a commercial product. Hosting decisions are therefore evaluated using a repeatable process that tries to optimize for **low current cost** while avoiding **forced migrations** later.

### 1) Identify the framework’s runtime model (drives hosting)
- **Astro is static-first**, but can require a server runtime when you enable **SSR**, **API routes**, or other dynamic features.
- This leads to two fundamentally different hosting shapes:
  - **Static hosting** (serve build artifacts from a CDN; lowest ops + cost)
  - **Server/edge compute hosting** (run SSR and endpoints; more constraints/cost)

### 2) Define the required “environments” early
Decide which of these must exist and be isolated:
- **Production** (stable, monitored)
- **Preview** (per-PR/per-branch)
- **Staging** (long-lived, production-like; separate domain and secrets)

Key question: can the platform do this cleanly without hacks like “one giant environment with manual toggles”?

### 3) Check compatibility constraints (avoid hidden rewrites)
For each candidate platform, explicitly test/confirm:
- **Static deployment** support (straightforward for almost all platforms)
- **SSR runtime compatibility**:
  - **Full Node.js** runtimes (most compatible with the ecosystem)
  - **Edge runtimes** (fast + cheap at scale, but not full Node; may break Node-only deps)
- **Build pipeline constraints** (build timeouts, build concurrency, artifact limits)

### 4) Evaluate the “commercialization cliff”
Many platforms have a sharp transition from “hobby” to “commercial”:
- **Commercial use restrictions** on free tiers (you may need to upgrade to monetize)
- **Hard monthly caps** that can pause/limit service
- **Team/seat pricing** that becomes the first real cost once you collaborate

Concrete example of what we track: build limits, request limits for dynamic compute, and any “non-commercial only” clauses.

### 5) Score for migration risk, not just today’s convenience
We prefer platforms that keep options open:
- Can we switch from **static → SSR** without rewriting the app?
- Does the runtime choice (Node vs edge) force us into specific libraries/patterns?
- Can we move later to containers if needed (Cloud Run/Fly/etc.) without redesigning everything?

Current chosen target is documented in the next section.

## Hosting & deployment (Cloudflare)

This project is designed to deploy on **Cloudflare Pages**, using Astro’s static output by default.

### Operational model
- **Default (recommended)**: **Static site** deployed to **Cloudflare Pages** (cheap, simple, minimal runtime surface area).
- **If/when needed**: **SSR / API routes** can run as **Cloudflare Pages Functions (Workers runtime)**. This generally requires switching the Astro build target to the Cloudflare adapter (`@astrojs/cloudflare`), because the Node SSR adapter is not a runtime match for Cloudflare.

### Environments
- **Production**: `main` (or `dev`, depending on repo flow) deploys to the production Pages project + custom domain.
- **Preview**: Cloudflare Pages supports **unlimited preview deployments** per project for PRs/branches.
- **Staging (optional, “startup-ready”)**: use a **separate Pages project** (separate domain + separate env vars/secrets) to avoid coupling staging to preview behavior.

### Limits and pricing considerations (important for scale)
- **Cloudflare Pages (Free plan)** limits include **500 builds/month**, **20-minute build timeout**, **20,000 files per site**, and **25 MiB max single asset**. Large assets should go to object storage (e.g., Cloudflare R2) and be served from a separate domain.
- **Dynamic requests** (Pages Functions) are billed as **Cloudflare Workers**:
  - Workers **Free**: **100,000 requests/day**
  - Workers **Paid**: **$5/month minimum**, includes **10 million requests/month** (then **$0.30 per additional million**) and CPU-time-based billing.

### Compatibility caveat (avoid surprises later)
If you introduce server-side code, remember that **Workers are not full Node.js**. Node-only dependencies (filesystem access, some native modules, certain Node APIs) may not work without refactors or replacements.

## Getting started locally

### Prerequisites
- **Node.js 22.14.0** (pinned in `.nvmrc`)
- npm (or your preferred Node package manager)

### Setup

```bash
# 1) Clone
git clone <your-repo-url>
cd <your-repo-folder>

# 2) Use the pinned Node version (recommended)
nvm install
nvm use

# 3) Install deps
npm install

# 4) Run the dev server
npm run dev
```

Dev server runs at `http://localhost:3000` (configured in `astro.config.mjs`).

## Available scripts

- `npm run dev` — start the development server.
- `npm run build` — build the production site.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run ESLint across the repo.
- `npm run lint:fix` — run ESLint and auto-fix issues where possible.
- `npm run format` — format files with Prettier.
- `npm run astro` — run the Astro CLI.
- `npm run test` — run unit tests (one-off).
- `npm run test:unit` — run unit tests (one-off).
- `npm run test:unit:watch` — run unit tests in watch mode.
- `npm run test:unit:ui` — run unit tests with the Vitest UI.
- `npm run test:unit:coverage` — run unit tests with coverage.
- `npm run test:e2e:install` — install Playwright Chromium.
- `npm run test:e2e` — run E2E tests (starts dev server automatically).
- `npm run test:e2e:ui` — run E2E tests with the Playwright UI.
- `npm run test:e2e:report` — open the Playwright HTML report.

## Project scope

### In scope (MVP)

**Authentication & security**
- Sign up (email, username, password, initial level), login/logout.
- Secure sessions (cookie flags) + password hashing + basic anti-abuse protections (e.g., rate limiting/lockouts).
- Authenticated-only access for progress actions and cookbook features.

**Learning content**
- Tutorials with categories (**Practical**, **Theoretical**, **Equipment**), levels (Beginner/Intermediate/Experienced), difficulty weight (1–5), and a consistent text structure (summary, main content, steps/sections, practice recommendations, key takeaways).
- Articles with level + difficulty weight, and a consistent text structure (summary, main content, key takeaways).

**Progress & recommendations**
- Mark tutorial as **passed** and article as **read** (idempotent); no undo in MVP.
- Completion % is computed per selected level across **tutorials + articles**; eligible to advance when completion is **≥ 85%**.
- “Out of date” status when new content drops completion below **85%** (no auto-downgrade).
- Recommendations follow the user’s **manually selected** level; newly added content should be surfaced first.

**Cookbook**
- Save recipe links (URL + custom title + notes), view list, and edit entries; entries are private per user.
- No recipe parsing in MVP.

**Admin/content operations**
- Tutorials and articles are added manually by admins; CRUD API is required for management.

**Analytics (for success metrics)**
- Track events: signup, tutorial passed, article read, recipe added.
- KPIs are measured within 48 hours of signup, with targets:
    - 90% pass at least one tutorial
    - 50% read at least one article
    - 30% add at least one recipe link

### Out of scope (MVP)
- User-generated/public tutorials or recipes; comments/ratings/social features.
- Rich multimedia (video hosting, interactive embeds).
- Search, tags, filters, or personalized recommendations beyond level selection.
- Adaptive learning paths, quizzes, or learning validation.
- Undo actions (unpass/unread).
- Advanced account flows (password reset, email verification, deletion/export).
- Licensing/copyright verification (handled externally).

## Project status

- **MVP in progress / early-stage implementation**, guided by the product spec in `prd.md`.
- Current package version: **0.0.1**.
- Platform: **web-only** MVP.

## License

Distributed under the MIT License.

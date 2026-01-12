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
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Tech stack

- **Astro 5** (with Node adapter + sitemap)
- **TypeScript 5**
- **React 19**
- **Tailwind CSS 4**
- **shadcn/ui** (UI components approach)

Developer tooling:
- ESLint + TypeScript ESLint + Astro/React plugins
- Prettier (incl. `prettier-plugin-astro`)
- Husky + lint-staged (pre-commit formatting/lint fixing)

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

Astro’s dev server typically starts at `http://localhost:4321`.

## Available scripts

- `npm run dev` — start the development server.
- `npm run build` — build the production site.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run ESLint across the repo.
- `npm run lint:fix` — run ESLint and auto-fix issues where possible.
- `npm run format` — format files with Prettier.
- `npm run astro` — run the Astro CLI.

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

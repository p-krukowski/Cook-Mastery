## Tech Stack

- Astro 5
- TypeScript 5
- React 19
- Tailwind 4
- Shadcn/ui

## Hosting / Deployment Target (chosen)

**Cloudflare Pages** is the primary deployment target.

- **Default model**: **SSR build** deployed to **Cloudflare Pages** using the `@astrojs/cloudflare` adapter.
- The project is configured to use the **Cloudflare adapter** for production builds (triggered by `CLOUDFLARE_ENV` environment variable).
- For local development, the **Node adapter** (`@astrojs/node`) is used by default.
- **Cloudflare Pages Functions** (Workers runtime) handles SSR and server endpoints.

### Cloudflare constraints to design around
- **Pages (Free plan)**: **500 builds/month**, **20-minute build timeout**, **20,000 files per site**, **25 MiB max single asset**.
- **Pages Functions billing**: billed as **Workers**.
  - Workers **Free**: **100,000 requests/day**.
  - Workers **Paid**: **$5/month minimum**, includes **10 million requests/month** (then **$0.30 per additional million**) with CPU-time-based billing.

### Practical implications for the codebase
- Keep the "happy path" **static-first** (content pages, marketing pages, docs, most UI).
- Treat server-side code as **Workers runtime code**, not general Node.js. Avoid Node-only APIs/libraries in server paths.

## Testing

### Unit tests

- Vitest

### E2E tests

- Playwright (Chromium/Desktop Chrome)

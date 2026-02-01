// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
  },
  adapter:
    // eslint-disable-next-line no-undef
    process.env.CF_PAGES === "1" || process.env.CLOUDFLARE_ENV
      ? cloudflare({
          platformProxy: {
            enabled: true,
          },
        })
      : node({
          mode: "standalone",
        }),
});

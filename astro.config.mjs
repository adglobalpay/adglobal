// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Si usas Tailwind vía el plugin oficial, también:
// import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: 'https://adglobalpay.github.io', // tu user orginal
  base: '/adglobal/',                    // nombre exacto del repo (Project Pages)
  trailingSlash: 'ignore',
  integrations: [
    react(),
    // tailwind()
  ],
});

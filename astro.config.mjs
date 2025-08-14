// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://adglobalpay.github.io',
  base: '/adglobal/',            // nombre EXACTO del repo
  trailingSlash: 'ignore',
  integrations: [react()],
});

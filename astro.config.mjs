// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://www.adglobalpay.com', // <— tu dominio real
  // No base aquí
  trailingSlash: 'ignore',
  integrations: [react()],
});


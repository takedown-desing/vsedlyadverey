import { defineConfig } from 'astro/config';

// GitHub Pages: https://<user>.github.io/<repo>/
// Домен клиента: вседлядверей.рф (punycode xn--b1aafadda6an7ce5o.xn--p1ai, зарегистрирован 23.09.2026).
// При переезде: SITE_URL=https://xn--b1aafadda6an7ce5o.xn--p1ai BASE_PATH=/ npm run build
export default defineConfig({
  site: process.env.SITE_URL || 'https://takedown-desing.github.io',
  base: process.env.BASE_PATH ?? '/vsedlyadverey',
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
});

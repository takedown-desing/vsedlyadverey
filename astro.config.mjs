import { defineConfig } from 'astro/config';

// GitHub Pages: https://<user>.github.io/<repo>/
// Домен клиента: ручкидлядверей.рф (punycode xn--b1adafanmbl0ch2a6c0g.xn--p1ai, REG.RU).
// При переезде: SITE_URL=https://xn--b1adafanmbl0ch2a6c0g.xn--p1ai BASE_PATH=/ npm run build
export default defineConfig({
  site: process.env.SITE_URL || 'https://takedown-desing.github.io',
  base: process.env.BASE_PATH ?? '/vsedlyadverey',
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
});

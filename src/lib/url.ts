// Префикс base (GitHub Pages: /vsedlyadverey). Все внутренние ссылки — только через u().
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
export const u = (path: string | null | undefined) => {
  if (!path) return '';
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  return BASE + (path.startsWith('/') ? path : '/' + path);
};
export const abs = (site: URL | undefined, path: string) => new URL(u(path), site ?? 'https://example.com').toString();

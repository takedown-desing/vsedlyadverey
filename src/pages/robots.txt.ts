import type { APIContext } from 'astro';
import { abs, u } from '../lib/url';
// пути через u(): в подпапке GitHub Pages получается /vsedlyadverey/admin/, на своём домене /admin/
export function GET({ site }: APIContext) {
  const body = `User-agent: *
Disallow: ${u('/admin/')}
Disallow: ${u('/go/')}
Disallow: ${u('/search/')}
Disallow: ${u('/cart/')}
Disallow: /*?q=
Disallow: /*?utm_

User-agent: Yandex
Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content&yclid&gclid&color ${u('/')}

Sitemap: ${abs(site, '/sitemap.xml')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}

import type { APIContext } from 'astro';
import { abs } from '../lib/url';
export function GET({ site }: APIContext) {
  const body = `User-agent: *
Disallow: /*/admin/
Disallow: /*/go/
Disallow: /*/search/
Disallow: /*/cart/
Disallow: /*?q=
Disallow: /*?utm_

User-agent: Yandex
Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content&yclid&gclid&color /

Sitemap: ${abs(site, '/sitemap.xml')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}

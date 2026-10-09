// Единый слой данных сайта: реестр страниц (SEO-проектирование), товары, тексты.
// Контент лежит в src/cms/ (один файл = одна сущность) и редактируется через админку /admin/ (Sveltia CMS).
import registryRaw from '../data/registry.json';
import catalogSettings from '../cms/settings/catalog.json';
import siteSettings from '../cms/settings/site.json';
import homeSettings from '../cms/settings/home.json';
import prevUrlMap from '../cms/settings/url-map.json';
import prevAutoRedirects from '../cms/settings/redirects-auto.json';
import manualRedirects from '../cms/settings/redirects.json';

export type RegPage = { url: string; h1: string; type: string; priority: string; primaryKw: string; ws: number; parent: string; note: string };
export type Variant = { finish: string; color: string; article?: string; price: number | null; inStock?: boolean; image: string | null; imageSrc?: string };
export type Product = {
  slug: string; name: string; brand: string; series: string | null; category: string; article?: string;
  variants: Variant[]; material?: string | null; style?: string | null; doorTypes?: string[];
  specs?: Record<string, string>; description?: string; sourceUrl?: string;
  extraCategories?: string[]; // дополнительные разделы, где товар тоже показывается
  order?: number; // порядок в листингах (меньше = выше), задаётся в админке
  hidden?: boolean | string; hiddenNote?: string; // товар снят с публикации (галочка в админке)
  intro?: string; blocks?: Block[]; faq?: { q: string; a: string }[];
};
export type Block = { type: string; title?: string; [k: string]: any };
export type Seo = { noindex?: boolean; canonical?: string; ogImage?: string };
export type PageText = Seo & { url: string; title?: string; description?: string; h1?: string; lead?: string; text?: string; blocks?: Block[]; faq?: { q: string; a: string }[] };
// раздел каталога из админки (src/cms/sections): адрес строится из родителя и slug
export type Section = PageText & { file: string; slug?: string; parent?: string; kind?: 'section' | 'tag'; inMenu?: boolean; menuName?: string; icon?: string; order?: number | null; priority?: string };
export type ProductText = { slug: string; intro?: string; blocks?: Block[]; faq?: { q: string; a: string }[] };
export type BrandCat = { title?: string; description?: string; lead?: string; text?: string };
export type BrandText = {
  slug: string; name: string; country?: string; founded?: string; segment?: string; tagline?: string; title?: string; description?: string; text?: string;
  series?: string[]; categories?: Record<string, BrandCat>;
};
export type Article = { slug: string; order?: number; hub: string; title: string; description: string; h1: string; date: string; author: string; readingMinutes?: number; body: string; faq?: { q: string; a: string }[]; related?: string[] };
export type Service = { url: string; title: string; description: string; h1: string; body: string };
export type Series = { slug: string; name: string; brand: string; title?: string; description?: string; text?: string };

import { COMPANY } from './company';
export const SITE_NAME = COMPANY.brand;
export const PHONE = COMPANY.phoneMain;
export const EMAIL = COMPANY.email;
export const SITE = siteSettings as Record<string, any>;
export const HOME = homeSettings as Record<string, any>;

// OFF: страницы, отключённые клиентом (сейчас это B2B-раздел), на сайт не попадают вовсе
// Разделы каталога (category/subcategory/tag) и рубрики блога берутся не из реестра проектирования, а из админки:
// редактор может создать любой раздел. Остальные страницы (бренды, серии, типы дверей, служебные) остаются в реестре.
const CMS_TYPES = new Set(['category', 'subcategory', 'tag', 'blog-hub']);
const KEEP_URLS = new Set(['/catalog/', '/catalog/komplekty-furnitury/', '/blog/']);
const regBase = (registryRaw as RegPage[]).filter((p) => p.priority !== 'OFF' && (!CMS_TYPES.has(p.type) || KEEP_URLS.has(p.url))).map((p) => ({ ...p, h1: p.h1.replace(/\s+—\s+/g, ': ') }));

// ---------- загрузка JSON-файлов: каждый файл в папке = одна запись (так их правит админка)
function loadArray<T>(mods: Record<string, unknown>): T[] {
  const out: T[] = [];
  for (const k of Object.keys(mods).sort()) {
    const d = (mods[k] as { default?: unknown }).default ?? mods[k];
    if (Array.isArray(d)) out.push(...(d as T[]));
    else if (d && typeof d === 'object') out.push(d as T);
  }
  return out;
}
const productMods = import.meta.glob('../cms/products/*.json', { eager: true });
const pagesMods = import.meta.glob('../cms/pages/*.json', { eager: true });
const sectionMods = import.meta.glob('../cms/sections/*.json', { eager: true });
const hubMods = import.meta.glob('../cms/blog-hubs/*.json', { eager: true });
// имя файла записи (slug в админке): запасной адрес, если поле «Адрес» не заполнено
const fileSlug = (path: string) => path.split('/').pop()!.replace(/\.json$/, '');
// транслитерация для адресов: новые записи админки могут называться кириллицей («дверные-ручки.json»)
const TR: Record<string, string> = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'j',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
export const translit = (s: string) => String(s || '').toLowerCase().replace(/[а-яё]/g, (c) => TR[c] ?? c).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const urlPart = (custom: unknown, file: string) => translit(String(custom || '').trim().replace(/^\/+|\/+$/g, '').split('/').pop() || '') || translit(file);
function loadWithFile<T>(mods: Record<string, unknown>): (T & { file: string })[] {
  return Object.keys(mods).sort().map((k) => { const d = ((mods[k] as { default?: unknown }).default ?? mods[k]) as T; return d && typeof d === 'object' ? { ...(d as T), file: fileSlug(k) } : null; }).filter((x): x is T & { file: string } => !!x);
}
const brandsMods = import.meta.glob('../cms/brands/*.json', { eager: true });
const seriesMods = import.meta.glob('../cms/series/*.json', { eager: true });
const articlesMods = import.meta.glob('../cms/articles/*.json', { eager: true });
const serviceMods = import.meta.glob('../cms/service/*.json', { eager: true });

// Таблицы в админке хранятся строками «ячейка | ячейка»; характеристики товара списком {k, v}.
const splitRow = (r: unknown): string[] => (Array.isArray(r) ? r.map(String) : String(r ?? '').split(/\s*\|\s*/));
export function normBlocks(blocks: unknown): Block[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter((b) => b && typeof b === 'object' && (b as Block).type).map((b) => {
    const x = { ...(b as Block) };
    if (x.type === 'table') { x.head = splitRow(x.head); x.rows = (x.rows || []).map(splitRow); }
    if (x.type === 'checklist') x.items = (x.items || []).map((i: any) => (typeof i === 'string' ? i : i?.text || i?.title || ''));
    return x;
  });
}
const specsRecord = (s: unknown): Record<string, string> => {
  if (Array.isArray(s)) return Object.fromEntries(s.filter((x) => x && x.k).map((x) => [String(x.k).trim(), String(x.v ?? '').trim()]));
  return (s && typeof s === 'object' ? s : {}) as Record<string, string>;
};

// Стартовые бренды (ответ клиента: «Стартуем с фабриками Colombo, TUPAI»). Сборка с LAUNCH_ONLY=1 оставляет в каталоге только их.
export const LAUNCH_BRANDS: string[] = (catalogSettings as any).launchBrands || ['colombo-design', 'tupai'];
export const LAUNCH_ONLY = typeof process !== 'undefined' && process.env.LAUNCH_ONLY === '1';
export const COLOR_NAMES: Record<string, string> = { black: 'чёрный', chrome: 'хром', gold: 'золото', bronze: 'бронза', nickel: 'никель', brass: 'латунь', white: 'белый', graphite: 'графит', copper: 'медь', silver: 'серебро', other: 'другое' };

// ---------- разделы каталога и рубрики блога из админки → строки реестра
const SECTIONS = loadWithFile<Section>(sectionMods).filter((s) => s.title || s.h1).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
const sectionByFile = new Map(SECTIONS.map((s) => [s.file, s]));
const sectionUrlCache = new Map<string, string>();
export function sectionUrl(file: string, seen = new Set<string>()): string {
  if (sectionUrlCache.has(file)) return sectionUrlCache.get(file)!;
  const s = sectionByFile.get(file);
  if (!s || seen.has(file)) return '/catalog/';
  seen.add(file);
  const part = urlPart(s.slug, s.file);
  const parent = s.parent && sectionByFile.has(s.parent) ? sectionUrl(s.parent, seen) : '/catalog/';
  const url = parent + part + '/';
  sectionUrlCache.set(file, url);
  return url;
}
const sectionRows: RegPage[] = SECTIONS.map((s) => {
  const url = sectionUrl(s.file); const parent = s.parent && sectionByFile.has(s.parent) ? sectionUrl(s.parent) : '/catalog/';
  const depth = url.split('/').filter(Boolean).length; // catalog/x = 2
  return { url, h1: (s.h1 || s.title || '').trim(), type: s.kind === 'tag' ? 'tag' : depth <= 2 ? 'category' : 'subcategory', priority: s.priority || 'P2', primaryKw: '', ws: 0, parent, note: '' };
});
const HUBS = loadWithFile<PageText & { order?: number | null }>(hubMods).filter((h) => h.title || h.h1).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
export const hubSlug = new Map(HUBS.map((h) => [h.file, urlPart((h as any).slug, h.file)]));
const hubRows: RegPage[] = HUBS.map((h) => ({ url: `/blog/${hubSlug.get(h.file)}/`, h1: (h.h1 || h.title || '').trim(), type: 'blog-hub', priority: 'P2', parent: '/blog/', primaryKw: '', ws: 0, note: '' }));
function cmsBrandRows(): RegPage[] {
  return loadWithFile<{ name?: string; title?: string }>(brandsMods).filter((b) => b.name).map((b) => ({ url: `/brands/${urlPart('', b.file)}/`, h1: `Дверная фурнитура ${b.name}`, type: 'brand', priority: 'P2', parent: '/brands/', primaryKw: '', ws: 0, note: '' }));
}
const seenUrl = new Set<string>();
export const registry: RegPage[] = [...regBase, ...sectionRows, ...hubRows, ...cmsBrandRows()].filter((p) => p.url && !seenUrl.has(p.url) && (seenUrl.add(p.url), true));
export const regByUrl = new Map(registry.map((p) => [p.url, p]));
// товар ссылается на раздел по имени файла (так работает выпадающий список в админке); старые данные могли хранить URL
const resolveCategory = (c: unknown): string => {
  const v = String(c || '').trim();
  if (!v) return '/catalog/';
  if (v.startsWith('/')) return v.endsWith('/') ? v : v + '/';
  return sectionByFile.has(v) ? sectionUrl(v) : '/catalog/';
};

function cleanProduct(p: Product): Product | null {
  if (!p || !p.name || p.hidden) return null;
  p = { ...p, slug: urlPart(p.slug, (p as any).file || ''), category: resolveCategory(p.category), brand: p.brand ? urlPart('', p.brand) : '',
    extraCategories: ((p as any).extraCategories || []).map(resolveCategory).filter((c: string) => c !== '/catalog/') } as Product;
  if (!p.slug) return null;
  if (LAUNCH_ONLY && !LAUNCH_BRANDS.includes(p.brand)) return null;
  // Фото показываем только с подтверждённым источником и не с сайтов конкурентов (водяные знаки).
  const BLOCKED = /todoor\.ru/i;
  const variants = (p.variants || []).filter(Boolean).map((v) => ({ ...v, finish: v.finish || COLOR_NAMES[v.color] || 'стандарт', color: v.color || 'other', image: v.image && !BLOCKED.test(v.imageSrc || '') ? v.image : null }));
  // товар без покрытий (например, загружен из файла только с названием) получает одно стандартное покрытие
  if (!variants.length) variants.push({ finish: 'стандарт', color: 'other', price: null, inStock: true, image: null } as any);
  // товар без фото показывается с заглушкой NO_PHOTO (поле image остаётся пустым: плитки, главная и комплекты берут только настоящие фото)
  const cat = p.category.endsWith('/') ? p.category : p.category + '/';
  return { ...p, category: cat, variants, doorTypes: p.doorTypes || [], specs: specsRecord(p.specs), blocks: normBlocks(p.blocks), faq: (p.faq || []).filter((f) => f && f.q) };
}
const seen = new Set<string>();
export const products: Product[] = loadWithFile<Product>(productMods)
  .map(cleanProduct)
  .filter((p): p is Product => !!p && !seen.has(p.slug) && (seen.add(p.slug), true))
  .map((p, i) => ({ p, i, o: typeof p.order === 'number' ? p.order : 1e9, img: p.variants.some((v) => v.image) ? 0 : 1 }))
  .sort((a, b) => a.img - b.img || a.o - b.o || a.i - b.i)
  .map((x) => x.p);
export const productBySlug = new Map(products.map((p) => [p.slug, p]));

// тексты разделов (src/cms/pages/*.json): пустые поля не затирают реестр
const clean = <T extends Record<string, any>>(t: T): T => Object.fromEntries(Object.entries(t).filter(([, v]) => v !== '' && v !== null && v !== undefined)) as T;
export const pageTexts = new Map<string, PageText>(loadArray<PageText>(pagesMods).filter((t) => t?.url).map((t) => [t.url, { ...clean(t), blocks: normBlocks(t.blocks), faq: (t.faq || []).filter((f) => f && f.q) }]));
for (const s of SECTIONS) pageTexts.set(sectionUrl(s.file), { ...clean(s as any), url: sectionUrl(s.file), blocks: normBlocks(s.blocks), faq: (s.faq || []).filter((f) => f && f.q) });
for (const h of HUBS) pageTexts.set(`/blog/${hubSlug.get(h.file)}/`, { ...clean(h as any), url: `/blog/${hubSlug.get(h.file)}/`, blocks: normBlocks(h.blocks), faq: (h.faq || []).filter((f) => f && f.q) });
export const productTexts = new Map<string, ProductText>();
for (const p of products) if (p.intro || p.blocks?.length || p.faq?.length) productTexts.set(p.slug, { slug: p.slug, intro: p.intro, blocks: p.blocks, faq: p.faq });
// бренды: подразделы «бренд × категория» в админке лежат списком, в коде — объектом по slug категории
export const brandTexts = new Map(loadWithFile<BrandText & { categories?: any }>(brandsMods).map((b) => ({ ...b, slug: urlPart('', b.file) })).filter((b) => b.slug && b.name).map((b) => {
  const cats = Array.isArray(b.categories) ? Object.fromEntries(b.categories.filter((c: any) => c?.slug).map((c: any) => [c.slug, c])) : (b.categories || {});
  return [b.slug, { ...clean(b), categories: cats } as BrandText];
}));
export const seriesTexts = new Map(loadArray<Series>(seriesMods).map((s) => [s.slug, s]));
export const articles = loadWithFile<Article>(articlesMods).map((a) => ({ ...a, slug: urlPart(a.slug, a.file), hub: a.hub ? (hubSlug.get(a.hub) || translit(a.hub)) : '', h1: a.h1 || a.title, title: a.title || a.h1, body: a.body || '' })).filter((a) => a.slug && (a.title || a.h1)).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || (b.date || '').localeCompare(a.date || ''));
export const services = new Map(loadArray<Service>(serviceMods).filter((s) => s?.url).map((s) => [s.url.endsWith('/') ? s.url : s.url + '/', s]));

// ---------- бренды
// список брендов и порядок: админка → «Настройки → Каталог и бренды»
const BRANDS_SET: { slug: string; name: string; tier: string }[] = ((catalogSettings as any).brands || []).filter((b: any) => b?.slug && b.name).map((b: any) => ({ slug: b.slug, name: b.name, tier: b.tier || 'B' }));
// бренд, заведённый в админке, но не добавленный в настройки, тоже попадает в список (уровень B)
export const BRANDS = [...BRANDS_SET, ...[...brandTexts.values()].filter((b) => !BRANDS_SET.some((x) => x.slug === b.slug)).map((b) => ({ slug: b.slug, name: b.name || b.slug, tier: 'B' }))];
export const inShowroom = (brand: string) => COMPANY.showroomBrands.includes(brand);
export const brandName = (slug: string) => BRANDS.find((b) => b.slug === slug)?.name ?? slug;

// ---------- навигация: 16 разделов каталога + иконки
// порядок и названия разделов в левой панели: админка → «Настройки → Каталог и бренды»
// левое меню: разделы с галочкой «Показывать в меню» (порядок по полю order), затем комплекты
export let CATEGORY_NAV: { url: string; name: string; icon: string }[] = [
  ...SECTIONS.filter((s) => s.inMenu).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9)).map((s) => ({ url: sectionUrl(s.file), name: (s.menuName || s.h1 || s.title || '').trim(), icon: s.icon || 'kit' })),
  ...(regByUrl.has('/catalog/komplekty-furnitury/') ? [{ url: '/catalog/komplekty-furnitury/', name: 'Комплекты на дверь', icon: 'kit' }] : []),
];
export let DOOR_TYPES = registry.filter((p) => p.type === 'door-type');

// ---------- теги (фасетные посадочные): правило выборки
const COLOR_TAGS: Record<string, string> = { chernye: 'black', belye: 'white', zoloto: 'gold', hrom: 'chrome', bronza: 'bronze', nikel: 'nickel', latun: 'brass', grafit: 'graphite', med: 'copper' };
const STYLE_TAGS: Record<string, string[]> = { klassika: ['classic'], sovremennye: ['modern', 'minimal'], loft: ['loft'] };
export const COLOR_HEX: Record<string, string> = { black: '#1d1d1f', chrome: '#c9ccd1', gold: '#c9a54a', bronze: '#8a6a45', nickel: '#a9a7a0', brass: '#b89b53', white: '#f4f4f2', graphite: '#4a4c50', copper: '#b06f4a', silver: '#d8d8d8', other: '#bbb' };

const has = (p: Product, re: RegExp) => re.test([p.name, p.description, JSON.stringify(p.specs || {}), p.material].join(' ').toLowerCase());

export function tagRule(url: string): ((p: Product) => boolean) | null {
  const parts = url.split('/').filter(Boolean); // catalog, cat, [sub], tag
  const slug = parts[parts.length - 1];
  const parentUrl = '/' + parts.slice(0, -1).join('/') + '/';
  const inParent = (p: Product) => p.category.startsWith(parentUrl);
  if (COLOR_TAGS[slug]) return (p) => inParent(p) && p.variants.some((v) => v.color === COLOR_TAGS[slug]);
  if (STYLE_TAGS[slug]) return (p) => inParent(p) && STYLE_TAGS[slug].includes(p.style || '');
  const map: Record<string, (p: Product) => boolean> = {
    'kruglaya-rozetka': (p) => has(p, /кругл/),
    'kvadratnaya-rozetka': (p) => has(p, /квадратн/),
    's-zamkom': (p) => has(p, /с замк|под цилиндр|под ключ/),
    's-fiksatorom': (p) => has(p, /фиксатор|wc|завертк|сантехн/) || (p.doorTypes || []).includes('bathroom'),
    italyanskie: (p) => ['colombo-design', 'venezia', 'fratelli-cattini', 'forme', 'class', 'melodia', 'verum', 'pamar'].includes(p.brand) || has(p, /итал/),
    magnitnye: (p) => has(p, /магнит/),
    'dlya-finskih-dverej': (p) => has(p, /финск/),
    besshumnye: (p) => has(p, /бесшумн|магнит/),
    'nakladki-dlya-vhodnyh-dverej': (p) => (p.doorTypes || []).includes('entrance'),
    's-perekodirovkoj': (p) => has(p, /перекодир/),
    's-dovodchikom': (p) => has(p, /доводчик|самозакрыв|kiker/),
    's-klyuchom': (p) => has(p, /ключ/),
    'dlya-steklyannyh-dverej': (p) => has(p, /стекл/) || (p.doorTypes || []).includes('glass'),
    's-fiksaciej': (p) => Object.entries(p.specs || {}).some(([k, v]) => /фиксац/i.test(k + ' ' + v) && !/(^|:\s*)(нет|без)/i.test(String(v)) && !/без фиксац/i.test(String(v))) || /с фиксацией/i.test(p.name),
    ulichnye: (p) => has(p, /морозо|уличн|-\s?\d{2}\s?°|°[cс]|от\s*-\s*\d{2}/),
    'dlya-tyazhelyh-dverej': (p) => has(p, /(1[0-9]{2}|[8-9][0-9])\s?кг/),
    cilindrovye: (p) => has(p, /цилиндр/),
    suvaldnye: (p) => has(p, /сувальд/),
    'dlya-kalitki': (p) => has(p, /калитк|(^|[^а-яё])ворот/),
    protivopozharnye: (p) => has(p, /противопожар|огнест|ei\s?\d/),
    chernye: (p) => p.variants.some((v) => v.color === 'black'),
    nochnye: (p) => has(p, /ночн/),
  };
  const fn = map[slug];
  return fn ? (p) => inParent(p) && fn(p) : null;
}

// ---------- выборки товаров для страницы реестра
const inSection = (p: Product, url: string) => p.category.startsWith(url) || (p.extraCategories || []).some((c) => c.startsWith(url));
export function productsFor(url: string): Product[] {
  const reg = regByUrl.get(url);
  if (!reg) return [];
  if (reg.type === 'tag') { const r = tagRule(url); return r ? products.filter((p) => r(p) || inSection(p, url)) : products.filter((p) => inSection(p, url)); }
  if (reg.type === 'brand') { const b = url.split('/')[2]; return products.filter((p) => p.brand === b); }
  if (reg.type === 'brand-category') {
    const [, , b, c] = url.split('/');
    const catUrl = BRAND_CAT_MAP[c] || `/catalog/${c}/`;
    return products.filter((p) => p.brand === b && p.category.startsWith(catUrl));
  }
  if (reg.type === 'series') {
    const slug = url.split('/')[2];
    const s = SERIES_RULES[slug];
    return s ? products.filter((p) => p.brand === s.brand && s.re.test((p.series || '') + ' ' + p.name)) : [];
  }
  if (reg.type === 'door-type') {
    const key = DOOR_TYPE_KEYS[url] || '';
    return products.filter((p) => (p.doorTypes || []).includes(key));
  }
  if (url === '/catalog/komplekty-furnitury/') return [...new Map(KITS.flatMap((k) => k.items.map((i) => [i.p.slug, i.p] as const))).values()];
  if (url === '/catalog/') return products;
  return products.filter((p) => inSection(p, url));
}
export const BRAND_CAT_MAP: Record<string, string> = {
  'skrytye-petli': '/catalog/dvernye-petli/skrytye/',
  'magnitnye-zamki': '/catalog/mezhkomnatnye-zamki/magnitnye/',
  'okonnye-ruchki': '/catalog/okonnaya-furnitura/okonnye-ruchki/',
};
export const DOOR_TYPE_KEYS: Record<string, string> = {
  '/furnitura-dlya-mezhkomnatnyh-dverej/': 'interior', '/furnitura-dlya-vhodnyh-dverej/': 'entrance', '/furnitura-dlya-razdvizhnyh-dverej/': 'sliding',
  '/furnitura-dlya-steklyannyh-dverej/': 'glass', '/furnitura-dlya-pvh-dverej/': 'pvc', '/furnitura-dlya-alyuminievyh-dverej/': 'aluminium',
  '/furnitura-dlya-protivopozharnyh-dverej/': 'fire', '/furnitura-dlya-finskih-dverej/': 'finnish', '/furnitura-dlya-kalitok-i-vorot/': 'gate', '/furnitura-dlya-vannoy-i-tualeta/': 'bathroom',
};
export const SERIES_RULES: Record<string, { brand: string; re: RegExp }> = {
  'krona-koblenz-kubica': { brand: 'krona-koblenz', re: /kubica/i }, 'krona-koblenz-atomika': { brand: 'krona-koblenz', re: /atomika/i },
  'krona-koblenz-spinoff': { brand: 'krona-koblenz', re: /spinoff/i }, 'krona-koblenz-tricks': { brand: 'krona-koblenz', re: /tricks/i },
  'agb-eclipse': { brand: 'agb', re: /eclipse/i }, 'agb-polaris': { brand: 'agb', re: /polaris/i }, 'agb-mediana': { brand: 'agb', re: /mediana/i },
  'agb-scivola': { brand: 'agb', re: /scivola/i }, 'colombo-design-robot': { brand: 'colombo-design', re: /robo/i },
  'colombo-design-antologhia': { brand: 'colombo-design', re: /antolog/i }, 'armadillo-urban': { brand: 'armadillo', re: /urban/i },
  'morelli-luxury': { brand: 'morelli', re: /luxury/i }, 'fratelli-cattini-compacttwin': { brand: 'fratelli-cattini', re: /compact/i },
  'tupai-5s': { brand: 'tupai', re: /5s/i }, 'venezia-unique': { brand: 'venezia', re: /unique/i },
};

// ---------- утилиты
export const minPrice = (p: Product) => {
  const ps = p.variants.map((v) => v.price).filter((x): x is number => typeof x === 'number' && x > 0);
  return ps.length ? Math.min(...ps) : null;
};
export const rub = (n: number | null | undefined) => (n ? new Intl.NumberFormat('ru-RU').format(n) + ' ₽' : 'Цена по запросу');
export const firstImage = (p: Product | undefined | null) => p?.variants.find((v) => v.image)?.image ?? null;
export const NO_PHOTO = '/images/no-photo.svg';
export const cardImage = (p: Product) => firstImage(p) || NO_PHOTO;
export const children = (url: string, types?: string[]) => registry.filter((p) => p.parent === url && p.url !== url && (!types || types.includes(p.type)) && !isEmptyPage(p.url));
export const INDEX_THRESHOLD: Record<string, number> = { tag: 3, 'brand-category': 2, subcategory: 1, series: 1, category: 1 };
export function isIndexable(url: string): boolean {
  if (isEmptyPage(url)) return false;
  const reg = regByUrl.get(url);
  if (reg?.type === 'kit') return true;
  if (!reg) return true;
  if (reg.priority === 'GAP') return productsFor(url).length > 0;
  const th = INDEX_THRESHOLD[reg.type];
  if (th === undefined) return true;
  if (reg.type === 'category' && children(url).length) return true;
  return productsFor(url).length >= th;
}
export function breadcrumbs(url: string): { url: string; name: string }[] {
  const out: { url: string; name: string }[] = [];
  let cur = regByUrl.get(url);
  while (cur && cur.url !== '/') {
    out.unshift({ url: cur.url, name: shortName(cur) });
    cur = cur.parent ? regByUrl.get(cur.parent) : undefined;
  }
  out.unshift({ url: '/', name: 'Главная' });
  return out;
}
export function shortName(p: RegPage) {
  const t = pageTexts.get(p.url);
  let n = t?.h1 || p.h1;
  if (p.url === '/') n = 'Главная';
  if (p.url === '/catalog/') n = 'Каталог';
  return n.replace(/^Дверная фурнитура (.+)$/, '$1');
}

// ---------- фасеты фильтра (общие + автоматические из характеристик)
export const STYLE_NAMES: Record<string, string> = { modern: 'Современный', classic: 'Классика', minimal: 'Минимализм', loft: 'Лофт' };
const SPEC_SKIP = /^(цена.*|ед.*измерения|единица.*|кол-во.*|количество.*|артикул|производитель|бренд|серия|модель|описание|комплектация|вес|цвет|покрытие|материал|страна|страна производства|гарантия.*|примечание|упаковка|в комплекте.*)$/i;
const normVal = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
export function productFacetValues(p: Product): Record<string, string | string[]> {
  const f: Record<string, string | string[]> = { color: [...new Set(p.variants.map((v) => v.color))] };
  if (p.brand) f.brand = p.brand;
  if (p.style) f.style = p.style;
  if (p.material) f.material = normVal(p.material).toLowerCase();
  const country = normVal(p.specs?.['Страна производства'] || p.specs?.['Страна'] || brandTexts.get(p.brand)?.country || '');
  if (country) f.country = country;
  if (p.series) f.series = normVal(p.series);
  f.stock = p.variants.some((v) => v.inStock !== false) ? 'yes' : 'no';
  for (const [k, v] of Object.entries(p.specs || {})) {
    const key = normVal(k); const val = normVal(v);
    if (!key || SPEC_SKIP.test(key) || !val || val.length > 32) continue;
    f['spec:' + key] = val;
  }
  return f;
}
export type Facet = { key: string; label: string; options: { v: string; label: string; n: number }[] };
export function facetsFor(items: Product[]): Facet[] {
  const count = new Map<string, Map<string, number>>();
  const present = new Map<string, number>();
  for (const p of items) {
    for (const [k, v] of Object.entries(productFacetValues(p))) {
      const vals = Array.isArray(v) ? v : [v];
      present.set(k, (present.get(k) || 0) + 1);
      if (!count.has(k)) count.set(k, new Map());
      for (const x of vals) count.get(k)!.set(x, (count.get(k)!.get(x) || 0) + 1);
    }
  }
  const LABEL: Record<string, string> = { brand: 'Производитель', color: 'Цвет / покрытие', style: 'Стиль', material: 'Материал', country: 'Страна производства', series: 'Модельный ряд', stock: 'Наличие' };
  const out: Facet[] = [];
  for (const key of ['brand', 'color', 'style', 'material', 'country', 'series', 'stock']) {
    const m = count.get(key); if (!m || m.size < 2) continue;
    if (key === 'series' && m.size > 20) continue;
    const opts = [...m.entries()].map(([v, n]) => ({ v, n, label: key === 'brand' ? brandName(v) : key === 'color' ? (COLOR_NAMES[v] || v) : key === 'style' ? (STYLE_NAMES[v] || v) : key === 'stock' ? (v === 'yes' ? STOCK_LABEL.yes : STOCK_LABEL.no) : v }));
    opts.sort((a, b) => key === 'brand' ? a.label.localeCompare(b.label) : b.n - a.n);
    out.push({ key, label: LABEL[key], options: opts });
  }
  const specKeys = [...count.keys()].filter((k) => k.startsWith('spec:'))
    .filter((k) => (present.get(k) || 0) >= Math.max(3, items.length * 0.3) && count.get(k)!.size >= 2 && count.get(k)!.size <= 12)
    .sort((a, b) => (present.get(b) || 0) - (present.get(a) || 0)).slice(0, 8);
  for (const key of specKeys) {
    const opts = [...count.get(key)!.entries()].map(([v, n]) => ({ v, n, label: v }))
      .sort((a, b) => (parseFloat(a.v) || 0) - (parseFloat(b.v) || 0) || a.v.localeCompare(b.v, 'ru'));
    out.push({ key, label: key.slice(5), options: opts });
  }
  return out;
}
// клиент работает со склада поставщика; чего нет на складе, везёт под заказ от производителя
export const STOCK_LABEL = { yes: SITE.stockYes || 'На складе поставщика', no: SITE.stockNo || 'Под заказ' };
export const PER_PAGE = 24;
export const pagesCount = (n: number) => Math.max(1, Math.ceil(n / PER_PAGE));
export function colorImage(p: Product, color?: string) {
  return (color && p.variants.find((v) => v.color === color && v.image)?.image) || firstImage(p);
}
export const colorSlug = (finish: string) => finish.toLowerCase().replace(/ё/g, 'е')
  .replace(/[а-я]/g, (c) => ({ а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'j',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' } as Record<string,string>)[c] ?? c)
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const pluralRu = (n: number, one: string, few: string, many: string) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);

// ---------- существующие страницы (для очистки ссылок в текстах на ещё не созданные страницы)
const ARTICLE_URLS = new Set(articles.map((a) => `/blog/${a.slug}/`));
export const LIVE_URLS = new Set<string>([
  ...registry.filter((p) => p.type !== 'article' && p.type !== 'product-template').map((p) => p.url),
  ...ARTICLE_URLS, ...products.map((p) => `/product/${p.slug}/`), '/kontakty/', '/o-kompanii/', '/search/', '/cart/',
]);
export const isLive = (path: string) => { const n = path.split('#')[0].split('?')[0].replace(/([^/])$/, '$1/'); return LIVE_URLS.has(n) && !isEmptyPage(n); };
// markdown: [анкор](/url/) → анкор, если страницы нет
export const pruneLinks = (md: string) => md.replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, (m, a, p) => (isLive(p) ? m : a));

// ---------- готовые комплекты фурнитуры на дверь (собираются из реальных товаров одного покрытия)
export type KitItem = { role: string; p: Product; v: Variant; qty: number };
export type Kit = { id: string; title: string; color: string; kind: 'room' | 'bath' | 'hidden'; items: KitItem[]; total: number; note: string };
function pickVariant(cats: string[], color: string, exclude: Set<string>, prefBrand?: string): { p: Product; v: Variant } | null {
  const cands: { p: Product; v: Variant }[] = [];
  for (const p of products) {
    if (exclude.has(p.slug) || !cats.some((c) => p.category.startsWith(c))) continue;
    const v = p.variants.find((x) => x.color === color && x.image && x.price);
    if (v) cands.push({ p, v });
  }
  cands.sort((a, b) => (a.p.brand === prefBrand ? -1 : 0) - (b.p.brand === prefBrand ? -1 : 0));
  return cands[0] || null;
}
function buildKits(): Kit[] {
  const kits: Kit[] = []; const usedHandles = new Set<string>();
  const COLORS = ['black', 'chrome', 'gold', 'bronze', 'nickel', 'brass', 'white', 'graphite'];
  for (const kind of ['bath', 'room', 'hidden'] as const) {
    for (const color of COLORS) {
      const handle = pickVariant(['/catalog/dvernye-ruchki/na-rozetke/'], color, usedHandles);
      if (!handle) continue;
      const b = handle.p.brand; const items: KitItem[] = [{ role: 'Ручка', ...handle, qty: 1 }];
      if (kind === 'bath') { const wc = pickVariant(['/catalog/zavertki-i-nakladki/wc-zavertki/'], color, new Set(), b); if (!wc) continue; items.push({ role: 'WC-завертка', ...wc, qty: 1 }); }
      const lock = pickVariant(kind === 'bath' ? ['/catalog/mezhkomnatnye-zamki/magnitnye/', '/catalog/mezhkomnatnye-zamki/s-fiksatorom/'] : ['/catalog/mezhkomnatnye-zamki/magnitnye/'], color, new Set(), b)
        || pickVariant(['/catalog/mezhkomnatnye-zamki/'], color, new Set(), b);
      if (!lock) continue; items.push({ role: 'Замок', ...lock, qty: 1 });
      const hinge = kind === 'hidden' ? pickVariant(['/catalog/dvernye-petli/skrytye/'], color, new Set(), b)
        : pickVariant(['/catalog/dvernye-petli/universalnye/', '/catalog/dvernye-petli/babochki/', '/catalog/dvernye-petli/skrytye/'], color, new Set(), b);
      if (!hinge) continue; items.push({ role: 'Петли', ...hinge, qty: hinge.p.category.includes('skrytye') ? 3 : 2 });
      const stop = pickVariant(['/catalog/upory-i-ogranichiteli/'], color, new Set(), b);
      if (stop) items.push({ role: 'Упор', ...stop, qty: 1 });
      usedHandles.add(handle.p.slug);
      const cname = COLOR_NAMES[color] || color;
      const kindName = kind === 'bath' ? 'для ванной и туалета' : kind === 'hidden' ? 'для скрытой двери' : 'для межкомнатной двери';
      kits.push({
        id: `${kind}-${color}`, color, kind, items,
        title: `Комплект ${kindName}, ${cname}`,
        total: items.reduce((s, i) => s + (i.v.price || 0) * i.qty, 0),
        note: kind === 'bath' ? 'Ручка, WC-завертка, замок с фиксатором или магнитный, петли и упор' : kind === 'hidden' ? 'Ручка, магнитный замок, 3 скрытые петли с 3D-регулировкой и упор' : 'Ручка, бесшумный магнитный замок, петли и упор',
      });
    }
  }
  return kits;
}
export const KITS = buildKits();

// ---------- страницы без товаров не публикуются (не генерируются, исчезают из навигации и ссылок)
const EMPTY_TYPES = new Set(['category', 'subcategory', 'tag', 'brand', 'brand-category', 'series', 'door-type']);
// служебные страницы без содержимого: сертификаты клиент не давал
const NO_CONTENT = new Set(['/sertifikaty/']);
export const isEmptyPage = (url: string): boolean => {
  const r = regByUrl.get(url);
  if (NO_CONTENT.has(url)) return true;
  if (!r || url === '/catalog/') return false;
  if (r.type === 'kit') return KITS.length === 0;
  if (!EMPTY_TYPES.has(r.type)) return false;
  return productsFor(url).length === 0;
};
DOOR_TYPES = DOOR_TYPES.filter((d) => !isEmptyPage(d.url));
CATEGORY_NAV = CATEGORY_NAV.filter((c) => !isEmptyPage(c.url));

// ---------- цели для кнопки «Открыть на сайте» в админке (/go/<коллекция>/<файл>/)
export const sectionFiles = [...sectionByFile.keys()];
const fileOf = (mods: Record<string, unknown>) => Object.keys(mods).map(fileSlug);
const pageUrlOf = (mods: Record<string, unknown>) => Object.entries(mods).map(([k, m]) => ({ file: fileSlug(k), url: String(((m as any).default ?? m)?.url || '/') }));
export const cmsTargets: { col: string; file: string; url: string }[] = [
  ...loadWithFile<Product>(productMods).map((p) => ({ col: 'products', file: p.file, url: `/product/${urlPart(p.slug, p.file)}/` })),
  ...articles.map((a) => ({ col: 'articles', file: (a as any).file, url: `/blog/${a.slug}/` })),
  ...fileOf(brandsMods).map((f) => ({ col: 'brands', file: f, url: `/brands/${urlPart('', f)}/` })),
  ...loadWithFile<{ slug?: string }>(seriesMods).map((s) => ({ col: 'series', file: s.file, url: `/series/${urlPart(s.slug, s.file)}/` })),
  ...pageUrlOf(pagesMods).map((p) => ({ col: 'pages', ...p })),
  ...pageUrlOf(serviceMods).map((p) => ({ col: 'service', ...p })),
].filter((t) => t.file);

// ---------- редиректы: старый адрес никогда не отдаёт 404
// url-map.json хранит адреса записей с прошлой сборки (ключ «коллекция/файл»). Если адрес записи сменился, со старого
// адреса ставится переадресация на новый; если запись удалена, скрыта или раздел опустел, на родительскую страницу.
// Накопленные переадресации лежат в redirects-auto.json, ручные в redirects.json (админка → «Настройки → Редиректы»).
// Оба файла и карта адресов обновляются после сборки (scripts/save-cms-state.mjs) и коммитятся деплой-workflow.
type UrlEntry = { url: string; fallback: string };
const norm = (p: string) => { const s = String(p || '').trim(); if (!s) return ''; if (/^https?:\/\//.test(s)) return s; const x = ('/' + s.replace(/^\/+/, '')).split('#')[0].split('?')[0]; return /\.[a-z0-9]+$/i.test(x) ? x : x.replace(/\/?$/, '/'); };
const liveUrl = (u: string) => u === '/' || isLive(u);
const rawProducts = loadWithFile<Product>(productMods);
const fallbackOf: Record<string, (file: string, url: string) => string> = {
  products: (f) => resolveCategory(rawProducts.find((p) => p.file === f)?.category),
  sections: (f) => { const s = sectionByFile.get(f); return s?.parent && sectionByFile.has(s.parent) ? sectionUrl(s.parent) : '/catalog/'; },
  articles: (f) => { const a = articles.find((x) => (x as any).file === f); return a?.hub ? `/blog/${a.hub}/` : '/blog/'; },
  'blog-hubs': () => '/blog/', brands: () => '/brands/', series: () => '/brands/', pages: () => '/', service: () => '/',
};
const currentMap: Record<string, UrlEntry> = {};
for (const t of [...cmsTargets, ...sectionFiles.map((f) => ({ col: 'sections', file: f, url: sectionUrl(f) })), ...[...hubSlug].map(([f, s]) => ({ col: 'blog-hubs', file: f, url: `/blog/${s}/` }))]) {
  if (liveUrl(t.url)) currentMap[`${t.col}/${t.file}`] = { url: t.url, fallback: (fallbackOf[t.col] || (() => '/'))(t.file, t.url) };
}
const firstLive = (...c: string[]) => c.find((x) => x && liveUrl(x)) || '/';
const auto: Record<string, string> = { ...(prevAutoRedirects as Record<string, string>) };
for (const [key, prev] of Object.entries(prevUrlMap as Record<string, UrlEntry>)) {
  const now = currentMap[key];
  if (now && now.url === prev.url) continue;
  auto[prev.url] = now ? now.url : firstLive(prev.fallback, prev.url.startsWith('/catalog/') || prev.url.startsWith('/product/') ? '/catalog/' : '', prev.url.startsWith('/blog/') ? '/blog/' : '');
}
const manual: Record<string, string> = {};
for (const r of ((manualRedirects as any).redirects || []) as { from?: string; to?: string }[]) { const f = norm(r.from || ''); const to = norm(r.to || ''); if (f && to && f !== to) manual[f] = to; }
// цепочки (a→b→c) схлопываем до живой страницы; переадресацию с живой страницы не ставим
const resolveTo = (to: string, all: Record<string, string>) => { let x = to; for (let i = 0; i < 10 && !/^https?:/.test(x) && !liveUrl(x) && all[x]; i++) x = all[x]; return /^https?:/.test(x) || liveUrl(x) ? x : firstLive(x.startsWith('/blog/') ? '/blog/' : '/catalog/'); };
const merged: Record<string, string> = { ...auto, ...manual };
export const REDIRECTS: Record<string, string> = {};
for (const [from, to] of Object.entries(merged)) { if (liveUrl(from) || !from.startsWith('/')) continue; const r = resolveTo(to, merged); if (r !== from) REDIRECTS[from] = r; }
export const CMS_STATE = {
  urlMap: currentMap,
  redirectsAuto: Object.fromEntries(Object.entries(auto).filter(([f]) => !liveUrl(f)).map(([f, to]) => [f, resolveTo(to, merged)]).sort(([a], [b]) => a.localeCompare(b))),
};

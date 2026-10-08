// Обмен каталогом через CSV: выгрузка и загрузка товаров и разделов (src/cms/products, src/cms/sections).
//
//   node scripts/catalog-csv.mjs export <папка>                 → <папка>/products.csv, <папка>/sections.csv
//   node scripts/catalog-csv.mjs import <файл.csv> [products|sections]
//   node scripts/catalog-csv.mjs import-pending                 → файл из админки (src/cms/settings/import.json), для CI
//
// Формат: разделитель «;», UTF-8 с BOM (Excel открывает без настройки). При загрузке понимает «;», «,» и табуляцию,
// UTF-8 и Windows-1251. Товар = несколько строк с одинаковым ID (по строке на вариант покрытия).
// Правила загрузки (их же описывает инструкция для редактора):
//   • ID пустой → новый товар/раздел; ID есть, но файла нет → создаётся с этим ID.
//   • Пустая ячейка или отсутствующая колонка → поле не меняется. Прочерк «-» в ячейке → поле очищается
//     (цена «-» = «Цена по запросу», характеристика «-» = убрать её у товара).
//   • Поля товара берутся из первой строки его ID; строки ниже меняют только варианты.
//   • Вариант ищется по «Артикулу варианта», затем по «Покрытию»; не нашёлся → добавляется. Варианты, которых нет в файле, остаются.
//   • «Удалить»: «товар» (или «да») удаляет товар/раздел, «вариант» удаляет вариант из строки.
//   • «Раздел»: адрес (/catalog/dvernye-ruchki/na-rozetke/) или цепочка названий через « > »; недостающие разделы создаются.
//   • «Бренд»: название или адрес бренда; неизвестный бренд создаётся.
//   • «Фото»: путь /images/products/… или ссылка https://… (картинка скачивается в public/images/products).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(ROOT, ...a);
const DIR = { products: P('src/cms/products'), sections: P('src/cms/sections'), brands: P('src/cms/brands') };

// ---------------------------------------------------------------- общие утилиты
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
export const translit = (s) => String(s || '').toLowerCase().replace(/[а-яё]/g, (c) => TR[c] ?? c).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const urlPart = (custom, file) => translit(String(custom || '').trim().replace(/^\/+|\/+$/g, '').split('/').pop() || '') || translit(file);
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n'); };
const loadDir = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => ({ id: f.slice(0, -5), data: readJson(path.join(dir, f)) })) : []);
const yes = (v) => /^(да|1|true|yes|y|\+|x|в наличии|есть)$/i.test(String(v ?? '').trim());
const boolCell = (b) => (b ? 'да' : 'нет');
const s = (v) => (v === null || v === undefined ? '' : String(v));

const COLORS = { black: 'чёрный', chrome: 'хром', gold: 'золото', bronze: 'бронза', nickel: 'никель', brass: 'латунь', white: 'белый', graphite: 'графит', copper: 'медь', silver: 'серебро', other: 'другое' };
const STYLES = { modern: 'современный', classic: 'классика', minimal: 'минимализм', loft: 'лофт' };
const DOORS = { interior: 'межкомнатные', entrance: 'входные', sliding: 'раздвижные', glass: 'стеклянные', pvc: 'ПВХ', aluminium: 'алюминиевые', fire: 'противопожарные', finnish: 'финские', gate: 'калитки и ворота', bathroom: 'ванная и туалет' };
const back = (map) => (v) => { const x = String(v || '').trim().toLowerCase().replace(/ё/g, 'е'); if (!x) return ''; for (const [k, l] of Object.entries(map)) if (k === x || l.toLowerCase().replace(/ё/g, 'е') === x) return k; return null; };
const colorOf = back(COLORS), styleOf = back(STYLES), doorOf = back(DOORS);

// ---------------------------------------------------------------- CSV
const esc = (v) => { const t = s(v); return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
const toCsv = (head, rows) => '﻿' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n') + '\r\n';
export function parseCsv(buf) {
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { text = new TextDecoder('windows-1251').decode(buf); }
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0];
  const d = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"' && cell === '') q = true;
    else if (c === d) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((x) => String(x).trim() !== ''));
  const head = (nonEmpty.shift() || []).map((h) => h.trim());
  return { head, rows: nonEmpty.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()]))) };
}

// ---------------------------------------------------------------- разделы: адреса
function sectionIndex() {
  const list = loadDir(DIR.sections);
  const byId = new Map(list.map((x) => [x.id, x.data]));
  const cache = new Map();
  const url = (id, seen = new Set()) => {
    if (cache.has(id)) return cache.get(id);
    const d = byId.get(id); if (!d || seen.has(id)) return '/catalog/';
    seen.add(id);
    const parent = d.parent && byId.has(d.parent) ? url(d.parent, seen) : '/catalog/';
    const u = parent + urlPart(d.slug, id) + '/'; cache.set(id, u); return u;
  };
  const byUrl = new Map(list.map((x) => [url(x.id), x.id]));
  return { list, byId, url, byUrl };
}

// ---------------------------------------------------------------- выгрузка
export const PRODUCT_COLS = ['ID', 'Ссылка на сайте (не загружается)', 'Название', 'H1', 'Title', 'Description', 'Адрес (URL)', 'noindex', 'Canonical',
  'Бренд', 'Раздел', 'Доп. разделы', 'Серия', 'Артикул', 'Материал', 'Стиль', 'Типы дверей', 'Скрыт', 'Порядок', 'Краткое описание', 'Вводный абзац',
  'Покрытие', 'Группа цвета', 'Артикул варианта', 'Цена', 'На складе', 'Фото', 'Удалить'];
export const SECTION_COLS = ['ID', 'Адрес на сайте (не загружается)', 'Title', 'H1', 'Description', 'Адрес (URL)', 'Родитель', 'Тип', 'В меню', 'Название в меню', 'Иконка', 'Порядок', 'Лид', 'noindex', 'Canonical', 'Удалить'];
const SPEC = 'Х: ';

export function exportCatalog(outDir, siteBase = '') {
  const sec = sectionIndex();
  const brands = new Map(loadDir(DIR.brands).map((b) => [b.id, b.data.name || b.id]));
  const products = loadDir(DIR.products);
  const specKeys = [...new Set(products.flatMap((p) => (p.data.specs || []).map((x) => x.k)))].sort((a, b) => a.localeCompare(b, 'ru'));
  const head = [...PRODUCT_COLS, ...specKeys.map((k) => SPEC + k)];
  const rows = [];
  for (const { id, data: p } of products) {
    const specs = Object.fromEntries((p.specs || []).map((x) => [x.k, x.v]));
    const base = [id, `${siteBase}/product/${urlPart(p.slug, id)}/`, p.name, p.h1, p.title, p.metaDescription, s(p.slug), boolCell(p.noindex), p.canonical,
      brands.get(p.brand) || p.brand, p.category ? sec.url(p.category) : '', (p.extraCategories || []).map((c) => sec.url(c)).join(', '), p.series, p.article,
      p.material, STYLES[p.style] || s(p.style), (p.doorTypes || []).map((d) => DOORS[d] || d).join(', '), boolCell(p.hidden), s(p.order), p.description, p.intro];
    const vs = p.variants?.length ? p.variants : [{}];
    for (const v of vs) rows.push([...base, v.finish, COLORS[v.color] || s(v.color), v.article, s(v.price), v.finish === undefined && !p.variants?.length ? '' : boolCell(v.inStock !== false), v.image, '', ...specKeys.map((k) => specs[k] ?? '')]);
  }
  const srows = sec.list.map(({ id, data: d }) => [id, siteBase + sec.url(id), d.title, d.h1, d.description, s(d.slug), d.parent && sec.byId.has(d.parent) ? sec.url(d.parent) : '',
    d.kind === 'tag' ? 'подборка' : 'раздел', boolCell(d.inMenu), d.menuName, d.icon, s(d.order), d.lead, boolCell(d.noindex), d.canonical, '']);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'products.csv'), toCsv(head, rows));
  fs.writeFileSync(path.join(outDir, 'sections.csv'), toCsv(SECTION_COLS, srows));
  return { products: products.length, rows: rows.length, sections: sec.list.length, specs: specKeys.length };
}

// ---------------------------------------------------------------- загрузка
const uniqueId = (dir, base) => { let id = base || 'zapis'; let n = 2; while (fs.existsSync(path.join(dir, id + '.json'))) id = `${base}-${n++}`; return id; };

async function fetchImage(url, id, report) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const type = r.headers.get('content-type') || '';
    const ext = /png/.test(type) ? 'png' : /webp/.test(type) ? 'webp' : /gif/.test(type) ? 'gif' : 'jpg';
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 5 * 1024 * 1024) throw new Error('файл больше 5 МБ');
    if (!/^image\//.test(type) && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) throw new Error('это не картинка');
    const base = translit(id) || 'foto'; let file = `${base}.${ext}`; let n = 2;
    while (fs.existsSync(P('public/images/products', file))) file = `${base}-${n++}.${ext}`;
    fs.writeFileSync(P('public/images/products', file), buf);
    return `/images/products/${file}`;
  } catch (e) { report.errors.push(`Фото ${url}: не скачалось (${e.message})`); return null; }
}

function makeResolvers(report, dry) {
  const sec = sectionIndex();
  const brandList = loadDir(DIR.brands);
  const brandByKey = new Map(brandList.flatMap((b) => [[b.id.toLowerCase(), b.id], [String(b.data.name || '').toLowerCase().replace(/ё/g, 'е'), b.id]]));
  const brand = (v) => {
    const key = String(v).trim().toLowerCase().replace(/ё/g, 'е'); if (!key) return '';
    if (brandByKey.has(key)) return brandByKey.get(key);
    const id = uniqueId(DIR.brands, translit(v));
    if (!dry) writeJson(path.join(DIR.brands, id + '.json'), { name: String(v).trim() });
    brandByKey.set(key, id); report.created.brands.push(String(v).trim()); return id;
  };
  const sectionByTitle = (title, parentId) => sec.list.find((x) => (x.data.parent || '') === (parentId || '') && [x.data.title, x.data.h1, x.data.menuName].some((t) => String(t || '').trim().toLowerCase() === title.toLowerCase()))?.id;
  const createSection = (title, parentId, slug) => {
    const id = uniqueId(DIR.sections, (parentId ? parentId + '--' : 'catalog--') + (slug || translit(title)));
    const d = { title, h1: title, slug: slug || translit(title), parent: parentId || '', kind: 'section', inMenu: false };
    if (!dry) writeJson(path.join(DIR.sections, id + '.json'), d);
    sec.list.push({ id, data: d }); sec.byId.set(id, d); sec.byUrl.set(sec.url(id), id);
    report.created.sections.push(sec.url(id)); return id;
  };
  const section = (v) => {
    const t = String(v || '').trim(); if (!t) return '';
    if (t.startsWith('/')) {
      const u = ('/' + t.replace(/^\/+|\/+$/g, '') + '/');
      if (sec.byUrl.has(u)) return sec.byUrl.get(u);
      if (!u.startsWith('/catalog/')) { report.errors.push(`Раздел ${t}: адрес должен начинаться с /catalog/`); return null; }
      let parent = ''; let acc = '/catalog/';
      for (const part of u.split('/').filter(Boolean).slice(1)) { acc += part + '/'; parent = sec.byUrl.get(acc) || createSection(part, parent, translit(part)); }
      return parent;
    }
    let parent = '';
    for (const name of t.split(/\s*>\s*/).filter(Boolean)) parent = sectionByTitle(name, parent) || createSection(name, parent);
    return parent;
  };
  return { sec, brand, section };
}

export async function importCsv(file, kind, { dry = false } = {}) {
  if (kind !== 'products' && kind !== 'sections') kind = undefined; // любое другое значение = определить по колонкам
  const { head, rows } = parseCsv(fs.readFileSync(file));
  // разделы: есть «Родитель» или «Title» без «Названия» и без колонок покрытий; иначе товары
  if (!kind) kind = !head.includes('Название') && !head.includes('Покрытие') && (head.includes('Родитель') || head.includes('Title')) ? 'sections' : 'products';
  const report = { file: path.basename(file), kind, rows: rows.length, updated: 0, created: { products: [], sections: [], brands: [] }, deleted: [], errors: [], warnings: [] };
  const has = (c) => head.includes(c);
  const unknown = head.filter((h) => !(kind === 'products' ? PRODUCT_COLS : SECTION_COLS).includes(h) && !(kind === 'products' && h.startsWith(SPEC)));
  if (unknown.length) report.warnings.push('Колонки не распознаны и пропущены: ' + unknown.join(', '));
  if (!has('ID') && !has(kind === 'products' ? 'Название' : 'Title')) { report.errors.push(`Нет колонки «ID» или «${kind === 'products' ? 'Название' : 'Title'}»: файл не загружен`); return report; }
  const R = makeResolvers(report, dry);
  const CLEAR = /^[-–—]$/;
  const set = (obj, key, col, row, fn = (x) => x, keepIfEmpty = false) => {
    if (!has(col)) return;
    const raw = row[col];
    if (raw === '') return; // пустая ячейка: оставить как есть
    if (CLEAR.test(raw)) { if (!keepIfEmpty) delete obj[key]; return; }
    const val = fn(raw);
    if (val === null) return; // ошибка разбора уже записана
    const empty = (x) => x === '' || x === null || x === undefined || (Array.isArray(x) && !x.length);
    if (empty(val)) { if (!empty(obj[key])) delete obj[key]; return; } // пустое поле не трогаем, заполненное очищаем
    obj[key] = val;
  };

  if (kind === 'sections') {
    rows.forEach((row, i) => {
      const line = i + 2; let id = row['ID'];
      if (yes(row['Удалить']) || /товар|раздел/i.test(row['Удалить'] || '')) {
        if (id && fs.existsSync(path.join(DIR.sections, id + '.json'))) { if (!dry) fs.rmSync(path.join(DIR.sections, id + '.json')); report.deleted.push(id); }
        return;
      }
      const isNew = !id || !fs.existsSync(path.join(DIR.sections, id + '.json'));
      if (isNew && !row['Title']) { report.errors.push(`Строка ${line}: новый раздел без Title пропущен`); return; }
      const d = isNew ? { kind: 'section', inMenu: false } : readJson(path.join(DIR.sections, id + '.json'));
      set(d, 'title', 'Title', row, (x) => x, true); set(d, 'h1', 'H1', row); set(d, 'description', 'Description', row);
      set(d, 'slug', 'Адрес (URL)', row, (x) => translit(x)); set(d, 'lead', 'Лид', row); set(d, 'canonical', 'Canonical', row);
      set(d, 'menuName', 'Название в меню', row); set(d, 'icon', 'Иконка', row);
      if (has('Родитель') && row['Родитель'] !== '') { const p = CLEAR.test(row['Родитель']) ? '' : R.section(row['Родитель']); if (p !== null) d.parent = p; }
      if (has('Тип') && row['Тип']) d.kind = /подбор|tag/i.test(row['Тип']) ? 'tag' : 'section';
      if (has('В меню') && row['В меню']) d.inMenu = yes(row['В меню']);
      if (has('noindex') && row['noindex']) d.noindex = yes(row['noindex']);
      set(d, 'order', 'Порядок', row, (x) => { const n = Number(String(x).replace(',', '.')); if (Number.isNaN(n)) { report.errors.push(`Строка ${line}: «Порядок» не число`); return null; } return n; });
      if (isNew) { id = uniqueId(DIR.sections, id ? translit(id) : (d.parent ? d.parent + '--' : 'catalog--') + (d.slug || translit(d.title))); report.created.sections.push(id); }
      else report.updated++;
      if (!dry) writeJson(path.join(DIR.sections, id + '.json'), d);
    });
    return report;
  }

  // товары: группы строк по ID (или по названию у новых товаров без ID)
  const groups = []; let cur = null;
  rows.forEach((row, i) => {
    const key = row['ID'] || (row['Название'] ? 'new:' + row['Название'] : cur?.key);
    if (!cur || cur.key !== key) { cur = { key, id: row['ID'], rows: [] }; groups.push(cur); }
    cur.rows.push({ row, line: i + 2 });
  });
  const specCols = head.filter((h) => h.startsWith(SPEC));
  const variantCols = ['Покрытие', 'Группа цвета', 'Артикул варианта', 'Цена', 'На складе', 'Фото'];
  for (const g of groups) {
    const { row: first, line } = g.rows[0];
    let id = g.id; const f = id ? path.join(DIR.products, id + '.json') : null;
    if (/^(да|товар)$/i.test(first['Удалить'] || '')) {
      if (f && fs.existsSync(f)) { if (!dry) fs.rmSync(f); report.deleted.push(id); } else report.warnings.push(`Строка ${line}: товара ${id || first['Название']} нет, удалять нечего`);
      continue;
    }
    const isNew = !f || !fs.existsSync(f);
    if (isNew && !first['Название']) { report.errors.push(`Строка ${line}: новый товар без названия пропущен`); continue; }
    const p = isNew ? { name: '', brand: '', category: '', variants: [], specs: [], hidden: false } : readJson(f);
    set(p, 'name', 'Название', first, (x) => x, true); set(p, 'h1', 'H1', first); set(p, 'title', 'Title', first); set(p, 'metaDescription', 'Description', first);
    set(p, 'slug', 'Адрес (URL)', first, (x) => translit(x)); set(p, 'canonical', 'Canonical', first);
    if (has('noindex') && first['noindex'] && (yes(first['noindex']) || 'noindex' in p)) p.noindex = yes(first['noindex']);
    if (has('Бренд') && first['Бренд']) p.brand = R.brand(first['Бренд']);
    if (has('Раздел') && first['Раздел']) { const c = R.section(first['Раздел']); if (c !== null) p.category = c; }
    set(p, 'extraCategories', 'Доп. разделы', first, (x) => String(x).split(/\s*[,|]\s*/).map((y) => y.trim()).filter(Boolean).map((y) => R.section(y)).filter(Boolean));
    set(p, 'series', 'Серия', first); set(p, 'article', 'Артикул', first); set(p, 'material', 'Материал', first);
    set(p, 'style', 'Стиль', first, (x) => { const v = styleOf(x); if (v === null) { report.errors.push(`Строка ${line}: стиль «${x}» неизвестен (современный, классика, минимализм, лофт)`); } return v; });
    set(p, 'doorTypes', 'Типы дверей', first, (x) => String(x).split(/\s*,\s*/).filter(Boolean).map((y) => { const v = doorOf(y); if (v === null) report.errors.push(`Строка ${line}: тип двери «${y}» неизвестен`); return v; }).filter(Boolean));
    if (has('Скрыт') && first['Скрыт']) p.hidden = yes(first['Скрыт']);
    set(p, 'order', 'Порядок', first, (x) => { const n = Number(String(x).replace(',', '.')); if (Number.isNaN(n)) { report.errors.push(`Строка ${line}: «Порядок» не число`); return null; } return n; });
    set(p, 'description', 'Краткое описание', first); set(p, 'intro', 'Вводный абзац', first);
    if (specCols.length) {
      const specs = new Map((p.specs || []).map((x) => [x.k, x.v]));
      for (const c of specCols) { const k = c.slice(SPEC.length).trim(); const v = first[c]; if (v === '') continue; if (CLEAR.test(v)) specs.delete(k); else specs.set(k, v); }
      p.specs = [...specs].map(([k, v]) => ({ k, v }));
    }
    // варианты
    if (variantCols.some(has)) {
      p.variants = p.variants || [];
      const before = [...p.variants]; let idx = -1;
      const one = (list) => (list.length === 1 ? list[0] : undefined);
      for (const { row, line: ln } of g.rows) {
        idx++;
        if (!variantCols.some((c) => has(c) && row[c] !== '') && !/вариант/i.test(row['Удалить'] || '')) continue;
        const art = row['Артикул варианта'] || ''; const fin = (row['Покрытие'] || '').toLowerCase();
        // сначала вариант на той же позиции, если совпадают артикул и покрытие (так повторная загрузка выгрузки ничего не меняет);
        // затем единственный вариант с таким артикулом, затем единственный с таким покрытием; иначе новый
        const same = before[idx];
        let v = (same && (same.article || '') === art && String(same.finish || '').toLowerCase() === fin ? same : undefined)
          || (art && one(p.variants.filter((x) => x.article === art))) || (fin && one(p.variants.filter((x) => String(x.finish || '').toLowerCase() === fin)));
        if (/вариант/i.test(row['Удалить'] || '')) { if (v) p.variants = p.variants.filter((x) => x !== v); else report.warnings.push(`Строка ${ln}: вариант для удаления не найден`); continue; }
        if (!v) { v = { finish: '', color: 'other', article: '', price: null, inStock: true, image: null }; p.variants.push(v); }
        set(v, 'finish', 'Покрытие', row); set(v, 'article', 'Артикул варианта', row);
        set(v, 'color', 'Группа цвета', row, (x) => { const c = colorOf(x); if (c === null) { report.errors.push(`Строка ${ln}: цвет «${x}» неизвестен (${Object.values(COLORS).join(', ')})`); } return c; });
        if (has('Цена') && row['Цена'] !== '') { const raw = String(row['Цена']).replace(/[\s ₽руб.]/g, '').replace(',', '.'); if (raw === '' || CLEAR.test(row['Цена'].trim())) v.price = null; else if (Number.isNaN(Number(raw))) report.errors.push(`Строка ${ln}: цена «${row['Цена']}» не число`); else v.price = Math.round(Number(raw)); }
        if (has('На складе') && row['На складе'] !== '') v.inStock = yes(row['На складе']);
        if (has('Фото') && row['Фото']) {
          const ph = row['Фото'].trim();
          if (/^https?:\/\//.test(ph)) { const loc = dry ? ph : await fetchImage(ph, (id || translit(p.name)) + '-' + translit(v.finish || 'foto'), report); if (loc) { v.image = loc; v.imageSrc = ph; } }
          else if (fs.existsSync(P('public', ph.replace(/^\/+/, '')))) { v.image = '/' + ph.replace(/^\/+/, ''); }
          else report.errors.push(`Строка ${ln}: фото ${ph} не найдено на сайте`);
        }
      }
    }
    if (!p.variants?.some((v) => v.image)) report.warnings.push(`${p.name}: нет ни одного фото, на сайте товар не покажется`);
    if (isNew) { id = uniqueId(DIR.products, id ? translit(id) : translit(p.name)); report.created.products.push(id); } else report.updated++;
    if (!dry) writeJson(path.join(DIR.products, id + '.json'), p);
  }
  return report;
}

// ---------------------------------------------------------------- отчёт и запуск
export function reportText(r) {
  const L = [`Файл: ${r.file} (${r.kind === 'products' ? 'товары' : 'разделы'}), строк: ${r.rows}`,
    `Обновлено: ${r.updated}; создано товаров: ${r.created.products.length}, разделов: ${r.created.sections.length}, брендов: ${r.created.brands.length}; удалено: ${r.deleted.length}`];
  if (r.created.sections.length) L.push('Новые разделы: ' + r.created.sections.join(', '));
  if (r.created.brands.length) L.push('Новые бренды: ' + r.created.brands.join(', '));
  if (r.deleted.length) L.push('Удалены: ' + r.deleted.join(', '));
  if (r.errors.length) L.push('', `Ошибки (${r.errors.length}):`, ...r.errors.slice(0, 200));
  if (r.warnings.length) L.push('', `Предупреждения (${r.warnings.length}):`, ...r.warnings.slice(0, 200));
  return L.join('\n');
}

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((x) => x.startsWith('--')));
const [cmd, a1, a2] = argv.filter((x) => !x.startsWith('--'));
if (cmd === 'export') {
  // адрес сайта для колонки «Ссылка на сайте»: те же переменные, что у astro.config.mjs
  const site = (process.env.SITE_URL || 'https://takedown-desing.github.io').replace(/\/$/, '') + (process.env.BASE_PATH ?? '/vsedlyadverey').replace(/\/$/, '');
  const r = exportCatalog(path.resolve(a1 || P('dist/admin/export')), a2 ?? site);
  console.log(`[catalog-csv] export: ${r.products} товаров (${r.rows} строк, ${r.specs} характеристик), ${r.sections} разделов`);
} else if (cmd === 'import') {
  const r = await importCsv(path.resolve(a1), a2, { dry: flags.has('--dry') });
  console.log(reportText(r));
} else if (cmd === 'import-pending') {
  // файл, загруженный в админке (Настройки → Импорт из CSV); вызывается в CI перед сборкой
  const cfgFile = P('src/cms/settings/import.json');
  const cfg = fs.existsSync(cfgFile) ? readJson(cfgFile) : {};
  if (!cfg.file) { console.log('[catalog-csv] нет файла для загрузки'); process.exit(0); }
  const src = P(cfg.file.replace(/^\/+/, ''));
  const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
  let text;
  if (!fs.existsSync(src)) text = `Файл ${cfg.file} не найден в хранилище. Загрузите его заново.`;
  else {
    const kind = cfg.kind === 'sections' ? 'sections' : cfg.kind === 'products' ? 'products' : undefined;
    const r = await importCsv(src, kind, { dry: !!cfg.dryRun });
    text = (cfg.dryRun ? 'ПРОВЕРКА без изменений сайта\n' : '') + reportText(r);
    if (!cfg.dryRun) { fs.mkdirSync(P('import/done'), { recursive: true }); fs.renameSync(src, P('import/done', date.replace(/[: ]/g, '-') + '-' + path.basename(src))); }
  }
  writeJson(cfgFile, { ...cfg, file: '', dryRun: false });
  writeJson(P('src/cms/settings/import-report.json'), { date, file: cfg.file, report: text });
  console.log(text);
} else if (cmd) {
  console.error('Команды: export <папка> | import <файл.csv> [products|sections] [--dry] | import-pending');
  process.exit(1);
}

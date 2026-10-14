// Приём заявок с сайта: POST /api/lead (формы «перезвоните», «написать нам») и POST /api/order (корзина).
// Запуск на сервере: node server/api.mjs (порт 3001, слушает только localhost; nginx проксирует /api/ сюда).
// Настройки в server/.env (см. server/.env.example). Каждая заявка пишется в server/data/orders.jsonl и,
// если задан SMTP, уходит письмом на ORDER_EMAIL. Без SMTP заявки только копятся в файле.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(DIR, '.env');
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const PORT = +(process.env.API_PORT || 3001);
const LOG = path.join(DIR, 'data', 'orders.jsonl');
fs.mkdirSync(path.dirname(LOG), { recursive: true });

const clean = (v, max = 2000) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max);
const rub = (n) => (typeof n === 'number' ? new Intl.NumberFormat('ru-RU').format(n) + ' ₽' : 'цена по запросу');

// письмо менеджеру
function render(kind, b) {
  const L = [];
  if (kind === 'order') {
    L.push(`Заказ с сайта от ${b.name}, тел. ${b.phone}`, b.addr ? `Адрес: ${b.addr}` : '', '');
    for (const i of b.items || []) L.push(`• ${i.name}${i.finish ? ', ' + i.finish : ''} × ${i.qty} — ${rub(i.price)}${i.url ? `\n  ${b.site}${i.url}` : ''}`);
    L.push('', `Итого: ${rub(b.total)}`);
  } else {
    L.push(`Заявка с сайта (${{ lead: 'перезвоните мне', contact: 'написать нам', b2b: 'оптовая заявка' }[kind] || kind})`, b.name ? `Имя: ${b.name}` : '', `Телефон: ${b.phone || b.contact}`, b.msg ? `Сообщение: ${b.msg}` : '');
  }
  L.push('', `Страница: ${b.page}`, `Время: ${b.time}`);
  return L.filter((x) => x !== '').join('\n');
}

async function sendMail(subject, text) {
  if (!process.env.SMTP_HOST || !process.env.ORDER_EMAIL) return 'smtp не настроен';
  const { createTransport } = await import('nodemailer');
  const t = createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 465), secure: (process.env.SMTP_SECURE ?? 'true') !== 'false', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: process.env.ORDER_EMAIL, subject, text });
  return 'отправлено';
}

const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
// простая защита от потока: не больше 20 заявок в минуту с одного IP
const hits = new Map();
const flood = (ip) => { const now = Date.now(); const a = (hits.get(ip) || []).filter((t) => now - t < 60000); a.push(now); hits.set(ip, a); return a.length > 20; };

http.createServer(async (req, res) => {
  const kindPath = (req.url || '').replace(/\?.*$/, '');
  if (req.method !== 'POST' || !/^\/api\/(lead|order)$/.test(kindPath)) return json(res, 404, { ok: false });
  const ip = req.headers['x-real-ip'] || req.socket.remoteAddress || '';
  if (flood(ip)) return json(res, 429, { ok: false, error: 'слишком много заявок' });
  let raw = ''; req.on('data', (c) => { raw += c; if (raw.length > 100000) req.destroy(); });
  req.on('end', async () => {
    let b; try { b = JSON.parse(raw || '{}'); } catch { return json(res, 400, { ok: false, error: 'bad json' }); }
    const kind = kindPath.endsWith('order') ? 'order' : clean(b.kind, 20) || 'lead';
    const rec = { kind, time: new Date().toISOString(), ip: String(ip), site: process.env.SITE_URL || '', page: clean(b.page, 500), name: clean(b.name, 200), phone: clean(b.phone || b.contact, 100), addr: clean(b.addr, 500), msg: clean(b.msg, 3000),
      items: Array.isArray(b.items) ? b.items.slice(0, 200).map((i) => ({ name: clean(i.name, 300), finish: clean(i.finish, 100), qty: Math.max(1, Math.min(9999, +i.qty || 1)), price: typeof i.price === 'number' ? i.price : null, url: clean(i.url, 300) })) : [], total: typeof b.total === 'number' ? b.total : null };
    if (!rec.phone) return json(res, 400, { ok: false, error: 'нет телефона' });
    if (kind === 'order' && !rec.items.length) return json(res, 400, { ok: false, error: 'пустая корзина' });
    fs.appendFileSync(LOG, JSON.stringify(rec) + '\n');
    let mail = ''; try { mail = await sendMail(kind === 'order' ? `Заказ с сайта: ${rec.name}, ${rec.phone}` : `Заявка с сайта: ${rec.phone}`, render(kind, rec)); } catch (e) { mail = 'ошибка почты: ' + e.message; console.error(e); }
    console.log(new Date().toISOString(), kind, rec.phone, mail);
    json(res, 200, { ok: true });
  });
}).listen(PORT, '127.0.0.1', () => console.log(`[api] http://127.0.0.1:${PORT}/api/{lead,order}`));

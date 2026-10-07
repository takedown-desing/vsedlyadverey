// Данные компании редактируются в админке (/admin/, раздел «Настройки → Компания») и лежат в src/cms/settings/company.json.
// Пустые поля (email, hours, ссылки мессенджеров) шаблоны не выводят.
import companyRaw from '../cms/settings/company.json';
export type Company = {
  brand: string; domain: string; legalName: string; inn: string; kpp: string; ogrn: string; okpo: string;
  phoneMain: string; phoneMainNote: string; email: string;
  messengers: { name: string; url: string }[];
  city: string; postalCode: string; street: string; address: string; legalAddress: string; metro: string;
  geo: { lat: number; lon: number };
  showroomBrands: string[];
  hours: { d: string; t: string }[];
  bank: { name: string; account: string; corr: string; bik: string };
  delivery: { mkad: number; perKm: number; freeMoscowFrom: number; toCarrier: number; freeCarrierFrom: number };
  prepayOnOrder: number;
};
const c = companyRaw as Partial<Company>;
export const COMPANY: Company = {
  ...(c as Company),
  email: c.email || '',
  messengers: (c.messengers || []).filter((m) => m && m.name),
  hours: (c.hours || []).filter((h) => h && h.d && h.t),
  showroomBrands: c.showroomBrands || [],
};
// schema.org openingHours из таблицы режима работы: «Пн–Пт» → Mo-Fr
const DAYS: Record<string, string> = { пн: 'Mo', вт: 'Tu', ср: 'We', чт: 'Th', пт: 'Fr', сб: 'Sa', вс: 'Su' };
export const hoursSchema = COMPANY.hours.flatMap((h) => {
  const t = h.t.replace(/[–—]/g, '-').replace(/\s/g, '');
  if (!/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(t)) return [];
  const d = h.d.toLowerCase().replace(/\s/g, '').split(/[–—-]/).map((x) => DAYS[x.slice(0, 2)]).filter(Boolean);
  return d.length ? [`${d.join('-')} ${t}`] : [];
});
export const tel = (s: string) => 'tel:' + s.replace(/[^+\d]/g, '');
export const mapSrc = (z = 16) => `https://yandex.ru/map-widget/v1/?ll=${COMPANY.geo.lon}%2C${COMPANY.geo.lat}&z=${z}&pt=${COMPANY.geo.lon},${COMPANY.geo.lat},pm2rdm`;

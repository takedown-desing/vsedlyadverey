// Данные компании из ответов клиента от 06.10.2026 (Вопросы_клиенту_дверная_фурнитура.docx.pdf).
// Пустые поля (email, hours, ссылки мессенджеров) клиент ещё не дал: шаблоны их не выводят.
export const COMPANY = {
  brand: 'Всё для дверей',
  domain: 'вседлядверей.рф',
  legalName: 'ООО «САНТЕХСИСТЕМА-МОСКВА»',
  inn: '7718968841',
  kpp: '774301001',
  ogrn: '1147746152498',
  okpo: '56657657',
  // временно: номер из текста клиента про доставку; клиент обещал новый номер для магазина
  phoneMain: '+7 (499) 264-52-11',
  phoneMainNote: 'многоканальный',
  email: '',
  messengers: [{ name: 'MAX', url: '' }, { name: 'Telegram', url: '' }],
  city: 'Москва',
  postalCode: '125493',
  street: 'ул. Флотская, д. 5, к. 2',
  address: 'Москва, ул. Флотская, д. 5, к. 2',
  legalAddress: '125493, г. Москва, ул. Флотская, д. 5, к. 2',
  metro: 'м. «Речной вокзал», около 1,2 км',
  geo: { lat: 55.85259, lon: 37.49471 },
  // в шоуруме выставлены только эти бренды
  showroomBrands: ['colombo-design', 'tupai'],
  hours: [] as { d: string; t: string }[],
  hoursSchema: [] as string[],
  bank: { name: 'ООО «Банк Точка», г. Москва', account: '40702810420000068663', corr: '30101810745374525104', bik: '044525104' },
  // условия доставки и оплаты из ответов клиента
  delivery: { mkad: 500, perKm: 25, freeMoscowFrom: 20000, toCarrier: 600, freeCarrierFrom: 25000 },
  prepayOnOrder: 70,
};
export const tel = (s: string) => 'tel:' + s.replace(/[^+\d]/g, '');
export const mapSrc = (z = 16) => `https://yandex.ru/map-widget/v1/?ll=${COMPANY.geo.lon}%2C${COMPANY.geo.lat}&z=${z}&pt=${COMPANY.geo.lon},${COMPANY.geo.lat},pm2rdm`;

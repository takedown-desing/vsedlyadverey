// Генерирует public/admin/config.yml для админки (Sveltia CMS, формат Decap/Netlify CMS).
// Запускается перед сборкой (npm run prebuild). Списки разделов и брендов берутся из реестра страниц
// и настроек каталога, поэтому выпадающие списки в админке всегда совпадают с сайтом.
// Файл записывается в JSON-синтаксисе: это валидный YAML, а зависимостей для YAML у проекта нет.
import fs from 'node:fs';
import path from 'node:path';

const registry = JSON.parse(fs.readFileSync(path.resolve('src/data/registry.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.resolve('src/cms/settings/catalog.json'), 'utf8'));
const out = path.resolve('public/admin/config.yml');

const REPO = 'takedown-desing/maniglia-shop';
const SITE_URL = 'https://takedown-desing.github.io/maniglia-shop/';

const byType = (types) => registry.filter((p) => types.includes(p.type) && p.priority !== 'OFF');
const opt = (p) => ({ label: `${p.h1} (${p.url})`, value: p.url });
const categoryOptions = byType(['category', 'subcategory']).filter((p) => p.url !== '/catalog/komplekty-furnitury/').map(opt);
const linkTargets = byType(['home', 'category', 'subcategory', 'tag', 'door-type', 'kit', 'brand', 'brand-hub', 'blog-hub', 'utility']).map(opt);
const textPageOptions = byType(['home', 'category', 'subcategory', 'tag', 'door-type', 'kit', 'brand-hub', 'blog-hub', 'utility', 'brand', 'brand-category', 'series']).map(opt);
const brandOptions = catalog.brands.map((b) => ({ label: b.name, value: b.slug }));
const brandCatOptions = [...new Set(byType(['brand-category']).map((p) => p.url.split('/')[3]))].sort().map((c) => ({ label: c, value: c }));

const ICONS = ['handle', 'rosette', 'lock', 'padlock', 'cylinder', 'hinge', 'closer', 'slide', 'stop', 'bolt', 'eye', 'seal', 'glass', 'window', 'furniture', 'kit', 'truck', 'shield', 'store', 'check', 'box', 'percent', 'search', 'cart', 'chat'];
const COLORS = [
  ['black', 'чёрный'], ['chrome', 'хром'], ['gold', 'золото'], ['bronze', 'бронза'], ['nickel', 'никель'], ['brass', 'латунь'],
  ['white', 'белый'], ['graphite', 'графит'], ['copper', 'медь'], ['silver', 'серебро'], ['other', 'другое'],
].map(([value, label]) => ({ label, value }));
const DOOR_TYPES = [
  ['interior', 'межкомнатные'], ['entrance', 'входные'], ['sliding', 'раздвижные'], ['glass', 'стеклянные'], ['pvc', 'ПВХ'],
  ['aluminium', 'алюминиевые'], ['fire', 'противопожарные'], ['finnish', 'финские'], ['gate', 'калитки и ворота'], ['bathroom', 'ванная и туалет'],
].map(([value, label]) => ({ label, value }));

const str = (name, label, extra = {}) => ({ name, label, widget: 'string', required: false, ...extra });
const txt = (name, label, extra = {}) => ({ name, label, widget: 'text', required: false, ...extra });
const md = (name, label, extra = {}) => ({ name, label, widget: 'markdown', required: false, buttons: ['bold', 'italic', 'link', 'heading-two', 'heading-three', 'bulleted-list', 'numbered-list', 'quote'], editor_components: [], ...extra });
const num = (name, label, extra = {}) => ({ name, label, widget: 'number', value_type: 'int', required: false, ...extra });
const bool = (name, label, def = false, extra = {}) => ({ name, label, widget: 'boolean', default: def, required: false, ...extra });
const sel = (name, label, options, extra = {}) => ({ name, label, widget: 'select', options, required: false, ...extra });
const icon = () => sel('icon', 'Иконка', ICONS, { default: 'check' });

const faq = { name: 'faq', label: 'Вопросы и ответы (FAQ)', label_singular: 'Вопрос', widget: 'list', required: false, collapsed: true, summary: '{{fields.q}}',
  fields: [str('q', 'Вопрос', { required: true }), txt('a', 'Ответ', { required: true })] };

// Блочный контент: типы совпадают с src/components/Blocks.astro
const blocks = { name: 'blocks', label: 'Блоки контента', label_singular: 'Блок', widget: 'list', required: false, collapsed: true, typeKey: 'type', summary: '{{fields.type}}: {{fields.title}}',
  hint: 'Порядок блоков можно менять перетаскиванием. Ссылки внутри текста: [текст](/catalog/dvernye-ruchki/).',
  types: [
    { name: 'text', label: 'Текст', fields: [str('title', 'Заголовок'), md('md', 'Текст', { required: true })] },
    { name: 'cards', label: 'Карточки (преимущества, виды)', fields: [str('title', 'Заголовок'), { name: 'items', label: 'Карточки', label_singular: 'Карточка', widget: 'list', summary: '{{fields.title}}', fields: [str('title', 'Заголовок', { required: true }), txt('text', 'Текст'), icon()] }] },
    { name: 'table', label: 'Таблица', fields: [str('title', 'Заголовок'), str('head', 'Шапка таблицы', { hint: 'Колонки через вертикальную черту: Параметр | Значение', required: true }), { name: 'rows', label: 'Строки', label_singular: 'Строка', widget: 'list', field: str('cell', 'Строка', { hint: 'Ячейки через вертикальную черту: В пределах МКАД | 500 ₽' }) }, str('note', 'Примечание под таблицей')] },
    { name: 'steps', label: 'Шаги (как выбрать, как установить)', fields: [str('title', 'Заголовок'), { name: 'items', label: 'Шаги', label_singular: 'Шаг', widget: 'list', summary: '{{fields.title}}', fields: [str('title', 'Название шага', { required: true }), txt('text', 'Текст')] }] },
    { name: 'checklist', label: 'Чек-лист', fields: [str('title', 'Заголовок'), { name: 'items', label: 'Пункты', label_singular: 'Пункт', widget: 'list', field: str('item', 'Пункт') }] },
    { name: 'callout', label: 'Плашка (совет или предупреждение)', fields: [sel('kind', 'Вид', [{ label: 'Совет', value: 'tip' }, { label: 'Важно', value: 'warn' }], { default: 'tip' }), str('title', 'Заголовок'), txt('text', 'Текст', { required: true })] },
    { name: 'stats', label: 'Цифры-факты', fields: [str('title', 'Заголовок'), { name: 'items', label: 'Цифры', label_singular: 'Цифра', widget: 'list', summary: '{{fields.value}} {{fields.label}}', fields: [str('value', 'Значение', { required: true }), str('label', 'Подпись', { required: true })] }] },
    { name: 'bars', label: 'Инфографика: столбцы', fields: [str('title', 'Заголовок'), str('unit', 'Единица измерения'), { name: 'items', label: 'Значения', label_singular: 'Значение', widget: 'list', summary: '{{fields.label}}: {{fields.value}}', fields: [str('label', 'Подпись', { required: true }), { name: 'value', label: 'Число', widget: 'number', value_type: 'float', required: true }] }, str('note', 'Примечание')] },
    { name: 'range', label: 'Инфографика: диапазоны', fields: [str('title', 'Заголовок'), str('unit', 'Единица измерения'), { name: 'items', label: 'Диапазоны', label_singular: 'Диапазон', widget: 'list', summary: '{{fields.label}}: {{fields.from}}–{{fields.to}}', fields: [str('label', 'Подпись', { required: true }), { name: 'from', label: 'От', widget: 'number', value_type: 'float', required: true }, { name: 'to', label: 'До', widget: 'number', value_type: 'float', required: true }] }, str('note', 'Примечание')] },
  ] };

const seo = [
  str('title', 'Title (заголовок вкладки и сниппета)', { hint: 'До 70 знаков. Если пусто, подставится заголовок из реестра' }),
  txt('description', 'Description (описание для поиска)', { hint: '120–160 знаков' }),
];

const config = {
  backend: {
    name: 'github', repo: REPO, branch: 'main',
    // коммиты из админки идут с [skip ci]; сайт пересобирается по кнопке «Publish Changes» в меню аккаунта
    // (она шлёт repository_dispatch sveltia-cms-publish, его слушает .github/workflows/deploy.yml)
    skip_ci: true,
    commit_messages: { create: 'Админка: добавлен {{collection}} «{{slug}}»', update: 'Админка: изменён {{collection}} «{{slug}}»', delete: 'Админка: удалён {{collection}} «{{slug}}»', uploadMedia: 'Админка: загружен файл {{path}}', deleteMedia: 'Админка: удалён файл {{path}}' },
  },
  site_url: SITE_URL, display_url: SITE_URL, logo: { src: SITE_URL + 'favicon.svg' },
  media_folder: 'public/images/uploads', public_folder: '/images/uploads',
  slug: { encoding: 'ascii', clean_accents: true },
  collections: [
    {
      name: 'products', label: 'Товары', label_singular: 'Товар', folder: 'src/cms/products', create: true, format: 'json', extension: 'json',
      identifier_field: 'name', slug: '{{fields.slug}}', summary: '{{name}}', sortable_fields: ['name', 'brand', 'order', 'category'],
      view_groups: [{ label: 'По бренду', field: 'brand' }, { label: 'По разделу', field: 'category' }, { label: 'Скрытые', field: 'hidden' }],
      view_filters: [{ label: 'Скрытые с сайта', field: 'hidden', pattern: true }, { label: 'Стартовые бренды (Colombo, TUPAI)', field: 'brand', pattern: '^(colombo-design|tupai)$' }],
      description: 'Карточка товара: название, бренд, раздел, варианты покрытий с фото и ценой, характеристики, описание и блоки текста. Товар без фото на сайт не выводится.',
      fields: [
        str('slug', 'Адрес карточки (slug)', { required: true, pattern: ['^[a-z0-9]+(-[a-z0-9]+)*$', 'Только латиница, цифры и дефисы: бренд-серия-артикул'], hint: 'Страница товара будет /product/<slug>/. После публикации не менять' }),
        str('name', 'Название', { required: true, hint: 'Без покрытия: «Дверная ручка Colombo Design Robot CD41RSB на круглой розетке»' }),
        sel('brand', 'Бренд', brandOptions, { required: true }),
        str('series', 'Серия / коллекция'),
        sel('category', 'Раздел каталога', categoryOptions, { required: true, hint: 'Самый глубокий подходящий раздел' }),
        str('article', 'Артикул модели'),
        num('order', 'Порядок в листинге', { hint: 'Меньше = выше. У существующих товаров 1–515, новые по умолчанию в конце' }),
        bool('hidden', 'Скрыть с сайта', false, { hint: 'Товар остаётся в админке, но не публикуется' }),
        str('hiddenNote', 'Почему скрыт'),
        {
          name: 'variants', label: 'Варианты покрытий', label_singular: 'Покрытие', widget: 'list', required: true, collapsed: false, summary: '{{fields.finish}} · {{fields.price}} ₽',
          hint: 'Минимум один вариант с фото. Первый вариант с фото становится главным в карточке',
          fields: [
            str('finish', 'Покрытие (как на сайте)', { required: true, hint: 'например: матовый чёрный' }),
            sel('color', 'Группа цвета (для фильтра)', COLORS, { required: true, default: 'other' }),
            str('article', 'Артикул варианта'),
            num('price', 'Цена, ₽', { hint: 'Пусто = «Цена по запросу»' }),
            bool('inStock', 'На складе поставщика', true, { hint: 'Снять галочку = «Под заказ»' }),
            { name: 'image', label: 'Фото', widget: 'image', required: false, media_folder: '/public/images/products', public_folder: '/images/products', choose_url: false, hint: 'JPG до 800 px по длинной стороне, фон белый, без водяных знаков чужих магазинов' },
            str('imageSrc', 'Источник фото (ссылка)', { hint: 'Откуда взято фото. Фото без источника на сайт не выводится; фото с todoor.ru блокируются' }),
          ],
        },
        str('material', 'Материал', { hint: 'латунь, цинковый сплав (ЦАМ), нержавеющая сталь' }),
        sel('style', 'Стиль', [{ label: 'Современный', value: 'modern' }, { label: 'Классика', value: 'classic' }, { label: 'Минимализм', value: 'minimal' }, { label: 'Лофт', value: 'loft' }]),
        sel('doorTypes', 'Для каких дверей', DOOR_TYPES, { multiple: true, hint: 'Товар попадёт в разделы «Фурнитура для … дверей»' }),
        { name: 'specs', label: 'Характеристики', label_singular: 'Характеристика', widget: 'list', required: false, collapsed: true, summary: '{{fields.k}}: {{fields.v}}', fields: [str('k', 'Название', { required: true, hint: 'Квадрат, мм' }), str('v', 'Значение', { required: true, hint: '8' })], hint: 'Поля «Страна производства», «Гарантия» и размеры попадают в таблицу характеристик и в фильтр' },
        txt('description', 'Короткое описание', { hint: '2–4 предложения своими словами' }),
        txt('intro', 'Вводный абзац карточки', { hint: 'Показывается под кнопкой «В корзину»' }),
        blocks,
        faq,
        str('sourceUrl', 'Источник данных (ссылка)'),
      ],
    },
    {
      name: 'pages', label: 'Разделы каталога: тексты', label_singular: 'Текст раздела', folder: 'src/cms/pages', create: true, format: 'json', extension: 'json',
      identifier_field: 'h1', slug: '{{fields.url}}', summary: '{{h1}} · {{url}}', sortable_fields: ['url', 'h1'],
      description: 'SEO-тексты страниц каталога, главной, подборок «по типу двери» и списка брендов. Сами разделы (адреса, вложенность) заданы структурой сайта и здесь не создаются.',
      fields: [
        sel('url', 'Страница', textPageOptions, { required: true, hint: 'Адрес страницы, для которой этот текст. Один текст на страницу' }),
        ...seo,
        str('h1', 'Заголовок H1'),
        txt('lead', 'Подзаголовок (лид)', { hint: '1–2 предложения под H1' }),
        md('text', 'Простой текст (если нет блоков)'),
        blocks,
        faq,
      ],
    },
    {
      name: 'brands', label: 'Бренды', label_singular: 'Бренд', folder: 'src/cms/brands', create: true, format: 'json', extension: 'json',
      identifier_field: 'name', slug: '{{fields.slug}}', summary: '{{name}}',
      description: 'Страница бренда: справка, текст, серии, подразделы «бренд × категория». Чтобы бренд появился в меню и фильтрах, добавьте его также в «Настройки → Каталог и бренды».',
      fields: [
        str('slug', 'Адрес (slug)', { required: true, pattern: ['^[a-z0-9]+(-[a-z0-9]+)*$', 'Только латиница, цифры и дефисы'] }),
        str('name', 'Название', { required: true }), str('country', 'Страна'), str('founded', 'Год основания'), str('segment', 'Сегмент', { hint: 'эконом / средний / премиум' }),
        str('tagline', 'Короткая характеристика'), ...seo, md('text', 'Текст о бренде'),
        { name: 'series', label: 'Серии (названия)', widget: 'list', required: false, field: str('s', 'Серия') },
        { name: 'categories', label: 'Подразделы бренда (бренд × категория)', label_singular: 'Подраздел', widget: 'list', required: false, collapsed: true, summary: '{{fields.slug}}: {{fields.title}}',
          fields: [sel('slug', 'Категория', brandCatOptions, { required: true }), ...seo, txt('lead', 'Лид'), md('text', 'Текст')] },
      ],
    },
    {
      name: 'series', label: 'Серии брендов', label_singular: 'Серия', folder: 'src/cms/series', create: true, format: 'json', extension: 'json',
      identifier_field: 'name', slug: '{{fields.slug}}', summary: '{{name}}',
      description: 'Тексты страниц серий (/series/…). Какие товары попадают в серию, определяется правилом по названию модели; новые серии нужно согласовать с разработчиком.',
      fields: [str('slug', 'Адрес (slug)', { required: true }), str('name', 'Название', { required: true }), sel('brand', 'Бренд', brandOptions, { required: true }), ...seo, md('text', 'Текст')],
    },
    {
      name: 'articles', label: 'Статьи («Инструкции и советы»)', label_singular: 'Статья', folder: 'src/cms/articles', create: true, format: 'json', extension: 'json',
      identifier_field: 'h1', slug: '{{fields.slug}}', summary: '{{h1}}', sortable_fields: ['order', 'date', 'h1'],
      description: 'Статьи блога. Адрес статьи /blog/<slug>/. Новая статья появляется в списке и на главной сразу после публикации.',
      fields: [
        str('slug', 'Адрес (slug)', { required: true, pattern: ['^[a-z0-9]+(-[a-z0-9]+)*$', 'Только латиница, цифры и дефисы'] }),
        num('order', 'Порядок в списке', { hint: 'Меньше = выше' }),
        sel('hub', 'Рубрика', [['ruchki', 'Ручки'], ['zamki', 'Замки'], ['petli', 'Петли'], ['dovodchiki', 'Доводчики'], ['razdvizhnye-sistemy', 'Раздвижные системы'], ['okna', 'Окна']].map(([value, label]) => ({ label, value })), { required: true }),
        ...seo, str('h1', 'Заголовок', { required: true }),
        { name: 'date', label: 'Дата', widget: 'datetime', format: 'YYYY-MM-DD', date_format: 'DD.MM.YYYY', time_format: false, required: false },
        str('author', 'Автор', { default: 'Редакция «Всё для дверей»' }), num('readingMinutes', 'Время чтения, мин'),
        md('body', 'Текст статьи', { required: true, hint: 'Заголовки разделов делайте «Заголовок 2»' }),
        faq,
        sel('related', 'Связанные разделы каталога', linkTargets, { multiple: true, hint: 'Статья будет предлагаться в карточках товаров этих разделов' }),
      ],
    },
    {
      name: 'service', label: 'Информационные страницы', label_singular: 'Страница', folder: 'src/cms/service', create: true, format: 'json', extension: 'json',
      identifier_field: 'h1', slug: '{{fields.url}}', summary: '{{h1}} · {{url}}',
      description: 'Доставка, оплата, гарантия, шоурум, вопросы и ответы. Страницы «Оптовикам», «Дизайнерам», «Производителям дверей» сейчас отключены и не публикуются, тексты сохранены на будущее.',
      fields: [
        sel('url', 'Адрес страницы', byType(['utility', 'b2b']).filter((p) => !['/search/', '/cart/', '/compare/', '/account/', '/sitemap/', '/new/', '/sale/', '/o-kompanii/', '/kontakty/', '/otzyvy/'].includes(p.url)).map(opt).concat(registry.filter((p) => p.type === 'b2b').map(opt)), { required: true }),
        ...seo, str('h1', 'Заголовок', { required: true }), md('body', 'Текст', { required: true, hint: 'Таблицы можно вставлять в формате Markdown: | Куда | Стоимость |' }), faq,
      ],
    },
    {
      name: 'reviews', label: 'Отзывы', files: [{
        name: 'reviews', label: 'Отзывы покупателей', file: 'src/cms/reviews.json', format: 'json',
        fields: [
          str('note', 'Пометка над отзывами', { hint: 'Пока отзывы вымышленные, пометка обязательна. Когда появятся настоящие, очистите поле' }),
          { name: 'reviews', label: 'Отзывы', label_singular: 'Отзыв', widget: 'list', required: false, summary: '{{fields.name}} · {{fields.rating}}★ · {{fields.productName}}',
            fields: [str('name', 'Имя', { required: true }), str('city', 'Город'), { name: 'date', label: 'Дата', widget: 'datetime', format: 'YYYY-MM-DD', date_format: 'DD.MM.YYYY', time_format: false, required: false },
              num('rating', 'Оценка (1–5)', { required: true, min: 1, max: 5 }), str('product', 'Slug товара', { hint: 'Адрес карточки без /product/, чтобы отзыв показался в карточке' }), str('productName', 'Название товара'), txt('text', 'Текст отзыва', { required: true })] },
        ],
      }],
    },
    {
      name: 'settings', label: 'Настройки сайта', files: [
        {
          name: 'company', label: 'Компания и контакты', file: 'src/cms/settings/company.json', format: 'json',
          fields: [
            str('brand', 'Название магазина', { required: true }), str('domain', 'Домен', { required: true }), str('legalName', 'Юридическое лицо', { required: true }),
            str('inn', 'ИНН'), str('kpp', 'КПП'), str('ogrn', 'ОГРН'), str('okpo', 'ОКПО'),
            str('phoneMain', 'Телефон', { required: true }), str('phoneMainNote', 'Подпись к телефону', { hint: 'многоканальный' }),
            str('email', 'E-mail', { hint: 'Пусто = не показывать' }),
            { name: 'messengers', label: 'Мессенджеры', label_singular: 'Мессенджер', widget: 'list', required: false, fields: [str('name', 'Название', { required: true }), str('url', 'Ссылка', { hint: 'https://t.me/… или https://max.ru/…; пусто = «подключается»' })] },
            str('city', 'Город'), str('postalCode', 'Индекс'), str('street', 'Улица, дом'), str('address', 'Адрес коротко (для шапки и подвала)'), str('legalAddress', 'Адрес полностью (реквизиты)'), str('metro', 'Как добраться'),
            { name: 'geo', label: 'Координаты для карты', widget: 'object', fields: [{ name: 'lat', label: 'Широта', widget: 'number', value_type: 'float' }, { name: 'lon', label: 'Долгота', widget: 'number', value_type: 'float' }] },
            sel('showroomBrands', 'Бренды в шоуруме', brandOptions, { multiple: true }),
            { name: 'hours', label: 'Режим работы', label_singular: 'Строка', widget: 'list', required: false, fields: [str('d', 'Дни', { required: true, hint: 'Пн–Пт' }), str('t', 'Часы', { required: true, hint: '10:00–19:00 или «выходной»' })], hint: 'Пусто = «время визита согласуйте по телефону»' },
            { name: 'bank', label: 'Банк', widget: 'object', fields: [str('name', 'Банк'), str('account', 'Расчётный счёт'), str('corr', 'Корр. счёт'), str('bik', 'БИК')] },
            { name: 'delivery', label: 'Тарифы доставки (цифры для главной и карточек)', widget: 'object', fields: [num('mkad', 'В пределах МКАД, ₽'), num('perKm', 'За МКАД, ₽ за км'), num('freeMoscowFrom', 'Бесплатно по Москве от, ₽'), num('toCarrier', 'До транспортной компании, ₽'), num('freeCarrierFrom', 'До ТК бесплатно от, ₽')], hint: 'Текст страницы «Доставка» правится отдельно в «Информационных страницах»' },
            num('prepayOnOrder', 'Предоплата под заказ, %'),
          ],
        },
        {
          name: 'site', label: 'Служебные тексты', file: 'src/cms/settings/site.json', format: 'json',
          fields: [
            txt('announcement', 'Плашка над шапкой', { hint: 'Пусто = плашки нет' }), bool('announcementShowPhone', 'Показывать телефон в плашке', true),
            txt('footerAbout', 'Текст о магазине в подвале'), str('footerLegalNote', 'Приписка к копирайту'),
            str('stockYes', 'Подпись наличия: есть'), str('stockNo', 'Подпись наличия: нет'),
            txt('priceNote', 'Примечание под ценой в карточке'), str('formNote', 'Подпись под формами'), str('cartNote', 'Подпись в корзине'),
            bool('showPayIcons', 'Показывать иконки оплаты в подвале', true),
          ],
        },
        {
          name: 'home', label: 'Главная страница', file: 'src/cms/settings/home.json', format: 'json',
          fields: [
            { name: 'slides', label: 'Слайды', label_singular: 'Слайд', widget: 'list', summary: '{{fields.title}}', fields: [str('kicker', 'Надзаголовок'), str('title', 'Заголовок', { required: true }), txt('text', 'Текст'), sel('cta', 'Куда ведёт кнопка', linkTargets), str('ctaText', 'Текст кнопки'), { name: 'image', label: 'Картинка (если пусто, берётся фото товара из раздела)', widget: 'image', required: false }, str('imageFrom', 'Раздел для автокартинки', { hint: '/catalog/dvernye-petli/skrytye/ или слово showroom' })] },
            { name: 'promo', label: 'Три плитки под слайдером', label_singular: 'Плитка', widget: 'list', summary: '{{fields.title}}', fields: [icon(), str('title', 'Заголовок', { required: true }), str('text', 'Подпись'), sel('url', 'Ссылка', linkTargets)] },
            { name: 'services', label: 'Блок «Почему покупают у нас»', label_singular: 'Пункт', widget: 'list', summary: '{{fields.title}}', fields: [icon(), str('title', 'Заголовок', { required: true }), str('text', 'Текст')] },
            { name: 'showroom', label: 'Блок шоурума', widget: 'object', fields: [str('kicker', 'Надзаголовок'), str('title', 'Заголовок'), str('noHoursText', 'Текст, если режим работы не задан')] },
            { name: 'lead', label: 'Форма «Перезвоните мне»', widget: 'object', fields: [str('title', 'Заголовок'), txt('text', 'Текст'), str('button', 'Кнопка')] },
            { name: 'aside', label: 'Врезка внизу главной', widget: 'object', fields: [str('title', 'Заголовок'), txt('text', 'Текст'), str('button', 'Кнопка'), sel('url', 'Ссылка', linkTargets)] },
          ],
        },
        {
          name: 'catalog', label: 'Каталог и бренды (меню, порядок)', file: 'src/cms/settings/catalog.json', format: 'json',
          fields: [
            { name: 'categories', label: 'Разделы в левом меню', label_singular: 'Раздел', widget: 'list', summary: '{{fields.name}}', fields: [sel('url', 'Раздел', byType(['category', 'kit']).map(opt), { required: true }), str('name', 'Название в меню', { required: true }), icon()] },
            { name: 'brands', label: 'Бренды (порядок и уровень)', label_singular: 'Бренд', widget: 'list', summary: '{{fields.name}} ({{fields.tier}})', fields: [str('slug', 'Slug бренда', { required: true, hint: 'Совпадает с адресом страницы бренда' }), str('name', 'Название', { required: true }), sel('tier', 'Уровень', [{ label: 'A: ключевые (на главной)', value: 'A' }, { label: 'B: бренды ассортимента', value: 'B' }, { label: 'C: нишевые', value: 'C' }], { default: 'B' })] },
            sel('launchBrands', 'Стартовые бренды', brandOptions, { multiple: true, hint: 'Используется сборкой LAUNCH_ONLY=1' }),
          ],
        },
      ],
    },
  ],
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, '# Сгенерировано scripts/gen-cms-config.mjs, не править вручную (JSON = валидный YAML)\n' + JSON.stringify(config, null, 2) + '\n');
console.log('[gen-cms-config] collections:', config.collections.length, 'category options:', categoryOptions.length, 'text pages:', textPageOptions.length);

# «Всё для дверей»: интернет-магазин дверной фурнитуры (тестовая версия)

Тестовая версия интернет-магазина дверной фурнитуры на 22 бренда (Colombo Design, Krona Koblenz, AGB, Tupai, Venezia, Fratelli Cattini, Morelli, FUARO, Armadillo, PUNTO и др.). Домен магазина: вседлядверей.рф. Данные компании лежат в `src/lib/company.ts`. Цены ориентировочные до загрузки прайса поставщиков. Сборка `LAUNCH_ONLY=1 npm run build` оставляет в каталоге только стартовые бренды (Colombo Design, TUPAI).

Структура сайта (разделы, URL, теги, бренды, перелинковка, sitemap) построена по SEO-проектированию: семантика Wordstat, SERP-кластеризация Яндекса, анализ конкурентов.

## Стек

- [Astro 5](https://astro.build), статическая генерация (SSG), без клиентского фреймворка.
- Данные — JSON в `src/data/` (товары, тексты, реестр страниц).
- Деплой — GitHub Actions → GitHub Pages (`.github/workflows/deploy.yml`).

## Запуск

```bash
npm ci
npm run dev        # http://localhost:4321/maniglia-shop/
npm run build      # сборка в dist/
```

## Где что лежит

| Путь | Что это |
|---|---|
| `src/data/registry.json` | реестр всех страниц: URL, H1, тип, приоритет (из SEO-проектирования) |
| `src/cms/products/*.json` | товары, один файл на модель: варианты покрытий, цены, характеристики, фото, тексты карточки |
| `src/cms/pages/*.json` | title, description, лид, блоки и FAQ разделов каталога (один файл на страницу) |
| `src/cms/brands/`, `src/cms/series/` | страницы брендов и серий |
| `src/cms/articles/*.json` | статьи раздела «Инструкции и советы» |
| `src/cms/service/*.json` | доставка, оплата, гарантия, шоурум, FAQ (и отключённые B2B-страницы) |
| `src/cms/reviews.json`, `src/cms/settings/*.json` | отзывы; компания и контакты, служебные тексты, главная, меню каталога и бренды |
| `public/admin/` | админка Sveltia CMS; `config.yml` генерируется `scripts/gen-cms-config.mjs` при сборке |
| `src/lib/data.ts` | слой данных: выборки товаров для категорий, тегов, брендов, правила индексации |
| `src/pages/` | маршруты: `catalog/[...path]`, `brands/[...path]`, `product/[slug]`, `blog/[slug]`, `[slug]` (типы дверей и служебные) |
| `public/images/products/` | фото товаров (с сайтов брендов и дилеров, для демо) |

## SEO, заложенное в шаблоны

- Канонические URL со слэшем, `index/noindex` по порогу товаров на теговых и бренд-страницах.
- JSON-LD: Organization, WebSite+SearchAction, BreadcrumbList, CollectionPage+ItemList, Product+Offer/AggregateOffer, Article, FAQPage, Brand.
- `sitemap.xml` и `robots.txt` генерируются при сборке.
- Внутренняя перелинковка: плитки подразделов, подборки-теги, «по брендам», «смотрите также», «инструкции по теме», «с этим покупают».

## Переезд на домен

В `astro.config.mjs` (или через переменные окружения при сборке): `SITE_URL=https://домен.ru BASE_PATH=/ npm run build`.

## Ограничения демо

- Цены ориентировочные, из открытых источников; наличие условное.
- Корзина работает в браузере (localStorage), заказы и формы никуда не отправляются.
- Фото товаров взяты с сайтов брендов и дилеров для демонстрации; для рабочего запуска нужны фото от поставщика или разрешение правообладателей.

## Админка

`/admin/` (Sveltia CMS, git-based): правки сохраняются коммитами в этот репозиторий с пометкой `[skip ci]`,
кнопка «Publish Changes» шлёт `repository_dispatch: sveltia-cms-publish`, на который деплой-workflow пересобирает сайт.
Вход: GitHub-аккаунт с правами на репозиторий (кнопка «Войти с помощью токена доступа») или OAuth через
`backend.base_url`, когда будет развёрнут [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth).
Инструкция для редакторов: `Инструкция по управлению сайтом.pdf` в папке проекта.

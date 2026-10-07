# Формат товара (JSON-массив в src/data/products/<group>.json)

> С 07.10.2026 контент лежит в `src/cms/` по одному файлу на сущность и правится через админку `/admin/`. Отличия формата: `specs` хранится списком `{k, v}`, таблицы блоков строками `ячейка | ячейка`, тексты карточки (`intro`, `blocks`, `faq`) внутри файла товара. Описание ниже про смысл полей остаётся в силе.

```json
{
  "slug": "colombo-design-robot-cd41-cromat",        // латиница, дефисы, уникальный: бренд-модель-артикул-покрытие
  "name": "Дверная ручка Colombo Design Robot CD41 на розетке",   // без покрытия
  "brand": "colombo-design",                          // slug бренда из списка ниже
  "series": "Robot",                                  // или null
  "category": "/catalog/dvernye-ruchki/na-rozetke/",  // САМЫЙ ГЛУБОКИЙ подходящий URL из src/data/_catalog-urls.json (type subcategory/category, НЕ tag)
  "article": "CD41",
  "variants": [                                       // покрытия одной модели; минимум 1
    {"finish": "матовый хром", "color": "chrome", "article": "CD41-CM", "price": 12500, "inStock": true, "image": "/images/products/colombo-design-robot-cd41-cromat.jpg"}
  ],
  "material": "латунь",                               // или null
  "style": "modern",                                  // modern | classic | minimal | loft | null
  "doorTypes": ["interior"],                          // interior | entrance | sliding | glass | pvc | aluminium | fire | bathroom
  "specs": {"Тип": "ручка на розетке", "Форма розетки": "круглая", "Диаметр розетки, мм": "50", "Квадрат, мм": "8", "Толщина двери, мм": "35–55", "Гарантия": "10 лет"},
  "description": "2–4 предложения СВОИМИ словами (не копировать текст источника): что это, для каких дверей, чем хорош.",
  "sourceUrl": "https://..."                          // откуда факты и цена
}
```

- `color` — одно из: black, chrome, gold, bronze, nickel, brass, white, graphite, copper, silver, other.
- `price` — целое число в рублях за единицу (для петель — за 1 шт; для ручек — за комплект), брать из открытого российского магазина/дилера, НЕ выдумывать; если цены нет — `null`.
- `image` — локальный путь; файл скачан в `site/public/images/products/<slug>[-<n>].jpg`, ужат `sips -Z 800 --setProperty format jpeg`, вес < 150 КБ. Если картинку скачать нельзя — `null`.
- Бренды (slug): morelli, fuaro, punto, armadillo, agb, krona-koblenz, colombo-design, fratelli-cattini, fantom, verum, ajax, class, tupai, extreza, otlav, lockstyle, venezia, forme, pamar, melodia, comaglio, porta-di-parma.
- Только реально существующие модели этих брендов, факты с реальных страниц. Никаких выдуманных артикулов.

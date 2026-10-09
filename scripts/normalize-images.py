"""Приводит фото товаров к стандарту: 800x800, белый фон, товар по центру с полями ~7%.
Обрезает белые/почти белые поля исходника, вписывает в 744x744 и центрирует.
Повторный запуск безопасен: файлы 800x800 пропускаются (их не пережимаем)."""
import sys, os
from PIL import Image, ImageChops, ImageOps
DIR = "public/images/products"
S, INNER = 800, 744
done = skipped = 0
for fn in sorted(os.listdir(DIR)):
    if not fn.lower().endswith((".jpg", ".jpeg", ".png", ".webp")): continue
    p = os.path.join(DIR, fn)
    try:
        im = Image.open(p)
        if im.size == (S, S): continue  # уже приведено к стандарту: не пережимаем повторно
        im = ImageOps.exif_transpose(im)
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA"); bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg
        im = im.convert("RGB")
        # обрезка полей, близких к белому
        diff = ImageChops.difference(im, Image.new("RGB", im.size, (255, 255, 255)))
        diff = diff.convert("L").point(lambda x: 255 if x > 18 else 0)
        box = diff.getbbox()
        if box:
            w, h = im.size
            bw, bh = box[2] - box[0], box[3] - box[1]
            # не режем фото-интерьеры (заполнены почти целиком)
            if bw * bh < 0.97 * w * h: im = im.crop(box)
        im.thumbnail((INNER, INNER), Image.LANCZOS)
        if max(im.size) < INNER * 0.6:  # маленькие исходники — умеренно увеличиваем
            k = (INNER * 0.8) / max(im.size); im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
        canvas = Image.new("RGB", (S, S), (255, 255, 255))
        canvas.paste(im, ((S - im.width) // 2, (S - im.height) // 2))
        canvas.save(p, "JPEG", quality=80, optimize=True, progressive=True)
        done += 1
    except Exception as e:
        print("ERR", fn, e); skipped += 1
print("normalized", done, "errors", skipped)

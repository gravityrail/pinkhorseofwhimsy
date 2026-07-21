# Worm

HTML5 worm game with custom cute PNG sprites. Source of truth lives here; publish by copying to `site/static/worm/`.

```bash
rm -rf ../../site/static/worm
mkdir -p ../../site/static/worm
cp -R index.html js assets ../../site/static/worm/
# Cover splash (arcade card + box-art overlay):
# cp path/to/cover.png ../../site/static/arcade/splashes/worm.png
```

Assets live under `assets/` (`treasures/`, `birds/`, `hazards/`, `ui/`). The game draws these PNGs on canvas and in the HUD — no emoji graphics.

Includes Pink Horse Arcade controls shim (`/arcade/controls.js`) with native touch UI retained (`disableTouch: true`).

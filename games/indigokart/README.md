# Indigo Kart (v1)

Modular vanilla JS + three.js kart racer. Source of truth lives here.

```bash
rm -rf ../../site/static/indigokart
mkdir -p ../../site/static/indigokart
rsync -a --exclude README.md --exclude .DS_Store ./ ../../site/static/indigokart/
```

Includes arcade controls for gas/brake/drift/item.

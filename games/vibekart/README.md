
## Publishing to the Pink Horse Arcade

Hosted at `/vibekart/`. Build with base path:

```bash
npm install
npm run build
rm -rf ../../site/static/vibekart && cp -R dist/. ../../site/static/vibekart/
```

Commit the refreshed `site/static/vibekart/`. Arcade card: `site/src/pages/arcade/index.tsx`.
Controls via `/arcade/controls.js` injected from `index.html`.

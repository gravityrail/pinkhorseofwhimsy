# Bean Quiz — publish

Full game source (HTML/JS + assets + topic packs) lives in this directory.
Asset generators: `generate-art.mjs`, `generate-audio.mjs`, `remove-bg.mjs`.

```bash
rm -rf site/static/bean-quiz
mkdir -p site/static/bean-quiz
rsync -a \
  --exclude "generate-*.mjs" \
  --exclude "remove-bg.mjs" \
  --exclude "PUBLISH.md" \
  --exclude "node_modules" \
  --exclude ".DS_Store" \
  games/bean-quiz/ site/static/bean-quiz/
```

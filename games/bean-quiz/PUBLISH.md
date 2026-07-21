# Bean Quiz — publish

Full game source (HTML/JS + assets + topic packs) lives in this directory.

Asset generators (all idempotent — they skip files that exist; `FORCE=1` regenerates):

| Script | What | Output |
| --- | --- | --- |
| `generate-art.mjs` | Host character poses + title scene (Gemini) | `site/static/bean-quiz/assets/img/` |
| `generate-art-v2.mjs` | Contestant avatars, particle props, extra poses, medals, pink-horse cameo, painted logo (Gemini) | `site/static/bean-quiz/assets/img/` |
| `remove-bg.mjs <names…>` | Chroma-keys the green off generated sprites | in place |
| `generate-audio.mjs [lines\|names\|questions]` | Every VO clip via ElevenLabs (reads `data.js` + `topics/*.js` from `site/static/bean-quiz/`) | `site/static/bean-quiz/assets/vo/` |
| `generate-sfx.mjs [names…]` | Game-show SFX + theme music via ElevenLabs | `site/static/bean-quiz/assets/{sfx,music}/` |

> **Music is currently procedural** (WebAudio in `index.html`). The ElevenLabs
> Music API returns 403 until the account owner accepts the terms at
> <https://elevenlabs.io/music-terms>. After accepting, run
> `node games/bean-quiz/generate-sfx.mjs theme think results` and the game
> auto-detects `assets/music/*.mp3` and switches to the real tunes.

Backdrops in `assets/bg/`: `<topicId>.png` per-topic stage art, plus optional
`q_<questionId>.png` per-question art (shown automatically when present).

## Publish

Generators write into `site/static/bean-quiz/`; hand-edits happen here. Sync
**additively** in both directions (never `rm -rf` — each side may have files
the other lacks while generation batches are running):

```bash
rsync -a --exclude "generate-*.mjs" --exclude "remove-bg.mjs" --exclude "PUBLISH.md" \
  --exclude "node_modules" --exclude ".DS_Store" \
  games/bean-quiz/ site/static/bean-quiz/
rsync -a site/static/bean-quiz/assets/ games/bean-quiz/assets/
```

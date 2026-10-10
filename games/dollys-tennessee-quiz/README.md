# Dolly’s Tennessee Quiz

An unofficial, affectionate fan-made trivia show with custom cartoon Dolly art, an original AI East Tennessee character voice, original host dialogue, and original Web Audio stings. No recording or clone of Dolly’s voice is used. Direct Dolly quips are labeled and sourced, with one brief lyric excerpt and song-title nods; the remaining dialogue is original. No commercial music is used.

Play solo or pass the mic between 2–4 contestants. Choose the Grand Tennessee Tour, Knoxville, Smoky Mountains, or Dolly’s roots. There are 45 source-linked questions, including 27 Dolly questions, and seven narrated back-porch stories about family, songwriting, ownership, style, generosity, and women’s independence in practice. Each contestant gets equal turns and one 50/50 lifeline. Ordinary correct answers earn 100 points; each contestant’s last turn is the 500-point “9 to 5” encore. Solo games have nine questions; multiplayer uses the largest multiple of the player count up to nine. Questions and answer positions are shuffled every show.

Tap/click answers, press A–D or 1–4, or use controller face buttons. Arrow keys move focus; Enter activates controls. Sound is opt-in. No timer. Reduced-motion preferences are honored. Best percentage is stored locally when storage is available.

## Publish

Canonical source is here. Copy the runtime files and pre-rendered audio:

```sh
mkdir -p site/static/dollys-tennessee-quiz/assets
cp games/dollys-tennessee-quiz/{index.html,style.css,game.js,data.js,host.js,voice.js,voice-manifest.js} site/static/dollys-tennessee-quiz/
cp -R games/dollys-tennessee-quiz/assets/voice site/static/dollys-tennessee-quiz/assets/
cp games/dollys-tennessee-quiz/assets/dolly.png site/static/dollys-tennessee-quiz/assets/
cp games/dollys-tennessee-quiz/assets/cover.png site/static/arcade/splashes/dollys-tennessee-quiz.png
```

The question bank includes a primary-source URL with every explanation: National Park Service, Visit Knoxville, Library of Congress, Imagination Library, and the Country Music Hall of Fame. The cartoon host was created with OpenAI ImageGen.

## Voice generation

All 124 MP3s are committed: host lines, question readings, fact readings, and back-porch stories. Playback is opt-in through Sound or Listen again. Changing screens, answering, muting, or hiding the tab stops the old queue. Missing or blocked audio leaves the game playable with captions. Questions do not read the answer options, because those options are shuffled.

`voice-config.json` documents the original ElevenLabs Voice Design character and model settings. It contains a public voice ID, never a credential. Generation runs offline and is not part of the site's runtime or deployment. The audio is about 13 minutes and 6.3 MB in total; only the current clip loads during play.

```sh
node games/dollys-tennessee-quiz/generate-voice.mjs --dry-run
node --env-file=/path/to/your/.env games/dollys-tennessee-quiz/generate-voice.mjs
node --test games/dollys-tennessee-quiz/voice.test.mjs
```

The environment file needs `ELEVENLABS_API_KEY`. Generation uses three requests at a time and skips existing clips with matching text, voice, model, and settings hashes. It writes a complete `voice-manifest.js` only after every clip exists. To render a subset, use `--only=story-` or a specific line prefix. If the design voice is unavailable in another account, create a new East Tennessee character voice and replace `voice_id` in the config before rendering. No celebrity reference audio is used.

New facts use Dolly’s official biography and her Uncle Bill tribute, the Imagination Library, and direct interviews in NPR, AARP, BUST, Vogue, and TIME. The women’s independence story is a reading of her actions, not a claim that she adopted a political label.

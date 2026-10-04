# Dolly’s Tennessee Quiz

An unofficial, affectionate fan-made trivia show with custom cartoon Dolly art, original host dialogue, and original Web Audio stings. No recorded Dolly voice or commercial music is used.

Play solo or pass the mic between 2–4 contestants. Choose the Grand Tennessee Tour, Knoxville, Smoky Mountains, or Dolly’s roots. Each contestant gets equal turns and one 50/50 lifeline. Ordinary correct answers earn 100 points; each contestant’s last turn is the 500-point “9 to 5” encore. Solo games have nine questions; multiplayer uses the largest multiple of the player count up to nine. Questions and answer positions are shuffled every show.

Tap/click answers, press A–D or 1–4, or use controller face buttons. Arrow keys move focus; Enter activates controls. Sound is opt-in. No timer. Reduced-motion preferences are honored. Best percentage is stored locally when storage is available.

## Publish

Canonical source is here. Copy the four runtime files and assets:

```sh
mkdir -p site/static/dollys-tennessee-quiz/assets
cp games/dollys-tennessee-quiz/{index.html,style.css,game.js,data.js} site/static/dollys-tennessee-quiz/
cp games/dollys-tennessee-quiz/assets/dolly.png site/static/dollys-tennessee-quiz/assets/
cp games/dollys-tennessee-quiz/assets/cover.png site/static/arcade/splashes/dollys-tennessee-quiz.png
```

The question bank includes a primary-source URL with every explanation: National Park Service, Visit Knoxville, Library of Congress, Imagination Library, and the Country Music Hall of Fame. The cartoon host was created with OpenAI ImageGen.

/*!
 * Bean Quiz topic: 80s Arcade Games.
 * Correct answer is ALWAYS index 0 (correct: 0) — the game shuffles at runtime.
 * Kid-friendly car-trip trivia about classic arcade & console games.
 */
(function () {
  var T = {
    id: 'arcade80s',
    name: '80s Arcade',
    emoji: '🕹️',
    color: '#e11d48',
    questions: [
      { id: 'a80_1', q: "Which yellow circle chomps dots and runs from colorful ghosts in a maze?", a: ["Pac-Man", "Donkey Kong", "Asteroids", "Pong"], correct: 0, fact: "Pac-Man was so popular that pizza shops put him on their menus. The Bean would eat the dots AND the pizza." },
      { id: 'a80_2', q: "In Super Mario Bros., what does Mario usually stomp on to defeat them?", a: ["Goombas", "Coins", "Clouds", "Flagpoles"], correct: 0, fact: "Stomp a Goomba and it goes flat! Just don't try that with real mushrooms. Or real cats. Tiger checked." },
      { id: 'a80_3', q: "What fruit-shaped character is famous for throwing barrels down at a plumber?", a: ["Donkey Kong", "Banana Kong", "King Apple", "Orange Julius"], correct: 0, fact: "Donkey Kong's 1981 arcade cabinet helped launch Mario — who was first called Jumpman!" },
      { id: 'a80_4', q: "What do you put into an old arcade cabinet so you can play?", a: ["A coin (or token)", "A sandwich", "A homework pass", "A tiny dog"], correct: 0, fact: "Quarter after quarter! Arcades were loud, neon temples of beeps and high scores." },
      { id: 'a80_5', q: "Which blue hedgehog runs ridiculously fast and collects golden rings?", a: ["Sonic", "Mario", "Link", "Pac-Man"], correct: 0, fact: "Sonic the Hedgehog debuted in 1991 — a smidge after the pure '80s, but still pure zoom energy. The Bean approves." },
      { id: 'a80_6', q: "In Tetris, what do you do with the falling shapes?", a: ["Stack them to make complete lines disappear", "Feed them to ghosts", "Paint them pink", "Throw them at barrels"], correct: 0, fact: "Tetris was invented in the Soviet Union in 1984. Completing a line feels better than a belly rub. Almost." },
      { id: 'a80_7', q: "Which game is basically two paddles bouncing a square ball back and forth?", a: ["Pong", "Space Invaders", "Frogger", "Centipede"], correct: 0, fact: "Pong (1972) helped invent the whole video-game industry. It's table tennis... but beepier." },
      { id: 'a80_8', q: "In Space Invaders, what are you shooting at?", a: ["Rows of descending aliens", "Friendly ducks", "Pizza delivery drones", "Clouds shaped like cats"], correct: 0, fact: "The aliens speed up as you zap them. Classic stress! Arcades had to stock extra coins because it was so addictive." },
      { id: 'a80_9', q: "What does the frog in Frogger try to do?", a: ["Cross a busy road and a river safely", "Eat every ghost", "Race a go-kart", "Build a house of bricks"], correct: 0, fact: "Hop hop hop — watch for cars AND alligators. Car-trip tip: frogs in real life prefer quieter roads." },
      { id: 'a80_10', q: "Nintendo's famous handheld from 1989 that flipped open was called the...?", a: ["Game Boy", "Play Pocket", "Micro Arcade", "Bean Brick"], correct: 0, fact: "The original Game Boy was gray, tough, and came packed with Tetris. Millions of road trips were saved." },
      { id: 'a80_11', q: "Which hero wears a green tunic and often carries a sword and shield in Hyrule?", a: ["Link", "Mario", "Sonic", "Pac-Man"], correct: 0, fact: "Link stars in The Legend of Zelda (1986). People mix him up with Princess Zelda all the time — even Tiger pretends not to." },
      { id: 'a80_12', q: "In many 80s games, what appears when you get the highest score?", a: ["Your initials on the high-score table", "A real pizza", "A parade", "A nap voucher for cats"], correct: 0, fact: "Three letters of glory! AAA was the classic flex. The Bean would pick WOOF." },
      { id: 'a80_13', q: "What shape is the main character in Q*bert?", a: ["An orange blob with a snout who hops on a pyramid of cubes", "A perfect square ghost", "A blue hedgehog", "A green pipe"], correct: 0, fact: "Q*bert hops diagonally and yells nonsense when he gets hit. Relatable. Very relatable." },
      { id: 'a80_14', q: "Dig Dug's hero defeats underground enemies mainly by...?", a: ["Inflating them with an air pump until they pop", "Reading them bedtime stories", "Feeding them cake", "Challenging them to chess"], correct: 0, fact: "Also he can drop rocks on them. Mining AND comedy. Chickencraft fans, take notes." },
      { id: 'a80_15', q: "Which colorful ghosts chase Pac-Man?", a: ["Blinky, Pinky, Inky, and Clyde", "Red, Blue, Green, and Banana", "Larry, Curly, Moe, and Bean", "Ghosty McGhostface alone"], correct: 0, fact: "Each ghost has its own personality and chase pattern. Pinky likes to ambush. Tiger says he invented ambushing." },
      { id: 'a80_16', q: "Ms. Pac-Man is easy to spot because she has...?", a: ["A red bow and lipstick", "A top hat and monocle", "Rocket boots", "A mohawk like The Bean"], correct: 0, fact: "Ms. Pac-Man (1982) added new mazes and moving fruit. Fashion AND gameplay upgrades!" },
      { id: 'a80_17', q: "What do you call the big upright machines people stood at in arcades?", a: ["Cabinets (or arcade cabinets)", "Refrigerators", "Vending lockers", "Robot kennels"], correct: 0, fact: "Wood, neon, joysticks, and a glowing screen — cabinets were furniture built purely for fun." },
      { id: 'a80_18', q: "In many platformers, what shiny things do you collect for points?", a: ["Coins", "Socks", "Homework sheets", "Hairballs"], correct: 0, fact: "Ding ding ding! Coins, rings, pellets — collecting sparkly stuff is a universal gamer joy." },
      { id: 'a80_19', q: "Which controller stick did you wiggle to move in most 80s arcade games?", a: ["A joystick", "A steering wheel made of cheese", "A tennis racket", "A cat's tail"], correct: 0, fact: "Joystick + buttons = the classic recipe. Some games had trackballs, spinners, or light guns too!" },
      { id: 'a80_20', q: "If an 80s game says GAME OVER, what usually just happened?", a: ["You ran out of lives", "You won a free puppy", "The arcade closed forever", "Tiger finished your snack"], correct: 0, fact: "Insert coin to continue! Unless you're out of quarters — then it's walk-of-shame time." },
      { id: 'a80_21', q: "Centipede is about shooting a long bug that...?", a: ["Breaks into smaller pieces as you hit it", "Sings opera", "Builds Lego towers", "Drives a tiny kart"], correct: 0, fact: "Also watch out for spiders and fleas. Garden warfare, arcade edition." },
      { id: 'a80_22', q: "Which company made the Nintendo Entertainment System (NES)?", a: ["Nintendo", "Sony", "Microsoft", "Acme Rocket Co."], correct: 0, fact: "The NES rescued home video games in North America after the big crash of 1983. Thank you, little gray box!" },
      { id: 'a80_23', q: "In Duck Hunt, what annoyed many players almost as much as missing ducks?", a: ["The laughing dog", "A dancing banana", "Slow Wi-Fi", "A grumpy tiger critic"], correct: 0, fact: "That dog. That LAUGH. Generations of kids shook their fists at a cartoon hound. The Bean is... conflicted." },
      { id: 'a80_24', q: "Galaga and Galaxian are games where you mostly...?", a: ["Pilot a ship and shoot alien formations", "Bake cupcakes", "Herd sheep", "Stack falling blocks"], correct: 0, fact: "Galaga could even capture your ship — then you could rescue it for double firepower. Epic." },
      { id: 'a80_25', q: "True or mostly true: early arcade screens often used simple shapes and bright colors because computers were weaker than today.", a: ["True — hardware was limited, so art was clever and bold", "False — they secretly filmed real dragons", "False — every game was photoreal", "Only on Tuesdays"], correct: 0, fact: "Limitations sparked creativity! A few pixels and a great idea could become a legend." },
    ],
  };
  if (typeof window !== 'undefined') (window.BEAN_QUIZ_TOPICS = window.BEAN_QUIZ_TOPICS || []).push(T);
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})();

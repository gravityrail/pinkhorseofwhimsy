/*!
 * Bean Quiz topic: Pink Horse Whimsy.
 * Correct answer is ALWAYS index 0 (correct: 0) — the game shuffles at runtime.
 * Silly fantasy, pink horses, car-trip whimsy, and a wink at this arcade.
 */
(function () {
  var T = {
    id: 'whimsy',
    name: 'Pink Horse Whimsy',
    emoji: '🦄',
    color: '#db2777',
    questions: [
      { id: 'whm1', q: "What mythical horse-like creature usually has a single horn on its forehead?", a: ["A unicorn", "A dragon", "A griffin", "A Roomba"], correct: 0, fact: "Unicorns are pure whimsy. Some legends say only the kind-hearted can spot one. The Bean says snacks help too." },
      { id: 'whm2', q: "If a horse is PINK and full of whimsy, where might you find it online?", a: ["pinkhorseofwhimsy.com", "themoon.gov", "under-your-bed.net", "only-broccoli.org"], correct: 0, fact: "You're playing on it right now! Welcome to the Pink Horse Arcade — home of homemade browser joy." },
      { id: 'whm3', q: "What do we call a story full of magic, talking animals, and impossible wonders?", a: ["A fantasy (or a fairy tale)", "A tax form", "A weather report", "A parking ticket"], correct: 0, fact: "Fantasy is where pink horses gallop, beans host game shows, and cats judge your life choices." },
      { id: 'whm4', q: "Which host of THIS quiz is a tiny white dog with a mohawk?", a: ["The Bean", "Tiger", "Pac-Man", "A sentient joystick"], correct: 0, fact: "That's meee! Chihuahua-terrier mix, sparkly jacket optional, enthusiasm mandatory." },
      { id: 'whm5', q: "Which sly sidekick is an orange tabby who narrates with maximum sarcasm?", a: ["Tiger", "The Bean", "Clyde the ghost", "A polite toaster"], correct: 0, fact: "Tiger prefers napping to trivia, but he still shows up for the microphone. And the drama." },
      { id: 'whm6', q: "A long car trip is the PERFECT time for...?", a: ["A quiz game, snacks, and silly names", "Painting the highway", "Teaching the car to bark", "Reorganizing the Moon"], correct: 0, fact: "Bean Quiz was basically invented for back-seat brains. Eyes on the road, grown-ups — ears on the fun." },
      { id: 'whm7', q: "What do you call a horse that can fly with big feathered wings?", a: ["A pegasus", "A potato", "A submarine", "A go-kart"], correct: 0, fact: "Pegasus soars through Greek myths. A pink pegasus would probably leave glitter contrails." },
      { id: 'whm8', q: "In whimsical stories, a magic wand is most often used to...?", a: ["Cast spells and make wondrous things happen", "Stir soup only", "Change flat tires", "File taxes"], correct: 0, fact: "Wave, sparkle, poof! Results may include frogs, fireworks, or suddenly knowing the capital of France." },
      { id: 'whm9', q: "Which color mixes red and white paint?", a: ["Pink", "Green", "Navy blue", "Invisible"], correct: 0, fact: "Pink! Official color of cotton candy, sunsets, and at least one very whimsical horse." },
      { id: 'whm10', q: "What fluffy spun-sugar snack looks like a cloud on a stick?", a: ["Cotton candy", "A snowball from space", "A wool sweater", "Tiger's leftover fur"], correct: 0, fact: "Cotton candy is mostly air and sugar — basically a cloud you are allowed to eat. Science AND whimsy!" },
      { id: 'whm11', q: "If someone says a game is 'whimsical,' they probably mean it is...?", a: ["Playful, imaginative, and a little delightfully odd", "Extremely boring on purpose", "Only about taxes", "Illegal in seventeen galaxies"], correct: 0, fact: "Whimsy is the spice of fun. A little odd makes everything better — mohawks included." },
      { id: 'whm12', q: "Talking animals appear in which kinds of stories?", a: ["Fables, cartoons, and lots of kids' adventures", "Only real news broadcasts", "Math textbooks exclusively", "Silent rock museums"], correct: 0, fact: "From Aesop's fables to this very quiz — animals have opinions, and some of us have microphones." },
      { id: 'whm13', q: "A rainbow's colors in order start with red, then orange, yellow, green, blue, indigo, and...?", a: ["Violet", "Beige", "Plaid", "Camouflage"], correct: 0, fact: "Roy G. Biv forever! Rainbows happen when sunlight bends through water drops. Nature's confetti." },
      { id: 'whm14', q: "What might a whimsical treasure map be marked with?", a: ["A big X (and probably some doodles)", "A barcode only", "Yesterday's weather", "A silent frown"], correct: 0, fact: "X marks the spot! Also watch for sea serpents, snack breaks, and dragons who collect stickers." },
      { id: 'whm15', q: "In many fairy tales, what tiny creature might grant wishes (with tricky wording)?", a: ["A genie (or a fairy)", "A filing cabinet", "A stop sign", "A sleepy remote control"], correct: 0, fact: "Always read the wish fine print. 'I wish for infinite belly rubs' is a solid opener." },
      { id: 'whm16', q: "Which of these is the most whimsical breakfast?", a: ["Pancakes shaped like stars with berry smiley faces", "A plain rock", "An empty plate named Steve", "Yesterday's socks"], correct: 0, fact: "Food tastes better when it's silly. Scientists haven't proven that, but The Bean has. Thoroughly." },
      { id: 'whm17', q: "A dragon who loves riddles would probably guard its cave with...?", a: ["A tricky question instead of just fire", "A polite welcome mat only", "Free Wi-Fi and nothing else", "Absolutely no personality"], correct: 0, fact: "Riddle dragons are the best dragons. Wrong answer? Maybe just a gentle toasting. Study up!" },
      { id: 'whm18', q: "What do you call a made-up word that still sounds perfect, like 'supercally' something?", a: ["A nonsense (or made-up) word — pure whimsy!", "A tax code", "A silent letter only", "A broken calculator"], correct: 0, fact: "Lewis Carroll and Dr. Seuss thrived on glorious gibberish. Labra-cadabra-dor forever." },
      { id: 'whm19', q: "If the Pink Horse Arcade is a collection of homemade browser games, you play them...?", a: ["In a web browser on a phone, tablet, or computer", "Only inside a volcano", "After translating them to whale song", "By shouting at clouds"], correct: 0, fact: "No cartridges required — just a browser and a sense of adventure. Touch-friendly for cars and couches!" },
      { id: 'whm20', q: "What should you do when a quiz gives you a silly name like 'Goopy Pine'?", a: ["Wear it with pride (and maybe giggle)", "Sue the dog host", "Change your legal name immediately forever", "Hide under a blanket until it leaves"], correct: 0, fact: "Silly names are temporary. The glory is forever. Probably. Tiger is still judging either way." },
      { id: 'whm21', q: "Which sparkly stage effect belongs at a game show AND a whimsical parade?", a: ["Confetti", "Quiet paperwork", "A single beige sock", "An unplugged lamp"], correct: 0, fact: "Confetti makes every correct answer feel like a tiny parade. Cleanup is tomorrow's problem." },
      { id: 'whm22', q: "A 'sidekick' in a story is usually...?", a: ["The hero's helpful (or snarky) partner", "The final boss only", "A type of sandwich", "The mute setting"], correct: 0, fact: "Every Bean needs a Tiger. Every hero needs someone to roll their eyes in high definition." },
      { id: 'whm23', q: "If you mix imagination with kindness and a splash of weird, you get...?", a: ["Whimsy", "Boredom soup", "A flat tire", "Strictly serious rocks"], correct: 0, fact: "That's the whole brand, baby. Pink Horse of Whimsy — galloping forth with delightful nonsense." },
      { id: 'whm24', q: "On a long drive, the best use of brains in the back seat is...?", a: ["Trivia, jokes, songs, and looking out the window", "Steering from the rear", "Opening the doors at highway speed", "Reprogramming the Sun"], correct: 0, fact: "Stay buckled, stay curious, and may your golden bean questions be plentiful." },
      { id: 'whm25', q: "What does The Bean say you are, even if you miss a question?", a: ["Still a very good human", "Banished forever", "Turned into a turnip", "Allergic to fun"], correct: 0, fact: "Wrong answers happen! Shake it off like a wet dog. Yes you are a good human. Yes you ARE." },
    ],
  };
  if (typeof window !== 'undefined') (window.BEAN_QUIZ_TOPICS = window.BEAN_QUIZ_TOPICS || []).push(T);
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})();

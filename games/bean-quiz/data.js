/*!
 * Bean Quiz — game data (questions, silly names, host lines).
 * Loaded in the browser as window.BEAN_QUIZ_DATA, and read by the Node audio
 * generator (games/bean-quiz/generate-audio.mjs) as the single source of truth
 * for every voice-over clip.
 *
 * Voice-over IDs -> assets/vo/<id>.mp3:
 *   host/sidekick lines : <line.id>.mp3      (spoken by line.speaker)
 *   question read-alouds: q_<question.id>.mp3 (spoken by The Bean)
 *   silly-name words    : name_<word>.mp3     (spoken by The Bean)
 * Any missing clip falls back to the browser's speech synthesis at runtime.
 */
(function () {
  const DATA = {
    // ElevenLabs voices chosen for each character.
    voices: {
      bean:  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura (quirky enthusiast)' }, // The Bean — bouncy host
      tiger: { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum (husky trickster)' },  // Tiger — sly cat sidekick
    },

    // ── Silly name generator ────────────────────────────────────────────────
    // A name is one "first" + one "last" word. The Bean announces it by playing
    // name_<first>.mp3 then name_<last>.mp3 (or speaking it if audio's missing).
    names: {
      first: ['Goopy','Stinky','Wobbly','Bonkers','Squishy','Noodle','Fuzzy','Grumpy','Sneaky',
        'Slimy','Bubbly','Crusty','Wiggly','Dizzy','Snorty','Cheeky','Loopy','Mucky','Zippy',
        'Drippy','Gloopy','Sniffly','Burpy','Toasty','Lumpy','Soggy','Sparkly','Nutty','Jumpy',
        'Snuggly','Cranky','Wonky','Giggly','Prickly','Bouncy','Dorky','Frazzled','Snazzy','Rumbly','Pickle'],
      last: ['Pine','Socks','Pants','Waffle','Biscuit','Nugget','Toes','Beans','Muffin','Snout',
        'Bottoms','Sprout','Doodle','Sniffles','Buttons','Pancake','Pretzel','Gizmo','Bubbles',
        'Wombat','Meatball','Toots','Bananas','Marshmallow','Snickerdoodle','Piggles','Whiskers',
        'Dumpling','Cornchip','Bumble','Wiggles','Pumpkin','Sprinkles','Turnip','Gumbo','Boots',
        'Snork','Noodle','Pickles','Fluff'],
    },

    // ── The Bean & Tiger's spoken lines ─────────────────────────────────────
    // speaker: 'bean' (dog-brained jokes) or 'tiger' (cat-brained jokes).
    lines: {
      welcome: [
        { id: 'welcome_1', speaker: 'bean',  text: "[excited] Helloooo and welcome to BEAN QUIZ! [giggles] I'm The Bean — part chihuahua, part terrier, ALL genius!" },
        { id: 'welcome_2', speaker: 'tiger', text: "[smug] And I'm Tiger, the smartest cat in this car. [chuckles] Which, let's be honest, is not a high bar." },
        { id: 'welcome_3', speaker: 'bean',  text: "[laughs] I am SO excited I could chase my own tail! [happily] Let's find out who's the top dog... and cat!" },
        { id: 'welcome_4', speaker: 'bean',  text: "[whispers] Psst. Before we start. [excited] There might be confetti. And bones. And feelings." },
        { id: 'welcome_5', speaker: 'tiger', text: "[sarcastic] Try to act surprised when the dog loses her mind. [sighs] Every. Single. Time." },
      ],
      howMany: [
        { id: 'howmany_1', speaker: 'bean',  text: "[eagerly] How many brilliant brains are playing today? Tap the number of players!" },
        { id: 'howmany_2', speaker: 'tiger', text: "[deadpan] Count 'em up. I'd help, but I only count to nine — one for each life." },
        { id: 'howmany_3', speaker: 'bean',  text: "[giggles] More players means more chaos means MORE TREATS for me metaphorically!" },
      ],
      namesReady: [
        { id: 'names_1', speaker: 'bean',  text: "[laughs] Ooh, look at these FABULOUS names! I did NOT sniff those out of a garbage can. [whispers] Probably." },
        { id: 'names_2', speaker: 'tiger', text: "[smug] Wear those names with pride. You earned every ridiculous letter." },
        { id: 'names_3', speaker: 'bean',  text: "[excited] Say hello to our contestants! What magnificent, made-up marvels!" },
        { id: 'names_4', speaker: 'tiger', text: "[chuckles] If I have to announce 'Stinky Pants' with a straight face, you're tipping me in tuna." },
      ],
      pickTopic: [
        { id: 'topic_1', speaker: 'bean',  text: "[happily] Time to pick a topic! Tap whatever tickles your brain!" },
        { id: 'topic_2', speaker: 'tiger', text: "[bored] Choose wisely. Or don't. I'll be napping either way." },
        { id: 'topic_3', speaker: 'bean',  text: "[gasps] There's Pop Stars now! [singing] Taylor! Taylor! [giggles] I mean— professional hosting voice." },
        { id: 'topic_4', speaker: 'tiger', text: "[sarcastic] If you pick Pop Stars, prepare for scarf-based emotional damage." },
      ],
      correct: [
        { id: 'correct_1', speaker: 'bean',  text: "[excited] CORRECT! [giggles] Ohhh that was almost as good as having my belly rubbed!" },
        { id: 'correct_2', speaker: 'bean',  text: "[laughs] YES! You nailed it! I'm wagging so hard I might take off!" },
        { id: 'correct_3', speaker: 'bean',  text: "[happily] Right on the nose — and I have a GREAT nose. Ten out of ten smells." },
        { id: 'correct_4', speaker: 'tiger', text: "[impressed] Correct. I'm impressed, and I don't impress easily. I once ignored a laser pointer." },
        { id: 'correct_5', speaker: 'tiger', text: "[chuckles] Nailed it. That felt better than knocking a full cup off a table." },
        { id: 'correct_6', speaker: 'bean',  text: "[excited] Woohoo! That answer deserves a treat, and I don't share treats!" },
        { id: 'correct_7', speaker: 'tiger', text: "[smug] Purr-fect. Yeah, I said it. I'm a cat. It's the law." },
        { id: 'correct_8', speaker: 'bean',  text: "[laughs] Correct! I'm doing my happy zoomies right now, you can't stop me!" },
        { id: 'correct_9', speaker: 'bean',  text: "[gasps] Brain so big! [giggles] Did you swallow a library?!" },
        { id: 'correct_10', speaker: 'tiger', text: "[whispers] Okay that was actually clever. [normal] Don't let it go to your head." },
        { id: 'correct_11', speaker: 'bean',  text: "[singing] Cor-rect, cor-rect, you are so cor-rect! [laughs] I'll stop singing." },
        { id: 'correct_12', speaker: 'tiger', text: "[deadpan] Yes. Good. Fine. [softly] ...I'm proud. Delete that from the record." },
      ],
      wrong: [
        { id: 'wrong_1', speaker: 'bean',  text: "[sympathetic] Ooh, not quite! That one slipped away like a squirrel I definitely could have caught." },
        { id: 'wrong_2', speaker: 'tiger', text: "[sighs] Nope. I liked that answer about as much as an empty food bowl at dinner time." },
        { id: 'wrong_3', speaker: 'bean',  text: "[aww] Aw, wrong! Don't worry, I've eaten a whole shoe. We all make mistakes." },
        { id: 'wrong_4', speaker: 'tiger', text: "[sarcastic] Incorrect. That was rougher than a hairball on a Monday." },
        { id: 'wrong_5', speaker: 'bean',  text: "[encouraging] Not this time! Shake it off like a wet dog. Literally, I do it all the time." },
        { id: 'wrong_6', speaker: 'tiger', text: "[chuckles] Wrong-o. I've knocked things off tables with more accuracy than that." },
        { id: 'wrong_7', speaker: 'bean',  text: "[softly] Nope! But you're still a very good human. Yes you are. Yes you ARE." },
        { id: 'wrong_8', speaker: 'bean',  text: "[gasps] Plot twist: that was the trap answer! [giggles] I mean— sorry." },
        { id: 'wrong_9', speaker: 'tiger', text: "[whispers] It's okay. Even genius cats misjudge a jump sometimes. [normal] Allegedly." },
        { id: 'wrong_10', speaker: 'bean',  text: "[dramatic] Tragedy! Drama! [laughs] Okay it's just a quiz. You're fine." },
      ],
      close: [
        { id: 'close_1', speaker: 'bean',  text: "[excited] So close! That was a real nail-biter, and I know all about biting things." },
        { id: 'close_2', speaker: 'tiger', text: "[impressed] Mrrow, that was tricky. Even I had to open one eye for that one." },
        { id: 'close_3', speaker: 'bean',  text: "[whispers] Between us... I almost picked that too. [giggles]" },
      ],
      trickWarn: [
        { id: 'trick_1', speaker: 'tiger', text: "[sinister] Heads up — this one's a trick question. Sniff carefully." },
        { id: 'trick_2', speaker: 'bean',  text: "[gasps] Oooh, sneaky one coming up! Don't let it fool you like a fake tennis ball throw." },
        { id: 'trick_3', speaker: 'tiger', text: "[smug] I'm not saying it's a trap. [chuckles] I'm implying it with my whole face." },
      ],
      turn: [
        { id: 'turn_1', speaker: 'bean',  text: "[excited] You're up, superstar! Here comes your question!" },
        { id: 'turn_2', speaker: 'tiger', text: "[deadpan] Your turn. No pressure. Well, a little pressure." },
        { id: 'turn_3', speaker: 'bean',  text: "[eagerly] Okay okay okay, focus those big beautiful brains — here we go!" },
        { id: 'turn_4', speaker: 'tiger', text: "[yawns] Try not to overthink it. Overthinking is my brand." },
      ],
      roundEnd: [
        { id: 'roundend_1', speaker: 'bean',  text: "[happily] That's the end of the round! Let's peek at the scores!" },
        { id: 'roundend_2', speaker: 'tiger', text: "[smug] Scoreboard time. Try to look surprised." },
        { id: 'roundend_3', speaker: 'bean',  text: "[laughs] Confetti break! Then more questions! My favorite sandwich!" },
      ],
      win: [
        { id: 'win_1', speaker: 'bean',  text: "[dramatic] And the CHAMPION of Bean Quiz is... [excited] drumroll on my little paws... our winner!" },
        { id: 'win_2', speaker: 'tiger', text: "[smug] Congratulations. You may pet me. Once. Gently. [whispers] Actually, no." },
        { id: 'win_3', speaker: 'bean',  text: "[laughs] What a game! Everybody's a good boy AND a good girl! Group zoomies!" },
        { id: 'win_4', speaker: 'tiger', text: "[softly] Fine. That was... fun. [normal] If you tell anyone I said that, I deny everything." },
      ],
      tapBean: [
        { id: 'tapbean_1', speaker: 'bean', text: "[gasps] Hey! Careful, that's my mohawk, it took me all morning!" },
        { id: 'tapbean_2', speaker: 'bean', text: "[laughs] Woof! Do that again and I'll lick the screen from the inside." },
        { id: 'tapbean_3', speaker: 'bean', text: "[giggles] Ooh, boop! I love a good boop. Do it again!" },
        { id: 'tapbean_4', speaker: 'bean', text: "[excited] You found the secret snuggle button! [happily] Ten points for friendship!" },
      ],
      tapTiger: [
        { id: 'taptiger_1', speaker: 'tiger', text: "[annoyed] Mrrow! Excuse you. I was mid-nap in my own head." },
        { id: 'taptiger_2', speaker: 'tiger', text: "[smug] Poke the cat, do you? Bold. I respect it. Slightly." },
        { id: 'taptiger_3', speaker: 'tiger', text: "[purrs] Purrrr... okay fine, that was a good scratch. [whispers] Don't tell the dog." },
        { id: 'taptiger_4', speaker: 'tiger', text: "[deadpan] That's a warning boop. The next one costs a tuna tax." },
      ],
      golden: [
        { id: 'golden_1', speaker: 'bean', text: "[gasps] GOLDEN BEAN QUESTION! [excited] This one's worth DOUBLE! Everybody, wag responsibly!" },
        { id: 'golden_2', speaker: 'tiger', text: "[impressed] Ooh. Golden. Don't choke. [chuckles] No pressure again." },
      ],
      sting: [
        { id: 'sting_1', speaker: 'bean', text: "[excited] Next up!" },
        { id: 'sting_2', speaker: 'tiger', text: "[smug] Moving on." },
      ],
    },

    // ── Question topics ─────────────────────────────────────────────────────
    // Each question: q, a[4], correct (index), fact (spoken/shown after), trick?
    topics: [
      { id: 'science', name: 'Science', emoji: '🔬', color: '#22c55e', questions: [
        { id: 'sci1', q: "Which planet has the tallest volcano in the solar system, Olympus Mons?", a: ['Mars','Earth','Venus','Mercury'], correct: 0, fact: "Mars! Olympus Mons is a shield volcano so big it makes Everest look shy." },
        { id: 'sci2', q: "What gas do plants breathe IN that we breathe OUT?", a: ['Carbon dioxide','Oxygen','Helium','Hydrogen'], correct: 0, fact: "Plants gobble up our carbon dioxide and give us oxygen back. Thanks, plants!" },
        { id: 'sci3', q: "How many legs does an insect have?", a: ['6','8','4','10'], correct: 0, fact: "Six legs! Spiders have eight, but spiders are arachnids, not insects. Sneaky!" },
        { id: 'sci4', q: "What is the very center of an atom called?", a: ['The nucleus','The electron','The shell','The proton cloud'], correct: 0, fact: "The nucleus is the tiny core packed with protons and neutrons." },
        { id: 'sci5', q: "On Earth, about how fast do you accelerate downward due to gravity (ignoring air)?", a: ['About 9.8 meters per second squared','1 mile per hour','The speed of light','Zero, if you ask politely'], correct: 0, fact: "Roughly 9.8 m/s² — every second you fall, you fall faster. Whee-science!" },
        { id: 'sci6', q: "Water is made of hydrogen and which other element?", a: ['Oxygen','Nitrogen','Carbon','Iron'], correct: 0, fact: "Two hydrogen plus one oxygen makes H-2-O. Splash!" },
        { id: 'sci7', q: "What do you call an animal that eats ONLY plants?", a: ['A herbivore','A carnivore','An omnivore','A dinovore'], correct: 0, fact: "Herbivores munch plants. Carnivores eat meat. Omnivores eat both, like me and pizza." },
        { id: 'sci8', q: "What is the closest star to Earth?", a: ['The Sun','Polaris','Alpha Centauri','The Moon'], correct: 0, fact: "The Sun is our very own star, only 93 million miles away. Practically neighbors!" },
        { id: 'sci9', q: "In your body, what carries oxygen around in your blood?", a: ['Red blood cells','White blood cells','Bones','Your brain'], correct: 0, fact: "Red blood cells are like tiny delivery trucks full of oxygen." },
        { id: 'sci10', q: "What do we call an animal, like a frog, that lives both in water and on land?", a: ['An amphibian','A reptile','A fish','A mammal'], correct: 0, fact: "Amphibians start life in water, then hop out onto land. Ribbit!" },
      ]},

      { id: 'math', name: 'Tricky Math', emoji: '🧮', color: '#3b82f6', questions: [
        { id: 'mth1', q: "A farmer has 17 sheep. All but 9 run away. How many are LEFT?", a: ['9','8','17','0'], correct: 0, trick: true, fact: "Sneaky! 'All BUT 9 ran away' means 9 stayed. Baaa-rilliant." },
        { id: 'mth2', q: "What is 13 times 7?", a: ['91','87','96','84'], correct: 0, fact: "10×7=70, 3×7=21, total 91. Times tables: the original boss fight." },
        { id: 'mth3', q: "You have 3 cookies and you TAKE 2. How many do YOU have now?", a: ['2','1','3','5'], correct: 0, trick: true, fact: "Gotcha! You TOOK 2, so you HAVE the 2 you took. Nom nom." },
        { id: 'mth4', q: "How many sides does a hexagon have?", a: ['6','5','7','8'], correct: 0, fact: "A hexagon has 6 sides — just like a honeycomb cell!" },
        { id: 'mth5', q: "Which is bigger: one half, or one quarter?", a: ['One half','One quarter','They are equal','You cannot tell'], correct: 0, fact: "One half is bigger. Cut a pizza in 2 versus in 4 — bigger slices win!" },
        { id: 'mth6', q: "How many months of the year have exactly 28 days?", a: ['All 12 of them','Only 1 (February)','2','6'], correct: 0, trick: true, fact: "Trick! EVERY month has at least 28 days. February just STOPS there." },
        { id: 'mth7', q: "What is three-quarters of 80?", a: ['60','40','70','20'], correct: 0, fact: "Half of 80 is 40; a quarter is 20; three quarters is 60." },
        { id: 'mth8', q: "I'm a number. Double me and add 4, and you get 20. What number am I?", a: ['8','10','12','16'], correct: 0, fact: "8! Double 8 is 16, plus 4 is 20. You cracked the code!" },
        { id: 'mth9', q: "How many minutes are there in one hour?", a: ['60','100','30','24'], correct: 0, fact: "60 minutes in an hour, 60 seconds in a minute. Tick tock!" },
        { id: 'mth10', q: "A red house is made of red bricks. A blue house is made of blue bricks. What is a GREENHOUSE made of?", a: ['Glass','Green bricks','Grass','Money'], correct: 0, trick: true, fact: "Ha! A greenhouse is made of GLASS so plants get sunshine. Tricky trick!" },
      ]},

      { id: 'jokes', name: 'Jokes & Riddles', emoji: '😹', color: '#f59e0b', questions: [
        { id: 'jok1', q: "Why did the scarecrow win an award?", a: ['He was outstanding in his field','He scared everyone','His hair was made of straw','He learned to fly'], correct: 0, fact: "Outstanding... in his FIELD! Get it? I crack myself up." },
        { id: 'jok2', q: "What do you call a fish with no eyes?", a: ['A "fsh"','A blindfish','A no-eye-deer','A sad guppy'], correct: 0, fact: "A fish with no 'i's is just... fsh! Blub blub." },
        { id: 'jok3', q: "What has hands but cannot clap?", a: ['A clock','A statue','A tree','A robot'], correct: 0, fact: "A clock has hands but never claps. Tick tock, no applause." },
        { id: 'jok4', q: "What building has the most stories?", a: ['A library','The tallest skyscraper','A school','A castle'], correct: 0, fact: "A library — it's full of STORIES! Books, get it?" },
        { id: 'jok5', q: "What gets WETTER the more it dries?", a: ['A towel','The sun','A sponge left alone','A raincoat'], correct: 0, fact: "A towel! The more it dries you, the wetter it gets. Whoa." },
        { id: 'jok6', q: "Why did the bicycle fall over?", a: ['It was two-tired','A big gust of wind','It hit a rock','It got bored'], correct: 0, fact: "It was TWO-tired... too tired! Bikes need naps too." },
        { id: 'jok7', q: "What do you call a bear with no teeth?", a: ['A gummy bear','A soft bear','A baby bear','A shy bear'], correct: 0, fact: "A gummy bear! Chewy AND cuddly." },
        { id: 'jok8', q: "What kind of tree can you hold in your hand?", a: ['A palm tree','A bonsai','An acorn','A twig'], correct: 0, fact: "A PALM tree — because it fits in your palm! Hand it to me." },
        { id: 'jok9', q: "Why was the math book so sad?", a: ['It had too many problems','Nobody would read it','It failed the test','It got a paper cut'], correct: 0, fact: "So many PROBLEMS! Poor little math book." },
        { id: 'jok10', q: "What do you call a dog magician?", a: ['A labra-cadabra-dor','A poodle wizard','A magic mutt','A hound of illusion'], correct: 0, fact: "A labra-CADABRA-dor! Ta-daaa! *bows*" },
      ]},

      { id: 'whoami', name: 'Who Am I?', emoji: '🕵️', color: '#a855f7', questions: [
        { id: 'who1', q: "Red hat, big mustache, jumps on turtles, saves a princess in a video game. Who am I?", a: ['Mario','Luigi','Sonic','Link'], correct: 0, fact: "It's-a Mario! Wahoo!" },
        { id: 'who2', q: "I sailed across the ocean in 1492 and bumped into the Americas. Who am I?", a: ['Christopher Columbus','Ferdinand Magellan','Marco Polo','Blackbeard'], correct: 0, fact: "Columbus sailed the ocean blue in 1492." },
        { id: 'who3', q: "A wizard boy with round glasses and a lightning-bolt scar who goes to Hogwarts. Who am I?", a: ['Harry Potter','Gandalf','Percy Jackson','Merlin'], correct: 0, fact: "Harry Potter! The boy who lived — and did loads of homework." },
        { id: 'who4', q: "In 1969 I became the first person to walk on the Moon. Who am I?", a: ['Neil Armstrong','Buzz Aldrin','Yuri Gagarin','Sally Ride'], correct: 0, fact: "Neil Armstrong: 'one small step for man...' — and no dogs, sadly." },
        { id: 'who5', q: "I painted the Mona Lisa and sketched flying machines 500 years ago. Who am I?", a: ['Leonardo da Vinci','Michelangelo','Pablo Picasso','Vincent van Gogh'], correct: 0, fact: "Leonardo da Vinci — artist, inventor, total genius." },
        { id: 'who6', q: "A yellow sponge who lives in a pineapple under the sea. Who am I?", a: ['SpongeBob SquarePants','Patrick Star','Squidward','Nemo'], correct: 0, fact: "SpongeBob SquarePants! Are ya ready, kids?" },
        { id: 'who7', q: "Wild white hair, tongue-out photo, came up with E equals m c squared. Who am I?", a: ['Albert Einstein','Isaac Newton','Nikola Tesla','Charles Darwin'], correct: 0, fact: "Einstein! The relativity guy with the best hair in science." },
        { id: 'who8', q: "A green ogre who lives in a swamp with a fast-talking donkey best friend. Who am I?", a: ['Shrek','The Hulk','Yoda','The Grinch'], correct: 0, fact: "Shrek! Ogres are like onions — they have layers." },
        { id: 'who9', q: "A superhero from the country of Wakanda with a sleek black suit and cat-like powers. Who am I?", a: ['Black Panther','Batman','Spider-Man','Catwoman'], correct: 0, fact: "Black Panther! Wakanda forever! (Tiger approves of the cat powers.)" },
        { id: 'who10', q: "I led India to independence using peaceful protest, and wore simple robes. Who am I?", a: ['Mahatma Gandhi','Nelson Mandela','Julius Caesar','Genghis Khan'], correct: 0, fact: "Mahatma Gandhi showed the world the power of being peaceful." },
      ]},

      { id: 'minecraft', name: 'Minecraft', emoji: '⛏️', color: '#16a34a', questions: [
        { id: 'mc1', q: "Creepers are afraid of which animal and will run away from it?", a: ['Ocelots (and cats)','Wolves','Chickens','Cows'], correct: 0, fact: "Cats scare creepers! Bring a feline bodyguard. Tiger takes full credit." },
        { id: 'mc2', q: "What do you combine to craft a torch?", a: ['A stick and coal','A stick and iron','Redstone and glass','A stick and gold'], correct: 0, fact: "A stick plus coal (or charcoal) makes 4 torches. Let there be light!" },
        { id: 'mc3', q: "What block must the FRAME of a Nether portal be made of?", a: ['Obsidian','Cobblestone','Diamond','Netherrack'], correct: 0, fact: "Obsidian! Made when water meets lava. Then light it up." },
        { id: 'mc4', q: "Which tool mines stone the FASTEST?", a: ['A pickaxe','A shovel','An axe','A sword'], correct: 0, fact: "Pickaxe for stone and ore, always. Shovels are for dirt and sand." },
        { id: 'mc5', q: "What happens if you look directly at an Enderman?", a: ['It gets angry and attacks','It gives you diamonds','It runs away','It starts dancing'], correct: 0, fact: "Never stare at an Enderman — it teleports over and attacks. Rude!" },
        { id: 'mc6', q: "What do you feed a wolf to tame it into a pet dog?", a: ['Bones','Apples','Carrots','Cake'], correct: 0, fact: "Bones tame wolves! Which, as a dog, I fully support." },
        { id: 'mc7', q: "Which is the strongest tool material — stronger than diamond?", a: ['Netherite','Iron','Gold','Emerald'], correct: 0, fact: "Netherite! You upgrade diamond gear with it. Nearly indestructible." },
        { id: 'mc8', q: "What do you need to sleep in and set your respawn point?", a: ['A bed','A chest','A crafting table','A furnace'], correct: 0, fact: "A bed! Sweet dreams — and no monsters at night." },
        { id: 'mc9', q: "In which biome would you find lots of sand and cacti?", a: ['The desert','The taiga','The jungle','The ocean'], correct: 0, fact: "The desert! Watch out — cacti hurt if you bump them." },
        { id: 'mc10', q: "Which friendly mob can you shear to get wool?", a: ['A sheep','A chicken','A cow','A pig'], correct: 0, fact: "Sheep! Snip snip — and their wool grows back after they eat grass." },
      ]},

      { id: 'geography', name: 'Geography & Rocks', emoji: '🌍', color: '#0ea5e9', questions: [
        { id: 'geo1', q: "Which ocean is the deepest on average, home to the Mariana Trench?", a: ['The Pacific','The Atlantic','The Indian','The Arctic'], correct: 0, fact: "Pacific again — Challenger Deep is absurdly deep. Robots only, please." },
        { id: 'geo2', q: "What is the tallest mountain on Earth above sea level?", a: ['Mount Everest','K2','Kilimanjaro','Denali'], correct: 0, fact: "Mount Everest, about 29,000 feet high. Brrr, bring a coat!" },
        { id: 'geo3', q: "Hot, melted rock UNDER the ground is called what?", a: ['Magma','Lava','Crystal','Quartz'], correct: 0, fact: "Under the ground it's MAGMA. Once it erupts out, we call it LAVA!" },
        { id: 'geo4', q: "Diamonds are made of which element, squeezed under huge pressure?", a: ['Carbon','Iron','Gold','Salt'], correct: 0, fact: "Carbon! The same stuff as pencil lead — just squished super hard." },
        { id: 'geo5', q: "Which continent is the coldest and is covered in ice?", a: ['Antarctica','Africa','Australia','Europe'], correct: 0, fact: "Antarctica! It's also technically the largest DESERT — very little rain." },
        { id: 'geo6', q: "How many continents are there on Earth?", a: ['7','5','6','8'], correct: 0, fact: "Seven! Asia, Africa, North America, South America, Antarctica, Europe, and Australia." },
        { id: 'geo7', q: "Which country is shaped like a boot?", a: ['Italy','France','Greece','Spain'], correct: 0, fact: "Italy! It even looks like it's kicking a little island — Sicily." },
        { id: 'geo8', q: "What is the hardest natural material found on Earth?", a: ['Diamond','Gold','Iron','Granite'], correct: 0, fact: "Diamond! So hard we use it to cut and drill other rocks." },
        { id: 'geo9', q: "What is the imaginary line around the middle of the Earth called?", a: ['The Equator','The Prime Meridian','The Axis','The Horizon'], correct: 0, fact: "The Equator! It's warmest there because the Sun beams straight down." },
        { id: 'geo10', q: "A scientist who studies rocks and the Earth is called a...?", a: ['Geologist','Biologist','Zoologist','Astronaut'], correct: 0, fact: "A geologist! They're basically professional rock collectors. Cool job." },
      ]},

      { id: 'animals', name: 'Amazing Animals', emoji: '🐾', color: '#ec4899', questions: [
        { id: 'ani1', q: "A blue whale's heart is roughly the size of what?", a: ['A small car','A grape','A house','A school bus only slightly kidding — wait, small car is right'], correct: 0, fact: "About the size of a small car. Ba-dump on a legendary scale." },
        { id: 'ani2', q: "How many hearts does an octopus have?", a: ['3','1','2','8'], correct: 0, fact: "Three hearts! Two pump to the gills, one for the rest of the body." },
        { id: 'ani3', q: "What do you call a baby kangaroo?", a: ['A joey','A cub','A kit','A pup'], correct: 0, fact: "A joey! It rides around in mom's cozy pouch. Comfy!" },
        { id: 'ani4', q: "What is the only mammal that can truly FLY?", a: ['The bat','The flying squirrel','The eagle','The sugar glider'], correct: 0, fact: "The bat! Flying squirrels only glide — bats really flap and fly." },
        { id: 'ani5', q: "A group of lions is called a...?", a: ['A pride','A pack','A herd','A flock'], correct: 0, fact: "A pride of lions! Fancy name for a fancy cat family." },
        { id: 'ani6', q: "Under all that white fur, what color is a polar bear's SKIN?", a: ['Black','White','Pink','Blue'], correct: 0, fact: "Black skin! It soaks up sunshine to keep them toasty in the Arctic." },
        { id: 'ani7', q: "How many legs does a spider have?", a: ['8','6','10','4'], correct: 0, fact: "Eight legs! That's why spiders are arachnids, not insects." },
        { id: 'ani8', q: "Which big bird cannot fly but can run super fast?", a: ['The ostrich','The eagle','The parrot','The robin'], correct: 0, fact: "The ostrich! It can sprint over 40 miles per hour. Zoom!" },
        { id: 'ani9', q: "What is the fastest land animal in the world?", a: ['The cheetah','The lion','The horse','The rabbit'], correct: 0, fact: "The cheetah! Zero to 60 miles per hour faster than most race cars." },
        { id: 'ani10', q: "A caterpillar wraps into a chrysalis and turns into a...?", a: ['A butterfly','A bee','A bird','A beetle'], correct: 0, fact: "A butterfly! The greatest glow-up in the whole animal kingdom." },
      ]},

      { id: 'world', name: 'World & Tech', emoji: '📰', color: '#ef4444', questions: [
        { id: 'wor1', q: "SpaceX's giant stainless-steel rocket designed for Mars is called what?", a: ['Starship','Falcon Nano','Death Star','Bean-1'], correct: 0, fact: "Starship — stacked on Super Heavy. Loud, shiny, ambitious." },
        { id: 'wor2', q: "Electric cars run on what instead of gasoline?", a: ['Batteries','Water','Steam','Coal'], correct: 0, fact: "Big rechargeable batteries! Plug in instead of filling up." },
        { id: 'wor3', q: "What does the 'www' at the start of a website stand for?", a: ['World Wide Web','World Wireless Web','Wide World Web','Web World Wide'], correct: 0, fact: "The World Wide Web! It connects the whole planet's computers." },
        { id: 'wor4', q: "A smart computer program that can chat and answer questions — like your game host — is called what?", a: ['Artificial Intelligence','A spreadsheet','A firewall','A joystick'], correct: 0, fact: "Artificial Intelligence, or A.I.! Kind of like a very clever robot brain." },
        { id: 'wor5', q: "In most of the world, the sport played at the World Cup is called what?", a: ['Football (soccer)','Basketball','Cricket','Baseball'], correct: 0, fact: "Football — which Americans call soccer! The world's most popular game." },
        { id: 'wor6', q: "Which rover has been driving on Mars searching for signs of ancient life?", a: ['Perseverance','Voyager','Titanic','The Mayflower'], correct: 0, fact: "Perseverance! It even has a little helicopter buddy named Ingenuity." },
        { id: 'wor7', q: "What do you call a photo you take of yourself with your phone?", a: ['A selfie','A meme','A filter','A pixel'], correct: 0, fact: "A selfie! Say cheese — or say 'squirrel', that gets MY attention." },
        { id: 'wor8', q: "What is the name of the money used in the United States?", a: ['The dollar','The euro','The pound','The yen'], correct: 0, fact: "The dollar! A hundred pennies make one. Ka-ching!" },
        { id: 'wor9', q: "Which company makes the iPhone?", a: ['Apple','Samsung','Google','Amazon'], correct: 0, fact: "Apple! Their logo is a bitten apple. Yum, but don't eat your phone." },
        { id: 'wor10', q: "Solar panels turn what into electricity?", a: ['Sunlight','Wind','Ocean waves','Thunder'], correct: 0, fact: "Sunlight! Free power beamed down from our nearest star, the Sun." },
      ]},

      { id: 'grabbag', name: 'Silly Grab Bag', emoji: '🍦', color: '#8b5cf6', questions: [
        { id: 'grb1', q: "What is the tallest animal in the world?", a: ['The giraffe','The elephant','The camel','The horse'], correct: 0, fact: "The giraffe! Its neck alone can be six feet long. Great for reaching snacks." },
        { id: 'grb2', q: "How many colors are in a rainbow?", a: ['7','5','6','10'], correct: 0, fact: "Seven! Red, orange, yellow, green, blue, indigo, violet. Roy G. Biv!" },
        { id: 'grb3', q: "Chocolate is made from the beans of which plant?", a: ['The cocoa (cacao) tree','The coffee bush','The corn stalk','The peanut plant'], correct: 0, fact: "Cocoa beans! Roasted and ground into delicious chocolate. Mmm." },
        { id: 'grb4', q: "What shape has eight sides, like a stop sign?", a: ['An octagon','A hexagon','A pentagon','A triangle'], correct: 0, fact: "An octagon! 'Octo' means eight — like an octopus's eight arms." },
        { id: 'grb5', q: "What do bees make that we love to eat?", a: ['Honey','Milk','Butter','Jam'], correct: 0, fact: "Honey! Made from flower nectar. Bees are tiny hard-working chefs." },
        { id: 'grb6', q: "What color do you get when you mix blue and yellow paint?", a: ['Green','Purple','Orange','Brown'], correct: 0, fact: "Green! Blue plus yellow. Try it and see!" },
        { id: 'grb7', q: "How many days are there in one week?", a: ['7','5','10','12'], correct: 0, fact: "Seven days! Monday all the way to Sunday." },
        { id: 'grb8', q: "What is frozen water called?", a: ['Ice','Steam','Fog','Mud'], correct: 0, fact: "Ice! Freeze water and it turns solid. Heat it and it becomes steam." },
        { id: 'grb9', q: "Which of these is a real dinosaur?", a: ['Tyrannosaurus Rex','Megalo-doggo','Chihuahua-saurus','Beanosaurus'], correct: 0, fact: "T. Rex! Tiny arms, giant teeth. I would NOT play fetch with it." },
        { id: 'grb10', q: "What do you call a shape that is perfectly round, like a ball or the Sun?", a: ['A circle (or sphere)','A square','A triangle','A cube'], correct: 0, fact: "A circle if it's flat, a sphere if it's a ball. Round and proud!" },
      ]},
    ],
  };

  if (typeof window !== 'undefined') window.BEAN_QUIZ_DATA = DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})();

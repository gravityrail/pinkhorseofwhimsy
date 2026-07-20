/*!
 * Harder replacement/extension packs for core topics.
 * Uses `extend` to bolt tougher questions onto existing topic ids.
 */
(function () {
  var packs = [
    { extend: 'science', questions: [
      { id: 'sciH1', q: "What is the most abundant element in the universe?", a: ["Hydrogen", "Oxygen", "Carbon", "Helium"], correct: 0, fact: "Hydrogen — about three-quarters of normal matter. Stars are giant hydrogen furnaces!" },
      { id: 'sciH2', q: "Sound travels FASTEST through which of these?", a: ["Steel", "Air", "Water vapor only", "Outer space vacuum"], correct: 0, fact: "Solids pass vibrations quickest. Space is silent — no air to shove!" },
      { id: 'sciH3', q: "Which blood type is often called the 'universal donor' for red cells?", a: ["O negative", "AB positive", "B positive", "A positive"], correct: 0, fact: "O-neg can usually donate red cells to many people. Science hero blood!" },
      { id: 'sciH4', q: "What particle carries a negative electric charge in an atom?", a: ["Electron", "Proton", "Neutron", "Quark smoothie"], correct: 0, fact: "Electrons zip around the nucleus. Protons are positive; neutrons are neutral." },
      { id: 'sciH5', q: "Absolute zero is about how cold on the Celsius scale?", a: ["−273.15°C", "0°C", "−100°C", "−1°C"], correct: 0, fact: "As cold as matter can get — atoms nearly freeze in place. Brrr on a cosmic level." },
      { id: 'sciH6', q: "Which organelle is the 'powerhouse of the cell'?", a: ["Mitochondrion", "Nucleus", "Ribosome", "Golgi gift shop"], correct: 0, fact: "Mitochondria make ATP energy. Yes, that meme is real science." },
      { id: 'sciH7', q: "Light-year measures what?", a: ["Distance", "Time only", "Brightness", "Temperature"], correct: 0, fact: "How FAR light travels in one year — not how long something lasts." },
      { id: 'sciH8', q: "What gas makes up most of Earth's atmosphere?", a: ["Nitrogen", "Oxygen", "Carbon dioxide", "Helium"], correct: 0, fact: "About 78% nitrogen, ~21% oxygen. We breathe the minority partner!" },
    ]},
    { extend: 'math', questions: [
      { id: 'mthH1', q: "What is 12² (twelve squared)?", a: ["144", "24", "112", "132"], correct: 0, fact: "12×12=144. A gross is 144 — old-timey counting word!" },
      { id: 'mthH2', q: "If a pizza is cut into 8 equal slices and you eat 3, what fraction is LEFT?", a: ["5/8", "3/8", "1/2", "8/3"], correct: 0, fact: "Eight minus three is five — five-eighths remain. More for later." },
      { id: 'mthH3', q: "What is the next prime number after 7?", a: ["11", "9", "10", "8"], correct: 0, fact: "Primes have exactly two factors: 1 and themselves. 9 is 3×3, so nope." },
      { id: 'mthH4', q: "A triangle's angles always add up to how many degrees?", a: ["180", "90", "360", "100"], correct: 0, fact: "Always 180° — Euclidean geometry's greatest hits." },
      { id: 'mthH5', q: "What is 15% of 200?", a: ["30", "15", "45", "50"], correct: 0, fact: "10% of 200 is 20; 5% is 10; together 30." },
      { id: 'mthH6', q: "Roman numeral XL equals what?", a: ["40", "60", "15", "90"], correct: 0, fact: "X=10, L=50, and X before L means 50−10=40." },
      { id: 'mthH7', q: "How many edges does a cube have?", a: ["12", "6", "8", "16"], correct: 0, fact: "6 faces, 8 corners, 12 edges. Dice geometry!" },
      { id: 'mthH8', q: "If you flip a fair coin twice, what's the probability of two heads?", a: ["1/4", "1/2", "1/3", "2/3"], correct: 0, fact: "HH, HT, TH, TT — one of four equally likely outcomes." },
    ]},
    { extend: 'minecraft', questions: [
      { id: 'mcH1', q: "How many obsidian blocks form a MINIMUM nether portal frame (corners optional)?", a: ["10", "14", "4", "20"], correct: 0, fact: "A 4×5 frame without corners uses 10 obsidian. Corners are optional bling." },
      { id: 'mcH2', q: "Which enchantment lets a bow shoot infinite arrows (with one arrow in inventory)?", a: ["Infinity", "Mending", "Power", "Flame"], correct: 0, fact: "Infinity + one arrow = forever pew-pew. Mending is the rival school of thought." },
      { id: 'mcH3', q: "What status effect do pufferfish give if you eat them raw?", a: ["Poison (and nausea/hunger too)", "Speed", "Night Vision only", "Creative mode"], correct: 0, fact: "Raw pufferfish is a bad snack. Brewing is another story." },
      { id: 'mcH4', q: "Which dimension contains endermen spawners in cities and ships with elytra?", a: ["The End", "The Nether", "The Overworld deep dark", "The Aether (not vanilla)"], correct: 0, fact: "End cities hold shulkers and ships hold elytra. Bring chorus fruit snacks." },
      { id: 'mcH5', q: "Ancient Debris is best mined with what?", a: ["Diamond or netherite pickaxe", "Wooden shovel", "Shears", "Bare hands for the bit"], correct: 0, fact: "Blast-resistant and picky — only diamond+ pickaxes drop it." },
      { id: 'mcH6', q: "Which block is a classic ON/OFF switch for redstone circuits?", a: ["Lever", "Dirt", "Glass pane", "Painting"], correct: 0, fact: "Levers toggle power. Redstone engineering: where friendships are tested." },
    ]},
    { extend: 'geography', questions: [
      { id: 'geoH1', q: "What is the capital of Canada?", a: ["Ottawa", "Toronto", "Vancouver", "Montreal"], correct: 0, fact: "Ottawa! Toronto is bigger; Ottawa is the capital. Trick question fuel." },
      { id: 'geoH2', q: "Which desert is the largest HOT desert on Earth?", a: ["The Sahara", "Antarctica", "The Gobi", "The Mojave"], correct: 0, fact: "Sahara is the largest hot desert. Antarctica is larger overall but icy." },
      { id: 'geoH3', q: "The Prime Meridian runs through which city?", a: ["Greenwich (London)", "Paris", "New York", "Cairo"], correct: 0, fact: "Longitude zero lives in Greenwich. Time zones bow to it." },
      { id: 'geoH4', q: "Which layer of Earth is liquid metal and creates the magnetic field?", a: ["Outer core", "Crust", "Mantle only", "Inner core (that's solid)"], correct: 0, fact: "Liquid outer core dynamo = compasses work. Science magic." },
      { id: 'geoH5', q: "Mount Kilimanjaro is on which continent?", a: ["Africa", "Asia", "South America", "Europe"], correct: 0, fact: "Tanzania, Africa — a free-standing volcanic giant." },
    ]},
    { extend: 'animals', questions: [
      { id: 'aniH1', q: "A shrimp's heart is located roughly where?", a: ["In its head region", "In its tail tip", "In each leg", "It has no heart"], correct: 0, fact: "Shrimp anatomy is chaos. Heart near the head — nature said 'sure'." },
      { id: 'aniH2', q: "Which animal has fingerprints so similar to humans they can confuse crime scenes?", a: ["Koala", "Dolphin", "Owl", "Goldfish"], correct: 0, fact: "Koala prints can look startlingly human. CSI: Eucalyptus." },
      { id: 'aniH3', q: "How many chambers does a cow's stomach have?", a: ["Four", "One", "Two", "Seven"], correct: 0, fact: "Ruminants: rumen, reticulum, omasum, abomasum. Fancy chew-twice plumbing." },
      { id: 'aniH4', q: "A flamingo's pink color mostly comes from what?", a: ["Their diet (carotenoids)", "Sunburn", "Paint", "Genetics alone with no food link"], correct: 0, fact: "Eat pinkish brine shrimp/algae, become fashion icon." },
      { id: 'aniH5', q: "Which mammal lays eggs?", a: ["Platypus (monotreme)", "Kangaroo", "Dolphin", "Bat"], correct: 0, fact: "Monotremes! Platypus and echidnas — mammals that said 'eggs actually'." },
    ]},
    { extend: 'world', questions: [
      { id: 'worH1', q: "HTTP status code 404 means what?", a: ["Not Found", "OK everything fine", "Server exploded", "Please pay wifi"], correct: 0, fact: "404: the page ghosted you." },
      { id: 'worH2', q: "Binary 1010 equals what in decimal?", a: ["10", "5", "8", "12"], correct: 0, fact: "8+0+2+0 = 10. Computers count on two fingers." },
      { id: 'worH3', q: "Which company makes the Android mobile operating system (primary steward)?", a: ["Google", "Apple", "Nintendo", "Tesla"], correct: 0, fact: "Google stewards Android; many phone brands ship it." },
      { id: 'worH4', q: "The first message ever sent on the ARPANET (internet ancestor) crashed after which letters?", a: ["LO (trying to type LOGIN)", "HI", "WWW", "CAT"], correct: 0, fact: "They typed L-O and the system crashed. Historic oops." },
    ]},
    { extend: 'whoami', questions: [
      { id: 'whoH1', q: "I wrote 'Pride and Prejudice' in the 1800s with razor wit. Who am I?", a: ["Jane Austen", "Mary Shelley", "Emily Dickinson", "Agatha Christie"], correct: 0, fact: "Jane Austen — enemies-to-lovers before it was a hashtag." },
      { id: 'whoH2', q: "I was a deaf-blind activist who learned language with Annie Sullivan's help. Who am I?", a: ["Helen Keller", "Anne Frank", "Rosa Parks", "Marie Curie"], correct: 0, fact: "Helen Keller — extraordinary communicator and advocate." },
      { id: 'whoH3', q: "I painted swirling night skies over a village and struggled with mental health in the 1800s. Who am I?", a: ["Vincent van Gogh", "Claude Monet", "Frida Kahlo", "Andy Warhol"], correct: 0, fact: "Van Gogh's The Starry Night. Post-Impressionist lightning." },
      { id: 'whoH4', q: "I invented a practical light bulb system and ran Menlo Park inventing sprees. Who am I?", a: ["Thomas Edison", "Nikola Tesla only", "Alexander Graham Bell", "Ada Lovelace"], correct: 0, fact: "Edison — controversial rival of Tesla, king of patents and PR." },
    ]},
    { extend: 'jokes', questions: [
      { id: 'jokH1', q: "What do you call fake spaghetti?", a: ["An impasta", "A noodle liar", "Carb-onara crime", "Penne for your thoughts only"], correct: 0, fact: "Impasta! I will not apologize." },
      { id: 'jokH2', q: "Why can't you give Elsa a balloon?", a: ["Because she will let it go", "Because she is allergic", "Because Olaf pops them", "Because balloons fear ice"], correct: 0, fact: "Let it gooooo. You're welcome / I'm sorry." },
    ]},
    { extend: 'grabbag', questions: [
      { id: 'grbH1', q: "How many bones does an adult human body typically have?", a: ["206", "300", "106", "512"], correct: 0, fact: "Babies start with more; bones fuse as you grow. 206 is the classic adult count." },
      { id: 'grbH2', q: "What is the chemical symbol for gold?", a: ["Au", "Go", "Gd", "Ag"], correct: 0, fact: "Au from Latin aurum. Ag is silver — don't get fancy-metal mix-ups." },
      { id: 'grbH3', q: "How many keys does a full-size piano usually have?", a: ["88", "64", "100", "52"], correct: 0, fact: "88 keys — 52 white, 36 black. Concert flex." },
    ]},
  ];

  if (typeof window !== 'undefined') {
    window.BEAN_QUIZ_TOPICS = window.BEAN_QUIZ_TOPICS || [];
    packs.forEach(function (p) { window.BEAN_QUIZ_TOPICS.push(p); });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = packs;
})();

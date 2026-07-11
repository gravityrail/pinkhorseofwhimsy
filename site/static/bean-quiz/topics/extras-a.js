/*!
 * Bean Quiz — extras pack A.
 * Extension packs that ADD questions to existing topics (note the `extend` key).
 * Loaded in the browser after data.js; pushes onto window.BEAN_QUIZ_TOPICS.
 */
(function () {
  var PACKS = [
    { extend: 'science', questions: [
      { id: 'sci_x1', q: "When water boils, it turns into what?", a: ["Steam (water vapor)", "Ice", "Snow", "Soup"], correct: 0, fact: "Boiling water becomes steam, a gas! Cool it back down and it turns into water again." },
      { id: 'sci_x2', q: "What is the biggest planet in our solar system?", a: ["Jupiter", "Earth", "Mars", "The Moon"], correct: 0, fact: "Jupiter is so huge that more than one thousand Earths could fit inside it!" },
      { id: 'sci_x3', q: "Which part of your body pumps blood around and around?", a: ["Your heart", "Your lungs", "Your stomach", "Your left ear"], correct: 0, fact: "Your heart beats about one hundred thousand times every day. Ba-dump, ba-dump!" },
      { id: 'sci_x4', q: "Which of these will a magnet stick to?", a: ["An iron nail", "A plastic spoon", "A wooden block", "A marshmallow"], correct: 0, fact: "Magnets love iron and steel. They ignore plastic, wood, and sadly, marshmallows." },
      { id: 'sci_x5', q: "What do scientists use to see tiny things like germs up close?", a: ["A microscope", "A telescope", "A kaleidoscope", "A magnifying dog nose"], correct: 0, fact: "Microscopes make tiny things look big. Telescopes are for faraway things like stars!" },
      { id: 'sci_x6', q: "What is sound made of?", a: ["Vibrations", "Tiny lights", "Little bubbles", "Invisible sparkles"], correct: 0, fact: "Sound is wiggling air! Dogs can hear super high sounds that humans can't hear at all." },
      { id: 'sci_x7', q: "In a storm, why do you SEE lightning before you HEAR thunder?", a: ["Light travels faster than sound", "Thunder is shy", "Sound travels faster than light", "Clouds muffle the flash"], correct: 0, fact: "Light is way faster than sound, so the flash wins the race to you every time." },
      { id: 'sci_x8', q: "About how many bones are in a grown-up human body?", a: ["206", "50", "1000", "About a million"], correct: 0, fact: "206 bones! Babies are born with around 300, but some join together as they grow." },
      { id: 'sci_x9', q: "What mostly makes the ocean tides rise and fall?", a: ["The Moon's pull", "Big fish swimming", "Passing boats", "Wind from the beach"], correct: 0, fact: "The Moon's gravity gently tugs the ocean as Earth spins. The Moon walks the sea like a leash!" },
      { id: 'sci_x10', q: "For a light bulb to glow, electricity must flow around a complete what?", a: ["Circuit", "Square", "Puddle", "Sandwich"], correct: 0, fact: "A circuit is a full loop. Break the loop and the electricity stops, like a gate on a dog run." },
      { id: 'sci_x11', q: "What is the fastest thing in the whole universe?", a: ["Light", "Sound", "A rocket", "A cat hearing a can opener"], correct: 0, fact: "Light could zip around the entire Earth about seven times in a single second!" },
      { id: 'sci_x12', q: "Which gas makes up MOST of the air we breathe?", a: ["Nitrogen", "Oxygen", "Carbon dioxide", "Helium"], correct: 0, trick: true, fact: "Sneaky! Air is about 78 percent nitrogen. Oxygen is only about a fifth of every sniff." },
    ]},

    { extend: 'animals', questions: [
      { id: 'ani_x1', q: "What do dogs mostly use to explore the world?", a: ["Their nose", "Their tail", "Their eyebrows", "A tiny map"], correct: 0, fact: "A dog's sense of smell is thousands of times better than a human's. Sniff sniff, genius at work!" },
      { id: 'ani_x2', q: "What do you call a baby cat?", a: ["A kitten", "A puppy", "A cub", "A calf"], correct: 0, fact: "A kitten! And a group of kittens is called a kindle. Tiger says that's adorable. Quietly." },
      { id: 'ani_x3', q: "What do giant pandas munch on almost all day long?", a: ["Bamboo", "Pizza", "Fish", "Marshmallows"], correct: 0, fact: "Pandas can spend more than twelve hours a day just eating bamboo. Crunch crunch crunch." },
      { id: 'ani_x4', q: "Which dinosaur had three horns on its face?", a: ["Triceratops", "Stegosaurus", "Velociraptor", "Brachiosaurus"], correct: 0, fact: "Triceratops literally means three-horned face. Great name, no imagination." },
      { id: 'ani_x5', q: "Which tiny insect can carry things many times heavier than its own body?", a: ["The ant", "The hamster", "The goldfish", "The pug"], correct: 0, fact: "Ants can lift many times their own weight. That's like you carrying a car. Show-offs." },
      { id: 'ani_x6', q: "Which sea creature has no brain, no bones, and has been around longer than dinosaurs?", a: ["The jellyfish", "The dolphin", "The shark", "The crab"], correct: 0, fact: "Jellyfish have drifted the seas for over five hundred million years, all without a single brain cell." },
      { id: 'ani_x7', q: "Which deep-sea fish dangles a glowing light to lure its dinner?", a: ["The anglerfish", "The clownfish", "The goldfish", "The catfish"], correct: 0, fact: "The anglerfish carries its own night-light. Down deep, its glow says 'free snacks' — but it's a trap!" },
      { id: 'ani_x8', q: "Which bird can fly backwards?", a: ["The hummingbird", "The penguin", "The owl", "The chicken"], correct: 0, fact: "Hummingbirds can hover and even fly backwards, beating their wings about fifty times a second!" },
      { id: 'ani_x9', q: "Grown-up cats mostly meow at whom?", a: ["Humans", "Other cats", "Dogs", "The moon"], correct: 0, fact: "Adult cats barely meow at each other — meowing is mostly for talking to people. Tiger calls it 'giving orders'." },
      { id: 'ani_x10', q: "How do honeybees tell other bees where the best flowers are?", a: ["A waggle dance", "Writing tiny notes", "Ringing a bell", "Sending a text"], correct: 0, fact: "Bees do a waggle dance that points the way to flowers. Best. Meeting. Ever." },
      { id: 'ani_x11', q: "Which sea animal has BLUE blood?", a: ["The horseshoe crab", "The goldfish", "The parrot", "The bulldog"], correct: 0, fact: "Horseshoe crab blood is blue because it uses copper instead of iron. Fancy!" },
      { id: 'ani_x12', q: "A koala is a type of what?", a: ["Marsupial", "Bear", "Monkey", "Very big hamster"], correct: 0, trick: true, fact: "Gotcha! Koalas are NOT bears — they're marsupials that carry babies in a pouch, like kangaroos." },
    ]},

    { extend: 'geography', questions: [
      { id: 'geo_x1', q: "What is the capital city of France?", a: ["Paris", "London", "Rome", "Madrid"], correct: 0, fact: "Paris! The Eiffel Tower grows about six inches taller in summer when the metal warms up." },
      { id: 'geo_x2', q: "Which country has a big red maple leaf on its flag?", a: ["Canada", "Mexico", "Japan", "Brazil"], correct: 0, fact: "Canada! It also has more lakes than every other country combined. That's a lot of swims." },
      { id: 'geo_x3', q: "Which country is home to wild kangaroos and koalas?", a: ["Australia", "Austria", "Argentina", "Antarctica"], correct: 0, fact: "Australia! Careful — Austria sounds similar but has zero kangaroos and lots of mountains." },
      { id: 'geo_x4', q: "What is the largest HOT desert in the world?", a: ["The Sahara", "The Gobi", "The Mojave", "The beach"], correct: 0, fact: "The Sahara in Africa is almost as big as the whole United States. Bring water. Lots of water." },
      { id: 'geo_x5', q: "Which river carries more water than any other river on Earth?", a: ["The Amazon", "The Nile", "The Mississippi", "The Thames"], correct: 0, fact: "The Amazon pours more water into the sea than the next several biggest rivers put together!" },
      { id: 'geo_x6', q: "When the ground suddenly shakes and rumbles, what do we call it?", a: ["An earthquake", "A rainbow", "A thunderstorm", "A giant's tummy rumble"], correct: 0, fact: "An earthquake! Scientists measure the shaking with a machine called a seismometer." },
      { id: 'geo_x7', q: "What do we call the print or trace of an ancient animal left in rock?", a: ["A fossil", "A crystal", "A pearl", "A statue"], correct: 0, fact: "Fossils! Scientists dig up dinosaur bones for a living. As a dog, I say: dream job." },
      { id: 'geo_x8', q: "Which tasty mineral crystal do we sprinkle on french fries?", a: ["Salt", "Diamond dust", "Sand", "Glitter"], correct: 0, fact: "Salt is a real mineral called halite — you eat little crystals every day!" },
      { id: 'geo_x9', q: "Earth's outer shell is cracked into giant slowly-moving slabs called what?", a: ["Tectonic plates", "Dinner plates", "Crust cookies", "Earth tiles"], correct: 0, fact: "Tectonic plates move about as fast as your fingernails grow. Slow and steady!" },
      { id: 'geo_x10', q: "What is the ring of volcanoes circling the Pacific Ocean called?", a: ["The Ring of Fire", "The Circle of Lava", "The Hot Hula Hoop", "The Volcano Fence"], correct: 0, fact: "The Ring of Fire has most of the world's volcanoes and earthquakes. Spicy neighborhood!" },
      { id: 'geo_x11', q: "Long ago, all the continents were squished together in one giant landmass called what?", a: ["Pangaea", "Atlantis", "Megaland", "Continentia"], correct: 0, fact: "Pangaea! The continents slowly drifted apart over millions of years, like a very slow puzzle." },
      { id: 'geo_x12', q: "What is the capital city of Australia?", a: ["Canberra", "Sydney", "Melbourne", "Kangaroo City"], correct: 0, trick: true, fact: "Tricky! Sydney is bigger and more famous, but Canberra is the capital." },
    ]},

    { extend: 'minecraft', questions: [
      { id: 'mc_x1', q: "In Minecraft, what do you feed a stray cat to tame it?", a: ["Raw fish", "Milk", "Cookies", "A tiny hamburger"], correct: 0, fact: "Raw cod or raw salmon wins a cat's heart. Tiger says that checks out in real life too." },
      { id: 'mc_x2', q: "Which mob shoots arrows at you with a bow?", a: ["A skeleton", "A zombie", "A slime", "A chicken"], correct: 0, fact: "Skeletons! But they catch fire in the morning sun. Not great bones for the beach." },
      { id: 'mc_x3', q: "Where does the Ender Dragon live?", a: ["The End", "The Nether", "The jungle", "Your basement"], correct: 0, fact: "The Ender Dragon rules The End. Beat it and the game rolls its mysterious credits!" },
      { id: 'mc_x4', q: "What do villagers use like money when you trade with them?", a: ["Emeralds", "Diamonds", "Gold coins", "Belly rubs"], correct: 0, fact: "Emeralds! Villagers hmm and haggle for those shiny green gems." },
      { id: 'mc_x5', q: "Which vegetable can you feed pigs to breed them?", a: ["Carrots", "Bones", "Steak", "Birthday cake"], correct: 0, fact: "Carrots! Pigs also love potatoes and beetroot. A very healthy piggy diet." },
      { id: 'mc_x6', q: "Which peaceful mob fills your bucket with milk?", a: ["A cow", "A pig", "A chicken", "A creeper"], correct: 0, fact: "Cows! And drinking milk washes away potion effects. Moo-gic!" },
      { id: 'mc_x7', q: "What tool do you use to light a Nether portal?", a: ["Flint and steel", "A torch", "A furnace", "A very angry match"], correct: 0, fact: "Flint and steel makes the spark — then whoosh, the purple portal swirls to life!" },
      { id: 'mc_x8', q: "What red dust do you place on the ground to carry power, like wires?", a: ["Redstone", "Glowstone", "Sandstone", "Pixie dust"], correct: 0, fact: "Redstone dust is Minecraft electricity! You can build doors, traps, even whole machines." },
      { id: 'mc_x9', q: "Which fiery mob floats in Nether fortresses and shoots fireballs?", a: ["A blaze", "A creeper", "A cow", "A snow golem"], correct: 0, fact: "Blazes! You need their blaze rods to brew potions and to find the End portal." },
      { id: 'mc_x10', q: "Along with experience levels, what blue stone do you need to enchant at a table?", a: ["Lapis lazuli", "Blueberries", "Blue wool", "Sapphires"], correct: 0, fact: "Lapis lazuli! No lapis, no sparkly enchantments. Choose wisely!" },
      { id: 'mc_x11', q: "What item found on End ships lets you glide through the sky?", a: ["Elytra", "A cape", "Feather boots", "A paper airplane"], correct: 0, fact: "Elytra wings! Jump off a mountain and swoosh. Add fireworks rockets to really zoom." },
      { id: 'mc_x12', q: "Which of these actually HURTS an Enderman?", a: ["Water", "Sunlight", "Music", "Flowers"], correct: 0, trick: true, fact: "Sneaky! Endermen are fine in the sun but hate water — they teleport away from rain. Just like a cat!" },
    ]},
  ];

  if (typeof window !== 'undefined') {
    var A = (window.BEAN_QUIZ_TOPICS = window.BEAN_QUIZ_TOPICS || []);
    PACKS.forEach(function (p) { A.push(p); });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = PACKS;
})();

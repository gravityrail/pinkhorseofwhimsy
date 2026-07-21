/*!
 * Bean Quiz — Pet Secrets pack: dog & cat trivia straight from the hosts,
 * folded into Amazing Animals, plus bonus bangers for Jokes & Riddles.
 * Correct answer is ALWAYS index 0 (correct: 0) — the game shuffles at runtime.
 */
(function () {
  var PACKS = [
    { extend: 'animals', questions: [
      { id: 'pet1', q: "Be honest: why do dogs sniff each other's butts?", a: ["It's how they say hello and learn all about each other", "They lost something back there", "It's a dare", "Dogs are just weird for no reason"], correct: 0, fact: "It's our handshake! One sniff tells me your mood, your snacks, and your entire biography. You're welcome." },
      { id: 'pet2', q: "When a cat slowly blinks at you, what is it saying?", a: ["'I trust you' — it's basically a cat kiss", "'I am falling asleep mid-conversation'", "'There is dust in my eye'", "'Prepare for battle'"], correct: 0, fact: "A slow blink is cat for 'you're alright, human.' Tiger says he's issued four. Ever." },
      { id: 'pet3', q: "Why do dogs tilt their heads when you talk to them?", a: ["To hear you better and figure out what you mean", "To look cute on purpose", "Their ears are heavy on one side", "They're checking if you're upside down"], correct: 0, fact: "We're adjusting our ears like satellite dishes! The cuteness is a side effect. A powerful, powerful side effect." },
      { id: 'pet4', q: "Why do cats knock things off tables?", a: ["Hunting practice — plus it makes the humans appear instantly", "Cats hate physics", "The floor asked for it", "Their paws are magnetic"], correct: 0, fact: "Batting objects is prey practice, and the crash summons humans from anywhere in the house. Tiger calls it 'the doorbell.'" },
      { id: 'pet5', q: "How do dogs mostly cool off, since they barely sweat?", a: ["Panting (plus a little sweat through their paw pads)", "Sweating through their tails", "Turning their fur inside out", "Thinking cold thoughts"], correct: 0, fact: "That's why we pant like tiny steam engines! Paw pads sweat a bit too — hence mysterious tiny footprints on hot days." },
      { id: 'pet6', q: "About how much of its life does a cat spend ASLEEP?", a: ["Around 70 percent", "About 10 percent", "Exactly half", "Cats never truly sleep"], correct: 0, fact: "Up to sixteen hours a day! Tiger calls it 'training.' For what? He won't say." },
      { id: 'pet7', q: "What are dog 'zoomies' — officially called FRAPs?", a: ["Frantic Random Activity Periods — bursts of pure happy energy", "A warning that a storm is coming", "A dance dogs learn at school", "A glitch in the dog"], correct: 0, fact: "Frantic Random Activity Periods! Scientists gave my happiness an acronym and I have never felt so SEEN." },
      { id: 'pet8', q: "A dog's NOSE print is unique — just like a human's what?", a: ["Fingerprint", "Haircut", "Shoe size", "Homework"], correct: 0, fact: "No two dog nose prints are the same! Mine has been described as 'boopable' and 'legally distinct.'" },
      { id: 'pet9', q: "Cats purr when they're happy — but what ELSE can purring do?", a: ["Help calm and even heal themselves", "Charge their batteries", "Send secret messages to other cats", "Make their fur grow"], correct: 0, fact: "Purr vibrations may soothe pain and even help bones heal. Tiger claims he's a licensed physician. He is not." },
      { id: 'pet10', q: "Why do dogs turn in circles before lying down?", a: ["Ancient instinct from flattening grass into a bed", "To check the floor is still there", "To wind themselves up like a toy", "Dizziness helps them sleep"], correct: 0, fact: "My wolf ancestors stomped grass into comfy nests. I do three spins on a flat cushion. Tradition matters." },
      { id: 'pet11', q: "What do a cat's whiskers actually measure?", a: ["Whether the cat can fit through a gap", "Wind speed", "The time", "How annoyed the cat is"], correct: 0, fact: "Whiskers are about as wide as the cat — built-in rulers! If the whiskers fit, the cat fits. Usually." },
      { id: 'pet12', q: "Which human snack is a BIG danger for dogs and should never ever be shared?", a: ["Chocolate", "Plain rice", "Carrot sticks", "Green beans"], correct: 0, fact: "Chocolate is genuinely poisonous to dogs — even when we give you the eyes. ESPECIALLY when we give you the eyes. Stay strong." },
    ]},

    { extend: 'jokes', questions: [
      { id: 'jokp1', q: "What is a cat's favorite color?", a: ["Purr-ple", "Hiss-teria pink", "Meow-genta", "Claw-range"], correct: 0, fact: "PURR-ple! Tiger rated this joke two out of ten, which from him is a standing ovation." },
      { id: 'jokp2', q: "What do you call a mountain of kittens?", a: ["A meow-ntain", "A purr-amid", "Mount Whiskers", "A cat-astrophe"], correct: 0, fact: "A meow-ntain! Warning: attempting to climb one results in unbearable cuteness." },
      { id: 'jokp3', q: "Why are fish so smart?", a: ["They live in schools", "They read sea-books", "They take notes on kelp", "Their teachers are sharks"], correct: 0, fact: "They live in SCHOOLS! And they still never do their homework. Scandalous." },
      { id: 'jokp4', q: "What's a pirate's favorite letter?", a: ["You'd THINK it's R, but it be the C", "R, obviously", "X, for the treasure", "P, for pirate"], correct: 0, trick: true, fact: "Arrr, ye fell for it! A pirate's heart belongs to the C. The sea. Get it? I'll walk the plank now." },
      { id: 'jokp5', q: "What do you call cheese that isn't yours?", a: ["Nacho cheese", "Stolen swiss", "Cheddar theft", "A dairy crime"], correct: 0, fact: "NACHO cheese! This joke is one hundred years old and still undefeated." },
      { id: 'jokp6', q: "What did the ocean say to the beach?", a: ["Nothing — it just waved", "'Nice sand!'", "'Shell we dance?'", "'Water you doing here?'"], correct: 0, fact: "It just WAVED! Shore, the other answers were tempting. I'm on a roll. A kelp roll." },
    ]},
  ];
  if (typeof window !== 'undefined') (window.BEAN_QUIZ_TOPICS = window.BEAN_QUIZ_TOPICS || []).push.apply(window.BEAN_QUIZ_TOPICS, PACKS);
  if (typeof module !== 'undefined' && module.exports) module.exports = PACKS;
})();

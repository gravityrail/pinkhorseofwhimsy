/*!
 * Bean Quiz topic: Space Odyssey (solar system + cosmic wonders).
 * Correct answer is ALWAYS index 0 (correct: 0) — the game shuffles at runtime.
 * Car-trip friendly space facts kids love — complements Rockets & Space.
 */
(function () {
  // Consolidated into the 'rockets' topic (renamed "Space & Rockets") so the
  // topic grid stays a tidy 4x4. Question ids unchanged — VO stays valid.
  var T = {
    extend: 'rockets',
    questions: [
      { id: 'spo1', q: "Which planet is famous for its big, beautiful rings?", a: ["Saturn", "Mercury", "Earth", "Pluto's cousin Steve"], correct: 0, fact: "Saturn's rings are mostly ice chunks — a cosmic jewelry collection millions of kilometers wide!" },
      { id: 'spo2', q: "What do we call a giant ball of hot glowing gas in space, like our Sun?", a: ["A star", "A comet", "A sandwich", "A very bright rock"], correct: 0, fact: "Stars fuse hydrogen into helium and shine for billions of years. Our Sun is a medium star — just right for dogs and pizza." },
      { id: 'spo3', q: "Which planet is closest to the Sun?", a: ["Mercury", "Neptune", "Jupiter", "The Moon"], correct: 0, fact: "Mercury is scorching on the day side and freezing at night. Pack EVERY jacket. And none of them." },
      { id: 'spo4', q: "What is a comet's pretty glowing tail made of?", a: ["Gas and dust pushed by the Sun", "Spaghetti", "Paint", "Tiger's shed fur"], correct: 0, fact: "When a dirty snowball comet nears the Sun, it sprouts a glowing tail that always points away from the sunlight." },
      { id: 'spo5', q: "How many planets are in our solar system (the official count today)?", a: ["Eight", "Nine", "Twelve", "Forty-two"], correct: 0, fact: "Mercury through Neptune! Pluto was reclassified as a dwarf planet in 2006. Still icy, still cool." },
      { id: 'spo6', q: "Which planet is the largest in our solar system?", a: ["Jupiter", "Mars", "Venus", "Earth"], correct: 0, fact: "Jupiter is a gas giant so big that more than 1,000 Earths could fit inside it. It also has a giant storm called the Great Red Spot." },
      { id: 'spo7', q: "What galaxy do we live in?", a: ["The Milky Way", "The Crunchy Way", "Andromeda Express", "Bean Nebula Prime"], correct: 0, fact: "The Milky Way looks like a spilled milk splash across a dark sky — billions of stars in a spiral." },
      { id: 'spo8', q: "Why do we have day and night on Earth?", a: ["Earth spins so different sides face the Sun", "The Sun turns off at bedtime", "Clouds wear sunglasses", "Cats flip a giant switch"], correct: 0, fact: "One full spin takes about 24 hours. That's a day! Nighty-night is just your side turning away from the lamp." },
      { id: 'spo9', q: "What causes the ocean tides to rise and fall?", a: ["Mostly the Moon's gravity", "Fish doing synchronized swimming", "Underwater fans", "Boats taking turns"], correct: 0, fact: "The Moon tugs on Earth's water. The Sun helps a little too. Cosmic teamwork!" },
      { id: 'spo10', q: "A 'shooting star' is usually what?", a: ["A meteor — a space rock burning up in our air", "A star resigning from its job", "A UFO delivering pizza", "The Sun sneezing"], correct: 0, fact: "Meteors streak and glow from friction with air. If a piece lands, it's called a meteorite. Make a wish either way!" },
      { id: 'spo11', q: "Which planet is known for its extreme sideways tilt, like it's rolling around the Sun?", a: ["Uranus", "Mars", "Venus", "Mercury"], correct: 0, fact: "Uranus is tipped on its side! Its seasons are wild and last for decades. Ice giant with drama." },
      { id: 'spo12', q: "What is the name of the path a planet takes around the Sun?", a: ["An orbit", "A sidewalk", "A tunnel", "A grocery line"], correct: 0, fact: "Earth's orbit is nearly a circle, slightly oval. One lap = one year. Birthday science!" },
      { id: 'spo13', q: "Black holes are famous because their gravity is so strong that...?", a: ["Not even light can escape from inside them", "They only eat broccoli", "They play soft jazz", "They are afraid of dogs"], correct: 0, fact: "At the center of our galaxy lurks a supermassive black hole. Don't worry — we're nowhere near the drain." },
      { id: 'spo14', q: "Which planet is often called Earth's 'twin' because it's similar in size?", a: ["Venus", "Jupiter", "Neptune", "Saturn"], correct: 0, fact: "Venus is similar in size but has a crushing hot atmosphere. Not a great vacation. Pack oven mitts? Still no." },
      { id: 'spo15', q: "What do astronomers use to see faraway stars more clearly?", a: ["Telescopes", "Sunglasses only", "Very long straws", "Echoes"], correct: 0, fact: "From backyard tubes to space telescopes like Hubble and James Webb — bigger mirrors, deeper cosmos." },
      { id: 'spo16', q: "The International Space Station orbits about how often around Earth?", a: ["About once every 90 minutes", "Once a year", "Once a century", "Only on leap days"], correct: 0, fact: "Astronauts see a sunrise every 90 minutes or so — roughly 16 sunrises a day. Exhausting. Beautiful." },
      { id: 'spo17', q: "What is a light-year?", a: ["The distance light travels in one year", "A year made of only daylight", "A birthday for lamps", "How long a glow stick lasts"], correct: 0, fact: "Light is fast — about 300,000 km per second — so a light-year is an ENORMOUS distance ruler for space." },
      { id: 'spo18', q: "Which planet has a day longer than its year (it spins extra slowly)?", a: ["Venus", "Earth", "Mars", "Jupiter"], correct: 0, trick: true, fact: "Venus takes longer to spin once than to orbit the Sun once. A Venus day is longer than a Venus year. Mind = blown." },
      { id: 'spo19', q: "What are Saturn's rings mostly made of?", a: ["Ice and rock chunks", "Cotton candy", "Solid gold hoops", "Frozen lasagna"], correct: 0, fact: "Some ring bits are tiny as sand, some as big as houses. A traffic jam of sparkly ice." },
      { id: 'spo20', q: "Neptune and Uranus look bluish mostly because of which gas in their atmospheres?", a: ["Methane", "Cotton candy vapor", "Blue food coloring", "Sadness"], correct: 0, fact: "Methane absorbs red light and flings blue back at our eyes. Fashion tip from the ice giants." },
      { id: 'spo21', q: "What protects Earth from most dangerous space rocks and harsh solar wind?", a: ["Our atmosphere and magnetic field", "A giant umbrella at the North Pole", "Angry seagulls", "Bubble wrap"], correct: 0, fact: "Atmosphere burns up meteors; the magnetic field deflects charged particles. Earth has great shields!" },
      { id: 'spo22', q: "Which bright planet is often called the 'Evening Star' or 'Morning Star'?", a: ["Venus", "Neptune", "Uranus", "A really ambitious firefly"], correct: 0, fact: "Venus is dazzling near sunrise or sunset. Not a star — just showing off." },
      { id: 'spo23', q: "What is an eclipse of the Sun?", a: ["When the Moon blocks the Sun's light for a little while", "When the Sun takes a nap", "When clouds invent darkness forever", "When someone unplugs the sky"], correct: 0, fact: "A total solar eclipse turns day to eerie twilight. Never stare at the Sun without proper eclipse glasses!" },
      { id: 'spo24', q: "Mars is colder than Earth partly because...?", a: ["It's farther from the Sun and has a thin atmosphere", "It forgot its sweater", "It is made of ice cream", "It sits in a giant fridge"], correct: 0, fact: "Martian weather: chilly, dusty, and fabulous for rovers. Bring a space suit, not shorts." },
      { id: 'spo25', q: "If you could drive a car to the Sun at highway speed, about how long would the trip take?", a: ["More than a hundred years", "About an afternoon", "Five minutes if you hurry", "You'd arrive yesterday"], correct: 0, trick: true, fact: "The Sun is about 93 million miles away. Even a speedy car needs over a century. Rockets: still the move." },
    ],
  };
  if (typeof window !== 'undefined') (window.BEAN_QUIZ_TOPICS = window.BEAN_QUIZ_TOPICS || []).push(T);
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})();

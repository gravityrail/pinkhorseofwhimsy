/*!
 * Bean Quiz — extras pack B: extension questions for existing topics.
 * Each pack uses `extend: '<topicId>'` to add questions to a topic from data.js.
 * Correct answer is ALWAYS index 0 (correct: 0) — the game shuffles at runtime.
 */
(function () {
  var PACKS = [
    { extend: 'math', questions: [
      { id: 'mth_x1', q: "How many times can you subtract 5 from 25?", a: ["Only once", "Five times", "Four times", "As many times as you want"], correct: 0, trick: true, fact: "Just once! After that you're subtracting from 20, not 25. Sneaky!" },
      { id: 'mth_x2', q: "What is 9 times 9?", a: ["81", "72", "99", "90"], correct: 0, fact: "Eighty-one! Nine rows of nine — The Bean counted on all four paws." },
      { id: 'mth_x3', q: "Lily pads on a pond double every day. The pond is FULLY covered on day 10. On which day was it HALF covered?", a: ["Day 9", "Day 5", "Day 8", "Day 2"], correct: 0, trick: true, fact: "Day 9! One more doubling fills the whole pond. Frogs love this puzzle." },
      { id: 'mth_x4', q: "In Roman numerals, what number does the letter X stand for?", a: ["10", "5", "100", "50"], correct: 0, fact: "X marks ten! V is 5, L is 50, and C is 100." },
      { id: 'mth_x5', q: "How many things are in a dozen?", a: ["12", "10", "6", "20"], correct: 0, fact: "Twelve! A dozen eggs, a dozen donuts... The Bean volunteers to count the donuts." },
      { id: 'mth_x6', q: "How many sides does a pentagon have?", a: ["5", "6", "4", "8"], correct: 0, fact: "Five sides! 'Penta' means five — just like the five-sided Pentagon building." },
      { id: 'mth_x7', q: "Bella's mom has three puppies. The first is named Coco, the second is named Momo. What is the third puppy's name?", a: ["Bella", "Bobo", "Lolo", "Fofo"], correct: 0, trick: true, fact: "It's Bella! The third puppy was hiding in the question the whole time." },
      { id: 'mth_x8', q: "What is 100 minus 25?", a: ["75", "85", "65", "70"], correct: 0, fact: "Seventy-five! Like a whole dollar minus one quarter." },
      { id: 'mth_x9', q: "What is 6 times 7?", a: ["42", "36", "48", "67"], correct: 0, fact: "Forty-two! Some very wise books say it's the answer to everything." },
      { id: 'mth_x10', q: "A spider has 8 legs. How many legs do 3 spiders have all together?", a: ["24", "16", "11", "32"], correct: 0, fact: "Twenty-four! That's 8 plus 8 plus 8. Far too many legs, says Tiger." },
      { id: 'mth_x11', q: "What is 2 plus 3 times 4?", a: ["14", "20", "24", "9"], correct: 0, trick: true, fact: "Fourteen! In math, times goes first: 3 times 4 is 12, then add 2." },
      { id: 'mth_x12', q: "A dozen is 12. So how many is a gross — a dozen dozens?", a: ["144", "124", "1200", "100"], correct: 0, fact: "One hundred forty-four! A gross of donuts sounds anything but gross." },
    ]},

    { extend: 'jokes', questions: [
      { id: 'jok_x1', q: "Why don't eggs tell each other jokes?", a: ["They would crack each other up", "They are too chicken", "They always scramble the punchline", "Their yolks are too old"], correct: 0, fact: "They'd CRACK each other up! Egg-cellent work, everyone." },
      { id: 'jok_x2', q: "What do you call a sleeping bull?", a: ["A bull-dozer", "A snore-taurus", "A lazy moo", "A cow-ch potato"], correct: 0, fact: "A bull-DOZER! He really digs a good nap." },
      { id: 'jok_x3', q: "What kind of dog does a vampire have?", a: ["A bloodhound", "A were-woof", "A spooky poodle", "A howl-oween puppy"], correct: 0, fact: "A bloodhound! The Bean says vampires give terrible belly rubs." },
      { id: 'jok_x4', q: "Why can't you give Elsa a balloon?", a: ["Because she will let it go", "Balloons are too warm for her", "Olaf would pop it", "Snowmen are scared of balloons"], correct: 0, fact: "She'll LET IT GOOO! Sorry, now it's stuck in your head too." },
      { id: 'jok_x5', q: "What is an astronaut's favorite part of a computer?", a: ["The space bar", "The moon-itor", "The rocket mouse", "The star keys"], correct: 0, fact: "The SPACE bar! Tap tap tap... liftoff!" },
      { id: 'jok_x6', q: "What do you call a cat who lives at the beach?", a: ["Sandy Claws", "A purr-maid", "A catfish", "A sun-kitten"], correct: 0, fact: "Sandy CLAWS! Tiger refuses to confirm or deny." },
      { id: 'jok_x7', q: "Why did the banana go to the doctor?", a: ["It was not peeling well", "It had a bad split", "It was yellow with fear", "It slipped on a human"], correct: 0, fact: "It wasn't PEELING well! Get better soon, banana." },
      { id: 'jok_x8', q: "What has one eye but cannot see?", a: ["A needle", "A sleepy cyclops", "A pirate on vacation", "A potato"], correct: 0, fact: "A needle! One eye, zero eyesight. Riddles are weird and wonderful." },
      { id: 'jok_x9', q: "What kind of music do mummies love?", a: ["Wrap music", "Rock and roll bandages", "Tomb tunes", "Boo-gie woogie"], correct: 0, fact: "WRAP music! They know all the ancient hits." },
      { id: 'jok_x10', q: "Why do cows wear bells?", a: ["Because their horns do not work", "To ring for dinner", "So farmers can find the dance floor", "They like heavy metal"], correct: 0, fact: "Because their HORNS don't work! Honk honk. I mean... moo." },
      { id: 'jok_x11', q: "The more you take, the more you leave behind. What am I?", a: ["Footsteps", "Cookies", "Naps", "Homework"], correct: 0, fact: "Footsteps! The Bean leaves muddy ones all over the couch." },
      { id: 'jok_x12', q: "What do you call a giant pile of cats?", a: ["A meow-ntain", "A purr-amid", "A fur-nado", "A kitty committee"], correct: 0, fact: "A meow-NTAIN! Tiger dreams of climbing one someday." },
    ]},

    { extend: 'whoami', questions: [
      { id: 'who_x1', q: "I'm a yellow electric mouse Pokemon with red cheeks and a lightning-bolt tail. Who am I?", a: ["Pikachu", "Charmander", "Jigglypuff", "Eevee"], correct: 0, fact: "Pika pika! Pikachu is the most famous Pokemon of them all." },
      { id: 'who_x2', q: "I'm a queen with ice powers, a sister named Anna, and a song about letting it go. Who am I?", a: ["Elsa", "Moana", "Rapunzel", "Cinderella"], correct: 0, fact: "Elsa of Arendelle! The cold never bothered her anyway." },
      { id: 'who_x3', q: "I sail past the reef to return the heart of Te Fiti, with a demigod named Maui. Who am I?", a: ["Moana", "Ariel", "Belle", "Tiana"], correct: 0, fact: "Moana! The ocean chose her — and her silly chicken, Heihei, came too." },
      { id: 'who_x4', q: "I'm a clever detective from London who solves mysteries with my friend Doctor Watson. Who am I?", a: ["Sherlock Holmes", "Hercule Poirot", "Inspector Gadget", "Batman"], correct: 0, fact: "Sherlock Holmes! Elementary, my dear players." },
      { id: 'who_x5', q: "I was the famous last queen of ancient Egypt and could speak many languages. Who am I?", a: ["Cleopatra", "Queen Victoria", "Nefertiti", "Joan of Arc"], correct: 0, fact: "Cleopatra! Ancient Egyptians adored cats, so Tiger approves of Egypt." },
      { id: 'who_x6', q: "I became pharaoh of Egypt when I was just a boy, and my golden mask is world famous. Who am I?", a: ["King Tut", "King Arthur", "Julius Caesar", "King Midas"], correct: 0, fact: "Tutankhamun — King Tut! His treasure-filled tomb was discovered in 1922." },
      { id: 'who_x7', q: "In 1932 I became the first woman to fly an airplane alone across the Atlantic Ocean. Who am I?", a: ["Amelia Earhart", "Sally Ride", "Bessie Coleman", "Rosa Parks"], correct: 0, fact: "Amelia Earhart! A daring pilot with sky-high courage." },
      { id: 'who_x8', q: "In 1955 I refused to give up my bus seat, helping spark the civil rights movement. Who am I?", a: ["Rosa Parks", "Harriet Tubman", "Ruby Bridges", "Maya Angelou"], correct: 0, fact: "Rosa Parks! One brave 'no' helped change history." },
      { id: 'who_x9', q: "A falling apple helped me figure out how gravity works, way back in the 1600s. Who am I?", a: ["Isaac Newton", "Albert Einstein", "Galileo Galilei", "Charles Darwin"], correct: 0, fact: "Isaac Newton! The Bean also studies falling food. Very, very closely." },
      { id: 'who_x10', q: "I wrote famous symphonies and kept composing music even after I lost my hearing. Who am I?", a: ["Beethoven", "Mozart", "Bach", "Elvis Presley"], correct: 0, fact: "Beethoven! He could feel the music through the piano's vibrations." },
      { id: 'who_x11', q: "I was a Mexican painter known for colorful self-portraits with flowers in my hair. Who am I?", a: ["Frida Kahlo", "Pablo Picasso", "Claude Monet", "Vincent van Gogh"], correct: 0, fact: "Frida Kahlo! She often painted her pet monkeys and parrots too." },
      { id: 'who_x12', q: "I'm a wooden puppet whose nose grows longer every time I tell a lie. Who am I?", a: ["Pinocchio", "Geppetto", "Woody", "Peter Pan"], correct: 0, fact: "Pinocchio! The Bean's nose only grows in the direction of snacks." },
    ]},

    { extend: 'world', questions: [
      { id: 'wor_x1', q: "The Eiffel Tower stands in which city?", a: ["Paris", "London", "Rome", "New York"], correct: 0, fact: "Paris! On hot days the iron expands and the tower grows about six inches taller." },
      { id: 'wor_x2', q: "The Great Wall, the longest wall on Earth, was built in which country?", a: ["China", "Japan", "India", "Egypt"], correct: 0, fact: "China! All its sections together stretch for thousands of miles." },
      { id: 'wor_x3', q: "The Great Pyramids of Giza are found in which country?", a: ["Egypt", "Mexico", "Greece", "Peru"], correct: 0, fact: "Egypt! They were built more than four thousand years ago and still stand tall." },
      { id: 'wor_x4', q: "Who invented the telephone?", a: ["Alexander Graham Bell", "Thomas Edison", "Nikola Tesla", "Benjamin Franklin"], correct: 0, fact: "Bell! His first call was to his helper: Mr. Watson, come here!" },
      { id: 'wor_x5', q: "How many rings are on the Olympic flag?", a: ["5", "3", "6", "7"], correct: 0, fact: "Five linked rings, standing for the parts of the world joined together in sport." },
      { id: 'wor_x6', q: "Which language has the most native speakers in the world?", a: ["Mandarin Chinese", "English", "Spanish", "French"], correct: 0, fact: "Mandarin Chinese! Nearly a billion people grow up speaking it." },
      { id: 'wor_x7', q: "Which country's flag is plain white with one big red circle in the middle?", a: ["Japan", "China", "South Korea", "Switzerland"], correct: 0, fact: "Japan! The red circle stands for the rising sun." },
      { id: 'wor_x8', q: "What money do France, Germany, Spain, and Italy all share?", a: ["The euro", "The pound", "The dollar", "The franc"], correct: 0, fact: "The euro! One kind of money shared by about twenty countries in Europe." },
      { id: 'wor_x9', q: "Japan's famous super-fast bullet trains are called what?", a: ["Shinkansen", "The Eurostar", "The Orient Express", "The Polar Express"], correct: 0, fact: "Shinkansen! They zoom along at nearly 200 miles per hour. Beat that, zoomies." },
      { id: 'wor_x10', q: "What part of an airplane makes the lift that holds it up in the air?", a: ["The wings", "The wheels", "The seats", "The propeller hat"], correct: 0, fact: "The wings! Air rushing over them pushes the plane up. Whoosh!" },
      { id: 'wor_x11', q: "Which country gave the Statue of Liberty to the United States as a gift?", a: ["France", "England", "Spain", "Canada"], correct: 0, fact: "France! She arrived in 350 pieces packed in crates, like a giant puzzle." },
      { id: 'wor_x12', q: "Big Ben is a famous clock tower in which city?", a: ["London", "Paris", "Sydney", "Toronto"], correct: 0, fact: "London! Big Ben is actually the nickname of the giant bell inside the tower." },
    ]},

    { extend: 'grabbag', questions: [
      { id: 'grb_x1', q: "Who has MORE bones: a baby or a grown-up?", a: ["A baby", "A grown-up", "They have the same number", "Only pirates have bones"], correct: 0, fact: "Babies have about 300 bones, and some of them fuse together as they grow!" },
      { id: 'grb_x2', q: "Which fruit wears its seeds on the OUTSIDE?", a: ["The strawberry", "The apple", "The banana", "The watermelon"], correct: 0, fact: "Strawberries! Each one carries about 200 tiny seeds on its skin." },
      { id: 'grb_x3', q: "Which instrument has 88 black and white keys?", a: ["The piano", "The guitar", "The trumpet", "The drum kit"], correct: 0, fact: "The piano! That's 52 white keys and 36 black ones." },
      { id: 'grb_x4', q: "In basketball, how many points do you score for a shot from behind the big arc?", a: ["3", "2", "1", "10"], correct: 0, fact: "Three points! That's why everyone cheers for a three-pointer." },
      { id: 'grb_x5', q: "What do we call a scientist who studies the weather?", a: ["A meteorologist", "An astrologer", "A geologist", "A dinosaur hunter"], correct: 0, fact: "A meteorologist! Despite the name, they mostly study clouds, not meteors." },
      { id: 'grb_x6', q: "During which Mexican holiday do families decorate with marigold flowers and remember loved ones?", a: ["The Day of the Dead", "Cinco de Mayo", "Thanksgiving", "April Fools' Day"], correct: 0, fact: "The Day of the Dead — Dia de los Muertos — a celebration full of flowers, food, and family." },
      { id: 'grb_x7', q: "What color is a flamingo when it hatches?", a: ["Gray", "Pink", "Blue", "Rainbow"], correct: 0, fact: "Gray! Flamingos turn pink from munching shrimpy pink snacks." },
      { id: 'grb_x8', q: "What color do you get when you mix red and blue paint?", a: ["Purple", "Green", "Orange", "Brown"], correct: 0, fact: "Purple! Royal, radical, and famously hard to rhyme." },
      { id: 'grb_x9', q: "More than half of all the bones in your body are found where?", a: ["In your hands and feet", "In your head", "In your back", "In your legs"], correct: 0, fact: "Hands and feet! Each hand alone has 27 bones. Handy!" },
      { id: 'grb_x10', q: "Which food was found in ancient Egyptian tombs and was STILL safe to eat?", a: ["Honey", "Cheese", "Bread", "Pizza"], correct: 0, fact: "Honey never spoils! Three-thousand-year-old honey, still snackable. Wow." },
      { id: 'grb_x11', q: "What do we call a spinning, funnel-shaped storm that touches the ground?", a: ["A tornado", "A hurricane", "A blizzard", "A drizzle"], correct: 0, fact: "A tornado! The fastest ones spin quicker than 200 miles per hour." },
      { id: 'grb_x12', q: "Where do pineapples grow?", a: ["On a spiky plant near the ground", "On tall palm trees", "Underground like carrots", "On vines like grapes"], correct: 0, fact: "On a ground plant! It takes about two years to grow just one pineapple." },
    ]},
  ];

  if (typeof window !== 'undefined') {
    var A = (window.BEAN_QUIZ_TOPICS = window.BEAN_QUIZ_TOPICS || []);
    PACKS.forEach(function (p) { A.push(p); });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = PACKS;
})();

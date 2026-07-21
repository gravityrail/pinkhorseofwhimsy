/*!
 * Bean Quiz topic: Girl Power — famous women, feminism, and world-changers.
 * Requested by Lola. Pitched at a sharp 12-year-old: real history, real science,
 * zero condescension, maximum hype.
 * Correct answer is ALWAYS index 0 (correct: 0) — the game shuffles at runtime.
 */
(function () {
  var T = {
    id: 'girlpower',
    name: 'Girl Power',
    emoji: '💪',
    color: '#d946ef',
    questions: [
      { id: 'gp1', q: "Who was the first person EVER to win two Nobel Prizes — in two different sciences?", a: ["Marie Curie", "Albert Einstein", "Isaac Newton", "Thomas Edison"], correct: 0, fact: "Marie Curie — physics AND chemistry! Her notebooks are still radioactive today. Please do not sniff them." },
      { id: 'gp2', q: "Who is the youngest person ever to win the Nobel Peace Prize, for standing up for girls' education?", a: ["Malala Yousafzai", "Greta Thunberg", "Taylor Swift", "Serena Williams"], correct: 0, fact: "Malala was seventeen. She proved one student with one book can out-brave an entire army of bullies." },
      { id: 'gp3', q: "Who was the first woman to fly solo across the Atlantic Ocean?", a: ["Amelia Earhart", "Sally Ride", "Bessie Coleman", "Mary Poppins"], correct: 0, fact: "Amelia Earhart, 1932 — fourteen hours alone over a freezing ocean in a tiny red plane she called her 'little red bus.'" },
      { id: 'gp4', q: "Which NASA mathematician's hand calculations helped astronauts reach the Moon — as told in 'Hidden Figures'?", a: ["Katherine Johnson", "Rosa Parks", "Marie Curie", "Amelia Earhart"], correct: 0, fact: "Katherine Johnson! Astronaut John Glenn refused to launch until SHE personally checked the computer's math. THE computer asked HER." },
      { id: 'gp5', q: "Who is considered the world's FIRST computer programmer — in the 1840s, before computers even existed?", a: ["Ada Lovelace", "Bill Gates", "Steve Jobs", "A very organized robot"], correct: 0, fact: "Ada Lovelace wrote the first algorithm for a machine that was never even built. Programming: invented by a girl, a century early." },
      { id: 'gp6', q: "Who sparked the Montgomery Bus Boycott in 1955 by refusing to give up her bus seat?", a: ["Rosa Parks", "Harriet Tubman", "Michelle Obama", "Ruth Bader Ginsburg"], correct: 0, fact: "Rosa Parks stayed seated so a whole movement could stand up. One quiet 'no' that changed history." },
      { id: 'gp7', q: "What were the suffragettes fighting for?", a: ["Women's right to VOTE", "Better hats", "Shorter school days", "The right to ride horses"], correct: 0, fact: "The vote! They marched, went to jail, and never quit. Every ballot a woman casts today is their trophy." },
      { id: 'gp8', q: "Which scientist lived with chimpanzees in Tanzania and changed how we understand animals forever?", a: ["Jane Goodall", "Marie Curie", "Katherine Johnson", "Doctor Dolittle"], correct: 0, fact: "Jane Goodall discovered chimps make tools — scientists literally had to rewrite the definition of 'human.' She did it at 26." },
      { id: 'gp9', q: "Which Mexican painter, famous for bold self-portraits, is one of the most celebrated artists ever?", a: ["Frida Kahlo", "Pablo Picasso", "Leonardo da Vinci", "Bob Ross"], correct: 0, fact: "Frida Kahlo painted her own fabulous face fifty-five times and made the unibrow ICONIC. Confidence level: legend." },
      { id: 'gp10', q: "Which gymnast has more World Championship medals than anyone in history — with four skills named after her?", a: ["Simone Biles", "Serena Williams", "Simone Says", "Nadia Comaneci"], correct: 0, fact: "Simone Biles! Her moves are so hard they had to invent new names AND new scores for them. Gravity has filed a complaint." },
      { id: 'gp11', q: "Which tennis champion won 23 Grand Slam singles titles — one of them while secretly pregnant?", a: ["Serena Williams", "Simone Biles", "Billie Jean King", "Megan Rapinoe"], correct: 0, fact: "Serena won the 2017 Australian Open with a secret teammate on board. Twenty-three slams. TWENTY-THREE." },
      { id: 'gp12', q: "Who was the first Black woman to travel to space, aboard Space Shuttle Endeavour in 1992?", a: ["Mae Jemison", "Katherine Johnson", "Sally Ride", "Amelia Earhart"], correct: 0, fact: "Doctor Mae Jemison — doctor, engineer, astronaut, AND she later appeared on Star Trek. Résumé: unbeatable." },
      { id: 'gp13', q: "Which Supreme Court justice fought for equal rights and got the nickname 'The Notorious R.B.G.'?", a: ["Ruth Bader Ginsburg", "Rosa Parks", "Ada Lovelace", "Judge Judy"], correct: 0, fact: "Ruth Bader Ginsburg argued — and won — cases that made 'because she's a girl' an illegal reason for basically anything." },
      { id: 'gp14', q: "In 1973, Billie Jean King beat Bobby Riggs in a famous tennis match known as what?", a: ["The Battle of the Sexes", "The Big Bounce", "Wimbledon Wars", "The Racket Rumble"], correct: 0, fact: "Ninety million people watched Billie Jean King win — and then she used the fame to demand equal prize money. And GOT it." },
      { id: 'gp15', q: "What does 'feminism' actually mean?", a: ["Believing everyone deserves equal rights and chances, whatever their gender", "Thinking girls are better than boys", "A type of hairstyle", "Being afraid of frogs"], correct: 0, trick: true, fact: "That's it — equality. That's the whole thing. As a girl dog with a mohawk, I officially approve this message." },
      { id: 'gp16', q: "Teenager Joan of Arc became famous in the 1400s for doing what?", a: ["Leading French armies to victory", "Inventing the croissant", "Painting the Mona Lisa", "Discovering gravity"], correct: 0, fact: "Joan of Arc led armies at SEVENTEEN. Most of us are proud when we lead the line at lunch." },
      { id: 'gp17', q: "Which young Kenyan-born movement did Wangari Maathai start that planted over 50 MILLION trees?", a: ["The Green Belt Movement", "The Tree Team", "Forest Force Five", "The Leaf League"], correct: 0, fact: "Wangari Maathai became the first African woman to win the Nobel Peace Prize — one tree, one woman, fifty million times." },
      { id: 'gp18', q: "Malala said: 'One child, one teacher, one book and one pen can...' — finish the quote!", a: ["Change the world", "Pass the test", "Win the quiz", "Take a nap"], correct: 0, fact: "Change the world! Write it on your wall. Tattoo it on your homework. Live it." },
    ],
  };
  if (typeof window !== 'undefined') (window.BEAN_QUIZ_TOPICS = window.BEAN_QUIZ_TOPICS || []).push(T);
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})();

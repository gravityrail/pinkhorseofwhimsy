/*!
 * Bean Quiz topic: Pop Stars — Taylor Swift fan-service deep cuts + hard pop trivia.
 * Correct answer is ALWAYS index 0 (correct: 0) — the game shuffles at runtime.
 */
(function () {
  var T = {
    id: 'pop-stars',
    name: 'Pop Stars',
    emoji: '🎤',
    color: '#e11d48',
    questions: [
      // ── Taylor deep cuts / hard fan service ───────────────────────────────
      { id: 'pop1', q: "Taylor Swift's re-recorded albums are nicknamed what?", a: ["Taylor's Versions", "Swift Editions", "Vault Masters", "Redux Records"], correct: 0, fact: "Taylor's Versions reclaim her masters — and hide unreleased 'From The Vault' tracks. Serious business, serious glitter." },
      { id: 'pop2', q: "Which album era is famous for snake imagery and a dramatic stadium tour comeback narrative?", a: ["Reputation", "Lover", "folklore", "Speak Now"], correct: 0, fact: "Reputation: snakes, black glitter, and 'Look What You Made Me Do.' Tiger claims he invented the snake look." },
      { id: 'pop3', q: "On which album does Taylor invent the fictional town of 'this sick beat'… wait, no — which album opens with the line about being 'so sick of running as fast as I can'?", a: ["1989 (the title track vibes are pure 1989-era synth-pop — the lyric is from 'Out of the Woods')", "Fearless", "Midnights", "The Tortured Poets Department"], correct: 0, trick: true, fact: "Trick wording on purpose! 'Out of the Woods' is a 1989 classic about anxiety and almost-crashes. Stay with me." },
      { id: 'pop4', q: "What is the correct full title of Taylor's 2024 double-album era (often shortened by fans)?", a: ["The Tortured Poets Department", "The Tortured Poets Society", "Midnight Poets Club", "The Anthology of Sad Lamp"], correct: 0, fact: "The Tortured Poets Department — sometimes with The Anthology. Bring tissues and a highlighter." },
      { id: 'pop5', q: "Which 'From The Vault' track from Red (Taylor's Version) became a massive slow-burn fan anthem about almost-love?", a: ["All Too Well (10 Minute Version)", "I Bet You Think About Me", "Run", "The Very First Night"], correct: 0, fact: "The 10-minute All Too Well is a novella with a scarf. Cinema." },
      { id: 'pop6', q: "Taylor's Eras Tour was structured as what?", a: ["A career-spanning set divided into album 'eras'", "Only folklore acoustic songs", "A country-only throwback", "A DJ set with no live band"], correct: 0, fact: "Each era got its own costume, set piece, and scream-sing chapter. Marathon cardio for Swifties." },
      { id: 'pop7', q: "Which album pair is often called her 'quarantine sister albums' — one fairy-tale folk, one more gothic?", a: ["folklore and evermore", "Lover and Reputation", "Midnights and 1989", "Speak Now and Red"], correct: 0, fact: "folklore & evermore: cardigans, fictional characters, and cottagecore maximalism." },
      { id: 'pop8', q: "In Swiftie slang, what does 'Mother is mothering' roughly celebrate?", a: ["Taylor being exceptionally on her game", "A literal parenting podcast", "Only songs about moms", "A canceled tour"], correct: 0, fact: "Internet praise dialect. When the bridge hits, Mother is mothering." },
      { id: 'pop9', q: "Which song's bridge famously starts counting 'I remember it all too well' memories in devastating detail?", a: ["All Too Well", "Blank Space", "Shake It Off", "ME!"], correct: 0, fact: "If you know, you know. If you don't, welcome to the scarf." },
      { id: 'pop10', q: "What color is most associated with the Midnights era aesthetic?", a: ["Deep navy / midnight blue", "Hot pink only", "Neon green", "Orange construction cone"], correct: 0, fact: "Midnights: clock motifs, glittery blues, 3am thoughts." },
      { id: 'pop11', q: "Which early-career album title matches a fairy-tale word and a breakthrough country-pop crossover era?", a: ["Fearless", "Reputation", "Midnights", "evermore"], correct: 0, fact: "Fearless won Album of the Year — then won again as Fearless (Taylor's Version). Historic flex." },
      { id: 'pop12', q: "What is a 'secret song' in Eras Tour lore?", a: ["A rotating surprise song (often acoustic) unique to that show", "A song only cats can hear", "The national anthem", "A TikTok filter"], correct: 0, fact: "Swifties tracked setlists like treasure maps. No two nights felt identical." },
      { id: 'pop13', q: "Which music video / short film companion is tied to All Too Well and stars Sadie Sink?", a: ["All Too Well: The Short Film", "Cardigan: The Cottage", "Anti-Hero: The Mirror", "Lavender Haze: The Fog"], correct: 0, fact: "A short film that made grown adults cry in parking lots. Art." },
      { id: 'pop14', q: "Taylor co-wrote and performed 'I Don't Wanna Live Forever' with which artist?", a: ["Zayn", "Ed Sheeran", "Bon Iver", "Post Malone"], correct: 0, fact: "From the Fifty Shades Darker soundtrack era — a pure late-2010s collab artifact." },
      { id: 'pop15', q: "Which album's standard edition tracklist ends with 'New Year's Day'?", a: ["Reputation", "Lover", "Red", "1989"], correct: 0, fact: "Soft piano after a maximalist album — a quiet closer for the chaos." },
      { id: 'pop16', q: "What do fans call the re-recorded vault tracks that never appeared on original albums?", a: ["From The Vault tracks", "Basement Bops", "Outtake Olympics", "Hidden Hamsters"], correct: 0, fact: "From The Vault = the reason Swifties refresh at midnight like it's a sport." },
      { id: 'pop17', q: "Which song name-checks a famous NYC neighborhood and a 'high line' kind of romance vibe on 1989?", a: ["Welcome to New York", "Style", "Wildest Dreams", "Clean"], correct: 0, fact: "Welcome to New York opens the 1989 party. Concrete jungle where dreams are made of — Swift edition." },
      { id: 'pop18', q: "On folklore, which character triangle involves Betty, James, and Augustine?", a: ["The teenage love-triangle songs (Cardigan / Betty / August)", "Only the song 'epiphany'", "The Midnights 3am tracks", "The Reputation snakes"], correct: 0, fact: "folklore's teenage trilogy is English-class catnip. Who hurt James? Everyone has a theory." },
      { id: 'pop19', q: "Which number is famously lucky/unlucky in Taylor lore and appears all over her work?", a: ["13", "7", "21", "4"], correct: 0, fact: "13: her birthday number, lucky charm, and easter-egg fuel." },
      { id: 'pop20', q: "What is the name of Taylor's cat who is a Scottish Fold and frequent social-star?", a: ["Meredith Grey (and friends Olivia Benson & Benjamin Button)", "Mr. Whiskers only", "Garfield", "Tiger the Quiz Cat"], correct: 0, fact: "Meredith, Olivia, and Benjamin — A-list cats. Tiger is taking notes and sulking." },

      // ── Broader pop, still hard / weird ───────────────────────────────────
      { id: 'pop21', q: "Which pop star's fans are called the Beyhive?", a: ["Beyoncé", "Rihanna", "Lady Gaga", "Adele"], correct: 0, fact: "Beyhive. Do not start drama you cannot finish." },
      { id: 'pop22', q: "Billie Eilish's early breakthrough single that whispered its way to the top was…?", a: ["ocean eyes", "Bad Guy only (later)", "Shake It Off", "Umbrella"], correct: 0, fact: "ocean eyes put Billie on the map — soft, eerie, unforgettable." },
      { id: 'pop23', q: "Which artist released the album SOUR and later GUTS?", a: ["Olivia Rodrigo", "Sabrina Carpenter", "Dua Lipa", "Doja Cat"], correct: 0, fact: "SOUR was a debut earthquake; GUTS doubled down on messy feelings." },
      { id: 'pop24', q: "Dua Lipa's disco-revival smash album is titled…?", a: ["Future Nostalgia", "Past Forward", "Neon Yesterday", "Studio 54 Forever"], correct: 0, fact: "Future Nostalgia: dance floor medicine." },
      { id: 'pop25', q: "Which K-pop group is behind 'Dynamite' and 'Butter'?", a: ["BTS", "BLACKPINK", "Stray Kids", "NewJeans"], correct: 0, fact: "BTS — global phenomenon, ARMY forever." },
      { id: 'pop26', q: "Lady Gaga's early persona-defining hit with a bad romance is…?", a: ["Bad Romance", "Shake It Off", "Anti-Hero", "drivers license"], correct: 0, fact: "Rah-rah-ah-ah-ah. Fashion! Music! Gaga." },
      { id: 'pop27', q: "Which pop star's fans are Little Monsters?", a: ["Lady Gaga", "Taylor Swift", "Billie Eilish", "Katy Perry"], correct: 0, fact: "Little Monsters. Gaga's community name since the Fame era." },
      { id: 'pop28', q: "Harry Styles' album Fine Line includes which dreamy hit about lights up and falling?", a: ["Adore You (and Watermelon Sugar era vibes — Fine Line is the album)", "Blank Space", "Levitating", "good 4 u"], correct: 0, trick: true, fact: "Fine Line is Harry's second solo album. Watermelon Sugar & Adore You lived there rent-free." },
      { id: 'pop29', q: "Which songwriting credit machine co-wrote countless hits and is NOT primarily a chart-topping solo pop diva persona like Taylor?", a: ["Max Martin (producer/writer legend)", "Taylor Swift", "Beyoncé", "Olivia Rodrigo"], correct: 0, fact: "Max Martin is the invisible hit factory behind decades of pop. Respect the architecture." },
      { id: 'pop30', q: "Swifties sometimes decode capital letters in her social posts because…?", a: ["They may spell secret messages or track titles", "Cats demand it", "It's random keyboard spam", "It's only for weather reports"], correct: 0, fact: "Easter eggs are a competitive sport. Bring a spreadsheet." },

      // ── Extra hard Taylor / industry ─────────────────────────────────────
      { id: 'pop31', q: "Which label situation led Taylor to re-record her first six albums?", a: ["She didn't own the original masters after a sale", "She lost a bet", "Vinyl factories refused red", "She only likes microphones shaped like snakes"], correct: 0, fact: "Artists' rights story of the decade. Taylor's Versions changed the industry conversation." },
      { id: 'pop32', q: "Which Midnights track is a self-own anthem about being the problem?", a: ["Anti-Hero", "Lavender Haze", "Bejeweled", "Karma"], correct: 0, fact: "It's me, hi. The mirror is undefeated." },
      { id: 'pop33', q: "What instrument does Taylor often play while performing surprise songs?", a: ["Guitar and/or piano", "Tuba only", "Bagpipes", "Theremin exclusively"], correct: 0, fact: "Guitar or piano, sometimes both across a night. Live skill issue: she has none." },
      { id: 'pop34', q: "Which song's music video features Taylor as multiple chaotic characters including 'Anti-Hero' selves?", a: ["Anti-Hero", "ME!", "You Belong With Me", "Wildest Dreams"], correct: 0, fact: "Giant Taylor, dinner-party Taylor, graveside Taylor — range." },
      { id: 'pop35', q: "Speak Now (Taylor's Version) is special partly because original Speak Now was…?", a: ["Written solely by Taylor", "Only covers of other artists", "An instrumental jazz album", "A podcast"], correct: 0, fact: "Solo-written teenage opera. Bridges for days." },
    ],
  };
  // Fix awkward pop3 - rewrite cleanly without meta trick mess
  T.questions[2] = {
    id: 'pop3',
    q: "Which 1989 track includes the lyric about being 'in the clear' after nearly crashing (metaphorically)?",
    a: ["Out of the Woods", "Blank Space", "Style", "Shake It Off"],
    correct: 0,
    fact: "Out of the Woods — anxiety, almosts, and a clean synth rush. Are we out of the woods yet?",
  };
  T.questions[27] = {
    id: 'pop28',
    q: "Harry Styles' second solo album, home to 'Watermelon Sugar' and 'Adore You', is called…?",
    a: ["Fine Line", "Harry's House", "Midnights", "SOUR"],
    correct: 0,
    fact: "Fine Line — soft rock, big feelings, fine fashion.",
  };

  if (typeof window !== 'undefined') (window.BEAN_QUIZ_TOPICS = window.BEAN_QUIZ_TOPICS || []).push(T);
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})();

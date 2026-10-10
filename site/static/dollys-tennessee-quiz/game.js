(() => {
  "use strict";
  const show = document.querySelector("#show"),
    speech = document.querySelector("#speech");
  const topics = {
    mix: ["✦", "The Grand Tennessee Tour", "A little of everything"],
    knoxville: [
      "☀",
      "Knoxville Sparkle",
      "Sunsphere, city sights & local history",
    ],
    smokies: [
      "⛰",
      "Smoky Mountain Magic",
      "Wildlife, mountain mist & woodland wonders",
    ],
    dolly: [
      "♡",
      "Dolly’s Mountain Roots",
      "Appalachian roots, deep cuts & a mind of her own",
    ],
  };
  const names = [
    "Rhinestone Rebel",
    "Smoky Mountain Star",
    "Sunsphere Sweetheart",
    "Back Porch Legend",
  ];
  let count = 1,
    topic = "mix",
    players = [],
    deck = [],
    index = 0,
    answered = false,
    options = [],
    screen = "home",
    sound = false,
    audio;
  const shuffle = (a) => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  const pick = (group) => shuffle(window.DOLLY_SHOW.lines[group])[0];
  function say(line, extra = []) {
    speech.textContent = line.text;
    speech.dataset.line = line.id;
    const source = document.querySelector("#host-source");
    source.hidden = !line.source;
    if (line.source) {
      source.href = line.source;
      source.textContent = line.sourceLabel;
    }
    window.DollyVoice.play([line.id, ...extra]);
  }
  function chime(kind = "start") {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      const notes =
        kind === "wrong"
          ? [220, 174]
          : kind === "win"
            ? [392, 494, 587, 784, 988]
            : [392, 494, 587];
      notes.forEach((f, i) => {
        const o = audio.createOscillator(),
          g = audio.createGain(),
          t = audio.currentTime + i * 0.11;
        o.type = "triangle";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(g);
        g.connect(audio.destination);
        o.start(t);
        o.stop(t + 0.23);
      });
    } catch {
      /* Play continues on devices without Web Audio. */
    }
  }
  document.querySelector("#sound").onclick = () => {
    sound = !sound;
    document.querySelector("#sound").textContent = sound
      ? "♪ Sound on"
      : "♪ Sound off";
    document
      .querySelector("#sound")
      .setAttribute("aria-pressed", String(sound));
    window.DollyVoice.setEnabled(sound);
    chime();
  };
  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = document.querySelector("#confetti");
    for (let i = 0; i < 35; i++) {
      const s = document.createElement("span");
      s.className = "confetto";
      s.textContent = ["✦", "♡", "♪"][i % 3];
      s.style.cssText = `left:${Math.random() * 100}%;color:${["#f77cbb", "#fbd481", "#96e2cc"][i % 3]};animation-delay:${Math.random() * 0.4}s`;
      c.append(s);
      setTimeout(() => s.remove(), 3000);
    }
  }
  function home() {
    screen = "home";
    say(pick("welcome"));
    show.innerHTML = `<div class="eyebrow">A rhinestone-studded trivia show</div><h1><em>Dolly’s</em><br>Tennessee<br><span class="quiz-word">Quiz</span></h1><p class="intro">Come on in, sugar. From Knoxville’s golden skyline to the misty Smokies, there’s a whole lot of wonder in these hills.</p><div class="details"><span>✦ 1–4 contestants</span><span>♡ No time pressure</span><span>♪ All heart</span></div><button class="primary" id="start">Let’s make some sparkle <span>→</span></button><button class="secondary porch-button" id="porch">♡ Back-porch stories</button><p class="small-note">Tap to play · Keyboard & controller friendly<br>Hear every question in an East Tennessee voice.<br>Mountain stories, original dialogue & a few classic Dolly quips.</p>`;
    show.querySelector("#start").onclick = setup;
    show.querySelector("#porch").onclick = () => porch(0);
  }
  function porch(at) {
    screen = "porch";
    const story = window.DOLLY_SHOW.stories[at];
    document.querySelector("#host-source").hidden = true;
    speech.textContent =
      "Pull up a chair, sugar. Here’s a little story behind the sparkle.";
    window.DollyVoice.play(["story-" + story.id]);
    show.innerHTML = `<div class="eyebrow">Back-porch stories · ${at + 1} / ${window.DOLLY_SHOW.stories.length}</div><h2>${story.title}</h2><span class="story-tag">${story.tag}</span><p class="story-text">${story.text}</p>${story.quote ? `<blockquote>${story.quote}<cite>${story.quoteKind}</cite></blockquote>` : ""}<a class="story-source" href="${story.source}" target="_blank" rel="noopener noreferrer">${story.sourceLabel} ↗</a><div class="actions"><button class="primary" id="next-story">Another porch story <span>→</span></button><button class="secondary" id="back-home">Back to the show</button></div><p class="small-note">Facts and direct quotations are sourced. The surrounding tribute dialogue is original.</p>`;
    show.querySelector("#next-story").onclick = () =>
      porch((at + 1) % window.DOLLY_SHOW.stories.length);
    show.querySelector("#back-home").onclick = home;
  }
  function setup() {
    screen = "setup";
    say(pick("setup"));
    show.innerHTML = `<div class="eyebrow">Take your place in the spotlight</div><h2>Who’s on the show?</h2><div class="choices" id="players">${[1, 2, 3, 4].map((n) => `<button class="choice ${count === n ? "selected" : ""}" data-count="${n}" aria-pressed="${count === n}"><strong>${n === 1 ? "Solo superstar" : n + " contestants"}</strong><small>${n === 1 ? "Your very own spotlight" : "Pass the mic · equal turns"}</small></button>`).join("")}</div><div class="choices topics">${Object.entries(
      topics,
    )
      .map(
        ([key, [icon, name, desc]]) =>
          `<button class="choice ${topic === key ? "selected" : ""}" data-topic="${key}" aria-pressed="${topic === key}"><span class="icon" aria-hidden="true">${icon}</span><span><strong>${name}</strong><small>${desc}</small></span></button>`,
      )
      .join(
        "",
      )}</div><button class="primary" id="begin">Cue the lights! <span>→</span></button><p class="small-note">100 points per correct answer. The final turn for each contestant is a 500-point “9 to 5” encore! Each gets one Little Help lifeline.</p>`;
    show.querySelectorAll("[data-count]").forEach(
      (b) =>
        (b.onclick = () => {
          count = Number(b.dataset.count);
          setup();
        }),
    );
    show.querySelectorAll("[data-topic]").forEach(
      (b) =>
        (b.onclick = () => {
          topic = b.dataset.topic;
          setup();
        }),
    );
    show.querySelector("#begin").onclick = begin;
  }
  function begin() {
    players = names
      .slice(0, count)
      .map((name) => ({ name, score: 0, correct: 0, help: true }));
    const bank =
      topic === "mix"
        ? Object.values(window.QUIZ_BANK).flat()
        : window.QUIZ_BANK[topic];
    const total = count === 1 ? 9 : Math.floor(9 / count) * count;
    deck = shuffle(bank).slice(0, total);
    index = 0;
    chime();
    question();
  }
  function question() {
    screen = "question";
    answered = false;
    const q = deck[index],
      p = players[index % count];
    options = shuffle(q[1].map((text, i) => ({ text, correct: i === 0 })));
    const encore = index >= deck.length - count;
    say(pick(encore ? "encore" : "question"), [q.id + "-question"]);
    show.innerHTML = `<div class="question-top"><span>${encore ? "✦ 9 TO 5 ENCORE" : topics[topic][1].toUpperCase()}</span><span>QUESTION ${index + 1} / ${deck.length}</span></div><div class="progress"><span style="width:${(index / deck.length) * 100}%"></span></div><div class="scoreboard">${players.map((s, i) => `<span class="score ${i === index % count ? "active" : ""}">${s.name} · ${s.score}</span>`).join("")}</div><div class="eyebrow">${count > 1 ? p.name + "’s turn" : "Your moment to shine"} · ${encore ? 500 : 100} points</div><h2>${q[0]}</h2><div class="choices" id="answers">${options.map((o, i) => `<button class="choice answer" data-answer="${i}"><span class="letter">${String.fromCharCode(65 + i)}</span><span>${o.text}</span></button>`).join("")}</div><div class="feedback" id="feedback" aria-live="polite">Take your time. Great things grow in these mountains.</div><div class="actions"><button class="secondary" id="help" ${p.help ? "" : "disabled"}>✦ Little Help · 50/50</button><button class="secondary" id="leave">Leave show</button></div><p class="small-note">Choose A–D or 1–4 · Controller face buttons choose answers</p>`;
    show
      .querySelectorAll("[data-answer]")
      .forEach((b) => (b.onclick = () => answer(Number(b.dataset.answer))));
    show.querySelector("#help").onclick = () => {
      if (answered || !p.help) return;
      p.help = false;
      shuffle(
        [...show.querySelectorAll("[data-answer]")].filter(
          (b) => !options[Number(b.dataset.answer)].correct,
        ),
      )
        .slice(0, 2)
        .forEach((b) => {
          b.disabled = true;
          b.setAttribute("aria-label", b.textContent + " — eliminated");
        });
      show.querySelector("#help").disabled = true;
      say(pick("help"));
    };
    show.querySelector("#leave").onclick = leave;
  }
  function answer(i) {
    const b = show.querySelector(`[data-answer="${i}"]`);
    if (screen !== "question" || answered || !b || b.disabled) return;
    answered = true;
    const q = deck[index],
      p = players[index % count],
      correct = options[i].correct,
      points = index >= deck.length - count ? 500 : 100;
    show.querySelectorAll("[data-answer]").forEach((btn, j) => {
      btn.disabled = true;
      if (options[j].correct) btn.classList.add("correct");
      else if (j === i) btn.classList.add("wrong");
    });
    if (correct) {
      p.score += points;
      p.correct++;
      chime("win");
      confetti();
      say(pick("correct"), [q.id + "-fact"]);
    } else {
      chime("wrong");
      say(pick("wrong"), [q.id + "-fact"]);
    }
    show.querySelector("#feedback").innerHTML =
      `<strong>${correct ? "You got it! +" + points + " points" : "A little something to take home"}</strong>${q[2]} <a href="${q[3]}" target="_blank" rel="noopener noreferrer">Explore the fact ↗</a>`;
    show.querySelector(".scoreboard").innerHTML = players
      .map(
        (s, j) =>
          `<span class="score ${j === index % count ? "active" : ""}">${s.name} · ${s.score}</span>`,
      )
      .join("");
    show.querySelector(".actions").innerHTML =
      `<button class="primary" id="next">${index === deck.length - 1 ? "The grand finale" : "Next spotlight"} <span>→</span></button>`;
    show.querySelector("#next").onclick = () => {
      index++;
      index >= deck.length ? results() : question();
    };
    show.querySelector("#next").focus({ preventScroll: true });
  }
  function leave() {
    screen = "leave";
    const previous = window.DOLLY_SHOW.lines["question"].find(
      (line) => line.id === speech.dataset.line,
    ) || { id: speech.dataset.line, text: speech.textContent };
    say(pick("intermission"));
    const dialog = document.createElement("dialog");
    dialog.innerHTML =
      '<h2>Leave this show?</h2><p>Your scores will be cleared when you return to the lobby.</p><div class="actions"><button class="primary" id="stay">Keep playing</button><button class="secondary" id="quit">Back to lobby</button></div>';
    document.body.append(dialog);
    const resume = () => {
      dialog.close();
      dialog.remove();
      screen = "question";
      say(previous, [deck[index].id + "-question"]);
    };
    dialog.querySelector("#stay").onclick = resume;
    dialog.querySelector("#quit").onclick = () => {
      dialog.close();
      dialog.remove();
      home();
    };
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      resume();
    });
    dialog.showModal();
  }
  function results() {
    screen = "results";
    const sorted = [...players].sort((a, b) => b.score - a.score),
      winners = sorted.filter((p) => p.score === sorted[0].score),
      turns = deck.length / count,
      max = (turns - 1) * 100 + 500;
    let best = 0;
    try {
      best = Number(localStorage.getItem("dolly-quiz-best")) || 0;
      best = Math.max(best, Math.round((sorted[0].score / max) * 100));
      localStorage.setItem("dolly-quiz-best", String(best));
    } catch {}
    say(pick("finale"));
    chime("win");
    confetti();
    show.innerHTML = `<div class="eyebrow">The grand rhinestone finale</div><div class="trophy" aria-hidden="true">✦ ♡ ✦</div><h2>${count === 1 ? (sorted[0].correct === turns ? "A perfect Tennessee superstar!" : "You’re a mountain gem!") : winners.length > 1 ? "A glittering tie!" : winners[0].name + " takes the spotlight!"}</h2><ul class="results">${sorted.map((p) => `<li><span>${p.name}<br><small>${p.correct} / ${turns} correct</small></span><b>${p.score} pts</b></li>`).join("")}</ul><p class="intro">${count === 1 ? "Every fact is a souvenir from Tennessee." : "Everybody gets a standing ovation in this show."} Your best star score: ${best}%.</p><div class="actions"><button class="primary" id="again">One more encore <span>→</span></button><button class="secondary" id="lobby">Change the show</button></div>`;
    show.querySelector("#again").onclick = begin;
    show.querySelector("#lobby").onclick = setup;
  }
  // The shared shim reuses the same event across several bubbling targets.
  const handledKeys = new WeakSet();
  document.addEventListener("keydown", (e) => {
    if (handledKeys.has(e)) return;
    handledKeys.add(e);
    if (screen === "leave") {
      if (e.key === "Enter" && !e.isTrusted)
        document.querySelector("dialog #stay")?.click();
      return;
    }
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    if (screen === "question" && !answered) {
      let n = "1234".indexOf(key);
      if (n < 0) n = "abcd".indexOf(key);
      if (n >= 0) {
        e.preventDefault();
        answer(n);
        return;
      }
    }
    if (key === "enter" || key === " ") {
      if (e.target instanceof HTMLButtonElement && e.isTrusted) return;
      e.preventDefault();
      const focused = document.activeElement;
      const next =
        show.contains(focused) &&
        focused instanceof HTMLButtonElement &&
        !focused.disabled
          ? focused
          : show.querySelector(".primary");
      if (next) next.click();
    }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      e.preventDefault();
      const buttons = [...show.querySelectorAll("button:not(:disabled)")];
      const step = key === "arrowup" || key === "arrowleft" ? -1 : 1;
      const at = buttons.indexOf(document.activeElement);
      buttons[(at + step + buttons.length) % buttons.length]?.focus();
    }
  });
  home();
})();

(() => {
  "use strict";
  const player = document.querySelector("#narration");
  const repeat = document.querySelector("#repeat-voice");
  const status = document.querySelector("#voice-status");
  const host = document.querySelector(".host");
  let enabled = false,
    current = [],
    generation = 0;
  function label(text) {
    status.textContent = text;
  }
  function stop() {
    generation++;
    player.onended = player.onerror = null;
    player.pause();
    player.removeAttribute("src");
    player.load();
    host.classList.remove("speaking");
    repeat.textContent = "↻ Listen again";
  }
  function play(ids) {
    current = [...ids];
    stop();
    if (!enabled) {
      label("Turn sound on to hear the mountain host");
      return;
    }
    const token = generation;
    const queue = ids
      .map((id) => window.DOLLY_VOICE_MANIFEST?.[id])
      .filter(Boolean);
    if (!queue.length) {
      label("Narration unavailable · the captions are ready");
      return;
    }
    let at = 0;
    const next = () => {
      if (token !== generation || !enabled) return;
      if (at === queue.length) {
        host.classList.remove("speaking");
        repeat.textContent = "↻ Listen again";
        label("East Tennessee tribute voice");
        return;
      }
      const clip = queue[at++];
      player.src = clip.file;
      player.onended = next;
      player.onerror = () => {
        if (token !== generation) return;
        stop();
        label("Voice clip unavailable · you can keep playing");
      };
      const promise = player.play();
      if (promise)
        promise
          .then(() => {
            if (token !== generation) return;
            host.classList.add("speaking");
            repeat.textContent = "↻ Start again";
            label("The mountain host is speaking…");
          })
          .catch(() => {
            if (token !== generation) return;
            host.classList.remove("speaking");
            label("Tap Listen again to hear this line");
          });
    };
    next();
  }
  window.DollyVoice = {
    play,
    stop,
    setEnabled(value) {
      enabled = value;
      if (value) play(current);
      else {
        stop();
        label("Voice and music muted");
      }
    },
    replay() {
      play(current);
    },
  };
  repeat.onclick = () => {
    if (!enabled) document.querySelector("#sound").click();
    else play(current);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
      label("Narration paused · tap Listen again");
    }
  });
})();

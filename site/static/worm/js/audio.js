/*! Worm — audio (mp3 + synth fallback) */
(function (W) {
  "use strict";

  const SFX = {
    eat: "/arcade/sfx/worm-eat.mp3",
    hurt: "/arcade/sfx/worm-hurt.mp3",
    bird: "/arcade/sfx/bird-screech.mp3",
    start: "/arcade/sfx/ui-start.mp3",
    music: "/arcade/sfx/worm-music.mp3",
    level: "/arcade/sfx/ui-start.mp3",
  };

  let AC = null;
  const buffers = Object.create(null);
  let musicEl = null;
  let musicStarted = false;
  let muted = false;

  function ctx() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    }
    if (AC && AC.state === "suspended") {
      try {
        AC.resume();
      } catch (e) {}
    }
    return AC;
  }

  function beep(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ac = ctx();
    if (!ac) return;
    dur = dur == null ? 0.12 : dur;
    type = type || "square";
    vol = vol == null ? 0.18 : vol;
    try {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), ac.currentTime + dur);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      o.connect(g);
      g.connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + dur);
    } catch (e) {}
  }

  function loadBuffer(key, url) {
    if (buffers[key] !== undefined) return;
    buffers[key] = null;
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("sfx " + key);
        return r.arrayBuffer();
      })
      .then(function (ab) {
        const ac = ctx();
        if (!ac) return;
        return ac.decodeAudioData(ab.slice(0));
      })
      .then(function (buf) {
        if (buf) buffers[key] = buf;
      })
      .catch(function () {
        buffers[key] = false;
      });
  }

  function playBuf(key, vol, rate) {
    if (muted) return false;
    const buf = buffers[key];
    if (!buf) return false;
    const ac = ctx();
    if (!ac) return false;
    try {
      const src = ac.createBufferSource();
      const g = ac.createGain();
      src.buffer = buf;
      if (rate) src.playbackRate.value = rate;
      g.gain.value = vol == null ? 0.5 : vol;
      src.connect(g);
      g.connect(ac.destination);
      src.start();
      return true;
    } catch (e) {
      return false;
    }
  }

  function playHtml(url, vol) {
    if (muted) return;
    try {
      const a = new Audio(url);
      a.volume = vol == null ? 0.5 : vol;
      const p = a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  const AudioSys = {
    init: function () {
      ctx();
      Object.keys(SFX).forEach(function (k) {
        if (k !== "music") loadBuffer(k, SFX[k]);
      });
    },

    unlock: function () {
      ctx();
    },

    eat: function (i) {
      const rate = 0.9 + (i % 8) * 0.04;
      if (!playBuf("eat", 0.55, rate)) {
        beep(420 + i * 40, 0.1, "square", 0.16, 760 + i * 40);
      } else {
        beep(520 + i * 30, 0.06, "sine", 0.06, 900);
      }
    },

    transition: function () {
      beep(300, 0.18, "sine", 0.14, 520);
    },

    hurt: function () {
      if (!playBuf("hurt", 0.65)) {
        beep(220, 0.4, "sawtooth", 0.25, 70);
        setTimeout(function () {
          beep(160, 0.4, "sawtooth", 0.22, 50);
        }, 80);
      } else {
        beep(180, 0.25, "sawtooth", 0.08, 60);
      }
    },

    bird: function () {
      if (!playBuf("bird", 0.5)) {
        beep(900, 0.18, "triangle", 0.1, 1500);
      }
    },

    gameOver: function () {
      [440, 330, 262, 196].forEach(function (f, i) {
        setTimeout(function () {
          beep(f, 0.3, "triangle", 0.2);
        }, i * 160);
      });
      playBuf("hurt", 0.4, 0.7);
    },

    start: function () {
      if (!playBuf("start", 0.55)) {
        [392, 523, 659, 784].forEach(function (f, i) {
          setTimeout(function () {
            beep(f, 0.18, "square", 0.16);
          }, i * 90);
        });
      }
    },

    milestone: function () {
      if (!playBuf("level", 0.5, 1.15)) {
        [523, 659, 784, 1046].forEach(function (f, i) {
          setTimeout(function () {
            beep(f, 0.16, "square", 0.14);
          }, i * 70);
        });
      } else {
        beep(880, 0.12, "sine", 0.08, 1320);
      }
    },

    secret: function () {
      [392, 494, 587, 784, 988].forEach(function (f, i) {
        setTimeout(function () {
          beep(f, 0.14, "triangle", 0.12);
        }, i * 80);
      });
    },

    combo: function (n) {
      beep(600 + Math.min(n, 12) * 40, 0.08, "square", 0.1, 900 + n * 20);
    },

    startMusic: function () {
      if (muted || musicStarted) return;
      musicStarted = true;
      try {
        musicEl = new Audio(SFX.music);
        musicEl.loop = true;
        musicEl.volume = 0.22;
        const p = musicEl.play();
        if (p && p.catch) p.catch(function () {
          musicStarted = false;
        });
      } catch (e) {
        musicStarted = false;
      }
    },

    stopMusic: function () {
      if (musicEl) {
        try {
          musicEl.pause();
        } catch (e) {}
      }
    },

    setMusicVolume: function (v) {
      if (musicEl) musicEl.volume = v;
    },

    pauseMusic: function (on) {
      if (!musicEl) return;
      try {
        if (on) musicEl.pause();
        else {
          const p = musicEl.play();
          if (p && p.catch) p.catch(function () {});
        }
      } catch (e) {}
    },
  };

  W.Audio = AudioSys;
})(window.Worm = window.Worm || {});

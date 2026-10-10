import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const source = await readFile(new URL("./voice.js", import.meta.url), "utf8");
function host() {
  const pending = [],
    classes = new Set(),
    listeners = {};
  const player = {
    src: "",
    paused: true,
    onended: null,
    onerror: null,
    pause() {
      this.paused = true;
    },
    removeAttribute() {
      this.src = "";
    },
    load() {},
    play() {
      this.paused = false;
      return new Promise((resolve, reject) =>
        pending.push({ resolve, reject }),
      );
    },
  };
  const repeat = {},
    status = {},
    picture = {
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
      },
    };
  const nodes = {
    "#narration": player,
    "#repeat-voice": repeat,
    "#voice-status": status,
    ".host": picture,
  };
  const document = {
    hidden: false,
    querySelector: (s) => nodes[s],
    addEventListener: (e, fn) => (listeners[e] = fn),
  };
  const context = {
    window: {
      DOLLY_VOICE_MANIFEST: {
        welcome: { file: "welcome.mp3" },
        question: { file: "question.mp3" },
        fact: { file: "fact.mp3" },
      },
    },
    document,
  };
  vm.runInNewContext(source, context);
  return {
    voice: context.window.DollyVoice,
    player,
    pending,
    classes,
    status,
    document,
    listeners,
  };
}
const settle = () => new Promise((r) => setImmediate(r));
test("Sound stays silent until the player opts in", () => {
  const h = host();
  h.voice.play(["welcome"]);
  assert.equal(h.pending.length, 0);
  h.voice.setEnabled(true);
  assert.equal(h.player.src, "welcome.mp3");
});
test("A question waits for its introduction to finish", () => {
  const h = host();
  h.voice.play(["welcome", "question"]);
  h.voice.setEnabled(true);
  assert.equal(h.player.src, "welcome.mp3");
  h.player.onended();
  assert.equal(h.player.src, "question.mp3");
});
test("Mute prevents a captured old completion from starting another clip", () => {
  const h = host();
  h.voice.play(["welcome", "question"]);
  h.voice.setEnabled(true);
  const oldEnd = h.player.onended;
  h.voice.setEnabled(false);
  oldEnd();
  assert.equal(h.player.src, "");
  assert.equal(h.player.paused, true);
  assert.equal(h.pending.length, 1);
});
test("A late rejected play cannot overwrite the new narration status", async () => {
  const h = host();
  h.voice.play(["welcome"]);
  h.voice.setEnabled(true);
  h.voice.play(["fact"]);
  h.pending[1].resolve();
  await settle();
  const status = h.status.textContent;
  h.pending[0].reject(new Error("Old clip cancelled"));
  await settle();
  assert.equal(h.player.src, "fact.mp3");
  assert.equal(h.status.textContent, status);
  assert.equal(h.classes.has("speaking"), true);
});
test("A late fulfilled play cannot make a muted host appear to speak", async () => {
  const h = host();
  h.voice.play(["welcome"]);
  h.voice.setEnabled(true);
  h.voice.setEnabled(false);
  h.pending[0].resolve();
  await settle();
  assert.equal(h.classes.has("speaking"), false);
  assert.equal(h.status.textContent, "Voice and music muted");
});
test("Leaving the tab stops the queue, but replay keeps the selected line", () => {
  const h = host();
  h.voice.play(["question"]);
  h.voice.setEnabled(true);
  h.document.hidden = true;
  h.listeners.visibilitychange();
  assert.equal(h.player.paused, true);
  assert.equal(h.player.src, "");
  h.voice.replay();
  assert.equal(h.player.src, "question.mp3");
});
test("A missing clip does not prevent a valid clip or the captions", () => {
  const h = host();
  h.voice.play(["missing", "fact"]);
  h.voice.setEnabled(true);
  assert.equal(h.player.src, "fact.mp3");
  h.player.onerror();
  assert.equal(h.player.paused, true);
  assert.match(h.status.textContent, /keep playing/);
});

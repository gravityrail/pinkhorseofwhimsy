#!/usr/bin/env node
/**
 * Pre-generate every Bean Quiz voice clip with ElevenLabs.
 *
 * Reads site/static/bean-quiz/data.js (+ topics/*.js) as the source of truth
 * and writes mp3s to site/static/bean-quiz/assets/vo/:
 *   <line.id>.mp3       — host/sidekick lines (line.speaker picks the voice)
 *   name_<word>.mp3     — silly-name words, The Bean's voice
 *   q_<qid>.mp3         — question read-alouds, The Bean's voice
 *   fact_<qid>.mp3      — post-reveal fun facts, The Bean's voice
 *
 * Idempotent (skips clips that exist). FORCE=1 regenerates. Needs
 * ELEVENLABS_API_KEY. Optional args narrow the run: lines|names|questions
 */
import { writeFile, mkdir, access, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(__dirname, '..', '..', 'site', 'static', 'bean-quiz');
const VO_DIR = join(GAME_DIR, 'assets', 'vo');
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('Set ELEVENLABS_API_KEY'); process.exit(1); }

const MODEL = 'eleven_multilingual_v2';
// A touch of instability + style makes Laura bouncier and Callum slyer.
const SETTINGS = { stability: 0.38, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true };

const DATA = require(join(GAME_DIR, 'data.js'));
const VOICE = { bean: DATA.voices.bean.id, tiger: DATA.voices.tiger.id };

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function loadTopics() {
  const topics = DATA.topics.map(t => ({ ...t, questions: [...t.questions] }));
  const dir = join(GAME_DIR, 'topics');
  let files = [];
  try { files = (await readdir(dir)).filter(f => f.endsWith('.js')); } catch { /* none yet */ }
  for (const f of files.sort()) {
    const mod = require(join(dir, f));
    for (const entry of Array.isArray(mod) ? mod : [mod]) {
      if (entry.extend) {
        const t = topics.find(t => t.id === entry.extend);
        if (t) t.questions.push(...entry.questions);
        else console.warn(`  ! ${f}: no topic '${entry.extend}' to extend`);
      } else if (entry.id) topics.push(entry);
    }
  }
  return topics;
}

function buildJobs(only) {
  const jobs = []; // {file, voice, text}
  const want = k => !only || only === k;

  if (want('lines')) {
    for (const group of Object.values(DATA.lines))
      for (const line of group)
        jobs.push({ file: `${line.id}.mp3`, voice: VOICE[line.speaker], text: line.text });
  }
  if (want('names')) {
    const words = new Set([...DATA.names.first, ...DATA.names.last].map(w => w.toLowerCase()));
    for (const w of words)
      jobs.push({ file: `name_${w}.mp3`, voice: VOICE.bean, text: w.charAt(0).toUpperCase() + w.slice(1) + '!' });
  }
  return jobs;
}

async function questionJobs() {
  const jobs = [];
  for (const t of await loadTopics())
    for (const q of t.questions) {
      jobs.push({ file: `q_${q.id}.mp3`, voice: VOICE.bean, text: q.q });
      if (q.fact) jobs.push({ file: `fact_${q.id}.mp3`, voice: VOICE.bean, text: q.fact });
    }
  return jobs;
}

async function tts(job) {
  const out = join(VO_DIR, job.file);
  if (!process.env.FORCE && await exists(out)) return 'skip';
  // Host lines/names get full quality; the ~576 question/fact clips use 64kbps
  // to keep the committed repo size sane (still plenty clear for speech).
  const format = /^(q_|fact_)/.test(job.file) ? 'mp3_44100_64' : 'mp3_44100_128';
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${job.voice}?output_format=${format}`, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: job.text, model_id: MODEL, voice_settings: SETTINGS }),
    });
    if (res.ok) {
      await writeFile(out, Buffer.from(await res.arrayBuffer()));
      return 'ok';
    }
    const body = (await res.text()).slice(0, 200);
    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, 2000 * attempt));
      continue;
    }
    throw new Error(`${job.file}: ${res.status} ${body}`);
  }
  throw new Error(`${job.file}: rate-limited after retries`);
}

async function run(jobs, label) {
  let ok = 0, skip = 0, fail = 0, done = 0;
  const CONCURRENCY = Number(process.env.CONCURRENCY) || 6;
  const queue = [...jobs];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const job = queue.shift();
      try {
        const r = await tts(job);
        r === 'skip' ? skip++ : ok++;
      } catch (e) { fail++; console.error(`  FAIL ${e.message}`); }
      if (++done % 25 === 0) console.log(`  ${label}: ${done}/${jobs.length}`);
    }
  }));
  console.log(`${label}: ${ok} generated, ${skip} skipped, ${fail} failed (of ${jobs.length})`);
  return fail;
}

async function main() {
  await mkdir(VO_DIR, { recursive: true });
  const only = process.argv[2]; // lines | names | questions | (all)
  let fails = 0;
  const base = buildJobs(only);
  if (base.length) fails += await run(base, 'lines+names');
  if (!only || only === 'questions') fails += await run(await questionJobs(), 'questions');
  const chars = [...base, ...(!only || only === 'questions' ? await questionJobs() : [])].reduce((n, j) => n + j.text.length, 0);
  console.log(`\n~${chars.toLocaleString()} chars of speech in scope. ${fails ? fails + ' FAILURES' : 'All good.'}`);
  process.exit(fails ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });

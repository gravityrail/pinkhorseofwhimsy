#!/usr/bin/env node
/**
 * Pre-generate every Bean Quiz voice clip with ElevenLabs.
 *
 * Prefers eleven_v3 (expressive audio tags like [giggles], [laughs], [whispers]).
 * Falls back to eleven_multilingual_v2 if v3 rejects a request.
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
import { config } from 'dotenv';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
config({ path: join(ROOT, '.env') });

const GAME_DIR = join(ROOT, 'site', 'static', 'bean-quiz');
const VO_DIR = join(GAME_DIR, 'assets', 'vo');
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('Set ELEVENLABS_API_KEY'); process.exit(1); }

// v3 understands performance tags in brackets; multilingual_v2 is the fallback.
const MODEL_PRIMARY = process.env.ELEVEN_MODEL || 'eleven_v3';
const MODEL_FALLBACK = 'eleven_multilingual_v2';
// Higher style + lower stability = more theatrical Bean energy.
const SETTINGS = { stability: 0.28, similarity_boost: 0.75, style: 0.55, use_speaker_boost: true };

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

/** Strip stage directions for plain fallback TTS if needed later. */
function plain(text) {
  return String(text).replace(/\[[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildJobs(only) {
  const jobs = [];
  const want = k => !only || only === k;

  if (want('lines')) {
    for (const group of Object.values(DATA.lines))
      for (const line of group)
        jobs.push({ file: `${line.id}.mp3`, voice: VOICE[line.speaker], text: line.text, expressive: true });
  }
  if (want('names')) {
    const words = new Set([...DATA.names.first, ...DATA.names.last].map(w => w.toLowerCase()));
    for (const w of words)
      jobs.push({
        file: `name_${w}.mp3`,
        voice: VOICE.bean,
        text: `[excited] ${w.charAt(0).toUpperCase() + w.slice(1)}!`,
        expressive: true,
      });
  }
  return jobs;
}

async function questionJobs() {
  const jobs = [];
  for (const t of await loadTopics())
    for (const q of t.questions) {
      // Light expression on questions keeps them lively without chewing the words.
      jobs.push({ file: `q_${q.id}.mp3`, voice: VOICE.bean, text: `[curious] ${q.q}`, expressive: true });
      if (q.fact) jobs.push({ file: `fact_${q.id}.mp3`, voice: VOICE.bean, text: `[happily] ${q.fact}`, expressive: true });
    }
  return jobs;
}

async function ttsOnce(job, model) {
  const format = /^(q_|fact_)/.test(job.file) ? 'mp3_44100_64' : 'mp3_44100_128';
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${job.voice}?output_format=${format}`,
    {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: job.text,
        model_id: model,
        voice_settings: SETTINGS,
      }),
    },
  );
  return res;
}

async function tts(job) {
  const out = join(VO_DIR, job.file);
  if (!process.env.FORCE && await exists(out)) return 'skip';

  for (let attempt = 1; attempt <= 4; attempt++) {
    let res = await ttsOnce(job, MODEL_PRIMARY);
    // If v3 chokes on tags or model name, retry plain text on fallback model.
    if (!res.ok && (res.status === 400 || res.status === 422)) {
      const err = await res.text();
      if (/model|tag|invalid/i.test(err) || MODEL_PRIMARY !== MODEL_FALLBACK) {
        res = await ttsOnce({ ...job, text: plain(job.text) }, MODEL_FALLBACK);
      } else {
        // already consumed body
      }
    }
    if (res.ok) {
      await writeFile(out, Buffer.from(await res.arrayBuffer()));
      return 'ok';
    }
    const body = (await res.text().catch(() => '')).slice(0, 220);
    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, 2000 * attempt));
      continue;
    }
    // last-ditch fallback
    if (attempt === 2) {
      const r2 = await ttsOnce({ ...job, text: plain(job.text) }, MODEL_FALLBACK);
      if (r2.ok) {
        await writeFile(out, Buffer.from(await r2.arrayBuffer()));
        return 'ok-fallback';
      }
    }
    throw new Error(`${job.file}: ${res.status} ${body}`);
  }
  throw new Error(`${job.file}: rate-limited after retries`);
}

async function run(jobs, label) {
  let ok = 0, skip = 0, fail = 0, done = 0;
  const CONCURRENCY = Number(process.env.CONCURRENCY) || 4;
  const queue = [...jobs];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const job = queue.shift();
      try {
        const r = await tts(job);
        if (r === 'skip') skip++;
        else ok++;
      } catch (e) { fail++; console.error(`  FAIL ${e.message}`); }
      if (++done % 25 === 0) console.log(`  ${label}: ${done}/${jobs.length} (ok ${ok}, skip ${skip}, fail ${fail})`);
    }
  }));
  console.log(`  ${label} done — ok ${ok}, skip ${skip}, fail ${fail}`);
  return fail;
}

async function main() {
  await mkdir(VO_DIR, { recursive: true });
  const only = process.argv[2]; // lines | names | questions | undefined=all
  console.log(`Bean Quiz VO → model ${MODEL_PRIMARY} (fallback ${MODEL_FALLBACK}) FORCE=${process.env.FORCE || ''}`);

  let fails = 0;
  if (!only || only === 'lines' || only === 'names') {
    const jobs = buildJobs(only === 'lines' || only === 'names' ? only : null);
    // if only is undefined, buildJobs already includes both
    const filtered = only ? buildJobs(only) : buildJobs(null);
    fails += await run(filtered, only || 'lines+names');
  }
  if (!only || only === 'questions') {
    const qj = await questionJobs();
    // Only generate missing question clips unless FORCE — full regen is huge.
    fails += await run(qj, 'questions');
  }
  if (fails) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });

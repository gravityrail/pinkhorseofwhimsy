#!/usr/bin/env node

/**
 * Downloads and builds the latest GDevelop core (libGD.js) and GDJS Runtime.
 * Caches everything in games/gdexport/.cache/ so subsequent runs are fast.
 *
 * What it does:
 * 1. Downloads libGD.js + libGD.wasm from GDevelop's S3 bucket
 * 2. Downloads GDevelop source (GDJS/ + Extensions/) from GitHub
 * 3. Builds the GDJS Runtime (TypeScript → JavaScript) using esbuild
 */

import { existsSync } from 'fs';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '.cache');
const LIBGD_DIR = join(CACHE_DIR, 'libgd');
const GDSRC_DIR = join(CACHE_DIR, 'gdsrc');
const RUNTIME_DIR = join(CACHE_DIR, 'Runtime');
const VERSION_FILE = join(CACHE_DIR, 'version.json');

const S3_BASE = 'https://s3.amazonaws.com/gdevelop-gdevelop.js/master/latest';
const GITHUB_TARBALL = 'https://github.com/4ian/GDevelop/archive/refs/heads/master.tar.gz';

function download(url) {
  return new Promise((resolve, reject) => {
    const doRequest = (requestUrl) => {
      https.get(requestUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    doRequest(url);
  });
}

async function getRemoteLastModified(url) {
  return new Promise((resolve) => {
    const doRequest = (requestUrl) => {
      https.request(requestUrl, { method: 'HEAD' }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location);
          return;
        }
        resolve(res.headers['last-modified'] || null);
      }).on('error', () => resolve(null)).end();
    };
    doRequest(url);
  });
}

async function isUpToDate() {
  if (!existsSync(VERSION_FILE)) return false;
  if (!existsSync(join(LIBGD_DIR, 'libGD.js'))) return false;
  if (!existsSync(RUNTIME_DIR)) return false;

  try {
    const cached = JSON.parse(await readFile(VERSION_FILE, 'utf8'));
    const remoteDate = await getRemoteLastModified(`${S3_BASE}/libGD.js`);
    return cached.libGDLastModified === remoteDate;
  } catch {
    return false;
  }
}

async function downloadLibGD() {
  await mkdir(LIBGD_DIR, { recursive: true });

  console.log('  Downloading libGD.js...');
  const js = await download(`${S3_BASE}/libGD.js`);
  await writeFile(join(LIBGD_DIR, 'libGD.js'), js);

  console.log('  Downloading libGD.wasm...');
  const wasm = await download(`${S3_BASE}/libGD.wasm`);
  await writeFile(join(LIBGD_DIR, 'libGD.wasm'), wasm);

  // Mark directory as CommonJS so Node doesn't try ESM interop on libGD.js
  await writeFile(join(LIBGD_DIR, 'package.json'), '{"type":"commonjs"}');

  const lastModified = await getRemoteLastModified(`${S3_BASE}/libGD.js`);
  return lastModified;
}

async function downloadGDSource() {
  console.log('  Downloading GDevelop source (GDJS + Extensions)...');
  await mkdir(GDSRC_DIR, { recursive: true });

  // Download tarball and extract GDJS/ and Extensions/ directories
  execSync(
    `curl -sL "${GITHUB_TARBALL}" | tar xzf - --strip-components=1 'GDevelop-master/GDJS/' 'GDevelop-master/Extensions/'`,
    { cwd: GDSRC_DIR, timeout: 120000 }
  );
}

async function buildRuntime() {
  console.log('  Installing GDJS build dependencies...');
  execSync('npm install --ignore-scripts', {
    cwd: join(GDSRC_DIR, 'GDJS'),
    timeout: 120000,
    stdio: 'pipe',
  });

  console.log('  Building GDJS Runtime (TypeScript -> JavaScript)...');
  await mkdir(RUNTIME_DIR, { recursive: true });

  execSync(`node scripts/build.js --out "${RUNTIME_DIR}"`, {
    cwd: join(GDSRC_DIR, 'GDJS'),
    timeout: 120000,
    stdio: 'pipe',
  });
}

export async function ensureSetup() {
  if (await isUpToDate()) {
    console.log('  GDCore + Runtime cached and up-to-date.');
    return { libgdDir: LIBGD_DIR, runtimeDir: RUNTIME_DIR };
  }

  console.log('Setting up GDevelop export toolchain...');
  await mkdir(CACHE_DIR, { recursive: true });

  // Clean old cache
  if (existsSync(GDSRC_DIR)) await rm(GDSRC_DIR, { recursive: true });
  if (existsSync(RUNTIME_DIR)) await rm(RUNTIME_DIR, { recursive: true });

  const libGDLastModified = await downloadLibGD();
  await downloadGDSource();
  await buildRuntime();

  // Clean up source after building (keep only the built runtime)
  await rm(GDSRC_DIR, { recursive: true });

  // Mark Runtime directory as CommonJS for proper require() in Node 25+
  await writeFile(join(RUNTIME_DIR, 'package.json'), '{"type":"commonjs"}');

  await writeFile(VERSION_FILE, JSON.stringify({
    libGDLastModified,
    builtAt: new Date().toISOString(),
  }));

  console.log('  Setup complete!');
  return { libgdDir: LIBGD_DIR, runtimeDir: RUNTIME_DIR };
}

// Run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureSetup().catch(console.error);
}

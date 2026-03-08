#!/usr/bin/env node

/**
 * Generate a 3D GLB model from an image using TRELLIS.2.
 *
 * Uses either:
 *   - HuggingFace Spaces API (free, no GPU needed) — default
 *   - Self-hosted TRELLIS.2 server (e.g., on RunPod)
 *
 * Usage:
 *   node generate-model.mjs --image statue.png --output statue.glb
 *   node generate-model.mjs --image barrel.png --output barrel.glb --resolution 512
 *   node generate-model.mjs --image statue.png --output statue.glb --backend runpod --trellis-url http://...
 *
 * Environment:
 *   TRELLIS_URL    - URL of self-hosted server (only for --backend runpod)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename } from 'path';

// ─── Parse args ──────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    image: null,
    output: 'model.glb',
    resolution: '1024',
    faces: 300000,
    textureSize: 2048,
    seed: 0,
    backend: 'huggingface',  // 'huggingface' or 'runpod'
    trellisUrl: process.env.TRELLIS_URL || null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--image': opts.image = args[++i]; break;
      case '--output': opts.output = args[++i]; break;
      case '--resolution': opts.resolution = args[++i]; break;
      case '--faces': opts.faces = parseInt(args[++i]); break;
      case '--texture-size': opts.textureSize = parseInt(args[++i]); break;
      case '--seed': opts.seed = parseInt(args[++i]); break;
      case '--backend': opts.backend = args[++i]; break;
      case '--trellis-url': opts.trellisUrl = args[++i]; break;
      case '--help':
        console.log(`
Generate 3D GLB models from images using TRELLIS.2

Usage:
  node generate-model.mjs --image INPUT.png --output OUTPUT.glb [options]

Options:
  --image PATH         Input image (PNG with transparent background works best)
  --output PATH        Output GLB file path (default: model.glb)
  --resolution N       Voxel resolution: 512, 1024, 1536 (default: 1024)
  --faces N            Decimation target face count (default: 300000)
  --texture-size N     Texture resolution (default: 2048)
  --seed N             Random seed (default: 0)
  --backend TYPE       'huggingface' (free, default) or 'runpod' (self-hosted)
  --trellis-url URL    Self-hosted server URL (for --backend runpod)

Backends:
  huggingface   Uses the free Microsoft TRELLIS.2 demo on HuggingFace Spaces.
                May have queue times during peak hours.

  runpod        Uses a self-hosted TRELLIS.2 server. See SETUP.md for
                instructions on setting up a RunPod GPU pod.
`);
        process.exit(0);
    }
  }
  return opts;
}

// ─── HuggingFace Spaces Backend ──────────────────────────────────────────

const HF_BASE = 'https://microsoft-trellis-2.hf.space';

async function hfCall(apiName, data) {
  // Gradio 5+ call API: POST to submit, GET to stream results
  const submitRes = await fetch(`${HF_BASE}/gradio_api/call/${apiName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!submitRes.ok) {
    const text = await submitRes.text();
    throw new Error(`HF call failed (${submitRes.status}): ${text}`);
  }
  const { event_id } = await submitRes.json();

  // Stream results via SSE — format is "event: <type>\ndata: <json>\n\n"
  const streamRes = await fetch(`${HF_BASE}/gradio_api/call/${apiName}/${event_id}`);
  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastEvent = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) throw new Error('Stream ended without result');
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        lastEvent = line.slice(7).trim();
        continue;
      }
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6);

      if (lastEvent === 'error') {
        throw new Error(`TRELLIS.2 error: ${payload}`);
      }

      if (lastEvent === 'complete') {
        try {
          return JSON.parse(payload);
        } catch {
          throw new Error(`Failed to parse result: ${payload.slice(0, 200)}`);
        }
      }

      // heartbeat or other events — ignore
      lastEvent = null;
    }
  }
}

async function hfUploadImage(imagePath) {
  const imageData = readFileSync(imagePath);
  const formData = new FormData();
  formData.append('files', new Blob([imageData], { type: 'image/png' }), basename(imagePath));

  const res = await fetch(`${HF_BASE}/gradio_api/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const files = await res.json();
  return files[0]; // returns the file path on the server
}

async function hfDownloadFile(filePath) {
  // filePath is relative to the Gradio app
  const url = `${HF_BASE}/gradio_api/file=${filePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function generateViaHuggingFace(imagePath, opts) {
  // 1. Start session
  console.log('  Starting session...');
  await hfCall('start_session', []);

  // 2. Upload image
  console.log('  Uploading image...');
  const uploadedPath = await hfUploadImage(imagePath);
  const imageHandle = { path: uploadedPath, url: `${HF_BASE}/gradio_api/file=${uploadedPath}`, orig_name: basename(imagePath), mime_type: 'image/png' };

  // 3. Preprocess (remove background etc.)
  console.log('  Preprocessing image...');
  const preprocessed = await hfCall('preprocess_image', [imageHandle]);
  const processedImage = preprocessed[0];

  // 4. Generate 3D
  console.log(`  Generating 3D (resolution=${opts.resolution})...`);
  console.log('  This may take 30-120 seconds...');

  // image_to_3d inputs: image, seed, resolution, then 3 sets of (guidance, rescale, steps, rescaleT)
  const result = await hfCall('image_to_3d', [
    processedImage,
    opts.seed,           // seed
    opts.resolution,     // resolution
    7.5, 0.7, 12, 5.0,  // shape guidance params (defaults)
    7.5, 0.5, 12, 3.0,  // texture guidance params (defaults)
    1.0, 0.0, 12, 3.0,  // additional params (defaults)
  ]);
  console.log('\n  3D generation complete!');

  // result[0] is the state (mesh data), result[1] is HTML preview
  const meshState = result[0];

  // 5. Extract GLB
  console.log(`  Extracting GLB (faces=${opts.faces}, texture=${opts.textureSize})...`);
  const glbResult = await hfCall('extract_glb', [
    meshState,
    opts.faces,
    opts.textureSize,
  ]);
  console.log('\n  GLB extraction complete!');

  // glbResult[0] is Model3D component data, glbResult[1] is download button data
  const glbData = glbResult[0];
  const glbPath = glbData?.path || glbData?.url || glbData;

  // 6. Download the GLB file
  console.log('  Downloading GLB...');
  let glbBuffer;
  if (typeof glbPath === 'string') {
    glbBuffer = await hfDownloadFile(glbPath);
  } else if (glbData?.url) {
    const res = await fetch(glbData.url);
    glbBuffer = Buffer.from(await res.arrayBuffer());
  } else {
    // Try the download button data
    const dlData = glbResult[1];
    const dlPath = dlData?.path || dlData;
    glbBuffer = await hfDownloadFile(typeof dlPath === 'string' ? dlPath : dlPath.path);
  }

  return glbBuffer;
}

// ─── RunPod / Self-hosted Backend ────────────────────────────────────────

async function generateViaRunPod(imagePath, opts) {
  if (!opts.trellisUrl) {
    console.error('Error: Set TRELLIS_URL or use --trellis-url for RunPod backend');
    process.exit(1);
  }

  // Health check
  const healthRes = await fetch(`${opts.trellisUrl}/health`);
  if (!healthRes.ok) throw new Error('Server not responding');
  const health = await healthRes.json();
  console.log(`  Server: ${health.gpu} (${health.vram_gb}GB VRAM)`);

  // Upload and generate
  const imageData = readFileSync(imagePath);
  const formData = new FormData();
  formData.append('image', new Blob([imageData], { type: 'image/png' }), basename(imagePath));
  formData.append('resolution', opts.resolution);
  formData.append('faces', opts.faces.toString());
  formData.append('texture_size', opts.textureSize.toString());

  console.log(`  Generating (resolution=${opts.resolution}, faces=${opts.faces})...`);
  const res = await fetch(`${opts.trellisUrl}/generate`, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  if (!opts.image) {
    console.error('Error: --image is required');
    console.error('  Provide an image of the object you want to convert to 3D.');
    console.error('  Best results: single object on a plain/transparent background.');
    process.exit(1);
  }

  if (!existsSync(opts.image)) {
    console.error(`Error: Image not found: ${opts.image}`);
    process.exit(1);
  }

  console.log(`TRELLIS.2 Image-to-3D Generator`);
  console.log(`  Backend: ${opts.backend}`);
  console.log(`  Image: ${opts.image}`);
  console.log(`  Output: ${opts.output}`);
  console.log(`  Resolution: ${opts.resolution}`);
  console.log();

  let glbBuffer;
  if (opts.backend === 'huggingface') {
    glbBuffer = await generateViaHuggingFace(opts.image, opts);
  } else if (opts.backend === 'runpod') {
    glbBuffer = await generateViaRunPod(opts.image, opts);
  } else {
    console.error(`Unknown backend: ${opts.backend}`);
    process.exit(1);
  }

  writeFileSync(opts.output, glbBuffer);
  console.log(`\nSaved: ${opts.output} (${(glbBuffer.length / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error(`\nError: ${err.message}`);
  if (err.stack && process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});

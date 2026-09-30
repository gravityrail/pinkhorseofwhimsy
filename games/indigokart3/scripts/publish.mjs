import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const staticRoot = resolve(root, 'site/static');
const gameRoot = fileURLToPath(new URL('../', import.meta.url));
await rm(resolve(staticRoot, 'indigokart3'), { recursive: true, force: true });
await cp(resolve(gameRoot, 'dist'), resolve(staticRoot, 'indigokart3'), { recursive: true });
for (const legacy of ['indigokart', 'indigokart2']) {
  await rm(resolve(staticRoot, legacy), { recursive: true, force: true });
  await mkdir(resolve(staticRoot, legacy), { recursive: true });
  await cp(resolve(gameRoot, 'legacy-redirect.html'), resolve(staticRoot, legacy, 'index.html'));
}
console.log('Published IndigoKart 3 and both legacy redirects into site/static.');

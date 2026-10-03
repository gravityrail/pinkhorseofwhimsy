import { Group, Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const models = new Map();
export async function loadEnvironmentKit(onProgress = () => {}) {
  const names = ['palm', 'coastal-rocks', 'pavilion', 'lighthouse', 'neon-tower', 'festival-arch'];
  const loader = new GLTFLoader();
  let completed = 0;
  await Promise.all(names.map(async name => {
    const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`);
    gltf.scene.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    // Collapse the Blender kit by material once, keeping its authored appearance
    // while avoiding hundreds of draw calls per roadside building.
    gltf.scene.updateMatrixWorld(true);
    const buckets = new Map();
    gltf.scene.traverse(node => {
      if (!node.isMesh) return;
      const key = node.material.uuid;
      if (!buckets.has(key)) buckets.set(key, { material: node.material, geometries: [] });
      buckets.get(key).geometries.push(node.geometry.clone().applyMatrix4(node.matrixWorld));
    });
    const kit = new Group();
    for (const { material, geometries } of buckets.values()) {
      const object = new Mesh(mergeGeometries(geometries, false), material);
      object.castShadow = object.receiveShadow = true;
      kit.add(object); geometries.forEach(g=>g.dispose());
    }
    gltf.scene.traverse(node=>node.geometry?.dispose());
    models.set(name, kit);
    onProgress(++completed / names.length);
  }));
}
export function scenery(name) {
  const source = models.get(name);
  if (!source) throw new Error(`Missing environment model: ${name}`);
  const clone = source.clone(true);
  // Track instances own their GPU resources; cached templates survive track changes.
  clone.traverse(node => {
    if (node.isMesh) {
      node.geometry = node.geometry.clone();
      node.material = Array.isArray(node.material) ? node.material.map(m => m.clone()) : node.material.clone();
    }
  });
  return clone;
}

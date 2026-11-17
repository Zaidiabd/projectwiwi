import * as THREE from 'three';

/**
 * Optional external sprite-atlas loader.
 * Checks for `<basePath>/animations.json` and, if present and valid, swaps in
 * the custom PNG/WebP atlas without altering CatAnimator or CatController.
 */
export async function tryLoadExternalAtlas(basePath) {
  try {
    const res = await fetch(`${basePath}/animations.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const manifest = await res.json();
    if (!manifest || !manifest.atlasFile || !manifest.clips) return null;

    const loader = new THREE.TextureLoader();
    const texture = await loader.loadAsync(`${basePath}/${manifest.atlasFile}`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    return { texture, manifest };
  } catch {
    return null;
  }
}

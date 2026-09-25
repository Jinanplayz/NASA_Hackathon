import { buildSpaceArt } from './space.js';
import { buildCraftArt } from './craft.js';
import { buildItemArt } from './items.js';

// Paints every texture the game uses. Runs once while the loading screen is up.
export function buildAllArt(scene) {
  buildSpaceArt(scene);
  buildCraftArt(scene);
  buildItemArt(scene);
}

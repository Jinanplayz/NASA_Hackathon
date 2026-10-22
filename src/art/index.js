import { buildSpaceArt } from './space.js';
import { buildCraftArt } from './craft.js';
import { buildItemArt } from './items.js';
import { buildTitleArt } from './title.js';
import { buildCh4Art } from './ch4.js';
import { buildCh5Art } from './ch5.js';
import { buildCh6Art } from './ch6.js';
import { buildCh7Art } from './ch7.js';

// Paints every texture the game uses. Runs once while the loading screen is up.
export function buildAllArt(scene) {
  buildSpaceArt(scene);
  buildCraftArt(scene);
  buildItemArt(scene);
  buildTitleArt(scene);
  buildCh4Art(scene);
  buildCh5Art(scene);
  buildCh6Art(scene);
  buildCh7Art(scene);
}

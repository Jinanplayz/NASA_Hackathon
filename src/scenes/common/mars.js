// The Martian landscape shared by the Mars mini-games: a butterscotch sky, hills and rusty
// ground that can scroll sideways (call scroll(x) every frame).
import { W, FULL } from '../../core/constants.js';
import { img } from '../../art/core.js';

export function marsBackdrop(scene, groundY, o = {}) {
  const sky = scene.add.graphics();
  const top = o.top ?? 0xb9845c, bottom = o.bottom ?? 0xe6b88c;
  sky.fillGradientStyle(top, top, bottom, bottom, 1);
  sky.fillRect(FULL.x, FULL.y, FULL.w, groundY - FULL.y + 4);
  const sun = o.sun === false ? null : img(scene, o.sunX ?? 1040, o.sunY ?? 120, 'softDot', 0.9).setTint(0xfff4e0).setAlpha(0.8);
  const far = scene.add.tileSprite(W / 2, groundY - 92, FULL.w, 220, 'marsHillsFar');
  const near = scene.add.tileSprite(W / 2, groundY - 66, FULL.w, 200, 'marsHillsNear');
  const gh = FULL.y + FULL.h - groundY;
  const ground = scene.add.tileSprite(W / 2, groundY + gh / 2, FULL.w, gh, 'marsGround');
  return {
    sky, sun, far, near, ground,
    scroll(x) {
      far.tilePositionX = x * 0.15;
      near.tilePositionX = x * 0.35;
      ground.tilePositionX = x;
    }
  };
}

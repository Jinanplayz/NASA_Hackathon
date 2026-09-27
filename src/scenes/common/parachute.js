// Parachute cords: from points along the rim of each canopy straight down to one point,
// the tip of the capsule, so the parachutes always look attached, even while they sway.
// Canopies are images with origin (0.5, 1): their x/y is the middle of the rim.
export function drawShrouds(g, canopies, apex, cords = 5) {
  canopies.forEach((m) => {
    if (!m.visible || m.alpha < 0.1) return;
    const half = (m.displayWidth / 2) * 0.95;
    const cos = Math.cos(m.rotation), sin = Math.sin(m.rotation);
    for (let k = 0; k < cords; k++) {
      const lx = -half + (2 * half * k) / (cords - 1);
      g.lineBetween(m.x + lx * cos, m.y + lx * sin, apex.x, apex.y);
    }
  });
}

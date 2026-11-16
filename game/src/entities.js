// Entity factories and per-entity behaviour for Lentera Rimba. Factories
// only build plain objects; the world owns the lists and the collisions.

import { CONFIG, VIEW } from './config.js';
import { chance, pick, range } from './random.js';

export const BOUNDS = { left: 24, top: 88, right: VIEW.width - 24, bottom: VIEW.height - 24 };

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function clampToBounds(entity, radius) {
  entity.x = Math.max(BOUNDS.left + radius, Math.min(BOUNDS.right - radius, entity.x));
  entity.y = Math.max(BOUNDS.top + radius, Math.min(BOUNDS.bottom - radius, entity.y));
}

export function makePlayer() {
  return {
    x: VIEW.width / 2,
    y: (VIEW.height + BOUNDS.top) / 2,
    vx: 0,
    vy: 0,
    radius: CONFIG.playerRadius,
    light: CONFIG.lightMax,
    dashTime: 0,
    dashCooldown: 0,
    dashDirX: 1,
    dashDirY: 0,
    invulnerable: 0,
    shield: 0,
    magnet: 0,
    slowmo: 0,
    facingX: 1,
    facingY: 0,
  };
}

export function makeOrb(rng, player) {
  let x = 0;
  let y = 0;
  for (let attempt = 0; attempt < 12; attempt++) {
    x = range(rng, BOUNDS.left + 30, BOUNDS.right - 30);
    y = range(rng, BOUNDS.top + 30, BOUNDS.bottom - 30);
    if (!player || dist(x, y, player.x, player.y) > 110) break;
  }
  return {
    x,
    y,
    radius: CONFIG.orbRadius,
    age: 0,
    lifetime: CONFIG.orbLifetime,
    bobPhase: range(rng, 0, Math.PI * 2),
  };
}

export function orbIsRisky(orb, wisps) {
  for (const wisp of wisps) {
    if (dist(orb.x, orb.y, wisp.x, wisp.y) < CONFIG.orbRiskyDistance) return true;
  }
  return false;
}

export function makeWisp(rng, player, speed) {
  const side = pick(rng, ['left', 'right', 'top', 'bottom']);
  let x = 0;
  let y = 0;
  if (side === 'left') {
    x = BOUNDS.left + 10;
    y = range(rng, BOUNDS.top + 20, BOUNDS.bottom - 20);
  } else if (side === 'right') {
    x = BOUNDS.right - 10;
    y = range(rng, BOUNDS.top + 20, BOUNDS.bottom - 20);
  } else if (side === 'top') {
    x = range(rng, BOUNDS.left + 20, BOUNDS.right - 20);
    y = BOUNDS.top + 10;
  } else {
    x = range(rng, BOUNDS.left + 20, BOUNDS.right - 20);
    y = BOUNDS.bottom - 10;
  }
  if (player && dist(x, y, player.x, player.y) < 220) {
    x = BOUNDS.left + 10;
    y = BOUNDS.top + 10;
  }
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius: CONFIG.wispRadius,
    speed: speed * range(rng, 0.9, 1.1),
    wobblePhase: range(rng, 0, Math.PI * 2),
    wobbleSpeed: range(rng, 1.6, 2.6),
  };
}

export function updateWisp(wisp, player, dt, slowFactor, others, time) {
  const dx = player.x - wisp.x;
  const dy = player.y - wisp.y;
  const d = Math.hypot(dx, dy) || 1;
  const wobble = Math.sin(time * wisp.wobbleSpeed + wisp.wobblePhase) * CONFIG.wispWobble;
  const px = -dy / d;
  const py = dx / d;
  let tx = (dx / d) * wisp.speed + px * wobble * 22;
  let ty = (dy / d) * wisp.speed + py * wobble * 22;
  for (const other of others) {
    if (other === wisp) continue;
    const ox = wisp.x - other.x;
    const oy = wisp.y - other.y;
    const od = Math.hypot(ox, oy);
    if (od > 0.01 && od < 44) {
      const push = (44 - od) * 4.2;
      tx += (ox / od) * push;
      ty += (oy / od) * push;
    }
  }
  const blend = Math.min(1, dt * 3.2);
  wisp.vx += (tx - wisp.vx) * blend;
  wisp.vy += (ty - wisp.vy) * blend;
  wisp.x += wisp.vx * slowFactor * dt;
  wisp.y += wisp.vy * slowFactor * dt;
  clampToBounds(wisp, wisp.radius);
}

const POWERUP_KINDS = ['shield', 'magnet', 'slowmo'];

export function makePowerup(rng, player) {
  const kind = chance(rng, 0.4) ? 'shield' : pick(rng, POWERUP_KINDS);
  let x = 0;
  let y = 0;
  for (let attempt = 0; attempt < 10; attempt++) {
    x = range(rng, BOUNDS.left + 40, BOUNDS.right - 40);
    y = range(rng, BOUNDS.top + 40, BOUNDS.bottom - 40);
    if (!player || dist(x, y, player.x, player.y) > 160) break;
  }
  return {
    x,
    y,
    kind,
    radius: CONFIG.powerupRadius,
    age: 0,
    lifetime: CONFIG.powerupLifetime,
    bobPhase: range(rng, 0, Math.PI * 2),
  };
}

export function makeParticle(x, y, vx, vy, lifetime, size, color) {
  return { x, y, vx, vy, age: 0, lifetime, size, color };
}

export function burst(rng, x, y, color, count, speed) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const angle = range(rng, 0, Math.PI * 2);
    const v = range(rng, speed * 0.3, speed);
    out.push(
      makeParticle(
        x,
        y,
        Math.cos(angle) * v,
        Math.sin(angle) * v - 18,
        range(rng, 0.35, 0.8),
        range(rng, 2, 5),
        color,
      ),
    );
  }
  return out;
}

export function makeFloater(x, y, text, color, size = 20) {
  return { x, y, text, color, size, age: 0, lifetime: 1.1 };
}

// Screenshot staging for Lentera Rimba. A `?shot=` query puts the game in
// a fixed, readable state — title, mid-play, level-up or game over — and a
// `?seed=` query fixes the random generator, so every capture is a real
// render of the game's own code, reproducible frame for frame.
//
// Supported modes: start, play, level, end. Example:
//   game/index.html?shot=play&seed=1

import { CONFIG } from './config.js';
import { burst, makeFloater } from './entities.js';
import { makeRng } from './random.js';

export function parseShotParams() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  const seedText = params.get('seed');
  const seed = seedText === null ? 1 : Number.parseInt(seedText, 10);
  return { mode: shot, seed: Number.isFinite(seed) ? seed >>> 0 : 1 };
}

function placeOrb(world, x, y, age = 0.4) {
  world.orbs.push({ x, y, radius: CONFIG.orbRadius, age, lifetime: CONFIG.orbLifetime, bobPhase: 1.1 });
}

function placeWisp(world, x, y, speed = 120) {
  world.wisps.push({
    x,
    y,
    vx: 0,
    vy: 0,
    radius: CONFIG.wispRadius,
    speed,
    wobblePhase: 0.7,
    wobbleSpeed: 2.1,
  });
}

function stageStart(world) {
  world.screen = 'title';
  world.score = 0;
  world.best = 1250;
  world.level = 1;
  world.orbsCollected = 0;
  world.timeSurvived = 0;
  world.player.light = CONFIG.lightMax;
  world.player.x = 640;
  world.player.y = 400;
  world.wisps = [];
  world.powerups = [];
  world.particles = [];
  world.floaters = [];
  world.banner = null;
  world.shake = 0;
  world.orbs = [];
  placeOrb(world, 300, 300);
  placeOrb(world, 470, 330);
  placeOrb(world, 820, 270);
  placeOrb(world, 980, 330);
  placeOrb(world, 220, 470);
  placeOrb(world, 1060, 470);
}

function stagePlay(world) {
  world.screen = 'playing';
  world.score = 340;
  world.best = 1250;
  world.level = 2;
  world.orbsCollected = 18;
  world.timeSurvived = 74;
  world.dashesUsed = 5;
  world.wispsDashed = 1;
  world.player.light = 68;
  world.player.x = 520;
  world.player.y = 420;
  world.player.dashCooldown = 0.45;
  world.player.magnet = 3.2;
  world.player.shield = 0;
  world.player.slowmo = 0;
  world.player.invulnerable = 0;
  world.orbs = [];
  placeOrb(world, 380, 330);
  placeOrb(world, 640, 320);
  placeOrb(world, 760, 430);
  placeOrb(world, 880, 300);
  placeOrb(world, 300, 520);
  placeOrb(world, 700, 560);
  placeOrb(world, 1020, 520);
  world.wisps = [];
  placeWisp(world, 430, 250);
  placeWisp(world, 830, 360);
  placeWisp(world, 980, 450);
  placeWisp(world, 240, 400);
  placeWisp(world, 660, 200);
  world.powerups = [
    { x: 1010, y: 260, kind: 'shield', radius: CONFIG.powerupRadius, age: 1.2, lifetime: CONFIG.powerupLifetime, bobPhase: 0.4 },
  ];
  world.particles = [
    ...burst(world.rng, 640, 320, '#ffd76a', 10, 150),
    ...burst(world.rng, 520, 420, '#ffcf5e', 8, 110),
  ];
  for (const p of world.particles) p.age = 0.18;
  world.floaters = [
    makeFloater(640, 300, '+10', '#ffd76a', 19),
    makeFloater(760, 410, 'RISIKO +25', '#ff9d4d', 22),
  ];
  for (const f of world.floaters) f.age = 0.25;
  world.banner = null;
  world.shake = 0;
}

function stageLevel(world) {
  world.screen = 'playing';
  world.score = 505;
  world.best = 1250;
  world.level = 3;
  world.orbsCollected = 27;
  world.timeSurvived = 118;
  world.dashesUsed = 8;
  world.wispsDashed = 2;
  world.player.light = 82;
  world.player.x = 640;
  world.player.y = 410;
  world.player.dashCooldown = 0;
  world.player.shield = 5.0;
  world.player.slowmo = 3.8;
  world.player.magnet = 0;
  world.player.invulnerable = 0;
  world.orbs = [];
  placeOrb(world, 360, 300);
  placeOrb(world, 500, 520);
  placeOrb(world, 790, 300);
  placeOrb(world, 920, 480);
  placeOrb(world, 260, 460);
  placeOrb(world, 1040, 330);
  world.wisps = [];
  placeWisp(world, 470, 280);
  placeWisp(world, 820, 260);
  placeWisp(world, 900, 420);
  placeWisp(world, 380, 430);
  placeWisp(world, 560, 210);
  placeWisp(world, 1020, 250);
  world.powerups = [
    { x: 1080, y: 560, kind: 'magnet', radius: CONFIG.powerupRadius, age: 0.8, lifetime: CONFIG.powerupLifetime, bobPhase: 1.9 },
  ];
  world.particles = [
    ...burst(world.rng, 640, 410, '#fff3c4', 20, 200),
    ...burst(world.rng, 820, 260, '#a78bfa', 14, 220),
  ];
  for (const p of world.particles) p.age = 0.2;
  world.floaters = [makeFloater(820, 240, '+50', '#e9d5ff', 22)];
  world.floaters[0].age = 0.25;
  world.banner = { text: 'LEVEL 3', sub: 'Bayangan makin cepat…', age: 0.6, duration: CONFIG.bannerTime };
  world.shake = 0;
}

function stageEnd(world) {
  world.screen = 'over';
  world.score = 480;
  world.best = 1250;
  world.newBest = false;
  world.level = 2;
  world.orbsCollected = 24;
  world.timeSurvived = 132;
  world.dashesUsed = 9;
  world.wispsDashed = 3;
  world.player.light = 0;
  world.player.x = 640;
  world.player.y = 620;
  world.orbs = [];
  placeOrb(world, 320, 300, 2.0);
  placeOrb(world, 960, 300, 2.0);
  placeOrb(world, 260, 500, 2.0);
  placeOrb(world, 1020, 500, 2.0);
  world.wisps = [];
  placeWisp(world, 240, 320);
  placeWisp(world, 1040, 320);
  placeWisp(world, 880, 580);
  world.powerups = [];
  world.particles = burst(world.rng, 640, 400, '#ffcf5e', 20, 200);
  for (const p of world.particles) p.age = 0.5;
  world.floaters = [];
  world.banner = null;
  world.shake = 0;
}

export function stageShot(world, mode, seed) {
  world.seed = seed;
  world.rng = makeRng(seed);
  world.time = mode === 'start' ? 3.0 : 12.5;
  world.overAt = 0;
  if (mode === 'start') stageStart(world);
  else if (mode === 'play') stagePlay(world);
  else if (mode === 'level') stageLevel(world);
  else if (mode === 'end') stageEnd(world);
  else stageStart(world);
}

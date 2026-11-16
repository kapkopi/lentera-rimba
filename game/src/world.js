// Game state and update logic for Lentera Rimba. The world holds every
// entity, the score, the level and the timers; rendering lives in render.js
// and never changes state.

import { CONFIG, VIEW } from './config.js';
import {
  BOUNDS,
  burst,
  clampToBounds,
  dist,
  makeFloater,
  makeOrb,
  makePlayer,
  makePowerup,
  makeWisp,
  orbIsRisky,
  updateWisp,
} from './entities.js';
import { makeRng, range, randomSeed } from './random.js';

const BEST_KEY = 'lentera-rimba-best';

function loadBest() {
  try {
    const stored = window.localStorage.getItem(BEST_KEY);
    const value = stored === null ? 0 : Number.parseInt(stored, 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // A missing store never blocks the game.
  }
}

export function wispCap(level) {
  return Math.min(CONFIG.wispMaxCap, CONFIG.wispBaseCap + (level - 1) * CONFIG.wispCapPerLevel);
}

export function wispInterval(level) {
  return Math.max(
    CONFIG.wispMinInterval,
    CONFIG.wispBaseInterval - (level - 1) * CONFIG.wispIntervalPerLevel,
  );
}

export function wispSpeed(level) {
  return Math.min(
    CONFIG.wispMaxSpeed,
    CONFIG.wispBaseSpeed + (level - 1) * CONFIG.wispSpeedPerLevel,
  );
}

export function levelForScore(score) {
  return 1 + Math.floor(score / CONFIG.scorePerLevel);
}

function makeScenery(rng) {
  const stars = [];
  for (let i = 0; i < 70; i++) {
    stars.push({
      x: range(rng, 0, VIEW.width),
      y: range(rng, 0, 220),
      size: range(rng, 0.7, 2.1),
      phase: range(rng, 0, Math.PI * 2),
    });
  }
  const treeLayer = (count, yMin, yMax, hMin, hMax) => {
    const trees = [];
    for (let i = 0; i < count; i++) {
      trees.push({
        x: range(rng, -40, VIEW.width + 40),
        y: range(rng, yMin, yMax),
        height: range(rng, hMin, hMax),
        width: range(rng, 42, 86),
      });
    }
    trees.sort((a, b) => a.y - b.y);
    return trees;
  };
  const fireflies = [];
  for (let i = 0; i < 26; i++) {
    fireflies.push({
      x: range(rng, 30, VIEW.width - 30),
      y: range(rng, 130, VIEW.height - 60),
      phase: range(rng, 0, Math.PI * 2),
      speed: range(rng, 0.4, 1.1),
      radius: range(rng, 14, 42),
    });
  }
  const mist = [];
  for (let i = 0; i < 7; i++) {
    mist.push({
      x: range(rng, 0, VIEW.width),
      y: range(rng, 300, VIEW.height - 60),
      width: range(rng, 260, 520),
      height: range(rng, 36, 70),
      speed: range(rng, 6, 16),
    });
  }
  const grass = [];
  for (let i = 0; i < 90; i++) {
    grass.push({
      x: range(rng, 0, VIEW.width),
      y: range(rng, VIEW.height - 130, VIEW.height - 8),
      height: range(rng, 8, 22),
      lean: range(rng, -4, 4),
    });
  }
  return { stars, treesFar: treeLayer(22, 250, 330, 120, 190), treesMid: treeLayer(18, 320, 420, 150, 240), treesNear: treeLayer(12, 420, 520, 190, 300), fireflies, mist, grass };
}

export function createWorld(seed) {
  const rng = makeRng(seed);
  const world = {
    seed,
    rng,
    time: 0,
    screen: 'title',
    player: makePlayer(),
    orbs: [],
    wisps: [],
    powerups: [],
    particles: [],
    floaters: [],
    score: 0,
    best: loadBest(),
    newBest: false,
    overAt: 0,
    orbsCollected: 0,
    level: 1,
    timeSurvived: 0,
    dashesUsed: 0,
    wispsDashed: 0,
    wispTimer: 2.2,
    powerupTimer: CONFIG.powerupInterval,
    shake: 0,
    banner: null,
    scenery: makeScenery(rng),
  };
  for (let i = 0; i < 6; i++) world.orbs.push(makeOrb(rng, world.player));
  return world;
}

export function startRun(world) {
  world.seed = randomSeed();
  world.rng = makeRng(world.seed);
  world.player = makePlayer();
  world.orbs = [];
  world.wisps = [];
  world.powerups = [];
  world.particles = [];
  world.floaters = [];
  world.score = 0;
  world.newBest = false;
  world.overAt = 0;
  world.orbsCollected = 0;
  world.level = 1;
  world.timeSurvived = 0;
  world.dashesUsed = 0;
  world.wispsDashed = 0;
  world.wispTimer = 2.2;
  world.powerupTimer = CONFIG.powerupInterval;
  world.shake = 0;
  world.banner = null;
  world.screen = 'playing';
  for (let i = 0; i < 6; i++) world.orbs.push(makeOrb(world.rng, world.player));
}

function setBanner(world, text, sub) {
  world.banner = { text, sub: sub || '', age: 0, duration: CONFIG.bannerTime };
}

function endRun(world, sounds) {
  world.screen = 'over';
  world.overAt = world.time;
  if (world.score > world.best) {
    world.newBest = true;
    world.best = world.score;
    saveBest(world.best);
  }
  world.particles.push(
    ...burst(world.rng, world.player.x, world.player.y, '#ffcf5e', 26, 220),
  );
  sounds.gameOver();
}

function updateAmbient(world, dt) {
  world.time += dt;
  updateParticles(world, dt);
  updateFloaters(world, dt);
}

function updateParticles(world, dt) {
  const kept = [];
  for (const p of world.particles) {
    p.age += dt;
    if (p.age >= p.lifetime) continue;
    const drag = Math.max(0, 1 - dt * 2.6);
    p.vx *= drag;
    p.vy *= drag;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    kept.push(p);
  }
  world.particles = kept;
}

function updateFloaters(world, dt) {
  const kept = [];
  for (const f of world.floaters) {
    f.age += dt;
    if (f.age >= f.lifetime) continue;
    f.y -= 42 * dt;
    kept.push(f);
  }
  world.floaters = kept;
}

function updatePlayer(world, input, sounds, dt) {
  const player = world.player;
  const axis = input.axis();
  if (axis.x !== 0 || axis.y !== 0) {
    player.facingX = axis.x;
    player.facingY = axis.y;
  }
  if (input.wasPressed('Space') && player.dashCooldown <= 0 && player.light > CONFIG.lightDashCost) {
    player.dashTime = CONFIG.dashTime;
    player.dashCooldown = CONFIG.dashCooldown;
    player.dashDirX = player.facingX;
    player.dashDirY = player.facingY;
    player.light -= CONFIG.lightDashCost;
    world.dashesUsed += 1;
    sounds.dash();
    world.particles.push(
      ...burst(world.rng, player.x, player.y, '#ffe9b0', 8, 120),
    );
  }
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.shield = Math.max(0, player.shield - dt);
  player.magnet = Math.max(0, player.magnet - dt);
  player.slowmo = Math.max(0, player.slowmo - dt);

  if (player.dashTime > 0) {
    player.dashTime -= dt;
    player.vx = player.dashDirX * CONFIG.dashSpeed;
    player.vy = player.dashDirY * CONFIG.dashSpeed;
    world.particles.push(
      ...burst(world.rng, player.x, player.y, '#ffcf5e', 1, 30),
    );
  } else {
    player.vx += axis.x * CONFIG.playerAccel * dt;
    player.vy += axis.y * CONFIG.playerAccel * dt;
    const damp = Math.exp(-CONFIG.playerFriction * dt);
    player.vx *= damp;
    player.vy *= damp;
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > CONFIG.playerMaxSpeed) {
      const scale = CONFIG.playerMaxSpeed / speed;
      player.vx *= scale;
      player.vy *= scale;
    }
  }
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  clampToBounds(player, player.radius);

  player.light -= CONFIG.lightDrain * dt;
  if (player.light <= 0) {
    player.light = 0;
    endRun(world, sounds);
  }
}

function updateOrbs(world, dt) {
  const player = world.player;
  const kept = [];
  for (const orb of world.orbs) {
    orb.age += dt;
    if (orb.age >= orb.lifetime) continue;
    if (player.magnet > 0) {
      const d = dist(orb.x, orb.y, player.x, player.y);
      if (d > 1 && d < CONFIG.magnetRadius) {
        const pull = 340 * dt;
        orb.x += ((player.x - orb.x) / d) * pull;
        orb.y += ((player.y - orb.y) / d) * pull;
      }
    }
    kept.push(orb);
  }
  world.orbs = kept;
  while (world.orbs.length < CONFIG.orbTargetMin) {
    world.orbs.push(makeOrb(world.rng, player));
  }
}

function updateWisps(world, dt) {
  const player = world.player;
  const slowFactor = player.slowmo > 0 ? CONFIG.slowmoFactor : 1;
  for (const wisp of world.wisps) {
    updateWisp(wisp, player, dt, slowFactor, world.wisps, world.time);
  }
  world.wispTimer -= dt;
  if (world.wispTimer <= 0 && world.wisps.length < wispCap(world.level)) {
    world.wisps.push(makeWisp(world.rng, player, wispSpeed(world.level)));
    world.wispTimer = wispInterval(world.level);
  }
}

function updatePowerups(world, dt) {
  const kept = [];
  for (const powerup of world.powerups) {
    powerup.age += dt;
    if (powerup.age < powerup.lifetime) kept.push(powerup);
  }
  world.powerups = kept;
  world.powerupTimer -= dt;
  if (world.powerupTimer <= 0) {
    world.powerupTimer = CONFIG.powerupInterval;
    if (world.powerups.length < 1) {
      world.powerups.push(makePowerup(world.rng, world.player));
    }
  }
}

function applyPowerup(world, sounds, powerup) {
  const player = world.player;
  if (powerup.kind === 'shield') {
    player.shield = CONFIG.shieldDuration;
    world.floaters.push(makeFloater(player.x, player.y - 30, 'PERISAI!', '#6ee7ff', 22));
  } else if (powerup.kind === 'magnet') {
    player.magnet = CONFIG.magnetDuration;
    world.floaters.push(makeFloater(player.x, player.y - 30, 'MAGNET CAHAYA!', '#f472b6', 22));
  } else {
    player.slowmo = CONFIG.slowmoDuration;
    world.floaters.push(makeFloater(player.x, player.y - 30, 'WAKTU MELAMBAT!', '#a3e635', 22));
  }
  world.particles.push(...burst(world.rng, powerup.x, powerup.y, '#ffffff', 14, 160));
  sounds.powerup();
}

function checkCollisions(world, sounds) {
  const player = world.player;
  const dashing = player.dashTime > 0;

  const keptOrbs = [];
  const spawned = [];
  for (const orb of world.orbs) {
    if (dist(orb.x, orb.y, player.x, player.y) < orb.radius + player.radius) {
      const risky = orbIsRisky(orb, world.wisps);
      const gained = risky ? CONFIG.orbRiskyScore : CONFIG.orbScore;
      world.score += gained;
      world.orbsCollected += 1;
      player.light = Math.min(CONFIG.lightMax, player.light + CONFIG.lightPerOrb);
      world.floaters.push(
        makeFloater(orb.x, orb.y - 18, risky ? `RISIKO +${gained}` : `+${gained}`, risky ? '#ff9d4d' : '#ffd76a', risky ? 22 : 19),
      );
      world.particles.push(...burst(world.rng, orb.x, orb.y, risky ? '#ff9d4d' : '#ffd76a', 10, 150));
      sounds.collect(risky);
      spawned.push(makeOrb(world.rng, player));
    } else {
      keptOrbs.push(orb);
    }
  }
  world.orbs = [...keptOrbs, ...spawned];

  const keptPowerups = [];
  for (const powerup of world.powerups) {
    if (dist(powerup.x, powerup.y, player.x, player.y) < powerup.radius + player.radius) {
      applyPowerup(world, sounds, powerup);
    } else {
      keptPowerups.push(powerup);
    }
  }
  world.powerups = keptPowerups;

  const keptWisps = [];
  for (const wisp of world.wisps) {
    const touching = dist(wisp.x, wisp.y, player.x, player.y) < wisp.radius + player.radius;
    if (!touching) {
      keptWisps.push(wisp);
      continue;
    }
    if (dashing) {
      world.score += CONFIG.dashKillScore;
      world.wispsDashed += 1;
      world.floaters.push(makeFloater(wisp.x, wisp.y - 18, `+${CONFIG.dashKillScore}`, '#e9d5ff', 22));
      world.particles.push(...burst(world.rng, wisp.x, wisp.y, '#a78bfa', 18, 240));
      world.shake = Math.max(world.shake, 4);
      sounds.dashKill();
      continue;
    }
    if (player.invulnerable > 0) {
      keptWisps.push(wisp);
      continue;
    }
    if (player.shield > 0) {
      player.shield = 0;
      player.invulnerable = CONFIG.hitInvulnerable;
      world.floaters.push(makeFloater(player.x, player.y - 30, 'PERISAI PECAH!', '#6ee7ff', 20));
      world.particles.push(...burst(world.rng, wisp.x, wisp.y, '#6ee7ff', 16, 200));
      sounds.hit();
      continue;
    }
    player.light -= CONFIG.lightPerHit;
    player.invulnerable = CONFIG.hitInvulnerable;
    world.shake = CONFIG.shakeOnHit;
    const d = dist(wisp.x, wisp.y, player.x, player.y) || 1;
    const pushX = ((player.x - wisp.x) / d) * 420;
    const pushY = ((player.y - wisp.y) / d) * 420;
    player.vx += pushX;
    player.vy += pushY;
    wisp.x -= pushX * 0.12;
    wisp.y -= pushY * 0.12;
    world.floaters.push(makeFloater(player.x, player.y - 30, '-CAHAYA', '#ff6b6b', 20));
    world.particles.push(...burst(world.rng, player.x, player.y, '#a78bfa', 16, 220));
    sounds.hit();
    keptWisps.push(wisp);
    if (player.light <= 0) {
      player.light = 0;
      world.wisps = keptWisps;
      endRun(world, sounds);
      return;
    }
  }
  world.wisps = keptWisps;
}

function updateLevel(world, sounds) {
  const next = levelForScore(world.score);
  if (next <= world.level) return;
  world.level = next;
  if (world.level % CONFIG.dawnEveryLevels === 0) {
    world.score += CONFIG.dawnBonus;
    world.player.light = Math.min(CONFIG.lightMax, world.player.light + CONFIG.dawnLight);
    setBanner(world, 'FAJAR TIBA!', `Bonus +${CONFIG.dawnBonus} — cahaya pulih`);
    sounds.dawn();
  } else {
    setBanner(world, `LEVEL ${world.level}`, 'Bayangan makin cepat…');
    sounds.levelUp();
  }
  world.particles.push(
    ...burst(world.rng, world.player.x, world.player.y, '#fff3c4', 20, 200),
  );
}

export function updateWorld(world, input, sounds, dt) {
  if (world.screen === 'paused') return;
  updateAmbient(world, dt);
  if (world.screen !== 'playing') return;

  updatePlayer(world, input, sounds, dt);
  if (world.screen !== 'playing') return;
  updateOrbs(world, dt);
  updateWisps(world, dt);
  updatePowerups(world, dt);
  checkCollisions(world, sounds);
  if (world.screen !== 'playing') return;
  updateLevel(world, sounds);
  world.timeSurvived += dt;
  world.shake = Math.max(0, world.shake - dt * 26);
  if (world.banner) {
    world.banner.age += dt;
    if (world.banner.age >= world.banner.duration) world.banner = null;
  }
}

export function formatTime(seconds) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}


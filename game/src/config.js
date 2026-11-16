// Tuning and palette for Lentera Rimba. One place for every number that
// shapes how the game feels, so balancing never means hunting through logic.

export const VIEW = { width: 1280, height: 720 };

export const PALETTE = {
  skyTop: '#0b2436',
  skyMid: '#0e2f3f',
  skyBottom: '#123c33',
  ground: '#0a1f18',
  groundFront: '#071712',
  treeFar: '#0d2c26',
  treeMid: '#0a241d',
  treeNear: '#061a15',
  mist: 'rgba(180, 220, 205, 0.07)',
  star: '#d8f2ff',
  moon: '#f4e9c8',
  lantern: '#ffcf5e',
  lanternCore: '#fff3c4',
  orb: '#ffd76a',
  orbRisky: '#ff9d4d',
  wisp: '#a78bfa',
  wispCore: '#e9d5ff',
  shield: '#6ee7ff',
  magnet: '#f472b6',
  slowmo: '#a3e635',
  text: '#fff3c4',
  textDim: '#b8d4c8',
  danger: '#ff6b6b',
};

export const CONFIG = {
  // Player movement and lantern.
  playerRadius: 16,
  playerAccel: 2600,
  playerMaxSpeed: 330,
  playerFriction: 8.5,
  lightMax: 100,
  lightDrain: 2.4,
  lightPerOrb: 13,
  lightPerHit: 18,
  lightDashCost: 4,
  dashSpeed: 950,
  dashTime: 0.16,
  dashCooldown: 1.15,
  dashKillScore: 50,
  hitInvulnerable: 1.1,

  // Orbs.
  orbRadius: 11,
  orbTargetMin: 5,
  orbTargetMax: 8,
  orbLifetime: 13,
  orbScore: 10,
  orbRiskyScore: 25,
  orbRiskyDistance: 130,

  // Wisps.
  wispRadius: 14,
  wispBaseSpeed: 92,
  wispSpeedPerLevel: 13,
  wispMaxSpeed: 265,
  wispBaseInterval: 1.7,
  wispIntervalPerLevel: 0.09,
  wispMinInterval: 0.7,
  wispBaseCap: 6,
  wispCapPerLevel: 1,
  wispMaxCap: 18,
  wispWobble: 1.9,

  // Power-ups.
  powerupRadius: 15,
  powerupInterval: 14,
  powerupLifetime: 10,
  shieldDuration: 12,
  magnetDuration: 6,
  magnetRadius: 240,
  slowmoDuration: 5,
  slowmoFactor: 0.4,

  // Progression.
  scorePerLevel: 250,
  dawnEveryLevels: 5,
  dawnBonus: 100,
  dawnLight: 30,

  // Feedback.
  shakeOnHit: 9,
  bannerTime: 2.2,
};

// All drawing for Lentera Rimba. Rendering reads the world and never
// changes it; every visual is drawn procedurally on the canvas.

import { CONFIG, PALETTE, VIEW } from './config.js';
import { orbIsRisky } from './entities.js';
import { formatTime } from './world.js';

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTree(ctx, tree, color) {
  ctx.fillStyle = color;
  const trunkW = Math.max(6, tree.width * 0.14);
  ctx.fillRect(tree.x - trunkW / 2, tree.y - tree.height * 0.22, trunkW, tree.height * 0.22);
  for (let layer = 0; layer < 3; layer++) {
    const layerH = tree.height * (0.42 - layer * 0.07);
    const layerW = tree.width * (1 - layer * 0.24);
    const topY = tree.y - tree.height + layer * tree.height * 0.26;
    ctx.beginPath();
    ctx.moveTo(tree.x, topY);
    ctx.lineTo(tree.x - layerW / 2, topY + layerH);
    ctx.lineTo(tree.x + layerW / 2, topY + layerH);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBackground(ctx, world) {
  const { width, height } = VIEW;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  for (const star of world.scenery.stars) {
    const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(world.time * 1.4 + star.phase));
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = PALETTE.star;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  glowCircle(ctx, 1130, 92, 90, '#f4e9c8', 0.22);
  ctx.fillStyle = PALETTE.moon;
  ctx.beginPath();
  ctx.arc(1130, 92, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.skyTop;
  ctx.beginPath();
  ctx.arc(1142, 84, 26, 0, Math.PI * 2);
  ctx.fill();

  const parallax = world.player.x - width / 2;
  const layers = [
    { trees: world.scenery.treesFar, color: PALETTE.treeFar, factor: 0.012 },
    { trees: world.scenery.treesMid, color: PALETTE.treeMid, factor: 0.022 },
    { trees: world.scenery.treesNear, color: PALETTE.treeNear, factor: 0.035 },
  ];
  for (const layer of layers) {
    for (const tree of layer.trees) {
      drawTree(ctx, { ...tree, x: tree.x - parallax * layer.factor }, layer.color);
    }
  }

  const ground = ctx.createLinearGradient(0, 520, 0, height);
  ground.addColorStop(0, PALETTE.ground);
  ground.addColorStop(1, PALETTE.groundFront);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 540, width, height - 540);

  ctx.strokeStyle = 'rgba(70, 130, 100, 0.5)';
  ctx.lineWidth = 2;
  for (const blade of world.scenery.grass) {
    ctx.beginPath();
    ctx.moveTo(blade.x, blade.y);
    ctx.quadraticCurveTo(blade.x + blade.lean, blade.y - blade.height * 0.6, blade.x + blade.lean * 1.6, blade.y - blade.height);
    ctx.stroke();
  }

  for (const cloud of world.scenery.mist) {
    const span = width + cloud.width;
    const x = ((cloud.x + world.time * cloud.speed) % span) - cloud.width / 2;
    ctx.fillStyle = PALETTE.mist;
    ctx.beginPath();
    ctx.ellipse(x, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const fly of world.scenery.fireflies) {
    const fx = fly.x + Math.cos(world.time * fly.speed + fly.phase) * fly.radius;
    const fy = fly.y + Math.sin(world.time * fly.speed * 0.8 + fly.phase) * fly.radius * 0.6;
    const pulse = 0.5 + 0.5 * Math.sin(world.time * 2.2 + fly.phase * 2);
    glowCircle(ctx, fx, fy, 10, '#d9f99d', 0.25 + pulse * 0.3);
    ctx.fillStyle = '#ecfccb';
    ctx.beginPath();
    ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOrb(ctx, orb, world) {
  const bob = Math.sin(world.time * 2.4 + orb.bobPhase) * 4;
  const y = orb.y + bob;
  const risky = orbIsRisky(orb, world.wisps);
  const color = risky ? PALETTE.orbRisky : PALETTE.orb;
  const fade = orb.age > orb.lifetime - 3 ? (orb.lifetime - orb.age) / 3 : 1;
  const blink = fade < 1 ? (Math.sin(world.time * 10) > 0 ? 1 : 0.45) : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade) * blink;
  glowCircle(ctx, orb.x, y, risky ? 38 : 30, color, 0.5);
  ctx.fillStyle = '#fff8dc';
  ctx.beginPath();
  ctx.arc(orb.x, y, orb.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(orb.x, y, orb.radius, 0, Math.PI * 2);
  ctx.stroke();
  if (risky) {
    const pulse = 1 + 0.12 * Math.sin(world.time * 5);
    ctx.strokeStyle = 'rgba(255, 157, 77, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(orb.x, y, orb.radius * 1.6 * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWisp(ctx, wisp, world) {
  const sway = Math.sin(world.time * 3 + wisp.wobblePhase) * 3;
  const x = wisp.x + sway;
  const y = wisp.y;
  glowCircle(ctx, x, y, 42, PALETTE.wisp, 0.45);
  ctx.fillStyle = PALETTE.wisp;
  ctx.beginPath();
  ctx.arc(x, y - 4, wisp.radius, Math.PI, 0);
  ctx.lineTo(x + wisp.radius, y + wisp.radius * 0.8);
  for (let i = 0; i < 3; i++) {
    const waveX = x + wisp.radius - (i + 0.5) * ((wisp.radius * 2) / 3);
    const waveY = y + wisp.radius * 0.8 + (i % 2 === 0 ? 5 : -2) + Math.sin(world.time * 4 + i) * 2;
    ctx.quadraticCurveTo(waveX, waveY + 6, x + wisp.radius - (i + 1) * ((wisp.radius * 2) / 3), y + wisp.radius * 0.8);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.wispCore;
  ctx.beginPath();
  ctx.arc(x - 5, y - 7, 3.4, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 7, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e1033';
  ctx.beginPath();
  ctx.arc(x - 5, y - 6, 1.8, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 6, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawPowerupIcon(ctx, kind, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  if (kind === 'shield') {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.8, y - size * 0.4);
    ctx.lineTo(x + size * 0.6, y + size * 0.7);
    ctx.quadraticCurveTo(x, y + size * 1.1, x - size * 0.6, y + size * 0.7);
    ctx.lineTo(x - size * 0.8, y - size * 0.4);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.4);
    ctx.lineTo(x, y + size * 0.5);
    ctx.stroke();
  } else if (kind === 'magnet') {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7, Math.PI, 0, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.7, y);
    ctx.lineTo(x - size * 0.7, y + size * 0.7);
    ctx.moveTo(x + size * 0.7, y);
    ctx.lineTo(x + size * 0.7, y + size * 0.7);
    ctx.stroke();
    ctx.fillRect(x - size * 0.85, y + size * 0.7, size * 0.3, size * 0.3);
    ctx.fillRect(x + size * 0.55, y + size * 0.7, size * 0.3, size * 0.3);
  } else {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - size * 0.55);
    ctx.moveTo(x, y);
    ctx.lineTo(x + size * 0.45, y + size * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

function powerupColor(kind) {
  if (kind === 'shield') return PALETTE.shield;
  if (kind === 'magnet') return PALETTE.magnet;
  return PALETTE.slowmo;
}

function drawPowerup(ctx, powerup, world) {
  const bob = Math.sin(world.time * 2.2 + powerup.bobPhase) * 4;
  const y = powerup.y + bob;
  const color = powerupColor(powerup.kind);
  const fade = powerup.age > powerup.lifetime - 3 ? (powerup.lifetime - powerup.age) / 3 : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  glowCircle(ctx, powerup.x, y, 36, color, 0.45);
  ctx.fillStyle = 'rgba(6, 20, 16, 0.85)';
  ctx.beginPath();
  ctx.arc(powerup.x, y, powerup.radius + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(powerup.x, y, powerup.radius + 3, 0, Math.PI * 2);
  ctx.stroke();
  drawPowerupIcon(ctx, powerup.kind, powerup.x, y, 9, color);
  ctx.restore();
}

function drawPlayer(ctx, world) {
  const player = world.player;
  const flicker = 1 + 0.08 * Math.sin(world.time * 9) + 0.05 * Math.sin(world.time * 23);
  const lightShare = player.light / CONFIG.lightMax;
  const glowRadius = 46 + lightShare * 62;
  const blink = player.invulnerable > 0 && Math.sin(world.time * 24) > 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.45;
  glowCircle(ctx, player.x, player.y, glowRadius * flicker, PALETTE.lantern, 0.32 + lightShare * 0.3);
  ctx.fillStyle = '#3a2a12';
  roundRectPath(ctx, player.x - 11, player.y - 19, 22, 6, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(player.x, player.y - 19, 6, Math.PI, 0);
  ctx.strokeStyle = '#3a2a12';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 220, 130, 0.92)';
  roundRectPath(ctx, player.x - 13, player.y - 13, 26, 28, 7);
  ctx.fill();
  ctx.fillStyle = PALETTE.lanternCore;
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 2, 7 * flicker, 9 * flicker, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2a12';
  ctx.lineWidth = 2;
  roundRectPath(ctx, player.x - 13, player.y - 13, 26, 28, 7);
  ctx.stroke();
  ctx.fillStyle = '#3a2a12';
  roundRectPath(ctx, player.x - 9, player.y + 15, 18, 5, 2);
  ctx.fill();
  if (player.shield > 0) {
    ctx.strokeStyle = PALETTE.shield;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (player.magnet > 0) {
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.65)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 17, world.time * 1.5, world.time * 1.5 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (player.slowmo > 0) {
    ctx.strokeStyle = 'rgba(163, 230, 53, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 23, -world.time, -world.time + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    const alpha = Math.max(0, 1 - p.age / p.lifetime);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  ctx.textAlign = 'center';
  for (const f of world.floaters) {
    const alpha = Math.max(0, 1 - f.age / f.lifetime);
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${f.size}px "Segoe UI", system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(4, 12, 10, 0.8)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world, sounds) {
  const { width } = VIEW;
  ctx.fillStyle = 'rgba(4, 12, 18, 0.55)';
  ctx.fillRect(0, 0, width, 64);
  ctx.fillStyle = 'rgba(255, 220, 130, 0.25)';
  ctx.fillRect(0, 64, width, 1);

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('SKOR', 24, 24);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(String(world.score), 24, 54);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Terbaik ${world.best}`, 330, 24);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`LEVEL ${world.level}`, width / 2, 28);
  const progress = (world.score % CONFIG.scorePerLevel) / CONFIG.scorePerLevel;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  roundRectPath(ctx, width / 2 - 110, 38, 220, 9, 4);
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  if (progress > 0) {
    roundRectPath(ctx, width / 2 - 110, 38, 220 * progress, 9, 4);
    ctx.fill();
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(sounds.muted ? 'Suara: mati (M)' : 'Suara: hidup (M)', width - 24, 26);
  ctx.fillText('Jeda (P)', width - 24, 48);

  const player = world.player;
  const barW = 420;
  const barX = width / 2 - barW / 2;
  const barY = VIEW.height - 36;
  const lowLight = player.light < 25;
  ctx.textAlign = 'right';
  ctx.fillStyle = lowLight ? PALETTE.danger : PALETTE.textDim;
  ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('CAHAYA', barX - 12, barY + 14);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  roundRectPath(ctx, barX, barY, barW, 18, 9);
  ctx.fill();
  const lightShare = Math.max(0, player.light / CONFIG.lightMax);
  const lightGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  lightGrad.addColorStop(0, '#ff9d4d');
  lightGrad.addColorStop(1, '#ffd76a');
  ctx.fillStyle = lightGrad;
  if (lightShare > 0.01) {
    roundRectPath(ctx, barX + 2, barY + 2, (barW - 4) * lightShare, 14, 7);
    ctx.fill();
  }
  ctx.strokeStyle = lowLight && Math.sin(world.time * 8) > 0 ? PALETTE.danger : 'rgba(255, 233, 176, 0.5)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, barX, barY, barW, 18, 9);
  ctx.stroke();

  const dashShare = 1 - player.dashCooldown / CONFIG.dashCooldown;
  const dashX = barX + barW + 20;
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('DASH', dashX, barY + 14);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  roundRectPath(ctx, dashX + 48, barY + 2, 90, 14, 7);
  ctx.fill();
  ctx.fillStyle = dashShare >= 1 ? '#6ee7ff' : '#3f7d95';
  roundRectPath(ctx, dashX + 48, barY + 2, 90 * Math.max(0, dashShare), 14, 7);
  ctx.fill();

  const effects = [];
  if (player.shield > 0) effects.push({ kind: 'shield', left: player.shield });
  if (player.magnet > 0) effects.push({ kind: 'magnet', left: player.magnet });
  if (player.slowmo > 0) effects.push({ kind: 'slowmo', left: player.slowmo });
  let effectX = width / 2 - (effects.length * 64) / 2 + 32;
  ctx.textAlign = 'center';
  for (const effect of effects) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(effectX, barY - 26, 17, 0, Math.PI * 2);
    ctx.fill();
    drawPowerupIcon(ctx, effect.kind, effectX, barY - 26, 8, powerupColor(effect.kind));
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`${Math.ceil(effect.left)}s`, effectX, barY - 48);
    effectX += 64;
  }
}

function drawBanner(ctx, world) {
  const banner = world.banner;
  if (!banner) return;
  const fadeIn = Math.min(1, banner.age / 0.2);
  const fadeOut = Math.min(1, (banner.duration - banner.age) / 0.4);
  const alpha = Math.min(fadeIn, fadeOut);
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
  const textW = ctx.measureText(banner.text).width;
  const pillW = Math.max(textW + 60, 300);
  ctx.fillStyle = 'rgba(4, 12, 18, 0.72)';
  roundRectPath(ctx, VIEW.width / 2 - pillW / 2, 132, pillW, 78, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 215, 106, 0.6)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, VIEW.width / 2 - pillW / 2, 132, pillW, 78, 16);
  ctx.stroke();
  ctx.fillStyle = PALETTE.lantern;
  ctx.fillText(banner.text, VIEW.width / 2, 168);
  if (banner.sub) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(banner.sub, VIEW.width / 2, 194);
  }
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(4, 14, 12, 0.78)';
  roundRectPath(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 220, 130, 0.3)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, x, y, w, h, 18);
  ctx.stroke();
}

function drawTitle(ctx, world) {
  const { width } = VIEW;
  ctx.textAlign = 'center';
  ctx.save();
  ctx.shadowColor = 'rgba(255, 207, 94, 0.55)';
  ctx.shadowBlur = 26;
  ctx.fillStyle = PALETTE.lantern;
  ctx.font = 'bold 68px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('LENTERA RIMBA', width / 2, 112);
  ctx.restore();
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  try {
    ctx.letterSpacing = '8px';
  } catch {
    // Older browsers ignore letter spacing.
  }
  ctx.fillText('JUNGLE LANTERN', width / 2, 146);
  try {
    ctx.letterSpacing = '0px';
  } catch {
    // Ignore.
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = '19px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Kumpulkan cahaya. Hindari bayangan. Bertahanlah sampai fajar.', width / 2, 180);

  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 25px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('TEKAN ENTER ATAU KLIK UNTUK MAIN', width / 2, 244);
  ctx.restore();

  if (world.best > 0) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`Skor terbaik: ${world.best}`, width / 2, 276);
  }

  panel(ctx, 190, 528, 900, 152);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('GERAK', 224, 560);
  ctx.fillText('DASH', 524, 560);
  ctx.fillText('KUASA', 824, 560);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('WASD / tombol panah', 224, 584);
  ctx.fillText('Cahaya menipis — ambil', 224, 606);
  ctx.fillText('bola cahaya untuk pulih.', 224, 628);
  ctx.fillText('Spasi: lari kilat,', 524, 584);
  ctx.fillText('tembus bayangan +50.', 524, 606);
  ctx.fillText('Bola dekat bayangan', 524, 628);
  ctx.fillText('bernilai +25.', 524, 650);
  drawPowerupIcon(ctx, 'shield', 838, 586, 8, PALETTE.shield);
  ctx.fillText('Perisai: tahan 1 hit', 856, 590);
  drawPowerupIcon(ctx, 'magnet', 838, 612, 8, PALETTE.magnet);
  ctx.fillText('Magnet: tarik cahaya', 856, 616);
  drawPowerupIcon(ctx, 'slowmo', 838, 638, 8, PALETTE.slowmo);
  ctx.fillText('Waktu melambat', 856, 642);
}

function drawPaused(ctx, world) {
  ctx.fillStyle = 'rgba(2, 8, 10, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('JEDA', VIEW.width / 2, 320);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Tekan P atau Enter untuk lanjut', VIEW.width / 2, 364);
  ctx.fillText('Tekan R untuk mulai dari awal', VIEW.width / 2, 394);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Skor ${world.score}  ·  Level ${world.level}  ·  ${formatTime(world.timeSurvived)}`, VIEW.width / 2, 438);
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(2, 6, 8, 0.66)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.danger;
  ctx.font = 'bold 58px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('CAHAYA PADAM', VIEW.width / 2, 176);
  if (world.newBest) {
    ctx.fillStyle = PALETTE.lantern;
    ctx.font = 'bold 21px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('★ Rekor baru! ★', VIEW.width / 2, 212);
  }
  panel(ctx, 400, 244, 480, 238);
  const rows = [
    ['Skor akhir', String(world.score)],
    ['Skor terbaik', String(world.best)],
    ['Cahaya terkumpul', String(world.orbsCollected)],
    ['Level tercapai', String(world.level)],
    ['Waktu bertahan', formatTime(world.timeSurvived)],
    ['Bayangan didash', String(world.wispsDashed)],
  ];
  ctx.font = '19px "Segoe UI", system-ui, sans-serif';
  let rowY = 282;
  for (const [label, value] of rows) {
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(label, 436, rowY);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 19px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(value, 844, rowY);
    ctx.font = '19px "Segoe UI", system-ui, sans-serif';
    rowY += 34;
  }
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('TEKAN ENTER UNTUK MAIN LAGI', VIEW.width / 2, 540);
  ctx.restore();
}

export function render(ctx, world, sounds) {
  ctx.save();
  if (world.shake > 0.2) {
    const mag = world.shake;
    ctx.translate((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag);
  }
  drawBackground(ctx, world);
  for (const orb of world.orbs) drawOrb(ctx, orb, world);
  for (const powerup of world.powerups) drawPowerup(ctx, powerup, world);
  for (const wisp of world.wisps) drawWisp(ctx, wisp, world);
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();

  if (world.screen === 'playing' || world.screen === 'paused') {
    drawHud(ctx, world, sounds);
    drawBanner(ctx, world);
  }
  if (world.screen === 'title') drawTitle(ctx, world);
  if (world.screen === 'paused') drawPaused(ctx, world);
  if (world.screen === 'over') drawGameOver(ctx, world);
}

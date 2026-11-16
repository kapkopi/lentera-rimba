// Entry point for Lentera Rimba: canvas setup, the frame loop, screen
// transitions, and screenshot staging. Game rules live in world.js, drawing
// in render.js; this file only wires them together.

import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { randomSeed } from './random.js';
import { render } from './render.js';
import { parseShotParams, stageShot } from './shots.js';
import { createWorld, startRun, updateWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const sounds = new SoundBank();
const shot = parseShotParams();

const world = shot
  ? createWorld(shot.seed)
  : createWorld(randomSeed());
if (shot) stageShot(world, shot.mode, shot.seed);

// Exposed for local debugging and screenshot tooling; the game never reads it.
window.__lentera = { world, sounds };

function handleScreens() {
  if (input.mouse.clicked) sounds.unlock();
  if (input.wasPressed('KeyM')) sounds.toggleMute();

  if (world.screen === 'title' && input.confirmPressed()) {
    sounds.unlock();
    sounds.click();
    startRun(world);
    return;
  }
  if (world.screen === 'playing' && input.wasPressed('KeyP')) {
    world.screen = 'paused';
    sounds.click();
    return;
  }
  if (world.screen === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Enter')) {
      world.screen = 'playing';
      sounds.click();
    } else if (input.wasPressed('KeyR')) {
      sounds.unlock();
      startRun(world);
    }
    return;
  }
  if (world.screen === 'over') {
    const settled = world.time - world.overAt > 0.8;
    if (settled && (input.confirmPressed() || input.wasPressed('KeyR'))) {
      sounds.unlock();
      sounds.click();
      startRun(world);
    }
  }
}

let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  if (shot) {
    // Staged screenshots keep their composition: time advances so glows and
    // bobs stay alive, but entities, particles and banners do not move on.
    world.time += dt;
  } else {
    handleScreens();
    updateWorld(world, input, sounds, dt);
  }
  render(ctx, world, sounds);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

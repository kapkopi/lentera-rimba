// Procedural sound effects with the Web Audio API: no audio files, every
// effect is a short oscillator envelope built when it is needed. The audio
// context starts only after a user gesture, and every call is guarded so the
// game plays silently anywhere audio is unavailable.

export class SoundBank {
  constructor() {
    this.context = null;
    this.muted = false;
    this.master = null;
  }

  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.context.destination);
    } catch {
      this.context = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
    return this.muted;
  }

  tone(freqFrom, freqTo, duration, type = 'sine', delay = 0) {
    if (!this.context || this.muted) return;
    try {
      const now = this.context.currentTime + delay;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqFrom, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(1, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch {
      // Sound is garnish; a failed effect never stops the game.
    }
  }

  collect(risky) {
    this.tone(risky ? 740 : 620, risky ? 1180 : 940, 0.12, 'sine');
    if (risky) this.tone(1180, 1560, 0.1, 'sine', 0.07);
  }

  hit() {
    this.tone(220, 55, 0.28, 'sawtooth');
    this.tone(140, 40, 0.3, 'square', 0.02);
  }

  dash() {
    this.tone(300, 900, 0.14, 'triangle');
  }

  dashKill() {
    this.tone(880, 220, 0.16, 'square');
    this.tone(1320, 660, 0.12, 'sine', 0.05);
  }

  levelUp() {
    this.tone(523, 523, 0.1, 'triangle');
    this.tone(659, 659, 0.1, 'triangle', 0.09);
    this.tone(784, 784, 0.16, 'triangle', 0.18);
  }

  dawn() {
    this.tone(392, 392, 0.12, 'sine');
    this.tone(523, 523, 0.12, 'sine', 0.1);
    this.tone(659, 659, 0.12, 'sine', 0.2);
    this.tone(784, 784, 0.24, 'sine', 0.3);
  }

  powerup() {
    this.tone(520, 1040, 0.18, 'sine');
    this.tone(1040, 1560, 0.14, 'sine', 0.1);
  }

  click() {
    this.tone(660, 880, 0.07, 'sine');
  }

  gameOver() {
    this.tone(392, 196, 0.5, 'sine');
    this.tone(311, 155, 0.6, 'sine', 0.22);
    this.tone(233, 116, 0.7, 'sine', 0.44);
  }
}

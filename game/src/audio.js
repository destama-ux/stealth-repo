// MOTHLIGHT — sound, generated live with WebAudio, no audio files.
// One clear job: every beep, chime and footstep the game makes.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  // Browsers only allow audio after a user gesture; call this from a key or click.
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // One short oscillator note: frequency, seconds, shape, loudness.
  tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A soft filtered-noise tap: footsteps and the pebble's clink.
  tap(vol, cutoff, dur = 0.06) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  step(quiet) {
    this.tap(quiet ? 0.05 : 0.11, quiet ? 500 : 900, 0.05);
  }

  guardStep(distanceTiles) {
    // Louder when the guard is close: footsteps tell you where a guard is.
    const vol = Math.max(0, 0.22 - distanceTiles * 0.028);
    if (vol <= 0.01) return;
    this.tap(vol, 420, 0.07);
  }

  pebble() {
    this.tone(1900, 0.07, 'triangle', 0.16, 0, 900);
    this.tap(0.12, 3200, 0.04);
  }

  pickup() {
    this.tone(880, 0.14, 'sine', 0.2);
    this.tone(1318, 0.2, 'sine', 0.18, 0.09);
  }

  spotted() {
    this.tone(196, 0.32, 'sawtooth', 0.16, 0, 392);
    this.tone(147, 0.4, 'sawtooth', 0.12, 0.1, 98);
  }

  caught() {
    this.tone(220, 0.5, 'sawtooth', 0.22, 0, 55);
    this.tone(110, 0.7, 'square', 0.12, 0.15, 55);
  }

  levelClear() {
    this.tone(523, 0.16, 'sine', 0.2);
    this.tone(659, 0.16, 'sine', 0.2, 0.13);
    this.tone(784, 0.3, 'sine', 0.22, 0.26);
  }

  victory() {
    const notes = [523, 659, 784, 1046, 784, 1046];
    notes.forEach((n, i) => this.tone(n, 0.22, 'sine', 0.2, i * 0.14));
  }

  exitOpen() {
    this.tone(392, 0.2, 'triangle', 0.16);
    this.tone(587, 0.3, 'triangle', 0.16, 0.12);
  }
}

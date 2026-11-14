/**
 * Sintetizador de áudio cozy 8-bit/suave via Web Audio API (zero arquivos externos).
 */
class PurrSound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensureContext() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  tone(freq, duration = 0.12, type = 'sine', volume = 0.08, delay = 0, slideTo = null) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  playClick() {
    this.tone(540, 0.055, 'triangle', 0.06, 0, 640);
  }

  playCoin() {
    this.tone(987.77, 0.07, 'square', 0.045, 0);
    this.tone(1318.51, 0.14, 'square', 0.045, 0.07);
  }

  playMeow() {
    // Miado fofo ascendente-descendente
    const ctx = this.ensureContext();
    if (!ctx) return;
    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, start);
    osc.frequency.exponentialRampToValueAtTime(840, start + 0.11);
    osc.frequency.exponentialRampToValueAtTime(590, start + 0.28);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.09, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.30);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.32);
  }

  playPurr() {
    // Ronronar rítmico suave
    for (let i = 0; i < 4; i++) {
      this.tone(95 + (i % 2) * 12, 0.09, 'triangle', 0.055, i * 0.1);
    }
  }

  playTimerComplete() {
    // Melodia cozy de conclusão
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.18, 'triangle', 0.085, idx * 0.11);
    });
    this.tone(1318.51, 0.32, 'sine', 0.08, 0.45);
  }

  playSad() {
    this.tone(440, 0.18, 'triangle', 0.07, 0, 349.23);
    this.tone(329.63, 0.28, 'triangle', 0.065, 0.18, 246.94);
  }
}

window.purrSound = new PurrSound();


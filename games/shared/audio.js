// One context for the entire arcade; every oscillator is tracked and stopped on exit.
export class ArcadeAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.voices = new Set();
  }
  unlock() {
    try {
      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.11;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended")
        this.context.resume().catch(() => {});
    } catch {
      /* Silent play remains available when audio is blocked. */
    }
  }
  mute(value) {
    this.muted = value;
    if (this.master) this.master.gain.value = value ? 0 : 0.11;
    if (value) this.stop();
  }
  tone(
    frequency,
    duration = 0.15,
    delay = 0,
    type = "sine",
    endFrequency = frequency,
  ) {
    if (!this.context || this.context.state !== "running" || this.muted) return;
    const start = this.context.currentTime + delay,
      osc = this.context.createOscillator(),
      gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(30, endFrequency),
      start + duration,
    );
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.65, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(this.master);
    const voice = { osc, gain };
    this.voices.add(voice);
    osc.onended = () => {
      this.voices.delete(voice);
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
  play(name) {
    if (name === "pop") this.tone(850, 0.13, 0, "sine", 230);
    if (name === "reveal") this.tone(470, 0.13, 0, "sine", 650);
    if (name === "match") {
      this.tone(580, 0.2);
      this.tone(780, 0.25, 0.11);
    }
    if (name === "miss") this.tone(290, 0.12, 0, "sine", 250);
    if (name === "diamond") {
      this.tone(880, 0.12);
      this.tone(1320, 0.15, 0.045);
    }
    if (name === "damage") this.tone(170, 0.24, 0, "triangle", 95);
    if (name === "win")
      for (const [i, n] of [523, 659, 784, 1047].entries())
        this.tone(n, 0.3, i * 0.12);
  }
  stop() {
    for (const voice of this.voices) {
      voice.osc.onended = null;
      try {
        voice.osc.stop();
      } catch {}
      voice.osc.disconnect();
      voice.gain.disconnect();
    }
    this.voices.clear();
  }
}

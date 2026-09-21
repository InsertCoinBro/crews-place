import { SOURCES } from "./audio-sources.js";
export { SOURCES };

const clamp = (v, min = 0, max = 1) =>
  Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
const SETTINGS_KEY = "crews-place-world-audio-v2";
export function distanceVolume(source, listener, radius) {
  if (!source || !listener || !(radius > 0)) return 0;
  const d = Math.hypot(
    source.x - listener.x,
    (source.y ?? 0) - (listener.y ?? 0),
    source.z - listener.z,
  );
  const t = clamp((d - radius * 0.22) / (radius * 0.78));
  return 1 - t * t * (3 - 2 * t);
}

export class WorldAudio {
  constructor({ contextFactory, fetcher, random = Math.random, storage } = {}) {
    this.contextFactory =
      contextFactory ??
      (() => {
        const Context =
          globalThis.AudioContext ?? globalThis.webkitAudioContext;
        return Context ? new Context() : null;
      });
    this.fetcher =
      fetcher ?? ((url, options) => globalThis.fetch(url, options));
    this.random = random;
    this.settings = {
      volume: 0.8,
      ambience: 0.65,
      gentle: false,
      muted: false,
    };
    try {
      this.storage = storage ?? globalThis.localStorage;
      const saved = JSON.parse(this.storage?.getItem(SETTINGS_KEY) ?? "null");
      if (saved) {
        this.settings.volume = clamp(saved.volume ?? 0.8);
        this.settings.ambience = clamp(saved.ambience ?? 0.65);
        this.settings.gentle = saved.gentle === true;
        this.settings.muted = saved.muted === true;
      }
    } catch {
      /* Storage can be disabled. */
    }
    this.context = null;
    this.buffers = new Map();
    this.loading = new Map();
    this.failed = new Map();
    this.loops = new Map();
    this.oneshots = new Set();
    this.animals = new Map();
    this.time = 0;
    this.epoch = 0;
    this.duck = 1;
    this.lastError = null;
  }

  // Called synchronously from Start, Resume, pointer and keyboard gestures.
  unlock() {
    try {
      if (!this.context) {
        this.context = this.contextFactory();
        if (!this.context) return;
        this.master = this.context.createGain();
        this.filter = this.context.createBiquadFilter();
        this.filter.type = "lowpass";
        this.filter.frequency.value = this.settings.gentle ? 4000 : 16000;
        this.limiter = this.context.createDynamicsCompressor();
        this.limiter.threshold.value = -6;
        this.limiter.knee.value = 9;
        this.limiter.ratio.value = 12;
        this.limiter.attack.value = 0.008;
        this.limiter.release.value = 0.2;
        this.master.gain.value = this.masterVolume;
        this.master.connect(this.filter);
        this.filter.connect(this.limiter);
        this.limiter.connect(this.context.destination);
      }
      if (this.context.state !== "running")
        this.context.resume().catch((e) => this.report("Audio start", e));
    } catch (e) {
      this.report("Audio start", e);
    }
  }

  get masterVolume() {
    return this.settings.muted
      ? 0
      : this.settings.volume * (this.settings.gentle ? 0.55 : 1);
  }

  configure(values) {
    for (const key of ["volume", "ambience"])
      if (key in values) this.settings[key] = clamp(values[key]);
    for (const key of ["muted", "gentle"])
      if (key in values) this.settings[key] = Boolean(values[key]);
    try {
      this.storage?.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {}
    if (this.masterVolume === 0) this.stopAll();
    if (this.context) {
      this.master.gain.setTargetAtTime(
        this.masterVolume,
        this.context.currentTime,
        0.08,
      );
      this.filter.frequency.setTargetAtTime(
        this.settings.gentle ? 4000 : 16000,
        this.context.currentTime,
        0.15,
      );
    }
  }

  report(name, error) {
    this.lastError = name + ": " + (error?.message ?? error);
    console.warn(this.lastError);
  }

  async load(url) {
    if (!url || !this.context) return null;
    if (this.buffers.has(url)) return this.buffers.get(url);
    if (this.failed.has(url) && this.time - this.failed.get(url) < 15)
      return null;
    if (!this.loading.has(url)) {
      const promise = (async () => {
        try {
          const response = await this.fetcher(url);
          if (!response.ok) throw new Error("HTTP " + response.status);
          const buffer = await this.context.decodeAudioData(
            await response.arrayBuffer(),
          );
          this.buffers.set(url, buffer);
          this.failed.delete(url);
          return buffer;
        } catch (e) {
          this.failed.set(url, this.time);
          this.report(url, e);
          return null;
        } finally {
          this.loading.delete(url);
        }
      })();
      this.loading.set(url, promise);
    }
    return this.loading.get(url);
  }

  voice(buffer, loop, volume, rate = 1) {
    const node = this.context.createBufferSource();
    const gain = this.context.createGain();
    node.buffer = buffer;
    node.loop = loop;
    node.playbackRate.value = clamp(rate, 0.5, 1.8);
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(
      volume,
      this.context.currentTime,
      loop ? 0.22 : 0.015,
    );
    node.connect(gain);
    gain.connect(this.master);
    const voice = { node, gain, stopped: false };
    node.onended = () => {
      node.disconnect();
      gain.disconnect();
      this.oneshots.delete(voice);
      voice.stopped = true;
    };
    node.start();
    return voice;
  }

  stopVoice(voice, fade = 0.1) {
    if (!voice || voice.stopped) return;
    voice.stopped = true;
    voice.gain.gain.cancelScheduledValues(this.context.currentTime);
    voice.gain.gain.setTargetAtTime(0, this.context.currentTime, fade / 3);
    voice.node.stop(this.context.currentTime + fade);
    this.oneshots.delete(voice);
  }

  setLoop(
    name,
    active,
    volume = 0,
    source = SOURCES[name],
    rate = 1,
    category = "effects",
  ) {
    const target =
      active && source && this.masterVolume > 0 ? clamp(volume) : 0;
    let item = this.loops.get(name);
    if (!item && target <= 0) return; // No silent play/pause churn out of range.
    if (!item) {
      item = { source, target, rate, category, voice: null, pending: false };
      this.loops.set(name, item);
    }
    if (item.source !== source) {
      this.stopVoice(item.voice);
      item.voice = null;
      item.source = source;
    }
    Object.assign(item, { target, rate, category });
  }

  proximity(
    name,
    position,
    listener,
    radius,
    volume = 1,
    source = SOURCES[name],
    rate = 1,
  ) {
    this.setLoop(
      name,
      true,
      distanceVolume(position, listener, radius) * volume,
      source,
      rate,
      "ambience",
    );
  }

  animal(name, species, position, listener, radius = 14, volume = 0.7) {
    let item = this.animals.get(name);
    if (!item) {
      item = { next: this.time + 0.65, voice: null, pending: false };
      this.animals.set(name, item);
    }
    Object.assign(item, { species, position, listener, radius, volume });
  }

  async oneShot(name, volume = 1, source = SOURCES[name]) {
    if (
      !source ||
      !this.context ||
      this.context.state !== "running" ||
      this.masterVolume <= 0 ||
      this.oneshots.size >= 6
    )
      return null;
    const epoch = this.epoch,
      requested = this.time;
    const buffer = await this.load(source);
    if (
      !buffer ||
      epoch !== this.epoch ||
      this.time - requested > 1.5 ||
      this.masterVolume <= 0 ||
      this.context.state !== "running" ||
      this.oneshots.size >= 6
    )
      return null;
    const v = this.voice(buffer, false, clamp(volume) * this.duck);
    this.oneshots.add(v);
    return v;
  }

  async startLoop(item) {
    item.pending = true;
    const epoch = this.epoch,
      url = item.source;
    const buffer = await this.load(url);
    item.pending = false;
    if (
      !buffer ||
      epoch !== this.epoch ||
      item.source !== url ||
      item.target <= 0 ||
      this.masterVolume <= 0 ||
      this.context.state !== "running"
    )
      return;
    item.voice = this.voice(buffer, true, 0, item.rate);
  }

  async startAnimal(item) {
    item.pending = true;
    const epoch = this.epoch;
    const buffer = await this.load(SOURCES[item.species]);
    item.pending = false;
    const attenuation = distanceVolume(
      item.position,
      item.listener,
      item.radius,
    );
    if (
      !buffer ||
      epoch !== this.epoch ||
      attenuation <= 0.08 ||
      this.masterVolume <= 0 ||
      this.settings.ambience <= 0 ||
      this.duck <= 0.5 ||
      this.context.state !== "running"
    )
      return;
    if (
      [...this.animals.values()].filter((a) => a.voice && !a.voice.stopped)
        .length >= (this.settings.gentle ? 1 : 2)
    )
      return;
    item.voice = this.voice(
      buffer,
      false,
      item.volume * attenuation * this.duck * this.settings.ambience,
    );
    this.oneshots.add(item.voice);
    item.next = this.time + buffer.duration + 9 + this.random() * 9;
  }

  update(dt) {
    this.time += Math.max(0, dt);
    if (
      !this.context ||
      this.context.state !== "running" ||
      this.masterVolume <= 0
    )
      return;
    const now = this.context.currentTime;
    for (const item of this.loops.values()) {
      if (item.target > 0 && !item.voice && !item.pending)
        void this.startLoop(item);
      if (!item.voice) continue;
      const volume =
        item.target *
        this.duck *
        (item.category === "ambience" ? this.settings.ambience : 1);
      item.voice.gain.gain.setTargetAtTime(volume, now, 0.22);
      item.voice.node.playbackRate.setTargetAtTime(
        clamp(item.rate, 0.5, 1.8),
        now,
        0.25,
      );
      if (item.target === 0) {
        this.stopVoice(item.voice, 0.7);
        item.voice = null;
      }
    }
    for (const item of this.animals.values()) {
      const volume =
        distanceVolume(item.position, item.listener, item.radius) *
        item.volume *
        this.settings.ambience;
      if (item.voice && !item.voice.stopped)
        item.voice.gain.gain.setTargetAtTime(volume * this.duck, now, 0.18);
      const busy = [...this.animals.values()].filter(
        (a) => a.pending || (a.voice && !a.voice.stopped),
      ).length;
      if (
        volume > 0.08 &&
        this.duck > 0.5 &&
        this.time >= item.next &&
        !item.pending &&
        (!item.voice || item.voice.stopped) &&
        busy < (this.settings.gentle ? 1 : 2)
      ) {
        item.next = this.time + 3;
        void this.startAnimal(item);
      }
    }
  }

  stopAll() {
    this.epoch++; // Pending loads cannot resurrect sounds after exit or pause.
    for (const item of this.loops.values()) {
      item.target = 0;
      this.stopVoice(item.voice);
      item.voice = null;
    }
    for (const v of [...this.oneshots]) this.stopVoice(v);
    this.animals.clear();
  }
}

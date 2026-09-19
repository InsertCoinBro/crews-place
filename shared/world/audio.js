const asset = (path) => new URL(`../../assets/audio/sfx/${path}`, import.meta.url).href;

const SOURCES = Object.freeze({
  trampolineSpring: asset("mechanical/trampoline-spring.ogg"),
  trampolineBounce: asset("mechanical/trampoline-bounce.ogg"),
  coasterWheels: asset("rides/coaster-wheels-loop.ogg"),
  coasterRail: asset("rides/coaster-rail-rattle.ogg"),
  coasterRatchet: asset("rides/rollercoaster-ratchet-cc0.mp3"),
  spaceDiveWind: asset("rides/space-dive-wind-loop.ogg"),
  spaceDiveBrake: asset("rides/space-dive-brake.ogg"),
  tractorEngine: asset("vehicles/tractor-engine-loop.ogg"),
  carEngine: asset("vehicles/blue-car-engine-loop.ogg"),
  traffic: asset("vehicles/traffic-ambience-loop.ogg"),
  horse: asset("animals/horse-ambience.ogg"),
  animals: asset("animals/animal-ambience-loop.ogg"),
  rain: asset("nature/rain-loop.ogg"),
  snow: asset("nature/snow-loop.ogg"),
  wind: asset("nature/wind-loop.ogg"),
  swing: asset("playground/playground-swing-loop.ogg"),
  spinner: asset("playground/playground-spinner-loop.ogg"),
  slide: asset("playground/playground-slide-whoosh.ogg"),
  hoop: asset("aviation/flight-hoop-pass.ogg"),
  leavesRustle: asset("nature/leaves-rustling-cc0.mp3"),
  fountain: asset("nature/fountain-cc0.mp3"),
  doorOpen: asset("space/doorOpen_000.ogg"),
  doorClose: asset("space/doorClose_000.ogg"),
  spaceEngine: asset("space/spaceEngineSmall_000.ogg"),
  spaceEngineLarge: asset("space/spaceEngineLarge_000.ogg"),
  thruster: asset("space/thrusterFire_000.ogg"),
  bubble: asset("space/forceField_000.ogg"),
  click: asset("ui/click_001.ogg"),
  confirm: asset("ui/confirmation_001.ogg"),
  land: asset("movement/impactSoft_medium_000.ogg"),
});

const clamp01 = (value) => Math.max(0, Math.min(1, value));

function distanceVolume(source, listener, radius) {
  if (!source || !listener) return 0;
  const distance = Math.hypot(
    source.x - listener.x,
    source.z - listener.z,
  );
  return clamp01(1 - distance / radius);
}

export class WorldAudio {
  constructor() {
    this.master = 0.62;
    this.calm = false;
    this.loops = new Map();
    this.oneshots = new Set();
    this.available = typeof globalThis.Audio === "function";
  }

  loop(name, source = SOURCES[name]) {
    if (!source || !this.available) return null;
    let item = this.loops.get(name);
    if (!item) {
      const audio = new Audio(source);
      audio.preload = "auto";
      audio.loop = true;
      audio.volume = 0;
      item = { audio, target: 0, volume: 0 };
      this.loops.set(name, item);
    }
    return item;
  }

  setLoop(name, active, volume = 0, source = SOURCES[name]) {
    const item = this.loop(name, source);
    if (!item) return;
    item.target = active ? clamp01(volume) : 0;
    if (active && item.audio.paused) {
      item.audio.play().catch(() => {});
    }
  }

  proximity(name, source, listener, radius, volume = 1, audioSource) {
    this.setLoop(
      name,
      Boolean(source && listener),
      distanceVolume(source, listener, radius) * volume,
      audioSource,
    );
  }

  oneShot(name, volume = 1, source = SOURCES[name]) {
    if (!source || !this.available) return;
    const audio = new Audio(source);
    audio.preload = "auto";
    audio.volume = clamp01(volume * this.master);
    this.oneshots.add(audio);
    audio.onended = () => this.oneshots.delete(audio);
    audio.play().catch(() => this.oneshots.delete(audio));
  }

  update(dt) {
    for (const item of this.loops.values()) {
      const rate = 1 - Math.exp(-dt * 7);
      item.volume += (item.target * this.master - item.volume) * rate;
      item.audio.volume = clamp01(item.volume);
      if (!item.audio.paused && item.target === 0 && item.volume < 0.004) {
        item.audio.pause();
        item.audio.currentTime = 0;
      }
    }
  }

  setCalm(calm) {
    this.calm = calm;
  }

  stopAll() {
    for (const item of this.loops.values()) {
      item.target = 0;
      item.audio.pause();
      item.audio.currentTime = 0;
      item.volume = 0;
    }
    for (const audio of this.oneshots) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.oneshots.clear();
  }
}

export { SOURCES, distanceVolume };

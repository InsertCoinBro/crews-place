import test from "node:test";
import assert from "node:assert/strict";
import { distanceVolume, WorldAudio, SOURCES } from "../shared/world/audio.js";

class FakeParam {
  constructor(value = 0) {
    this.value = value;
  }
  setTargetAtTime(value) {
    this.value = value;
  }
  cancelScheduledValues() {}
}

class FakeNode {
  constructor() {
    this.gain = new FakeParam();
    this.playbackRate = new FakeParam(1);
    this.onended = null;
    this.stopped = false;
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() {
    this.stopped = true;
    this.onended?.();
  }
}

class FakeContext {
  constructor() {
    this.state = "running";
    this.currentTime = 0;
    this.destination = {};
    this.sources = [];
  }
  createGain() {
    return new FakeNode();
  }
  createBiquadFilter() {
    const node = new FakeNode();
    node.frequency = new FakeParam(16000);
    node.type = "lowpass";
    return node;
  }
  createDynamicsCompressor() {
    const node = new FakeNode();
    node.threshold = new FakeParam();
    node.knee = new FakeParam();
    node.ratio = new FakeParam();
    node.attack = new FakeParam();
    node.release = new FakeParam();
    return node;
  }
  createBufferSource() {
    const node = new FakeNode();
    this.sources.push(node);
    return node;
  }
  decodeAudioData() {
    return Promise.resolve({ duration: 2 });
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
}

test("proximity volume is smooth and silent outside its radius", () => {
  const listener = { x: 0, y: 0, z: 0 };
  assert.equal(distanceVolume({ x: 0, y: 0, z: 0 }, listener, 10), 1);
  assert.ok(distanceVolume({ x: 5, y: 0, z: 0 }, listener, 10) > 0);
  assert.equal(distanceVolume({ x: 11, y: 0, z: 0 }, listener, 10), 0);
});

test("world audio starts and fades a loop through the shared graph", async () => {
  const context = new FakeContext();
  const audio = new WorldAudio({
    contextFactory: () => context,
    fetcher: async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    }),
    storage: null,
  });
  audio.unlock();
  audio.setLoop("test", true, 0.5, "test.mp3");
  audio.update(0);
  await new Promise((resolve) => setTimeout(resolve, 0));
  audio.update(0);
  assert.equal(context.sources.length, 1);
  assert.equal(audio.loops.get("test").voice.node.loop, true);

  audio.setLoop("test", false, 0, "test.mp3");
  audio.update(0.1);
  assert.equal(context.sources[0].stopped, true);
  assert.equal(audio.loops.get("test").voice, null);
});

test("late downloads cannot restart audio after pause or mute", async () => {
  const context = new FakeContext();
  let release;
  let requests = 0;
  const audio = new WorldAudio({
    contextFactory: () => context,
    fetcher: () => {
      requests++;
      return new Promise((resolve) => {
        release = resolve;
      });
    },
  });
  audio.unlock();
  audio.setLoop("engine", true, 0.5, "shared.mp3");
  audio.update(0);
  const pending = audio.oneShot("event", 0.5, "shared.mp3");
  audio.stopAll();
  release({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
  await pending;
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(requests, 1, "concurrent requests share one download");
  assert.equal(
    context.sources.length,
    0,
    "stale loop and one-shot stay stopped",
  );
  audio.configure({ muted: true });
  audio.setLoop("engine", true, 0.5, "shared.mp3");
  audio.update(1);
  assert.equal(context.sources.length, 0);
});

test("animals use complete species calls, respect proximity and gentle concurrency", async () => {
  const context = new FakeContext();
  const audio = new WorldAudio({
    contextFactory: () => context,
    random: () => 0,
  });
  audio.unlock();
  audio.configure({ gentle: true });
  const cow = { duration: 2 },
    horse = { duration: 3 };
  audio.buffers.set(SOURCES.cow, cow);
  audio.buffers.set(SOURCES.horse, horse);
  const listener = { x: 0, z: 0 };
  audio.animal("cow", "cow", { x: 40, z: 0 }, listener);
  audio.update(1);
  assert.equal(context.sources.length, 0);
  audio.animal("cow", "cow", listener, listener);
  audio.animal("horse", "horse", listener, listener);
  audio.update(1);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].buffer, cow);
  assert.equal(context.sources[0].loop, false);
  audio.update(0.5);
  assert.equal(
    context.sources.length,
    1,
    "frames do not restart or stack calls",
  );
  audio.animal("cow", "cow", { x: 40, z: 0 }, listener);
  audio.update(0);
  assert.equal(audio.animals.get("cow").voice.gain.gain.value, 0);
  audio.configure({ ambience: 0 });
  context.sources[0].stop();
  audio.update(30);
  assert.equal(
    context.sources.length,
    1,
    "zero background volume prevents animal playback",
  );
});

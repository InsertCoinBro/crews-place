import { SOURCES } from "../shared/world/audio.js";
import { mixWorldAudio, mixRocketAudio } from "../shared/world/audio-mix.js";

// Development-only integration check: real asset downloads, browser decoding,
// playback graph, and game activity transitions. No microphone is used.
export function addAudioChecks(game) {
  const panel = document.createElement("section");
  panel.style.cssText =
    "position:fixed;inset:12px auto auto 12px;max-height:85vh;overflow:auto;z-index:100;background:#fff;color:#173e38;padding:16px;max-width:520px";
  panel.innerHTML =
    '<button>Run audio checks</button><pre aria-live="polite"></pre>';
  document.body.append(panel);
  const button = panel.querySelector("button");
  const output = panel.querySelector("pre");
  button.onclick = async () => {
    button.disabled = true;
    game.start(); // Actual user gesture unlocks the browser audio context.
    game.running = false;
    const a = game.audio;
    const saved = { ...a.settings };
    const savedPosition = game.player.position.clone();
    const calm = game.calm;
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const check = (ok, label) => {
      if (!ok) throw new Error(label);
      output.textContent += `PASS ${label}\n`;
    };
    const clear = async () => {
      a.stopAll();
      await wait(180);
    };
    const weather = { rain: 0, snow: 0, windX: 0, windZ: 0 };
    const mix = async (state = weather) => {
      mixWorldAudio(game, state);
      a.update(1);
      await wait(20);
      a.update(0);
      await wait(250);
    };
    let analyser;
    try {
      a.configure({ volume: 0.8, ambience: 0.65, muted: false, gentle: false });
      await a.context.resume();
      const buffers = await Promise.all(
        Object.values(SOURCES).map((url) => a.load(url)),
      );
      check(
        buffers.every((buffer) => buffer?.duration > 0),
        `${buffers.length} assets downloaded and decoded`,
      );
      check(
        buffers.every((buffer) =>
          buffer.getChannelData(0).some((v) => Math.abs(v) > 0.001),
        ),
        "All decoded clips contain an audio signal",
      );
      analyser = a.context.createAnalyser();
      analyser.fftSize = 2048;
      a.limiter.connect(analyser);
      const signal = () => {
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        return Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);
      };
      await clear();
      game.player.teleport(0, 110);
      await mix();
      check(
        [...a.animals.values()].every((item) => !item.voice),
        "Distant animals stay silent",
      );
      for (const [index, species] of [
        "cow",
        "horse",
        "pig",
        "sheep",
        "goat",
        "chicken",
        "duck",
        "rabbit",
      ].entries()) {
        await clear();
        game.player.position.copy(game.farm.animals[index].position);
        await mix();
        const item = a.animals.get("farm-" + species);
        check(
          item?.voice?.node.buffer === a.buffers.get(SOURCES[species]) &&
            !item.voice.node.loop,
          `${species}: matching natural call, no repeated loop`,
        );
      }
      check(
        signal() > 0.00001,
        "Nearby animal signal reaches the output graph",
      );
      await clear();
      game.player.teleport(0, 110);
      game.coaster.board();
      await mix();
      check(
        !a.loops.get("coasterWheels")?.voice,
        "Coaster is silent before launch",
      );
      game.coaster.launch();
      game.coaster.ride.update(20);
      await mix();
      check(
        a.loops.get("coasterWheels")?.voice && signal() > 0.00001,
        "Launched coaster produces output",
      );
      game.coaster.exit();
      await mix();
      check(
        !a.loops.get("coasterWheels")?.voice,
        "Coaster exit stops the rail loop",
      );
      await clear();
      game.spaceDive.board();
      game.spaceDive.launch();
      game.spaceDive.ride.update(20);
      await mix({ ...weather, rain: 1 });
      check(
        a.loops.get("spaceDiveWind")?.voice && !a.loops.get("rain")?.voice,
        "Space Dive has ride wind without town rain",
      );
      game.spaceDive.exit();
      await mix();
      check(!a.loops.get("spaceDiveWind")?.voice, "Space Dive exit stops wind");
      await clear();
      game.enterVehicle();
      game.vehicle.speed = 8;
      await mix();
      check(
        a.loops.get("carEngine")?.voice &&
          a.loops.get("carRoad")?.voice &&
          signal() > 0.00001,
        "Car engine and rolling layer produce output",
      );
      const fastRate = a.loops.get("carEngine").rate;
      game.vehicle.speed = 0;
      await mix();
      check(
        a.loops.get("carEngine").rate < fastRate &&
          !a.loops.get("carRoad").voice,
        "Stopping car lowers engine pitch and stops rolling layer",
      );
      game.exitVehicle();
      await clear();
      game.cornMaze.enter();
      await mix();
      check(
        a.loops.get("tractorEngine")?.voice,
        "Tractor engine plays while occupied",
      );
      game.cornMaze.exit();
      await clear();
      game.enterPlane();
      await mix();
      check(
        a.loops.get("plane")?.voice && signal() > 0.00001,
        "Plane uses the shared recording mixer",
      );
      game.exitPlane();
      game.enter("space");
      for (const ride of ["swing", "spinner", "slide"]) {
        await clear();
        game.playground.enter(ride);
        if (ride === "slide") {
          await mix();
          check(
            !a.loops.get("slide")?.voice,
            "Slide lift is silent before descent",
          );
          game.playground.update(8);
        }
        await mix();
        check(
          a.loops.get(ride)?.voice,
          `${ride}: sound starts during movement`,
        );
        game.playground.exit();
        await mix();
        check(!a.loops.get(ride)?.voice, `${ride}: exit stops sound`);
      }
      game.enter("town");
      game.player.teleport(0, 110);
      await clear();
      await mix({ ...weather, rain: 1, windX: -4, windZ: -2 });
      check(
        a.loops.get("rain")?.voice && a.loops.get("wind")?.voice,
        "Rain and wind work in negative wind directions",
      );
      a.configure({ muted: true });
      await wait(700);
      check(
        signal() < 0.000001 &&
          [...a.loops.values()].every((item) => !item.voice),
        "Mute stops output and active loops",
      );
      a.configure({ muted: false, gentle: true });
      check(
        game.calm === calm && Math.abs(a.masterVolume - 0.44) < 0.0001,
        "Gentle audio leaves motion unchanged and reduces volume",
      );
      await clear();
      a.configure({ gentle: false });
      game.startRocketJourney();
      game.updateRocketJourney(6);
      mixRocketAudio(game);
      a.update(0);
      await wait(20);
      a.update(0);
      await wait(350);
      check(
        a.loops.get("rocket")?.voice && signal() > 0.00001,
        "Rocket thrust produces output",
      );
      game.rocket.skip();
      game.updateRocketJourney(0);
      mixRocketAudio(game);
      a.update(0);
      check(!a.loops.get("rocket")?.voice, "Rocket landing stops thrust audio");
      game.pause();
      check(
        [...a.loops.values()].every((item) => !item.voice) &&
          a.oneshots.size === 0,
        "Pause clears all world audio",
      );
      check(!a.lastError, "No audio loading or decoding errors");
      output.textContent += "ALL AUDIO CHECKS PASSED\n";
    } catch (error) {
      output.textContent += `FAIL ${error.message}\n`;
      console.error(error);
    } finally {
      a.stopAll();
      if (analyser) a.limiter.disconnect(analyser);
      if (game.rocket.active) {
        game.rocket.skip();
        game.updateRocketJourney(0);
      }
      game.enter("town", [savedPosition.x, savedPosition.z]);
      a.configure(saved);
      game.mode = "paused";
      game.running = true;
      game.lastTime = performance.now();
      game.frame(game.lastTime);
      button.disabled = false;
    }
  };
}

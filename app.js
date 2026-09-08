import * as THREE from "three";
import { Input } from "./shared/core/input.js";
import { Player } from "./shared/core/player.js";
import {
  loadPlayerCharacter,
  CHARACTERS,
} from "./shared/world/player-character.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Pickups } from "./shared/world/pickups.js";
import { FollowCamera } from "./shared/core/camera.js";
import { Interactions } from "./shared/core/interactions.js";
import { buildTown } from "./shared/world/town.js";
import { buildInterior } from "./shared/world/interiors.js";
import { TRAFFIC_ROUTES, Traffic } from "./shared/world/traffic.js";
import { DriveableCar } from "./shared/world/vehicle.js";
import { NPCs } from "./shared/world/npcs.js";
import { loadHorseNPC, Wildlife } from "./shared/world/wildlife.js";
import { Leaves } from "./shared/world/leaves.js";
import { UI } from "./shared/components/ui.js";
import { destinations } from "./games/destinations.js";
import { ArcadeManager } from "./games/arcade.js";
import { RollerCoaster } from "./shared/world/coaster.js";
import { COASTER_EXIT } from "./shared/world/coaster-track.js";
import { LibraryReader } from "./games/library.js";
import { Farm, FARM_SITE } from "./shared/world/farm.js";
import { buildSpace } from "./shared/world/space.js";
import { buildAirfield, FlyablePlane } from "./shared/world/airfield.js";

function showError(error) {
  console.error(error);
  document.querySelector("#error").hidden = false;
  document.querySelector("#error-copy").textContent =
    "The game could not continue. " + error.message;
}
class Game {
  constructor(characters, initialCharacter, horseGltf = null) {
    this.characters = characters;
    this.canvas = document.querySelector("#world");
    this.mode = "opening";
    this.calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environment.texture;
    room.dispose();
    pmrem.dispose();
    this.scene.background = new THREE.Color(0xc5e2e0);
    this.scene.fog = new THREE.Fog(0xc5e2e0, 105, 235);
    this.skyLight = new THREE.HemisphereLight(0xe6f7ff, 0xc3b995, 2.2);
    this.scene.add(this.skyLight);
    this.sun = new THREE.DirectionalLight(0xffedcb, 3.2);
    this.sun.position.set(-24, 38, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -48,
      right: 48,
      top: 48,
      bottom: -48,
      near: 0.5,
      far: 135,
    });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.camera = new THREE.PerspectiveCamera(
      55,
      innerWidth / innerHeight,
      0.1,
      320,
    );
    this.input = new Input(this.canvas);
    this.interactions = new Interactions();
    this.ui = new UI();
    const town = buildTown(this.scene, this.interactions);
    this.areas = {
      town,
      arcade: buildInterior(this.scene, this.interactions, "arcade", 100),
      library: buildInterior(this.scene, this.interactions, "library", 130),
      rec: buildInterior(this.scene, this.interactions, "rec", 160),
      space: buildSpace(this.scene),
    };
    this.area = town;
    this.player = new Player(this.scene, characters.get(initialCharacter));
    this.pickups = new Pickups(town.group);
    this.follow = new FollowCamera(this.camera);
    this.follow.calm = this.calm;
    this.traffic = new Traffic(town.group);
    const carRoute = TRAFFIC_ROUTES[1];
    const carStart =
      carRoute.segments.slice(0, 5).reduce((a, b) => a + b, 0) + 14;
    this.vehicle = new DriveableCar(town.group, carRoute, carStart);
    this.vehicleInteraction = this.interactions.register({
      id: "player-car",
      area: "town",
      kind: "vehicle",
      x: this.vehicle.model.position.x,
      z: this.vehicle.model.position.z,
      radius: 3.3,
      label: "Big Blue Car",
      hint: "Press E to get in and drive",
    });
    this.vehicle.interaction = this.vehicleInteraction;
    this.driving = false;
    this.airfield = buildAirfield(town);
    this.plane = new FlyablePlane(town.group);
    this.planeInteraction = this.interactions.register({
      id: "skybird-plane",
      area: "town",
      kind: "plane",
      x: this.plane.model.position.x,
      z: this.plane.model.position.z,
      radius: 4.2,
      label: "Skybird Plane",
      hint: "Press E to fly",
    });
    this.plane.interaction = this.planeInteraction;
    this.flying = false;
    this.npcs = new NPCs(town.group);
    this.wildlife = new Wildlife(town.group, horseGltf);
    this.leaves = new Leaves(town.group);
    this.bouncePulse = 0;
    this.interactionCooldown = 0;
    this.arcade = new ArcadeManager(this);
    this.library = new LibraryReader(this);
    this.coaster = new RollerCoaster(this);
    this.farm = new Farm(this);
    this.interactions.on("minigame", (item) => {
      this.pickups.reset();
      this.arcade.launch(item);
    });
    this.interactions.on("book", (item) => this.library.open(item.bookId));
    this.interactions.on("door", (item) => this.enter(item.target, item.spawn));
    this.interactions.on("destination", (item) =>
      this.openDestination(item.destination),
    );
    this.interactions.on("vehicle", () => this.enterVehicle());
    this.interactions.on("plane", () => this.enterPlane());
    this.bindUI();
    this.refreshCharacterUI();
    this.resize();
    this.camera.position.set(42, 34, 49);
    this.camera.lookAt(1, 0, -1);
    this.player.sync();
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.setMode("paused");
      showError(
        new Error("The graphics context was interrupted. Reload to continue."),
      );
    });
    this.lastTime = performance.now();
    this.running = true;
    requestAnimationFrame((t) => this.frame(t));
    document.querySelector("#start").disabled = false;
    document.querySelector("#start").innerHTML =
      'Start Game <span aria-hidden="true">→</span>';
  }
  bindUI() {
    document.querySelectorAll('input[name="character"]').forEach((radio) => {
      radio.disabled = !this.characters.has(radio.value);
      radio.addEventListener("change", () => this.setCharacter(radio.value));
    });
    const characterSelect = document.querySelector("#pause-character");
    for (const option of characterSelect.options)
      option.disabled = !this.characters.has(option.value);
    characterSelect.addEventListener("change", () =>
      this.setCharacter(characterSelect.value),
    );
    document.querySelectorAll("[data-gesture]").forEach((button) => {
      button.addEventListener("click", () => {
        if (this.mode !== "playing") return;
        if (!this.player.gesture(button.dataset.gesture))
          this.ui.toast("Stand still to try a gesture.");
        this.canvas.focus();
      });
    });
    document
      .querySelector("#start")
      .addEventListener("click", () => this.start());
    document
      .querySelector("#pause")
      .addEventListener("click", () => this.pause());
    document
      .querySelector("#resume")
      .addEventListener("click", () => this.resume());
    this.ui.panel.addEventListener("cancel", (e) => {
      e.preventDefault();
      this.resume();
    });
    document.querySelector("#calm").checked = this.calm;
    document.querySelector("#calm").addEventListener("change", (e) => {
      this.calm = e.target.checked;
      this.follow.calm = this.calm;
    });
    document
      .querySelector("#camera-lock")
      .addEventListener("click", async () => {
        if (document.pointerLockElement) {
          document.exitPointerLock();
          return;
        }
        try {
          await this.canvas.requestPointerLock();
          this.canvas.focus();
        } catch {
          this.ui.toast(
            "Mouse lock is unavailable. Drag the mouse to look around.",
          );
          this.canvas.focus();
        }
      });
    let hadMouseLock = false;
    document.addEventListener("pointerlockchange", () => {
      const locked = document.pointerLockElement === this.canvas;
      document.querySelector("#camera-lock").textContent = locked
        ? "Mouse locked"
        : "Free mouse";
      this.input.clear();
      if (hadMouseLock && !locked && this.mode === "playing") this.pause();
      hadMouseLock = locked;
    });
    document.addEventListener("pointerlockerror", () =>
      this.ui.toast("Drag the mouse to look around."),
    );
    window.addEventListener("keydown", (e) => {
      if (e.code === "Escape" && this.mode === "playing") {
        e.preventDefault();
        this.pause();
      }
    });
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("blur", () => {
      if (this.mode === "playing") this.pause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.mode === "playing") this.pause();
    });
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.arcade?.resize();
  }
  setCharacter(id) {
    if (!["opening", "paused"].includes(this.mode) || !this.characters.has(id))
      return false;
    if (this.coaster?.occupied) this.coaster.exit();
    this.pickups.reset();
    this.player.setModel(this.characters.get(id));
    if (this.driving || this.flying) this.player.model.visible = false;
    this.refreshCharacterUI();
    try {
      localStorage.setItem("crews-place-character", id);
    } catch {
      /* Private browsing still works. */
    }
    return true;
  }
  refreshCharacterUI() {
    const id = this.player.model.userData.avatarId;
    document.querySelectorAll('input[name="character"]').forEach((radio) => {
      radio.checked = radio.value === id;
    });
    document.querySelector("#pause-character").value = id;
    document.querySelector("#robot-gestures").hidden = id !== "jolly_robot";
    document.querySelector("#cowboy-controls").hidden = id !== "cowboy";
    document.querySelector("#character-status").textContent =
      `${CHARACTERS[id].label} selected`;
  }
  setMode(mode) {
    this.mode = mode;
    this.input.setEnabled(mode === "playing");
    if (mode !== "playing" && document.pointerLockElement)
      document.exitPointerLock();
  }
  start() {
    document.querySelector("#opening").hidden = true;
    document.querySelector("#hud").hidden = false;
    this.setMode("playing");
    this.follow.reset();
    this.canvas.focus();
    this.ui.toast("Welcome! Wander wherever you like.");
  }
  pause() {
    if (this.mode !== "playing") return;
    this.setMode("paused");
    if (this.flying) this.plane.setAudioActive(false);
    this.farm?.closeSign();
    this.ui.showPrompt(null);
    document.querySelector("#panel-tag").textContent = "TAKE YOUR TIME";
    document.querySelector("#panel-title").textContent = "A little pause.";
    document.querySelector("#panel-copy").textContent =
      "Your town will be right here. Ready when you are.";
    document.querySelector("#preferences").hidden = false;
    this.ui.panel.showModal();
    document.querySelector("#resume").focus();
  }
  resume() {
    this.ui.panel.close();
    this.setMode("playing");
    if (this.flying) this.plane.setAudioActive(true);
    this.canvas.focus();
  }
  enterVehicle() {
    if (this.area.id !== "town" || this.driving) return;
    this.driving = this.vehicle.enter(this.player);
    if (this.driving) {
      document.querySelector("#drive-controls").hidden = false;
      this.input.clear();
      this.ui.toast("You are in! W or S follows the street.");
    }
  }
  exitVehicle() {
    if (!this.driving) return;
    this.vehicle.exit(this.player);
    this.driving = false;
    document.querySelector("#drive-controls").hidden = true;
    this.input.clear();
    this.ui.toast("The car will stay right here.");
  }
  enterPlane() {
    if (this.area.id !== "town" || this.flying) return;
    this.flying = this.plane.enter(this.player);
    if (this.flying) {
      document.querySelector("#plane-controls").hidden = false;
      document.querySelector("#flight-status").hidden = false;
      this.input.clear();
      this.ui.toast("Engine on! Hold W or ↑ to take off.");
    }
  }
  exitPlane() {
    if (!this.flying) return;
    this.plane.exit(this.player);
    this.flying = false;
    document.querySelector("#plane-controls").hidden = true;
    document.querySelector("#flight-status").hidden = true;
    this.input.clear();
    this.ui.toast("Skybird is ready at the start of the runway.");
  }
  async openDestination(id) {
    const destination = destinations[id];
    if (!destination) return;
    this.setMode("activity");
    this.ui.showPrompt(null);
    document.querySelector("#panel-tag").textContent =
      destination.title.toUpperCase();
    document.querySelector("#panel-title").textContent =
      "Mini-game coming soon";
    document.querySelector("#panel-copy").textContent = destination.description;
    document.querySelector("#preferences").hidden = true;
    this.ui.panel.showModal();
    document.querySelector("#resume").focus();
    if (destination.launch) {
      try {
        await destination.launch({ destination, close: () => this.resume() });
      } catch (error) {
        console.error(error);
        document.querySelector("#panel-copy").textContent =
          "This activity could not start. You can return to the town.";
      }
    }
  }
  enter(id, spawn) {
    const next = this.areas[id];
    if (!next) return;
    this.farm?.closeSign();
    this.pickups.reset();
    this.area.group.visible = false;
    this.area = next;
    next.group.visible = true;
    const point = spawn ?? next.spawn ?? [0, 15];
    this.player.heading = id === "town" ? 0 : Math.PI;
    this.player.teleport(point[0], point[1], next.groundY ?? 0);
    this.follow.reset(id === "town" ? Math.PI : 0);
    this.input.clear();
    // Re-center sunlight and its shadow map on the current room.
    const center =
      id === "town" ? 0 : (next.bounds.minX + next.bounds.maxX) / 2;
    this.sun.position.set(center - 24, (next.groundY ?? 0) + 38, 20);
    this.sun.target.position.set(center, next.groundY ?? 0, 0);
    this.sun.target.updateMatrixWorld();
    const environment = next.environment;
    this.scene.background.set(environment?.background ?? 0xc5e2e0);
    this.scene.fog.color.set(environment?.fog ?? 0xc5e2e0);
    this.scene.fog.near = environment?.fogNear ?? 105;
    this.scene.fog.far = environment?.fogFar ?? 235;
    this.renderer.toneMappingExposure = environment?.exposure ?? 1.25;
    this.scene.environmentIntensity = id === "space" ? 0.3 : 1;
    this.skyLight.intensity = id === "space" ? 0.35 : 2.2;
    this.sun.intensity = id === "space" ? 1.1 : 3.2;
    this.ui.showPrompt(null);
    this.ui.toast(
      id === "town" ? "Back in the neighborhood" : "Welcome to " + next.name,
    );
  }
  tick(dt) {
    if (this.mode === "arcade") {
      this.arcade.update(dt);
      return;
    }
    this.interactionCooldown = Math.max(0, this.interactionCooldown - dt);
    let event = null;
    if (this.mode === "playing") {
      if (this.coaster.occupied) {
        this.coaster.update(dt);
        this.ui.showPrompt(null);
      } else if (this.flying) {
        if (this.input.consume("KeyE")) this.exitPlane();
        if (this.flying) {
          const flight = this.plane.update(dt, this.input);
          this.player.position.copy(this.plane.model.position);
          this.player.heading = this.plane.heading;
          this.player.sync();
          document.querySelector("#flight-altitude").textContent =
            Math.round(flight.altitude) + " m";
          document.querySelector("#flight-speed").textContent =
            Math.round(flight.speed) + " km/h";
        }
        this.ui.showPrompt(
          this.flying
            ? {
                id: "plane-exit",
                key: "E",
                label: "Leave the plane",
                hint: "Skybird returns to the runway start",
              }
            : null,
        );
      } else if (this.driving) {
        if (this.input.consume("KeyE")) this.exitVehicle();
        if (this.driving) {
          this.vehicle.update(dt, this.input);
          this.player.position.copy(this.vehicle.model.position);
          this.player.heading = this.vehicle.model.rotation.y;
          this.player.sync();
        }
        this.ui.showPrompt(
          this.driving
            ? {
                id: "vehicle-exit",
                key: "E",
                label: "Get out of the car",
                hint: "The car will stay here",
              }
            : null,
        );
      } else {
        event = this.player.update(dt, this.input, this.follow.yaw, this.area);
        if (this.area.id === "town")
          this.pickups.update(dt, this.player, this.input, this.area);
        const pickupHint = document.querySelector("#pickup-hint");
        pickupHint.textContent = this.pickups.hint;
        pickupHint.hidden = !this.pickups.hint;
        const nearby = this.interactions.find(
          this.player.position,
          this.area.id,
        );
        this.ui.showPrompt(nearby);
        if (this.input.consume("KeyE") && this.interactionCooldown === 0)
          this.interactions.activate();
      }
      if (this.mode !== "playing") return;
      this.scene.updateMatrixWorld(true);
      if (this.coaster.occupied) this.coaster.updateCamera(dt);
      else
        this.follow.update(
          dt,
          this.player,
          this.input,
          this.area,
          this.flying
            ? {
                yaw: this.plane.cameraYaw(),
                distance: 13.5,
                targetHeight: 1.15,
                turnRate: 6.5,
              }
            : this.driving
              ? {
                  yaw: this.vehicle.cameraYaw(),
                  distance: 8.8,
                  targetHeight: 1.55,
                  turnRate: 7.5,
                }
              : undefined,
        );
      if (event === "bounce") {
        this.bouncePulse = 1;
        this.ui.toast("Up you go!");
      }
    }
    if (this.mode === "opening" || this.mode === "playing") {
      if (this.mode === "opening") this.player.model.animator?.update(dt);
      this.traffic.update(dt, this.area.interior ? null : this.player);
      this.npcs.update(dt, this.area.interior ? null : this.player);
      this.wildlife.update(dt, this.area.interior ? null : this.player);
      this.farm.update(dt);
      if (
        this.leaves.update(
          dt,
          this.mode === "playing" && !this.area.interior ? this.player : null,
          event,
          this.calm,
        )
      )
        this.ui.toast("A little rustle of autumn.");
      this.bouncePulse = Math.max(0, this.bouncePulse - dt * 3);
      this.areas.town.trampolineMesh.position.y =
        0.44 - Math.sin(this.bouncePulse * Math.PI) * 0.12;
    }
    // Keep the shadow window centered on the player throughout the much larger
    // world. The light direction stays unchanged; only its coverage follows.
    this.sun.position.set(
      this.player.position.x - 24,
      this.player.position.y + 38,
      this.player.position.z + 20,
    );
    this.sun.target.position.set(
      this.player.position.x,
      this.area.groundY ?? 0,
      this.player.position.z,
    );
    this.sun.target.updateMatrixWorld();
    const inSpace = this.area.id === "space";
    const inCoasterPark =
      !this.area.interior &&
      !inSpace &&
      this.player.position.z < -32 &&
      this.player.position.x > -42;
    this.renderer.toneMappingExposure = THREE.MathUtils.damp(
      this.renderer.toneMappingExposure,
      inSpace ? 0.78 : inCoasterPark ? 0.86 : 1.25,
      3,
      dt,
    );
    this.scene.fog.near = inSpace ? 72 : inCoasterPark ? 165 : 105;
    this.scene.fog.far = inSpace ? 210 : inCoasterPark ? 300 : 235;
    this.ui.update(
      dt,
      this.player,
      this.area,
      this.follow.yaw,
      this.vehicle,
      this.plane,
    );
  }
  frame(time) {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    try {
      this.tick(dt);
      this.renderer.render(
        this.arcade.current?.scene ?? this.scene,
        this.arcade.current?.camera ?? this.camera,
      );
    } catch (error) {
      this.running = false;
      showError(error);
      return;
    }
    requestAnimationFrame((t) => this.frame(t));
  }
}
async function boot() {
  document.querySelector("#start").textContent = "Loading your world…";
  const ids = Object.keys(CHARACTERS);
  const [results, horseResult] = await Promise.all([
    Promise.allSettled(ids.map((id) => loadPlayerCharacter(id))),
    loadHorseNPC().then(
      (value) => ({ status: "fulfilled", value }),
      (reason) => ({ status: "rejected", reason }),
    ),
  ]);
  const characters = new Map();
  results.forEach((result, i) => {
    if (result.status === "fulfilled") characters.set(ids[i], result.value);
    else console.error(result.reason);
  });
  if (!characters.size)
    throw new Error("The characters could not load. Please reload the game.");
  let selected = "cowboy";
  try {
    selected = localStorage.getItem("crews-place-character") ?? selected;
  } catch {
    /* Optional preference. */
  }
  if (!characters.has(selected)) selected = characters.keys().next().value;
  if (horseResult.status === "rejected") console.error(horseResult.reason);
  const game = new Game(
    characters,
    selected,
    horseResult.status === "fulfilled" ? horseResult.value : null,
  );
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("coaster-preview")
  ) {
    game.start();
    game.player.teleport(COASTER_EXIT.x, COASTER_EXIT.z + 3);
    game.follow.reset(0);
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("farm-preview")
  ) {
    game.start();
    game.player.teleport(FARM_SITE.playerAnchor.x, FARM_SITE.playerAnchor.z);
    game.follow.reset(Math.PI);
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("airfield-preview")
  ) {
    game.start();
    game.player.teleport(
      game.plane.model.position.x + 4,
      game.plane.model.position.z,
    );
    game.follow.reset(Math.PI / 2);
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("space-preview")
  ) {
    game.start();
    game.enter("space");
    game.follow.reset(Math.PI);
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("space-test")
  )
    import("./tests/space-browser-checks.js").then((module) =>
      module.runSpaceChecks(game),
    );
  if (import.meta.env.DEV) {
    const animalPreview = new URLSearchParams(location.search).get(
      "farm-read-preview",
    );
    if (animalPreview) game.farm.openSign(animalPreview);
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("farm-test")
  )
    import("./tests/farm-browser-checks.js").then((m) => m.runFarmChecks(game));
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("airfield-test")
  )
    import("./tests/airfield-browser-checks.js").then((m) =>
      m.runAirfieldChecks(game),
    );
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("coaster-test")
  )
    import("./tests/coaster-browser-checks.js").then((m) =>
      m.runCoasterChecks(game),
    );
  // Explicit development-only harness; absent from production gameplay.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("test"))
    import("./tests/browser-checks.js").then((m) => m.runBrowserChecks(game));
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("arcade-test")
  )
    import("./tests/arcade-browser-checks.js").then((m) =>
      m.runArcadeChecks(game),
    );
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("robot-test")
  )
    import("./tests/robot-browser-checks.js").then((m) =>
      m.runRobotChecks(game),
    );
}
boot().catch(showError);

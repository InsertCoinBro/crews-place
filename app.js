import { SpaceCombat } from "./shared/world/space-combat.js";
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
import { Weather } from "./shared/world/weather.js";
import { FlightHoops, FLIGHT_HOOPS } from "./shared/world/flight-hoops.js";
import { UI } from "./shared/components/ui.js";
import { MobileControls } from "./shared/components/mobile-controls.js";
import { destinations } from "./games/destinations.js";
import { ArcadeManager } from "./games/arcade.js";
import { RollerCoaster } from "./shared/world/coaster.js";
import { SpaceDive } from "./shared/world/space-dive.js";
import { SPACE_DIVE_EXIT } from "./shared/world/space-dive-track.js";
import { COASTER_EXIT } from "./shared/world/coaster-track.js";
import { LibraryReader } from "./games/library.js";
import { CornMaze, MAZE_START } from "./shared/world/corn-maze.js";
import { Farm, FARM_SITE } from "./shared/world/farm.js";
import { buildSpace } from "./shared/world/space.js";
import {
  SpacePlayground,
  PLAYGROUND,
} from "./shared/world/space-playground.js";
import {
  buildAirfield,
  FlyablePlane,
  NORTH_AIRFIELD_SITE,
} from "./shared/world/airfield.js";
import {
  buildRocketLaunchSite,
  RocketJourney,
  ROCKET_SITE,
} from "./shared/world/rocket.js";
import { SPACE_ALTITUDE, SPACE_LANDING_SITE } from "./shared/world/space.js";

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
    this.mobile =
      matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    document.body.classList.toggle("mobile-device", this.mobile);
    if (this.mobile)
      this.canvas.setAttribute(
        "aria-label",
        "Crew's Place 3D world. Use the left joystick to move, drag the right side to look, and use the large action buttons to jump, interact, or leave activities.",
      );
    this.mode = "opening";
    this.calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.mobile,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, this.mobile ? 1.25 : 1.75),
    );
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
    const shadowSize = this.mobile ? 1024 : 2048;
    this.sun.shadow.mapSize.set(shadowSize, shadowSize);
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
    this.northAirfield = buildAirfield(town, NORTH_AIRFIELD_SITE);
    this.plane = new FlyablePlane(town.group);
    this.weather = new Weather(town.group);
    this.flightHoops = new FlightHoops(town.group);
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
    this.rocketSite = buildRocketLaunchSite(town);
    this.rocket = new RocketJourney(this.scene, town, this.areas.space);
    this.rocketInteraction = this.interactions.register({
      id: "starbound-rocket-door",
      area: "town",
      kind: "rocket",
      x: this.rocketSite.door.x,
      y: this.rocketSite.door.y,
      z: this.rocketSite.door.z,
      radius: 1.65,
      label: "Board the Starbound Rocket",
      hint: "Press E at the door to travel to space",
    });
    this.interactions.register({
      id: "starbound-rocket-ladder",
      area: "town",
      kind: "hint",
      x: this.rocketSite.ladderStart.x,
      y: this.rocketSite.ladderStart.y,
      z: this.rocketSite.ladderStart.z,
      radius: 2.2,
      key: "W",
      label: "Climb the rocket ladder",
      hint: "Walk forward up the golden rungs",
    });
    this.rocketCameraReady = false;
    this.playground = new SpacePlayground(this);
    this.rocketReturnInteraction = this.interactions.register({
      id: "starbound-rocket-return",
      area: "rocket-in-transit",
      kind: "rocket",
      x: SPACE_LANDING_SITE.x,
      y: SPACE_ALTITUDE,
      z: SPACE_LANDING_SITE.z + 2,
      radius: 4,
      label: "Return to Crew's Place",
      hint: "Press E to board the rocket and fly back to the launch pad",
    });
    this.npcs = new NPCs(town.group);
    this.wildlife = new Wildlife(town.group, horseGltf);
    this.leaves = new Leaves(town.group);
    this.bouncePulse = 0;
    this.interactionCooldown = 0;
    this.arcade = new ArcadeManager(this);
    this.library = new LibraryReader(this);
    this.coaster = new RollerCoaster(this);
    this.spaceDive = new SpaceDive(this);
    this.spaceAlien = new SpaceCombat(this, characters.get("moon_mischief"));
    this.farm = new Farm(this);
    this.cornMaze = new CornMaze(this);
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
    this.interactions.on("rocket", () => this.startRocketJourney());
    this.bindUI();
    this.mobileControls = new MobileControls(this);
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
      .querySelector("#rocket-skip")
      .addEventListener("click", () => this.rocket.skip());
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
    window.visualViewport?.addEventListener("resize", () => this.resize());
    window.addEventListener("blur", () => {
      if (this.mode === "playing") this.pause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.mode === "playing") this.pause();
    });
  }
  resize() {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.arcade?.resize(width, height);
  }
  setCharacter(id) {
    if (!["opening", "paused"].includes(this.mode) || !this.characters.has(id))
      return false;
    if (this.coaster?.occupied) this.coaster.exit();
    if (this.spaceDive?.occupied) this.spaceDive.exit();
    this.cornMaze?.exit();
    this.playground?.exit();
    this.pickups.reset();
    this.player.setModel(this.characters.get(id));
    if (this.driving || this.flying || this.mode === "rocket")
      this.player.model.visible = false;
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
    document.querySelector("#robot-gestures").hidden = id === "cowboy";
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
      "Your world will be right here. Ready when you are.";
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
    this.flightHoops.update(this.player.position, false);
    this.flying = false;
    document.querySelector("#plane-controls").hidden = true;
    document.querySelector("#flight-status").hidden = true;
    this.input.clear();
    this.ui.toast("Skybird is parked and ready for your next flight.");
  }
  startRocketJourney() {
    if (
      !["town", "space"].includes(this.area.id) ||
      this.driving ||
      this.flying ||
      !this.rocket.begin(this.area.id === "space")
    )
      return false;
    this.pickups.reset();
    this.rocketInteraction.area = "rocket-in-transit";
    this.rocketReturnInteraction.area = "rocket-in-transit";
    this.player.inVehicle = true;
    this.player.model.visible = false;
    this.setMode("rocket");
    this.ui.showPrompt(null);
    this.ui.toastTime = 0;
    document.querySelector("#toast").hidden = true;
    this.rocketCameraReady = false;
    this.camera.far = 460;
    this.camera.updateProjectionMatrix();
    document.body.classList.add("rocket-journey-active");
    document.querySelector("#pause").disabled = true;
    document.querySelector("#rocket-status").hidden = false;
    document.querySelector("#rocket-stage").textContent = "Boarding the rocket";
    document.querySelector("#rocket-detail").textContent =
      "The door is closing safely.";
    document.querySelector("#rocket-progress").style.width = "0%";
    return true;
  }
  updateRocketJourney(dt) {
    const journey = this.rocket.update(dt, this.calm);
    if (!journey) return;
    document.querySelector("#rocket-stage").textContent = journey.stage;
    document.querySelector("#rocket-detail").textContent = journey.detail;
    document.querySelector("#rocket-progress").style.width =
      Math.round(journey.progress * 100) + "%";
    this.scene.background.copy(journey.background);
    this.scene.fog.color.copy(journey.background);
    this.scene.fog.near = THREE.MathUtils.lerp(105, 215, journey.skyMix);
    this.scene.fog.far = 450;
    this.scene.environmentIntensity = THREE.MathUtils.lerp(
      1,
      0.3,
      journey.skyMix,
    );
    this.skyLight.intensity = THREE.MathUtils.lerp(2.2, 0.35, journey.skyMix);
    this.sun.intensity = THREE.MathUtils.lerp(3.2, 1.1, journey.skyMix);
    if (!this.rocketCameraReady) {
      this.camera.position.copy(journey.camera.position);
      this.rocketCameraReady = true;
    } else {
      this.camera.position.lerp(
        journey.camera.position,
        1 - Math.exp(-3.2 * dt),
      );
    }
    const viewDirection = journey.camera.target
      .clone()
      .sub(this.camera.position)
      .normalize();
    const screenRight = new THREE.Vector3()
      .crossVectors(viewDirection, this.camera.up)
      .normalize();
    const framedTarget = journey.camera.target
      .clone()
      .addScaledVector(screenRight, 6);
    this.camera.lookAt(framedTarget);
    this.sun.position.set(
      this.rocket.model.position.x - 24,
      this.rocket.model.position.y + 38,
      this.rocket.model.position.z + 20,
    );
    this.sun.target.position.copy(this.rocket.model.position);
    this.sun.target.updateMatrixWorld();
    if (journey.arrived) this.finishRocketJourney();
  }
  finishRocketJourney() {
    const returning = this.rocket.returning;
    if (returning) this.rocket.dockInTown();
    else this.rocket.dockInSpace();
    this.player.inVehicle = false;
    this.enter(
      returning ? "town" : "space",
      returning
        ? [ROCKET_SITE.x, ROCKET_SITE.ladderFarZ + 1.5]
        : [SPACE_LANDING_SITE.x + 7.5, SPACE_LANDING_SITE.z],
    );
    this.player.position.y = returning ? 0 : SPACE_ALTITUDE;
    this.rocketInteraction.area = returning ? "town" : "rocket-in-transit";
    this.rocketReturnInteraction.area = returning
      ? "rocket-in-transit"
      : "space";
    this.player.sync();
    this.setMode("playing");
    this.follow.reset(Math.PI / 2);
    this.follow.ready = false;
    this.camera.far = 320;
    this.camera.updateProjectionMatrix();
    document.body.classList.remove("rocket-journey-active");
    document.querySelector("#pause").disabled = false;
    document.querySelector("#rocket-status").hidden = true;
    this.ui.toast(
      returning
        ? "Touchdown! Welcome back to Crew's Place."
        : "Touchdown! Walk up to the rocket and press E whenever you're ready to return.",
    );
    this.canvas.focus();
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
    this.cornMaze?.exit();
    this.playground?.exit();
    this.farm?.closeSign();
    this.pickups.reset();
    this.area.group.visible = false;
    this.area = next;
    next.group.visible = true;
    this.spaceAlien?.reset();
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
    this.spaceAlien.update(dt);
    if (this.mode === "arcade") {
      this.arcade.update(dt);
      return;
    }
    if (this.mode === "rocket") {
      this.updateRocketJourney(dt);
      return;
    }
    this.interactionCooldown = Math.max(0, this.interactionCooldown - dt);
    let event = null;
    if (this.mode === "playing") {
      if (this.playground.active) {
        this.playground.update(dt);
        this.ui.showPrompt(null);
      } else if (this.spaceDive.occupied) {
        this.spaceDive.update(dt);
        this.ui.showPrompt(null);
      } else if (this.coaster.occupied) {
        this.coaster.update(dt);
        this.ui.showPrompt(null);
      } else if (this.flying) {
        if (this.input.consume("KeyE")) this.exitPlane();
        if (this.flying) {
          this.plane.gentleWeather = this.calm;
          this.plane.weatherTime = this.weather.time;
          const flight = this.plane.update(dt, this.input);
          if (this.flightHoops.update(this.plane.model.position, true))
            this.ui.toast(
              this.flightHoops.passed.size === FLIGHT_HOOPS.length
                ? "All hoops explored! Beautiful flying."
                : "Through the hoop! Nicely flown.",
            );
          document.querySelector("#flight-hoops").textContent =
            "Hoops " +
            this.flightHoops.passed.size +
            " / " +
            FLIGHT_HOOPS.length;
          document.querySelector("#flight-weather").textContent =
            flight.terrainContact
              ? "Terrain ahead · Turn toward an open pass"
              : flight.weather.name +
                " · Wind " +
                Math.round(
                  Math.hypot(flight.weather.windX, flight.weather.windZ) * 3.6,
                ) +
                " km/h";
          this.player.position.copy(this.plane.model.position);
          this.player.heading = this.plane.heading;
          this.player.sync();
          document.querySelector("#flight-altitude").textContent =
            Math.round(flight.altitude) + " m";
          document.querySelector("#flight-speed").textContent =
            Math.round(flight.speed * 3.6) + " km/h";
          const distanceNorth = Math.round(
            Math.hypot(
              this.plane.model.position.x - NORTH_AIRFIELD_SITE.x,
              this.plane.model.position.z - NORTH_AIRFIELD_SITE.z,
            ),
          );
          document.querySelector("#flight-route").textContent =
            Math.cos(this.plane.heading) > 0 &&
            this.plane.model.position.z < -90
              ? "Fly south · Home " +
                Math.round(
                  Math.hypot(
                    this.plane.model.position.x - 52,
                    this.plane.model.position.z - 50,
                  ),
                ) +
                " m"
              : this.plane.model.position.z > -1900
                ? "Fly north · North Meadow " + distanceNorth + " m"
                : "North Meadow " +
                  distanceNorth +
                  " m · Hold S to land and brake";
        }
        this.ui.showPrompt(
          this.flying
            ? {
                id: this.plane.airborne ? "plane-return" : "plane-exit",
                key: "E",
                label: "Leave the plane",
                hint: this.plane.airborne
                  ? "Return safely to the home runway"
                  : "Land on a runway to explore here",
              }
            : null,
        );
      } else if (this.cornMaze.occupied) {
        this.cornMaze.update(dt);
        this.ui.showPrompt(null);
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
      this.spaceAlien.afterPlayer(dt);
      this.scene.updateMatrixWorld(true);
      if (this.spaceDive.occupied) this.spaceDive.updateCamera(dt);
      else if (this.coaster.occupied) this.coaster.updateCamera(dt);
      else
        this.follow.update(
          dt,
          this.player,
          this.input,
          this.area,
          this.playground.active
            ? {
                distance: this.playground.active === "slide" ? 15 : 11,
                targetHeight: 2,
                ...(this.playground.active === "slide"
                  ? { yaw: Math.PI + 0.5, turnRate: 2 }
                  : {}),
              }
            : this.cornMaze.occupied
              ? {
                  yaw: this.cornMaze.model.rotation.y + Math.PI,
                  distance: 10,
                  targetHeight: 3.3,
                  turnRate: 5,
                }
              : this.flying
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
      this.player.position.z > -90 &&
      this.player.position.x > -42;
    this.renderer.toneMappingExposure = THREE.MathUtils.damp(
      this.renderer.toneMappingExposure,
      inSpace ? 0.78 : inCoasterPark ? 0.86 : 1.25,
      3,
      dt,
    );
    this.scene.fog.near = inSpace ? 72 : inCoasterPark ? 165 : 105;
    this.scene.fog.far = inSpace ? 210 : inCoasterPark ? 300 : 235;
    const outdoors = this.area.id === "town" && !this.spaceDive.occupied;
    const weather = this.weather.update(
      this.mode === "playing" ? dt : 0,
      this.player.position,
      outdoors,
      this.calm,
    );
    if (outdoors) {
      const amount = weather.cloud;
      this.scene.background.lerp(
        new THREE.Color(amount > 0.2 ? 0xaabcc9 : 0xc5e2e0),
        1 - Math.exp(-dt * 1.4),
      );
      this.scene.fog.color.copy(this.scene.background);
      // Keep mountain silhouettes visible early enough to steer around them.
      if (this.player.position.z < -150) {
        this.scene.fog.near = 150 - amount * 25;
        this.scene.fog.far = 340 - amount * 45;
      }
    }
    this.spaceDive.applyEnvironment();
    this.ui.update(
      dt,
      this.player,
      this.area,
      this.follow.yaw,
      this.vehicle,
      this.plane,
      this.rocket,
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
    new URLSearchParams(location.search).has("space-dive-preview")
  ) {
    game.start();
    game.player.teleport(SPACE_DIVE_EXIT.x, SPACE_DIVE_EXIT.z + 3);
    game.follow.reset(0);
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("space-dive-test")
  )
    import("./tests/space-dive-browser-checks.js").then((m) =>
      m.runSpaceDiveChecks(game),
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
    new URLSearchParams(location.search).has("maze-preview")
  ) {
    game.start();
    game.player.teleport(MAZE_START.x + 2, MAZE_START.z);
    game.follow.reset(Math.PI / 2);
    if (new URLSearchParams(location.search).has("maze-test"))
      import("./tests/maze-browser-checks.js").then((m) =>
        m.runMazeChecks(game),
      );
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
    new URLSearchParams(location.search).has("space-combat-test")
  ) {
    import("./tests/space-combat-browser-checks.js").then((m) =>
      m.runSpaceCombatChecks(game),
    );
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("space-combat-preview")
  ) {
    game.start();
    game.enter("space");
    game.player.teleport(-20, -20, game.area.groundY);
    game.player.heading = 0;
    game.follow.reset(0);
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
    new URLSearchParams(location.search).has("rocket-preview")
  ) {
    game.start();
    game.player.teleport(ROCKET_SITE.x, ROCKET_SITE.ladderFarZ + 0.4);
    game.follow.reset(0);
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("rocket-journey-preview")
  ) {
    game.start();
    game.startRocketJourney();
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("rocket-return-preview")
  ) {
    game.start();
    game.startRocketJourney();
    game.rocket.skip();
    game.updateRocketJourney(0);
    game.player.teleport(SPACE_LANDING_SITE.x + 3, SPACE_LANDING_SITE.z + 2);
    game.player.position.y = SPACE_ALTITUDE;
    game.player.sync();
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("playground-preview")
  ) {
    game.start();
    game.enter("space", PLAYGROUND.entrance);
    game.follow.reset(Math.PI / 2);
    const ride = new URLSearchParams(location.search).get("ride");
    const item = game.interactions.items.find(
      (i) => i.id === `playground-${ride}`,
    );
    if (item) {
      game.player.teleport(item.x, item.z, SPACE_ALTITUDE);
      game.follow.reset(0);
    }
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("playground-test")
  ) {
    import("./tests/playground-browser-checks.js").then((m) =>
      m.runPlaygroundChecks(game),
    );
  }
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("space-test")
  )
    import("./tests/space-browser-checks.js").then((module) =>
      module.runSpaceChecks(game),
    );
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("rocket-test")
  )
    import("./tests/rocket-browser-checks.js").then((module) =>
      module.runRocketChecks(game),
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

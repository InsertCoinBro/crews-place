import * as THREE from "three";
import { ArcadeAudio } from "./shared/audio.js";
import { ArcadeHUD } from "./shared/hud.js";
import { BubblePop } from "./bubble-pop/game.js";
import { MemoryHop } from "./memory-hop/game.js";
import { RocketFlyer } from "./rocket-flyer/game.js";

export const ARCADE_GAMES = {
  bubble: { title: "Bubble Pop", Game: BubblePop },
  memory: { title: "Memory Hop", Game: MemoryHop },
  rocket: { title: "Rocket Flyer", Game: RocketFlyer },
};
const EMPTY_INPUT = { down: () => false, consume: () => false };
export class ArcadeManager {
  constructor(game) {
    this.game = game;
    this.current = null;
    this.snapshot = null;
    this.serial = 0;
    this.keys = new Set();
    this.pressed = new Set();
    this.taps = new Map();
    this.audio = new ArcadeAudio();
    this.suspended = false;
    this.previousResult = null;
    this.hud = new ArcadeHUD({
      exit: () => this.exit(),
      mute: () => {
        this.audio.unlock();
        this.audio.mute(!this.audio.muted);
        this.hud.sound(this.audio.muted);
      },
      resume: () => this.resume(),
      focus: () => this.focus(),
    });
    this.input = {
      down: (...codes) =>
        codes.some((c) => this.keys.has(c) || (this.taps.get(c) ?? 0) > 0),
      consume: (...codes) => {
        const hit = codes.some((c) => this.pressed.has(c));
        codes.forEach((c) => this.pressed.delete(c));
        return hit;
      },
    };
    // Listeners are installed once, not once per game or replay.
    window.addEventListener("keydown", (e) => {
      if (!this.current) {
        if (
          e.code === "KeyE" &&
          game.mode === "playing" &&
          game.interactions.current?.kind === "minigame"
        )
          this.audio.unlock();
        return;
      }
      if (e.code === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) this.exit();
        return;
      }
      this.hud.trapFocus(e);
      if (this.suspended || this.hud.resultVisible) return;
      if (
        ![
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.code)
      )
        return;
      if (e.target instanceof HTMLElement && e.target.closest("button,input"))
        return;
      e.preventDefault();
      if (e.repeat && !this.keys.has(e.code)) return;
      if (!e.repeat) {
        this.pressed.add(e.code);
        this.taps.set(e.code, 0.09);
      }
      this.keys.add(e.code);
      this.audio.unlock();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.pause());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.pause();
    });
    game.canvas.addEventListener("pointerdown", () => {
      if (this.current && !this.hud.resultVisible) this.focus();
    });
  }
  focus() {
    this.keys.clear();
    this.pressed.clear();
    this.taps.clear();
    this.game.canvas.focus({ preventScroll: true });
  }
  launch(item) {
    const spec = ARCADE_GAMES[item.game];
    if (this.current || !spec || this.game.area.id !== "arcade") return false;
    const g = this.game,
      token = ++this.serial;
    this.snapshot = {
      area: g.area,
      position: g.player.position.clone(),
      heading: g.player.heading,
      modelVisible: g.player.model.visible,
      modelScale: g.player.model.scale.clone(),
      cameraPosition: g.camera.position.clone(),
      cameraQuaternion: g.camera.quaternion.clone(),
      yaw: g.follow.yaw,
      pitch: g.follow.pitch,
      target: g.follow.target.clone(),
      ready: g.follow.ready,
      canvasLabel: g.canvas.getAttribute("aria-label"),
    };
    g.setMode("arcade");
    g.ui.showPrompt(null);
    g.ui.toastTime = 0;
    document.querySelector("#toast").hidden = true;
    g.player.model.visible = false;
    document.body.classList.add("arcade-active");
    this.audio.unlock();
    this.keys.clear();
    this.suspended = false;
    try {
      this.current = new spec.Game({
        avatar: g.player.model,
        calm: g.calm,
        audio: this.audio,
        hud: this.hud,
        focus: () => this.focus(),
        exit: () => {
          if (token === this.serial) this.exit();
        },
      });
      this.current.id = item.game;
      this.resize();
      this.hud.sound(this.audio.muted);
      g.canvas.setAttribute(
        "aria-label",
        spec.title +
          ". " +
          this.hud.root.querySelector("#arcade-instructions").textContent +
          " Escape exits the game.",
      );
      this.focus();
      return true;
    } catch (error) {
      console.error(error);
      this.exit();
      g.ui.toast("That game couldn't start. You can keep exploring.");
      return false;
    }
  }
  exit() {
    if (!this.snapshot) return;
    const g = this.game,
      snapshot = this.snapshot,
      old = this.current;
    this.current = null;
    this.snapshot = null;
    ++this.serial;
    this.audio.stop();
    this.keys.clear();
    this.pressed.clear();
    this.taps.clear();
    this.suspended = false;
    this.previousResult = null;
    this.hud.hide();
    try {
      old?.dispose();
    } catch (error) {
      console.error("Mini-game cleanup", error);
    }
    g.renderer.renderLists.dispose();
    document.body.classList.remove("arcade-active");
    g.area = snapshot.area;
    g.player.position.copy(snapshot.position);
    g.player.velocity.set(0, 0);
    g.player.velocityY = 0;
    g.player.grounded = snapshot.position.y === 0;
    g.player.heading = snapshot.heading;
    g.player.model.scale.copy(snapshot.modelScale);
    g.player.sync();
    g.player.model.visible = snapshot.modelVisible;
    g.camera.position.copy(snapshot.cameraPosition);
    g.camera.quaternion.copy(snapshot.cameraQuaternion);
    g.follow.yaw = snapshot.yaw;
    g.follow.pitch = snapshot.pitch;
    g.follow.target.copy(snapshot.target);
    g.follow.ready = snapshot.ready;
    g.canvas.setAttribute("aria-label", snapshot.canvasLabel);
    g.interactions.current = null;
    g.interactionCooldown = 0.35;
    g.setMode("playing");
    this.focus();
    g.ui.toast("Back at your arcade cabinet.");
  }
  pause() {
    if (!this.current || this.suspended) return;
    this.suspended = true;
    this.keys.clear();
    this.pressed.clear();
    this.taps.clear();
    this.audio.stop();
    this.previousResult = this.hud.resultVisible ? this.hud.resultState : null;
    this.hud.result({
      tag: "TAKE YOUR TIME",
      title: "A little pause.",
      copy: "Your game is saved right here. Ready when you are.",
      actions: [
        { label: "Continue Game", run: () => this.resume(), primary: true },
        { label: "Return to Arcade", run: () => this.exit() },
      ],
    });
  }
  resume() {
    if (!this.current) return;
    this.suspended = false;
    this.audio.unlock();
    this.keys.clear();
    if (this.previousResult) this.hud.result(this.previousResult);
    else {
      this.hud.hideResult();
      this.focus();
    }
    this.previousResult = null;
  }
  update(dt) {
    if (this.current && !this.suspended && !document.hidden) {
      this.current.update(
        dt,
        this.hud.resultVisible ? EMPTY_INPUT : this.input,
      );
      for (const [code, time] of this.taps) {
        if (time <= dt) this.taps.delete(code);
        else this.taps.set(code, time - dt);
      }
    }
  }
  resize() {
    this.current?.resize(innerWidth, innerHeight);
  }
}

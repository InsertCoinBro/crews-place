import * as THREE from "three";

const once = new Set([
  "Jump",
  "JumpRise",
  "JumpStart",
  "Land",
  "Wave",
  "Celebrate",
  "LookAround",
  "Nod",
  "ShakeHead",
  "Reach",
]);
export const ROBOT_GESTURES = [
  "Wave",
  "Celebrate",
  "LookAround",
  "Nod",
  "ShakeHead",
];

// One mixer owns both skeleton tracks and the exported facial morph tracks.
export class CharacterAnimator {
  constructor(model) {
    this.model = model;
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = new Map();
    this.freeRightActions = new Map();
    const rightArm = (track) =>
      /DEF-(upper_arm|forearm|hand)R\./.test(track.name);
    for (const clip of model.animations ?? []) {
      const name = clip.name.replace(/^GAME_/, "");
      const action = this.mixer.clipAction(clip);
      if (once.has(name)) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(name, action);
      if (model.userData.avatarId === "cowboy") {
        const bodyClip = new THREE.AnimationClip(
          name + "_freeRight",
          clip.duration,
          clip.tracks.filter((t) => !rightArm(t)),
        );
        const bodyAction = this.mixer.clipAction(bodyClip);
        if (once.has(name)) {
          bodyAction.setLoop(THREE.LoopOnce, 1);
          bodyAction.clampWhenFinished = true;
        }
        this.freeRightActions.set(name, bodyAction);
        if (name === "Carry" || name === "Reach") {
          const armClip = new THREE.AnimationClip(
            name + "_arm",
            clip.duration,
            clip.tracks.filter(rightArm),
          );
          const armAction = this.mixer.clipAction(armClip);
          if (name === "Reach") {
            armAction.setLoop(THREE.LoopOnce, 1);
            armAction.clampWhenFinished = true;
          }
          this[name.toLowerCase() + "Action"] = armAction;
        }
      }
    }
    for (const [logical, source] of [
      ["Jump", "JumpRise"],
      ["Fall", "JumpFall"],
    ]) {
      if (!this.actions.has(logical) && this.actions.has(source))
        this.actions.set(logical, this.actions.get(source));
      if (this.freeRightActions.has(source))
        this.freeRightActions.set(logical, this.freeRightActions.get(source));
    }
    this.current = null;
    this.gesture = null;
    this.gestureTime = 0;
    this.landTime = 0;
    this.carrying = false;
    this.reachTime = 0;
    this.play("Idle", 0);
  }
  play(name, fade = 0.16) {
    const action =
      (this.carrying || this.reachTime > 0
        ? this.freeRightActions.get(name)
        : null) ?? this.actions.get(name);
    if (!action || this.current === name) return;
    const previous = this.activeAction;
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (previous && fade) {
      previous.fadeOut(fade);
      action.fadeIn(fade);
    } else previous?.stop();
    this.current = name;
    this.activeAction = action;
    this.model.userData.animationState = name;
  }
  trigger(name) {
    if (name === "Reach" && this.reachAction) {
      this.reachTime = this.reachAction.getClip().duration;
      this.reachAction.reset().setEffectiveWeight(1).fadeIn(0.1).play();
      const current = this.current;
      this.current = null;
      this.play(current);
      return true;
    }
    if (
      ![...ROBOT_GESTURES, "Dance"].includes(name) ||
      !this.actions.has(name) ||
      this.carrying
    )
      return false;
    if (name === "Dance" && this.gesture === "Dance") {
      this.gesture = null;
      this.gestureTime = 0;
      this.play("Idle");
      return true;
    }
    this.gesture = name;
    this.gestureTime =
      name === "Dance" ? Infinity : this.actions.get(name).getClip().duration;
    if (this.current === name) this.actions.get(name).reset();
    this.play(name);
    return true;
  }
  setCarrying(value) {
    this.carrying = value;
    this.reachTime = 0;
    this.reachAction?.fadeOut(0.1);
    if (value)
      this.carryAction?.reset().setEffectiveWeight(1).fadeIn(0.1).play();
    else this.carryAction?.fadeOut(0.15);
    const current = this.current;
    this.current = null;
    this.play(current);
  }
  reset() {
    this.gesture = null;
    this.gestureTime = this.landTime = 0;
    this.carrying = false;
    this.reachTime = 0;
    this.mixer.stopAllAction();
    this.current = null;
    this.play("Idle", 0);
    this.mixer.update(0);
  }
  update(
    dt,
    {
      speed = 0,
      running = false,
      grounded = true,
      velocityY = 0,
      event = null,
      preparingJump = false,
    } = {},
  ) {
    this.landTime = Math.max(0, this.landTime - dt);
    if (event === "land")
      this.landTime = this.actions.get("Land")?.getClip().duration ?? 0;
    if (!grounded || speed > 0.15) {
      this.gesture = null;
      this.gestureTime = 0;
    }
    let next;
    if (preparingJump) next = "JumpStart";
    else if (!grounded) next = velocityY > 0 ? "Jump" : "Fall";
    else if (speed > 0.15) next = running ? "Run" : "Walk";
    else if (this.landTime > 0) next = "Land";
    else if (this.gestureTime > 0) next = this.gesture;
    else next = "Idle";
    this.play(next, event === "bounce" || event === "land" ? 0.07 : 0.16);
    if (event === "bounce") this.actions.get("Jump")?.reset();
    if (next === "Walk" || next === "Run") {
      this.activeAction?.setEffectiveTimeScale(
        THREE.MathUtils.clamp(speed / (next === "Run" ? 6.6 : 3.5), 0.55, 1.8),
      );
    }
    this.mixer.update(dt);
    this.gestureTime = Math.max(0, this.gestureTime - dt);
    if (this.reachTime > 0) {
      this.reachTime = Math.max(0, this.reachTime - dt);
      if (this.reachTime === 0 && !this.carrying) {
        this.reachAction?.fadeOut(0.15);
        this.current = null;
      }
    }
  }
  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
  }
}

const DIRECTIONS = ["KeyW", "KeyA", "KeyS", "KeyD"];

export class MobileControls {
  constructor(game) {
    this.game = game;
    this.root = document.createElement("section");
    this.root.id = "mobile-controls";
    this.root.setAttribute("aria-label", "Touch game controls");
    this.root.innerHTML = `
      <div class="mobile-look" aria-hidden="true"><span>Drag to look</span></div>
      <div class="mobile-stick" role="group" aria-label="Move or steer">
        <div class="mobile-stick-knob"></div>
      </div>
      <div class="mobile-actions">
        <button type="button" data-code="KeyE" class="mobile-action mobile-use">Use</button>
        <button type="button" data-code="Space" class="mobile-action mobile-jump">Jump</button>
        <button type="button" data-code="KeyC" class="mobile-action mobile-secondary">View</button>
        <button type="button" data-code="KeyR" class="mobile-action mobile-restart" hidden>Restart</button>
        <button type="button" data-code="Enter" class="mobile-action mobile-enter" hidden>Next</button>
        <button type="button" data-code="KeyT" class="mobile-action mobile-pickup" hidden>Pick up</button>
        <button type="button" class="mobile-action mobile-gesture">Gesture</button>
      </div>`;
    document.querySelector("#game").append(this.root);
    this.stick = this.root.querySelector(".mobile-stick");
    this.knob = this.root.querySelector(".mobile-stick-knob");
    this.look = this.root.querySelector(".mobile-look");
    this.stickPointer = null;
    this.lookPointer = null;
    this.lookPoint = null;
    this.gestureIndex = 0;
    this.boundCodes = new Set();
    this.bindStick();
    this.bindLook();
    this.bindButtons();
    this.root
      .querySelector(".mobile-gesture")
      .addEventListener("click", () => this.playGesture());
    this.timer = setInterval(() => this.refresh(), 250);
    this.refresh();
  }

  get input() {
    return this.game.mode === "arcade" ? this.game.arcade : this.game.input;
  }

  press(code) {
    this.input.press?.(code);
  }

  release(code) {
    this.game.input.release?.(code);
    this.game.arcade.release?.(code);
  }

  setDirection(codes) {
    for (const code of DIRECTIONS) {
      const wanted = codes.has(code);
      const active = this.boundCodes.has(code);
      if (wanted && !active) {
        this.press(code);
        this.boundCodes.add(code);
      } else if (!wanted && active) {
        this.release(code);
        this.boundCodes.delete(code);
      }
    }
  }

  bindStick() {
    const move = (event) => {
      if (event.pointerId !== this.stickPointer) return;
      event.preventDefault();
      const rect = this.stick.getBoundingClientRect();
      let x = event.clientX - (rect.left + rect.width / 2);
      let y = event.clientY - (rect.top + rect.height / 2);
      const radius = rect.width * 0.34;
      const length = Math.hypot(x, y);
      if (length > radius) {
        x *= radius / length;
        y *= radius / length;
      }
      this.knob.style.transform = `translate(${x}px, ${y}px)`;
      const threshold = radius * 0.28;
      this.setDirection(
        new Set([
          ...(y < -threshold ? ["KeyW"] : []),
          ...(y > threshold ? ["KeyS"] : []),
          ...(x < -threshold ? ["KeyA"] : []),
          ...(x > threshold ? ["KeyD"] : []),
        ]),
      );
    };
    const end = (event) => {
      if (event.pointerId !== this.stickPointer) return;
      this.stickPointer = null;
      this.knob.style.transform = "translate(0, 0)";
      this.setDirection(new Set());
    };
    this.stick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.stickPointer = event.pointerId;
      this.stick.setPointerCapture(event.pointerId);
      move(event);
    });
    this.stick.addEventListener("pointermove", move);
    this.stick.addEventListener("pointerup", end);
    this.stick.addEventListener("pointercancel", end);
  }

  bindLook() {
    this.look.addEventListener("pointerdown", (event) => {
      if (this.game.mode !== "playing") return;
      event.preventDefault();
      this.lookPointer = event.pointerId;
      this.lookPoint = { x: event.clientX, y: event.clientY };
      this.look.setPointerCapture(event.pointerId);
      this.look.querySelector("span").hidden = true;
    });
    this.look.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.lookPointer || !this.lookPoint) return;
      event.preventDefault();
      this.game.input.addLook(
        event.clientX - this.lookPoint.x,
        event.clientY - this.lookPoint.y,
      );
      this.lookPoint = { x: event.clientX, y: event.clientY };
    });
    const end = (event) => {
      if (event.pointerId !== this.lookPointer) return;
      this.lookPointer = null;
      this.lookPoint = null;
    };
    this.look.addEventListener("pointerup", end);
    this.look.addEventListener("pointercancel", end);
  }

  bindButtons() {
    for (const button of this.root.querySelectorAll("[data-code]")) {
      const code = button.dataset.code;
      const release = (event) => {
        event.preventDefault();
        this.release(code);
        button.classList.remove("pressed");
      };
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.press(code);
        button.classList.add("pressed");
      });
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
    }
  }

  playGesture() {
    if (this.game.mode !== "playing" || this.game.player.actualSpeed > 0.15)
      return;
    const robot = this.game.player.model.userData.avatarId === "jolly_robot";
    const gestures = robot
      ? ["Wave", "Celebrate", "LookAround", "Nod", "ShakeHead"]
      : ["Dance"];
    this.game.player.gesture(gestures[this.gestureIndex % gestures.length]);
    this.gestureIndex += 1;
  }

  refresh() {
    const arcadeUnavailable =
      this.game.mode === "arcade" &&
      (this.game.arcade.suspended || this.game.arcade.hud.resultVisible);
    const active =
      ["playing", "arcade"].includes(this.game.mode) && !arcadeUnavailable;
    const arcade = this.game.mode === "arcade";
    this.root.classList.toggle("mobile-controls-active", active);
    this.root.classList.toggle("mobile-controls-arcade", arcade);
    if (!active) this.setDirection(new Set());

    const use = this.root.querySelector(".mobile-use");
    const jump = this.root.querySelector(".mobile-jump");
    const secondary = this.root.querySelector(".mobile-secondary");
    const restart = this.root.querySelector(".mobile-restart");
    const enter = this.root.querySelector(".mobile-enter");
    const pickup = this.root.querySelector(".mobile-pickup");
    const gesture = this.root.querySelector(".mobile-gesture");
    if (arcade) {
      use.hidden = true;
      jump.hidden = false;
      jump.textContent = "Action";
      secondary.hidden = true;
      restart.hidden = false;
      enter.hidden = this.game.arcade.current?.id !== "derby";
      pickup.hidden = true;
      gesture.hidden = true;
      this.look.hidden = true;
      return;
    }

    use.hidden = false;
    use.textContent = this.game.spaceship?.occupied
      ? "Land"
      : this.game.driving || this.game.flying || this.game.cornMaze?.occupied
        ? "Exit"
        : "Use";
    jump.hidden =
      this.game.driving || this.game.flying || this.game.cornMaze?.occupied;
    jump.textContent = this.game.spaceship?.occupied
      ? "Rise"
      : this.game.playground?.active === "float"
        ? "Float up"
        : "Jump";
    secondary.textContent = this.game.spaceship?.occupied
      ? "Lower"
      : this.game.playground?.active === "float"
        ? "Float down"
        : "View";
    secondary.hidden = !(
      this.game.spaceship?.occupied ||
      this.game.coaster?.occupied ||
      this.game.spaceDive?.occupied ||
      this.game.playground?.active === "float"
    );
    restart.hidden = true;
    enter.hidden = true;
    pickup.hidden = !document.querySelector("#pickup-hint:not([hidden])");
    gesture.hidden = !!(
      this.game.spaceship?.occupied ||
      this.game.driving ||
      this.game.flying ||
      this.game.cornMaze?.occupied ||
      this.game.playground?.active ||
      this.game.coaster?.occupied ||
      this.game.spaceDive?.occupied
    );
    this.look.hidden = !!(
      this.game.flying ||
      this.game.driving ||
      this.game.cornMaze?.occupied ||
      this.game.playground?.active ||
      this.game.coaster?.occupied ||
      this.game.spaceDive?.occupied
    );
  }
}

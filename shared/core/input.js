export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.heldKeys = new Set();
    this.blockedKeys = new Set();
    this.lookX = 0;
    this.lookY = 0;
    this.enabled = false;
    this.dragging = false;
    this.pointerId = null;
    const gameKeys = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "KeyE",
      "KeyC",
      "KeyQ",
      "KeyR",
      "ShiftLeft",
      "ShiftRight",
      "KeyF",
      "KeyG",
      "KeyH",
      "KeyJ",
      "KeyK",
      "KeyT",
    ];
    window.addEventListener("keydown", (e) => {
      this.heldKeys.add(e.code);
      if (!this.enabled || !gameKeys.includes(e.code)) return;
      if (this.blockedKeys.has(e.code) || (e.repeat && !this.keys.has(e.code)))
        return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("button,input,select,dialog")
      )
        return;
      e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
      this.heldKeys.delete(e.code);
      this.blockedKeys.delete(e.code);
    });
    window.addEventListener("blur", () => {
      this.clear();
      this.heldKeys.clear();
      this.blockedKeys.clear();
    });
    canvas.addEventListener("pointerdown", (e) => {
      if (!this.enabled) return;
      this.dragging = true;
      this.pointerId = e.pointerId;
      canvas.focus({ preventScroll: true });
      if (!document.pointerLockElement) canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (
        this.enabled &&
        this.dragging &&
        this.pointerId === e.pointerId &&
        e.pointerType !== "mouse"
      ) {
        this.lookX += e.movementX;
        this.lookY += e.movementY;
      }
    });
    canvas.addEventListener("pointerup", (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.dragging = false;
      this.pointerId = null;
    });
    canvas.addEventListener("pointercancel", () => this.clear());
    window.addEventListener("mousemove", (e) => {
      if (
        this.enabled &&
        (this.dragging || document.pointerLockElement === canvas)
      ) {
        this.lookX += e.movementX;
        this.lookY += e.movementY;
      }
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  down(...codes) {
    return codes.some((code) => this.keys.has(code));
  }
  consume(code) {
    const has = this.pressed.has(code);
    this.pressed.delete(code);
    return has;
  }
  press(code) {
    if (!this.enabled || this.keys.has(code)) return;
    this.keys.add(code);
    this.pressed.add(code);
  }
  release(code) {
    this.keys.delete(code);
  }
  addLook(x, y) {
    if (!this.enabled) return;
    this.lookX += x;
    this.lookY += y;
  }
  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.lookX = this.lookY = 0;
    this.dragging = false;
    this.pointerId = null;
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    this.clear();
    this.blockedKeys = new Set(this.heldKeys);
  }
}

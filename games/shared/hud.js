export class ArcadeHUD {
  constructor({ exit, mute, resume, focus }) {
    this.root = document.createElement("section");
    this.root.id = "arcade-layer";
    this.root.hidden = true;
    this.root.setAttribute("aria-label", "Arcade game");
    this.root.innerHTML =
      '<header class="arcade-top"><div class="arcade-title"><span id="arcade-symbol" aria-hidden="true"></span><div><small>CREW’S PLACE / ARCADE</small><h1 id="arcade-title"></h1></div></div><div id="arcade-stats" class="arcade-stats" role="status"></div><div class="arcade-actions"><button id="arcade-mute" class="arcade-button" aria-pressed="false">Sound on</button><button id="arcade-exit" class="arcade-button">Exit Game <kbd>Esc</kbd></button></div></header><div id="arcade-message" class="arcade-message" role="status" aria-live="polite"></div><footer class="arcade-bottom"><p id="arcade-instructions"></p><div id="arcade-progress-wrap" hidden><span id="arcade-progress-label"></span><progress id="arcade-progress" max="1" value="0"></progress></div></footer><section id="arcade-result" class="arcade-result" role="dialog" aria-modal="true" aria-labelledby="arcade-result-title" hidden><div class="arcade-result-card"><span id="arcade-result-tag"></span><h2 id="arcade-result-title"></h2><p id="arcade-result-copy"></p><div id="arcade-result-actions"></div></div></section>';
    document.querySelector("#game").append(this.root);
    this.root.querySelector("#arcade-exit").onclick = exit;
    this.root.querySelector("#arcade-mute").onclick = () => {
      mute();
      focus();
    };
    this.focus = focus;
    this.resume = resume;
    this.lastStats = "";
    this.lastMessage = "";
  }
  start({ id, title, symbol, instructions }) {
    this.root.hidden = false;
    this.root.dataset.game = id;
    this.hideResult();
    this.lastStats = "";
    this.lastMessage = "";
    this.root.querySelector("#arcade-title").textContent = title;
    this.root.querySelector("#arcade-symbol").textContent = symbol;
    this.root.querySelector("#arcade-instructions").textContent = instructions;
    this.message("");
    this.progress(null);
  }
  stats(text) {
    if (text !== this.lastStats) {
      this.root.querySelector("#arcade-stats").textContent = text;
      this.lastStats = text;
    }
  }
  message(text) {
    if (text !== this.lastMessage) {
      this.root.querySelector("#arcade-message").textContent = text;
      this.lastMessage = text;
    }
  }
  progress(value, label = "Stay here to reveal") {
    this.root.querySelector("#arcade-progress-wrap").hidden = value === null;
    if (value !== null) {
      this.root.querySelector("#arcade-progress").value = value;
      this.root.querySelector("#arcade-progress-label").textContent = label;
    }
  }
  sound(muted) {
    const b = this.root.querySelector("#arcade-mute");
    b.textContent = muted ? "Sound off" : "Sound on";
    b.setAttribute("aria-pressed", String(muted));
  }
  result({ tag = "LOVELY PLAYING!", title, copy, actions }) {
    this.resultState = { tag, title, copy, actions };
    this.root.querySelector("#arcade-result-tag").textContent = tag;
    this.root.querySelector("#arcade-result-title").textContent = title;
    this.root.querySelector("#arcade-result-copy").textContent = copy;
    const buttons = this.root.querySelector("#arcade-result-actions");
    buttons.replaceChildren();
    for (const action of actions) {
      const button = document.createElement("button");
      button.textContent = action.label;
      button.className =
        "arcade-button " + (action.primary ? "arcade-primary" : "");
      button.onclick = action.run;
      buttons.append(button);
    }
    this.root.querySelector("#arcade-result").hidden = false;
    buttons.querySelector("button")?.focus();
  }
  get resultVisible() {
    return !this.root.querySelector("#arcade-result").hidden;
  }
  hideResult() {
    this.resultState = null;
    this.root.querySelector("#arcade-result").hidden = true;
    this.root.querySelector("#arcade-result-actions").replaceChildren();
  }
  hide() {
    this.hideResult();
    this.root.hidden = true;
  }
  trapFocus(event) {
    if (!this.resultVisible || event.code !== "Tab") return;
    const buttons = [
      ...this.root.querySelectorAll(
        "#arcade-result-actions button, .arcade-actions button",
      ),
    ];
    const index = buttons.indexOf(document.activeElement);
    event.preventDefault();
    buttons[
      (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length
    ]?.focus();
  }
}

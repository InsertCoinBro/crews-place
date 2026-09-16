const VENDOR_ROOT = `${import.meta.env.BASE_URL}vendor/littlejs/games/`;

const EMBEDDED_GAMES = {
  gem: {
    id: "gem",
    title: "Gem Garden",
    symbol: "◆",
    file: "matchThree.html",
    instructions:
      "Choose Play, then drag one gem onto a neighbor to make a row of three or more.",
  },
  golf: {
    id: "golf",
    title: "Crew’s Putt-Putt",
    symbol: "●",
    file: "miniGolf.html",
    instructions:
      "Choose a hole, then drag from the ball to aim and release to putt. Take all the time you need.",
  },
  tower: {
    id: "tower",
    title: "Tower Builder",
    symbol: "▥",
    file: "pillars.html",
    instructions:
      "Choose Play. Use Left and Right to move, Up to cycle jewels, Down to lower, and Space to place.",
  },
  brick: {
    id: "brick",
    title: "Brick Out",
    symbol: "▰",
    file: "brickout.html",
    instructions:
      "Choose Play. Move the paddle with your pointer or arrow keys, then click or press Space to launch.",
  },
  derby: {
    id: "derby",
    title: "Home Run Derby",
    symbol: "●",
    file: "homerDerby.html",
    instructions:
      "Choose Play. Click or press Space to swing, then press Enter when you are ready for the next pitch.",
  },
  ski: {
    id: "ski",
    title: "Downhill Ski",
    symbol: "▲",
    file: "skiing.html",
    instructions:
      "Choose Play. Move your pointer to steer and click to jump. Space or R starts a fresh run after a bump.",
  },
  throw: {
    id: "throw",
    title: "Free Throw",
    symbol: "○",
    file: "freeThrow.html",
    instructions:
      "Choose Play, drag from the basketball to aim, and release to shoot. This practice has no timer.",
  },
};

class EmbeddedArcadeGame {
  constructor(context, spec) {
    this.context = context;
    this.spec = spec;
    this.ready = false;
    this.pendingMuted = context.audio.muted;

    this.host = document.createElement("div");
    this.host.className = "arcade-embed-host";
    this.host.dataset.game = spec.id;

    this.frame = document.createElement("iframe");
    this.frame.className = "arcade-embed-frame";
    this.frame.title = `${spec.title} game`;
    this.frame.src = VENDOR_ROOT + spec.file;
    this.frame.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-pointer-lock",
    );
    this.frame.setAttribute("allow", "autoplay");

    this.onMessage = (event) => {
      if (
        event.source !== this.frame?.contentWindow ||
        event.origin !== location.origin
      )
        return;
      if (event.data?.type === "crewArcadeReady") {
        this.ready = true;
        this.setMuted(this.pendingMuted);
        this.context.hud.stats("Take your time");
        this.focusGame();
      } else if (event.data?.type === "crewArcadeExit") {
        this.context.exit();
      }
    };
    window.addEventListener("message", this.onMessage);

    this.host.append(this.frame);
    document.querySelector("#game").append(this.host);
    document.body.classList.add("arcade-embedded-active");
    context.hud.start(spec);
    context.hud.stats("Loading game…");
    context.hud.message("");
  }

  post(type, extra = {}) {
    this.frame?.contentWindow?.postMessage({ type, ...extra }, location.origin);
  }

  focusGame() {
    this.frame?.focus({ preventScroll: true });
    this.frame?.contentWindow?.focus();
  }

  setMuted(muted) {
    this.pendingMuted = muted;
    if (this.ready) this.post("crewArcadeMute", { muted });
  }

  pause() {
    this.post("crewArcadePause");
  }

  resume() {
    this.post("crewArcadeResume");
    this.focusGame();
  }

  virtualKey(code, down) {
    this.post("crewArcadeKey", { code, down });
  }

  update() {}

  resize() {}

  dispose() {
    window.removeEventListener("message", this.onMessage);
    this.post("crewArcadePause");
    if (this.frame) this.frame.src = "about:blank";
    this.host?.remove();
    document.body.classList.remove("arcade-embedded-active");
    this.frame = null;
    this.host = null;
  }
}

export class GemGarden extends EmbeddedArcadeGame {
  constructor(context) {
    super(context, EMBEDDED_GAMES.gem);
  }
}

export class CrewsPuttPutt extends EmbeddedArcadeGame {
  constructor(context) {
    super(context, EMBEDDED_GAMES.golf);
  }
}

export class TowerBuilder extends EmbeddedArcadeGame {
  constructor(context) {
    super(context, EMBEDDED_GAMES.tower);
  }
}

export class BrickOut extends EmbeddedArcadeGame {
  constructor(context) {
    super(context, EMBEDDED_GAMES.brick);
  }
}

export class HomeRunDerby extends EmbeddedArcadeGame {
  constructor(context) {
    super(context, EMBEDDED_GAMES.derby);
  }
}

export class DownhillSki extends EmbeddedArcadeGame {
  constructor(context) {
    super(context, EMBEDDED_GAMES.ski);
  }
}

export class FreeThrow extends EmbeddedArcadeGame {
  constructor(context) {
    super(context, EMBEDDED_GAMES.throw);
  }
}

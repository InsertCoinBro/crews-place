(() => {
  const send = (type) => {
    if (window.parent !== window)
      window.parent.postMessage({ type }, location.origin);
  };

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.code !== "Escape" || window.parent === window) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      send("crewArcadeExit");
    },
    true,
  );

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.origin !== location.origin)
      return;
    const message = event.data || {};
    if (message.type === "crewArcadePause") paused = true;
    else if (message.type === "crewArcadeResume") {
      paused = typeof isMenuVisible === "function" ? isMenuVisible() : false;
      document.querySelector("canvas")?.focus();
    } else if (
      message.type === "crewArcadeMute" &&
      typeof setMenuMuted === "function"
    )
      setMenuMuted(!!message.muted);
    else if (message.type === "crewArcadeKey") {
      const key =
        message.code === "Space" ? " " : message.code.replace(/^Key/, "");
      document.dispatchEvent(
        new KeyboardEvent(message.down ? "keydown" : "keyup", {
          code: message.code,
          key,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  });

  if (document.readyState === "complete") send("crewArcadeReady");
  else
    window.addEventListener("load", () => send("crewArcadeReady"), {
      once: true,
    });
})();

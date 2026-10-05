// To connect a real game, add an async `launch({ close, destination })` function.
// Controls remain paused until that game calls close(). No town changes needed.
export const destinations = {
  arcade: {
    title: "Star Arcade",
    description: "A home for playful puzzles and little discoveries.",
  },
  rec: {
    title: "Recreation Club",
    description: "A space to make, imagine, and try something new.",
    launch: ({ game, close }) =>
      new Promise((resolve) => {
        game.coloring.open(() => {
          close();
          resolve();
        });
      }),
  },
  park: {
    title: "Meadow Park",
    description: "Push the beach ball around the grass.",
    launch: ({ game, close }) => {
      game.parkBall.activate();
      game.ui.toast("Wheee! Push the beach ball around the park.");
      close();
      return Promise.resolve();
    },
  },
};

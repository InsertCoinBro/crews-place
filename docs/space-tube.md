# Starlight Slipstream

An east-side space tube slide, entered near `(156, 35)` on the lunar surface.
Follow the mint approach lights east from the space hub. Walk to the funnel
and press **E** (or **Use** on touch controls) to start the suction launch.

The approximately 3.3 km transparent, pastel-tinted route stays within the
existing space boundaries. It rises 315 m above the moon with a double spiral
climb, two vertical loops, a triple corkscrew, and a long twisting return dive.
The character rides visibly head-first on their stomach, with arms extended.
Airflow rings and speed-responsive wind audio accompany the ride; world sound
settings still apply. Bubble launching and alien pursuit suspend while aboard.

- Normal ride: **60 seconds**, including launch acceleration and a soft landing.
- **C / View** switches between follow and side cameras.
- **Gentler motion** slows the complete route to about 86 seconds, keeps the
  camera upright, and freezes the decorative moving airflow rings.
- **E / Exit safely** returns to the landing plaza immediately, at any point.
- **Esc / Pause** freezes the ride. Switching character or leaving the area
  cleans up the ride and restores normal walking.
- Finishing automatically returns the player to the adjacent exit plaza;
  walk back to the entrance to ride again.

Local development entry points: `/?space-tube-preview` for boarding and
`/?space-tube-test` for the five in-browser lifecycle checks across all avatars.
`tests/space-tube.test.js` checks route geometry, frame continuity, full duration
at 30/60/120 fps, gentle mode, avatar pose, pause, exit, and repeat rides.

# Starlight Explorer

A separate flyable spaceship at the northeast space dock (x 31, z -31). This does not replace or change the town-to-space rocket.

Walk to the marked boarding point and press E. The current character sits inside a transparent bubble cockpit. Twin blue-white rear boosters illuminate during movement. Drag to orbit the follow camera and see the pilot.

## Controls

- W/S or up/down arrows: forward/reverse; release to slow into a hover.
- A/D or left/right arrows: steer.
- Space: rise. C: lower.
- E or Return and land: automatic ascent to a clear return height, flight back to the northeast dock, descent and safe disembarking.
- Escape: pause. Gentler motion reduces flight speed and removes booster pulsing.

Touch controls use the existing movement joystick, Rise, Lower and Land buttons. The ship stays inside the space environment and above its surface, with collider clearance and a 55 m manual-flight ceiling. The alien encounter and blaster pause while aboard. Switching characters or leaving space restores the player and parks the ship at its dock.

## Development checks

`?spaceship-preview` starts beside the boarding marker. Tests in `tests/spaceship.test.js` load each real playable GLB and check cockpit attachment, finite poses/camera, flight, pause, the full return/landing loop, repeat boarding, world limits and obstacle clearance. These are automated Three.js checks, not a manual browser playthrough.

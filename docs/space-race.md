# Moonbeam Rally

A 3.88 km plasma spacecraft circuit on the west side of the expanded moon. The boarding
plaza is at `(-141, 80)`; mint approach lights lead west from the space hub.
The route stays clear of the rocket and ship docks, and
the eastern tube slide. Colored shoulders and raised edges mark the full track.

The selected player races the Moon Mischief aliens Nova and Pip in detailed
metallic spacecraft with glass cockpits and twin plasma exhausts. Their lane
choices respond to obstacles, traffic, boost pads and pickups. They can draft,
overtake and use power-ups; identical inputs repeat the same race (no randomness
or hidden catch-up teleporting). Swept hull contacts prevent driving through
rivals, including when lapping them. Finished rivals leave the active track.

Two laps cover 7.76 km: eight automatic jumps, 24 flaming jump rings, three
110-metre tunnels per lap, nine boost zones and five magnetic stoppers per lap.
Jump crests reach roughly 40–67 metres above the road. Normal speed is 88 m/s
(317 km/h), with boost up to 118 m/s (425 km/h). Even continuous maximum boost
cannot complete the race in under 65 seconds. Steering stays within the barriers
throughout jumps and turns. Passing fire rings counts toward the HUD and grants
a short boost.

Five meteor zones show amber warning circles before falling comets arrive.
An impact slows an unshielded ship briefly; decorative shower fragments fall
outside the track. Power-up capsules provide turbo, a protective shield, or a
gravity pulse that slows nearby rivals. The rivals can collect and use them too.

## Controls and comfort

- Walk to the boarding marker and press E / Use. Start when ready with E or the
  Start race button, followed by a three-second visual countdown.
- A/D or left/right arrows move across the track; the kart follows its bends.
- Auto-accelerate starts enabled. Turn it off to hold W/up for acceleration.
- S/down brakes. On touch screens use the stick left/right to steer, up for
  manual acceleration, or down to brake. Jumps happen automatically.
- Cyan chevrons accelerate; amber magnetic grids and bumpers slow the ship.
  Hazards never cause a crash screen or restart. Press F or tap the HUD power-up
  button to use a collected capsule. Shields block stoppers, meteors and pulses,
  but do not make hulls intangible.
- Gentler motion slows every racer equally and softens the camera. The world's
  existing sound toggle and audio settings apply to the hover engines. Gentler
  motion also steadies fire animation and limits the speed-sensitive field of
  view. There are no camera rolls or screen flashes. The race HUD stays compact
  at the side; the Controls button expands the other options.
- Esc/Pause freezes the race. Exit safely is always available; E also exits
  during countdown/racing. E on the results screen starts a fresh race.

First place awards a gold trophy on the plaza stand and increments the trophy
count saved in this browser. Other finishes receive an encouraging completion
message and can retry. If browser storage is unavailable, awards still work
for the current visit. Avatar and area changes restore walking and clear the race.

The expanded moon's western and southern bounds remain accessible, preserving
the race plaza and full spaceship flight area.

Effects are distance-culled, fire uses instanced geometry, and distant alien rigs
remain hidden until the station is nearby or the player boards.

Development previews: `/?space-race-preview` and `/?space-race-test`. The latter
checks full races with all three avatars, every jump, win and non-win rewards,
pause, touch input, replay, exit, and area/character cleanup. Its jump inspector
freezes an actual simulated jump for visual review without awarding a trophy.

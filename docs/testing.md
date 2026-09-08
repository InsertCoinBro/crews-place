# Prototype verification

## Automated checks

`pnpm test`: 33 checks covering physics, routes, arcade rules, the imported cowboy, and the player car. Character checks load the actual GLB, verify ground origin/scale/facing and absence of studio geometry, exercise movement and jumping without rigged limbs, and confirm mini-game clones cannot dispose the town player's resources.

The development browser harness (`/?test`) checks the actual game and input system in a WebGL browser: startup/rendering, WASD, arrows, stopping, wall/ground/boundary collision, jumping, trampoline bounces, moving leaf particles, E-key entry/exit for both rooms, all three activity panels, disabled controls under panels, Escape/cancel, camera rotation/obstruction, exit-door camera clearance, traffic/NPC animation, the player car's enter/forward-drive/exit/park behavior, and pause/resume key clearing.

Browser setup teleports the player to each test location, then drives keyboard events and fixed simulation frames through the real game loop. This is integration coverage, not a claim that every path was explored manually.

The development-only `/?coaster-test` harness exercises the complete Rainbow Rush loop: boarding, separate launch, movement lockout, pause and resume, follow and front-seat cameras, two inversions, fast sections, exact station return, repeat rides, early exit, both selectable characters, gentler-motion camera behavior, finite transforms, rendering, and WebGL health. The recorded implementation run passed 9/9 checks.

## Manual visual checks

Cowboy and vehicle integration: all 33 Node tests and 28 town browser checks passed in the local Chromium browser. The cowboy replaces the main player and the mini-game avatar; Rocket Flyer shows its head, face and hat. The production build includes the local GLB. Character animation clips remain intentionally absent.

Opening screen, visible third-person character, actual mouse-drag camera rotation, arcade interior, recreation room, contextual door prompt, and activity panel are checked in the Codex Chromium browser during implementation.

## Limitations

Safari, Firefox, low-end/mobile hardware, gamepads, touch movement, and assistive-technology gameplay have not been tested. No user studies or clinical/therapeutic outcomes are claimed. Runtime performance varies with hardware. Test results do not prove all combinations of camera angle, collision corner, or input timing are free of bugs.

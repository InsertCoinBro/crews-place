# Crew's Place · Little Town

A playable browser-based 3D exploration prototype, built with JavaScript, Three.js, HTML, CSS, and Vite. Start the game and freely explore the town and its broad surrounding countryside with no timer or objectives.

## Launch on this Mac

Double-click `start.command`, then open the local address shown in its terminal (usually http://127.0.0.1:5173). Alternatively, run `sh start.command` in the VS Code terminal, or run the **Start Crew's Place** task. The launcher can use the Node runtime bundled with Codex when Node is not on your PATH.

Keep the terminal open while playing. Press Ctrl+C there to stop the server. This version uses Vite; use the launcher instead of Live Server or opening the HTML file directly.

## Launch on another computer

Install Node.js 22.12+ and npm or pnpm. In this project folder:

```sh
npm install
npm run dev
```

The project includes a `pnpm-lock.yaml`; `pnpm install --frozen-lockfile` and `pnpm dev` use its exact dependency versions. `npm run build` creates a standalone production site in `dist/`; `npm run preview` serves it locally. No external artwork, remote fonts, account, API key, or backend is required.

## Controls

| Control                        | Action                                                 |
| ------------------------------ | ------------------------------------------------------ |
| WASD or arrow keys             | Walk relative to the camera                            |
| Hold the mouse button and drag | Rotate the camera                                      |
| Free mouse button              | Toggle optional mouse lock; then simply move the mouse |
| Q / R                          | Rotate the camera using the keyboard                   |
| Space                          | Jump; land on the trampoline to bounce                 |
| E                              | Use the nearby door or activity                        |
| Near the blue car: E, W/S      | Enter/exit; drive forward or reverse around the street |
| At Rainbow Rush: E             | Board the coaster, then launch the ride                |
| During Rainbow Rush: C         | Switch between follow-cart and front-seat views        |
| Escape / Pause                 | Pause; Escape also closes an activity panel            |

The controls guide and contextual prompts remain on screen. The game pauses when the window loses focus. The Pause menu includes gentler camera motion and fewer leaf particles; this starts enabled if the system requests reduced motion. The prototype is silent.

## What works

- Custom Blender cowboy as the main character, with blue eyes, mustache, goatee, Western outfit and holster. Smooth movement, jumping and camera follow work; the character keeps its current pose until skeletal animations are added.
- Ground, wall, furniture, tree-trunk, and map-edge collision; camera obstruction checks for buildings and room walls/doors.
- A 180×180 walkable countryside—three times the original width and depth—with open grassland, scattered tree clusters, wildflowers, distant hills, and scenery beyond the boundary so there is no visible world drop-off.
- The animated horse from the Character Creations project wanders a quiet outer meadow and rests when the player approaches.
- Streets, sidewalks, shops, a library exterior, park, benches, trees, flowers, fountain, and a position map on wider screens.
- Four cars on two road loops and seven pedestrians on walking routes. They stop when the player is close ahead. There is no traffic damage.
- A bulky blue player car starts on the east street beside Meadow Park. Press E near it to get in, use W/S or Up/Down to drive forward or reverse around the street loop, and press E again to get out. The car stays parked wherever you leave it.
- **Rainbow Rush Coaster Park** fills the northeast countryside where the player was standing when it was requested. Its 544-meter circuit includes a 33-meter lift, major drop, two full loops, fast sweeping sections, a three-cart train, and station brakes that return the rider to the same platform. Press E to board, launch with E or the on-screen button, and press C to switch views. Gentler motion keeps the camera upright through inversions.
- **Star Arcade** (northwest) and **Recreation Club** (northeast): walk to a front door and press E to enter. Walk to the interior exit and press E to return.
- Arcade cabinets, the recreation room's creative table, and the park activity sign open a **Mini-game coming soon** panel; player input is disabled until it closes.
- Jump into the leaf pile in Meadow Park to scatter leaves. They settle and can be triggered again.
- Jump onto the round trampoline in Meadow Park. Each descending landing automatically bounces the player; move off the mat to stop.

## Code map

```text
app.js                      Game loop, scene, mode changes, transitions
shared/core/
  input.js                  Keyboard, mouse drag, and pointer-lock input
  player.js                 Player movement and grounded character transform
  physics.js                Horizontal collisions, gravity, jump, bounce
  camera.js                 Follow camera and obstruction handling
  interactions.js           Nearby interaction registry and handler dispatch
shared/world/
  models.js                 Replaceable character, building, tree, car factories
  player-character.js       Load the main cowboy GLB before starting the game
  town.js                   Building definitions, park, paths, and town bounds
  landscape.js              Expanded grassland, outer scenery, trees, flowers
  wildlife.js               Imported horse asset, animation, and meadow route
  coaster-track.js          Closed track, transported frame, and ride physics
  coaster.js                Park scenery, train, interactions, HUD, and ride camera
  interiors.js              The two rooms and their exits
  routes.js                 Reusable closed-route sampling
  traffic.js                Vehicles and driving loops
  npcs.js                   Pedestrians and walking loops
  leaves.js                 Reusable leaf particle pool
shared/components/ui.js     Prompts, messages, location label, position map
games/destinations.js       Mini-game connection points
styles/                    Opening screen, HUD, and dialogs
tests/                     Physics, routes, and browser interaction checks
assets/models/             Game-ready cowboy GLB, export details and instructions
characters/                Editable Blender character masters and Python exporters
```

## Add a mini-game

Each destination has a stable ID (`arcade`, `rec`, or `park`) in `games/destinations.js`. Add a `launch({ close, destination })` function to its entry and keep game-specific files in a separate `games/<name>/` folder. The town pauses before launching; call `close()` to resume. The current dialog can serve as the activity host or be replaced by the game's own UI.

To add a new location, call `interactions.register()` with an ID, area ID, x/z position, radius, label, kind, and destination ID. Door interactions use the same registry with a target area. Replace primitive model factories in `models.js` without rewriting movement or the activity system; retain their scale, ground origin, and named limb references or adapt the animation function.

## Verification

```sh
npm test
npm run build
```

For browser integration checks, run the development server and visit `/?test`. The visible report exercises the actual game loop with keyboard events and arranged scenarios. Its scenario buttons also allow visual inspection. This harness is not included in the production bundle. See `docs/testing.md` for recorded results and limitations.

## Still placeholders

The main cowboy is an imported Blender model; NPCs, buildings, vehicles, scenery, and interiors still use generated placeholder geometry. The cowboy has no skeletal animations yet. Voice instructions, saving, character selection, and touch/gamepad movement are not implemented. Rooms use instantaneous door transitions and have no ceilings. Vehicle/NPC movement uses fixed routes rather than full pathfinding or mutual collision avoidance. The library and café are exterior scenery. The town is a desktop keyboard-and-mouse prototype; it has not yet been usability-tested with autistic players or caregivers.

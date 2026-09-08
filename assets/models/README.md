# Main character: Cowboy

`cowboy.glb` is the game's default player, loaded before Start Game is enabled. It is also cloned for Memory Hop and Bubble Pop; Rocket Flyer displays its head, hat and facial features in the cockpit.

- Editable master: `characters/cowboy_animated_v03/cowboy_animated_v03.blend` (project root).
- Exporter: `characters/cowboy_animated_v03/build_animations.py`.
- Game coordinates: Y up, +Z forward, feet at Y=0; height 1.85 units.
- Embedded materials; no remote artwork, textures or decoder dependency.
- `avatarPart` mesh metadata identifies body, head, shirt, trousers, boots, hat, gear and face.
- The exported copy reduces mesh density and combines parts by material. The original Blender file retains its separate editable parts and studio.
- Rigify source rig and a baked 21-bone game skeleton. Ten clips: Idle, Walk, Run, JumpStart, JumpRise, JumpFall, Land, Dance, Reach and Carry. Mini-game copies have independent skeletons and mixers. NPC animation is unchanged.

Re-export from the project root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python characters/cowboy_animated_v03/build_animations.py
```

Run `npm test` and `npm run build` afterward. Check `/?test` and `/?arcade-test` in the development browser for town and mini-game integration. The earlier static export statistics are in `cowboy-export.json`; current clip timings are in `characters/cowboy_animated_v03/animation_manifest.json`.

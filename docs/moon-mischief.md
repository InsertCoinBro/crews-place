# Moon Mischief

Original 3D alien for Crew’s Place: mildly spooky eyes and brows, rounded horns and three soft fingers. The exported character has no built-in weapon; the game equips a separate sci-fi blaster in space.

Open `moon_mischief_animated.blend` in Blender. The `MoonMischiefRig` armature has 15 bones; choose any action in the Action Editor. `build_alien.py` recreates the source, export and two previews using Blender 5.2. The studio is excluded from the exported model.

Game-ready model: `../../assets/models/moon_mischief.glb` (about 1 MB). Self-contained materials, 30 fps, grounded feet, approximately 2.22 m tall. Faces Blender -Y / glTF +Z.

14 clips: Idle, Walk, Run, ChaseRun, Reach, Tag, Wave, Celebrate, LookAround, Nod, ShakeHead, Jump, Fall, Land. ChaseRun is the arms-forward reaching run; Run is ordinary playable locomotion. See `animation_manifest.json` for durations and looping.

## In Crew’s Place

Choose Moon Mischief at the opening screen or from the pause menu. Use the existing movement, run, jump and gesture controls.

Five independent Moon Mischief NPCs spawn around the space boundary and chase after a short grace period. Walking is faster than the aliens; Gentler motion slows them further. They follow routes around obstacles and respect the safe landing area. They rest during playground and Space Dive activities, and freeze while paused. Pause alien chase is available during space exploration. After reaching the player, an alien waves briefly before resuming its chase. Leaving space resets the encounter. Turning the chase off lasts for the current game session.

Cowboy, Jolly Robot and Moon Mischief all equip a visible bubble launcher in space. Face an alien and press **B**, or use the **Blow bubble** button. A small forward aim-assist cone selects a visible target; scenery blocks shots. A hit surrounds an alien in a transparent bubble and gently carries it upward and outward. Once the bubble floats beyond the play area, that alien returns at a clear spot along the boundary. Aiming and recoil are procedural in-game animations layered over each character's movement; the Blender source and its 14 exported clips are unchanged. Pausing the encounter also pauses the bubbles.

## Verification

The model was rendered and visually inspected, then cleanly re-imported into Blender with all 14 clips and its 15-bone rig. The game GLB matches the export in Character creations. Automated Three.js tests cover animation validity, independent NPC skeletons, chase behavior, cover, directional targeting, boundary respawn and aiming/recoil on all three playable rigs. The development-only `?space-combat-test` browser harness checks five visible NPCs, firing and respawning with each playable character, and activity/pause safety. All 90 Node tests, all five browser integration checks and the production build passed for this update.

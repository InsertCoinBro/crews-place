# Moon Mischief

Original 3D alien for Crew’s Place: mildly spooky eyes and brows, rounded horns and three soft fingers. No teeth, weapons or attack animation.

Open `moon_mischief_animated.blend` in Blender. The `MoonMischiefRig` armature has 15 bones; choose any action in the Action Editor. `build_alien.py` recreates the source, export and two previews using Blender 5.2. The studio is excluded from the exported model.

Game-ready model: `../../assets/models/moon_mischief.glb` (about 1 MB). Self-contained materials, 30 fps, grounded feet, approximately 2.22 m tall. Faces Blender -Y / glTF +Z.

14 clips: Idle, Walk, Run, ChaseRun, Reach, Tag, Wave, Celebrate, LookAround, Nod, ShakeHead, Jump, Fall, Land. ChaseRun is the arms-forward reaching run; Run is ordinary playable locomotion. See `animation_manifest.json` for durations and looping.

## In Crew’s Place

Choose Moon Mischief at the opening screen or from the pause menu. Use the existing movement, run, jump and gesture controls.

A separate alien waits near the space landing pad. After leaving the safe landing area, it starts a gentle chase following a short grace period. Walking is faster than the alien; Gentler motion slows it further. It follows routes around obstacles. It rests while the player is using playground activities, and freezes while paused. Stop alien chase is always available during space exploration. After a tag, it waves and waits for Play tag again. Leaving space resets the encounter. Turning the chase off lasts for the current game session.

## Verification

The model was rendered and visually inspected, then cleanly re-imported into Blender with all 14 clips and its 15-bone rig. Automated Three.js tests cover finite clips, forward-reaching hands, independent NPC skeleton, player movement/jumping, safe-zone behavior, pause, tag/restart/stop, gentle speed, obstacle paths and actual space-world collider placement. The game production build is checked separately. No manual browser playthrough was performed for this delivery.

# Animated cowboy

Open `cowboy_animated_v03.blend` in Blender. The visible character uses the fitted `Cowboy_Rigify` rig; its `Rigify_*` actions are editable. `Cowboy_Metarig` is retained for future fitting. The hidden `CowboySkeleton` stores the baked game actions.

`build_animations.py` rebuilds the rig and animations from `cowboy_static_v02.glb` and exports `../../assets/models/cowboy.glb`. It uses Blender's bundled Rigify, with 21 deform bones and ten clips: Idle, Walk, Run, JumpStart, JumpRise, JumpFall, Land, Dance, Reach and Carry. Facial features and clothing come from the original model. Hands retain the original mitten geometry.

Game controls: WASD/arrows move, Shift runs, Space crouches then jumps, F toggles the cowboy's line dance, and T grabs/returns toys at the two stands near the starting area. Approach the stand and stop before grabbing. Movement stops the dance. Item contact is timed to the reach, with runtime two-bone arm IK and a right-arm carrying pose.

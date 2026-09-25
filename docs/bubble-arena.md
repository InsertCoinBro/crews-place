# Bubble Basin

The alien bubble activity now lives in a 220 × 220 meter square northeast of the moon landing area (x 140–360, z −410 to −190). The west race course and east tube slide remain clear. The arena uses the existing textured moon floor, with five perimeter wall sections, a wide south entrance, twelve moon-stone cover islands, and a mint safe circle just inside.

Walk through the gate to equip the bubble launcher automatically. B or **Blow bubble** fires a short trail of bubbles. Cover blocks shots and alien movement. Five Moon Mischief aliens pursue only players inside the square; navigation bounds keep them inside even at the open gate. Captured aliens float upward in bubbles, remain horizontally inside the square, and respawn at clear positions inside its boundary. Bubble meshes share reusable geometry and material.

If an unbubbled alien stays within 2.4 meters with a clear view of the player for three continuous seconds, the warning meter fills and the player returns to the entrance safe circle. Moving away or behind cover clears the warning. The safe circle and a four-second entry/reset grace period protect the player. Pausing the game freezes the warning; **Pause alien chase** stops pursuit and firing. **Leave arena** returns outside the entrance. Walking outside also hides the launcher and activity controls, and stops pursuit.

Local previews: `?space-combat-preview` starts outside the entrance; `?space-combat-test` checks walking in/out, all three avatars, capture/contained respawn, solid cover, crowding/pause/reset, and exit controls using the running game.

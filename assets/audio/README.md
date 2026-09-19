# Crew's Place audio library

This folder is the audio staging area for future game integration. Files are grouped by intended use rather than by the source website so the implementation pass can find them quickly.

## License policy

- `library/kenney/` contains the original downloaded Kenney CC0 zip packs kept for provenance.
- `sfx/` contains the curated files selected from those packs plus a few CC0 Freesound preview files.
- Every downloaded item is recorded in [`manifest.json`](./manifest.json) with its source page, direct download URL, license, and suggested Crew's Place events.
- The Freesound files are preview MP3s. They are suitable for prototyping and mapping, but the full-quality source should be downloaded later if the sound is selected for release.
- No sound files have been wired into gameplay yet.

## Categories

- `sfx/ui/` — buttons, panels, confirmation, errors, book/page movement.
- `sfx/movement/` — footsteps, landings, soft impacts, metal/wood cues.
- `sfx/nature/` — leaves and fountain ambience.
- `sfx/space/` — doors, engines, thrusters, bubble/beam, rocket cues.
- `sfx/interactions/` — pickup, reward, navigation, and positive feedback tones.

## Important implementation notes

These files cover many events through reusable sound families. They are not one unique file for every event in the audit. For example, one gentle impact can cover trampoline landing, toy placement, and coaster arrival with different volume/pitch settings. Ride wheel, weather, traffic, animal, tractor, and detailed playground recordings still need a dedicated selection or recording pass.

# Crew's Place audio library

This folder is the audio library used by Crew's Place. Files are grouped by intended use rather than by the source website so the implementation can find them quickly.

## License policy

- `library/kenney/` contains the original downloaded Kenney CC0 zip packs kept for provenance.
- `sfx/` contains the curated files selected from those packs plus processed CC0 recordings.
- The original selection is recorded in [`manifest.json`](./manifest.json) with its source page, direct download URL, license, and suggested Crew's Place events.
- The realistic recording pass is listed in [`realistic-manifest.json`](./realistic-manifest.json). It preserves the downloaded source beside each normalized runtime derivative, including source page, author, license, hashes, and processing settings.
- Runtime files are mono 44.1kHz MP3 derivatives with gentle fades, compression, headroom, and loop seams so they remain comfortable when several nearby sounds overlap.

## Categories

- `sfx/ui/` — buttons, panels, confirmation, errors, book/page movement.
- `sfx/movement/` — footsteps, landings, soft impacts, metal/wood cues.
- `sfx/nature/` — leaves and fountain ambience.
- `sfx/space/` — doors, engines, thrusters, bubble/beam, rocket cues.
- `sfx/interactions/` — pickup, reward, navigation, and positive feedback tones.
- `sfx/realistic/` — farm animals, coaster wheels and chain, car and tractor engines, rocket, propeller, weather, playground, and ride ambience.

## Important implementation notes

The runtime mixer starts sounds from the player's proximity or active ride state, then fades, pitches, and ducks them through one shared Web Audio graph. Animal calls are scheduled independently, so the player can hear the nearby animal rather than a single farm-wide loop. The pause dialog includes master volume, ambience volume, mute, and gentler-sounds controls.

The rolling foley recording supplies both coaster wheels and the quieter playground spinner. Snow uses a soft outdoor breeze. Rabbit audio is movement in bedding. Rocket thrust uses a processed NASA-derived shuttle recording. The approved trampoline, landing/jump, and bubble effects are retained, along with short interface and fictional spaceship effects.

Sound preferences are saved independently of motion preferences. Background volume includes animal calls, traffic, fountain, and weather. World mute remains accessible during rocket travel; narrated lessons retain their separate controls.

To reproduce the prepared recordings, run `node scripts/prepare-realistic-audio.mjs` from the project root with FFmpeg installed. For browser checks, run the development server, open `/?audio-test`, and select **Run audio checks**. This verifies actual browser decoding, output signal, proximity, activity transitions, and mute/pause cleanup without using a microphone. These checks do not measure the listener's speakers or individual sensory preferences.

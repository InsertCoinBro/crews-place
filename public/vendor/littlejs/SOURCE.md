# LittleJS Arcade source record

Crew's Place includes selected files from LittleJS Arcade under its MIT license.

- Upstream: https://github.com/KilledByAPixel/LittleJSArcade
- Commit: `0cbf5fe8713d02b453c8f210c686c633f55f149d`
- Downloaded archive: `LittleJSArcade-0cbf5fe8713d02b453c8f210c686c633f55f149d.zip`
- Included games: Match Three, Mini Golf, Pillars, Brickout, Home Run Derby, Skiing, and Free Throw
- Included shared files: the LittleJS engine builds, Box2D WebAssembly runtime, and the four templates required by these games

The game HTML files have small Crew's Place integration patches: local display names, embedded-layout CSS, removal of a misleading leaderboard sentence, and a same-origin lifecycle bridge for pause, mute, focus, and exit. Free Throw is untimed in Crew's Place, and Downhill Ski uses a gentle retry message. The remaining game rules and core gameplay stay aligned with the upstream code.

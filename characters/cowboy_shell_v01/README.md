# Cowboy shell · version 01

Open **cowboy_shell_v01.blend** in Blender. The character is built with Python and saved as native editable Blender geometry.

- Full blank body, with a featureless head and simple mitten hands.
- Removable Western shirt, trousers, boots, hat, belt, holster, and stylized revolver prop.
- Named collections separate the parts. Collection `90` contains only the presentation studio.
- The `COWBOY | stage 01 master` empty moves the assembled character.
- Front is -Y, up is Z, and the feet are at ground level.
- Flat color materials are editable and use no external textures.

This is the initial modeling shell. Facial features, hair, individual fingers, final topology, UV work, rigging, and animation are future steps.

`cowboy_shell_preview.png` and `cowboy_shell_rear.png` show the rendered model. `build_cowboy.py` reproduces this version; a copy is also embedded in the blend file's Text Editor. Run the builder in a **fresh background Blender process**, because it clears its active scene before creating the model:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python build_cowboy.py
```

The builder regenerates the named version-01 outputs, so save future hand-edited versions under a new filename before running it again.

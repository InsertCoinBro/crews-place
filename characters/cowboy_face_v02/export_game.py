"""Export the approved cowboy to a compact, animation-free game GLB.

Uses an isolated Blender process; never overwrites the editable source blend.
"""
import bpy
import bmesh
import math
import json
from pathlib import Path
from mathutils import Matrix, Vector

HERE=Path(__file__).resolve().parent
DEST=HERE.parents[1]/'assets'/'models'
DEST.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(HERE/'cowboy_face_v02.blend'))
deps=bpy.context.evaluated_depsgraph_get()
sources=[o for c in bpy.data.collections if c.name[:2] in ('01','02','03','04','05','06','07')
    for o in c.objects if o.type in ('MESH','CURVE')]
temp=bpy.data.collections.new('GAME EXPORT');bpy.context.scene.collection.children.link(temp)
parts={'01':'body','02':'shirt','03':'trousers','04':'boots','05':'hat','06':'gear','07':'face'}
runtime=[]

def add_mesh(name,me,part,budget):
    ob=bpy.data.objects.new(name,me);temp.objects.link(ob)
    ob['avatarPart']=part
    bpy.context.view_layer.objects.active=ob
    me.calc_loop_triangles()
    if len(me.loop_triangles)>budget:
        mod=ob.modifiers.new('Game mesh reduction','DECIMATE')
        mod.ratio=budget/len(me.loop_triangles)
        bpy.ops.object.modifier_apply(modifier=mod.name)
    runtime.append(ob)

for source in sources:
    me=bpy.data.meshes.new_from_object(source.evaluated_get(deps))
    me.transform(source.matrix_world)
    part=parts[next(c.name[:2] for c in source.users_collection if c.name[:2] in parts)]
    if part=='body':
        # Split head from the mannequin for the rocket cockpit. Every face stays
        # in one of the two pieces; the split is concealed inside the shirt collar.
        for head in (True,False):
            copy=me.copy();bm=bmesh.new();bm.from_mesh(copy)
            remove=[f for f in bm.faces if (f.calc_center_median().z>=1.785)!=head]
            bmesh.ops.delete(bm,geom=remove,context='FACES')
            loose=[v for v in bm.verts if not v.link_faces]
            if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
            bm.to_mesh(copy);bm.free()
            add_mesh('Cowboy head' if head else 'Cowboy body',copy,'head' if head else 'body',6500 if head else 7000)
        bpy.data.meshes.remove(me)
    else:
        budget=900 if part=='face' else 2200
        if source.name.startswith('SHIRT |'):budget=10000
        if source.name.startswith('TROUSERS |'):budget=6500
        if source.name.startswith('NOSE |'):budget=1600
        if source.name.startswith('HAT | swept'):budget=4000
        add_mesh(source.name,me,part,budget)

# Join by semantic part/material, reducing draw calls while keeping a head/hat/
# face selection for the cockpit. Animation will be authored in the source file.
groups={}
for ob in runtime:
    key=(ob['avatarPart'],tuple(m.name for m in ob.data.materials))
    groups.setdefault(key,[]).append(ob)
merged=[]
for (part,mats),objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    ob=objects[0];ob.name='cowboy_'+part+'_'+(mats[0].split('|')[-1].strip() if mats else 'mesh')
    ob['avatarPart']=part
    merged.append(ob)

bottom=min(v.co.z for ob in merged for v in ob.data.vertices)
top=max(v.co.z for ob in merged for v in ob.data.vertices)
scale=1.85/(top-bottom)
for ob in merged:
    for v in ob.data.vertices:
        v.co=Vector((v.co.x*scale,v.co.y*scale,(v.co.z-bottom)*scale))
    ob.data.update()

root=bpy.data.objects.new('Cowboy',None);temp.objects.link(root)
root['avatarId']='cowboy';root['sourceVersion']='face-v02';root['rigged']=False
for ob in merged:ob.parent=root
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for ob in merged:ob.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(DEST/'cowboy.glb'),export_format='GLB',
    use_selection=True,export_apply=True,export_yup=True,export_animations=False,
    export_cameras=False,export_lights=False,export_extras=True)
tris=0
for ob in merged:
    ob.data.calc_loop_triangles();tris+=len(ob.data.loop_triangles)
report={'source':'characters/cowboy_face_v02/cowboy_face_v02.blend',
    'asset':'assets/models/cowboy.glb','height':1.85,'up':'+Y','forward':'+Z',
    'ground_origin':True,'meshes':len(merged),'triangles':tris,
    'bytes':(DEST/'cowboy.glb').stat().st_size,'animations':0,'studio_exported':False}
(DEST/'cowboy-export.json').write_text(json.dumps(report,indent=2)+'\n')
print('EXPORT_REPORT',json.dumps(report),flush=True)

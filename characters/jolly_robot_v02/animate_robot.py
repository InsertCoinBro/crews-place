"""Generate a real Rigify mechanical rig, facial morphs and a game animation set.

Run in a fresh background Blender process. Version 01 stays untouched.
"""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

OUT=Path(__file__).resolve().parent
PROJECT=OUT.parents[1]
TAU=math.tau
bpy.ops.wm.open_mainfile(filepath=str(OUT.parent/'jolly_robot_v01/jolly_robot_v01.blend'))
bpy.ops.preferences.addon_enable(module='rigify')
from rigify.generate import generate_rig

scene=bpy.context.scene
old=bpy.data.objects['Jolly_Rig']
master=old.parent
parts=[ob for ob in bpy.data.objects if ob.type=='MESH' and 'rigid_bone' in ob]
old.animation_data_clear()
for pb in old.pose.bones:
    pb.rotation_quaternion=Quaternion();pb.location=(0,0,0);pb.scale=(1,1,1)
old.data.pose_position='REST'
scene.frame_set(1)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)

# Each hard-surface segment has a Rigify control and a separate deform bone.
# These components deliberately preserve mechanical joints without stretchy limbs.
meta=old.copy();meta.data=old.data.copy();old.users_collection[0].objects.link(meta)
meta.name='Jolly_Metarig';meta.data.name='Jolly | Rigify mechanical metarig'
meta.parent=None;meta.matrix_world=Matrix.Identity(4)
meta.data.pose_position='POSE'
meta.data.bones['root'].name='hips'
for pb in meta.pose.bones:
    pb.rigify_type='basic.super_copy'
    pb.rigify_parameters.make_control=True
    pb.rigify_parameters.make_deform=True
    pb.rigify_parameters.super_copy_widget_type='circle'
    pb.rotation_mode='QUATERNION'
    if pb.parent:
        pb.rigify_parameters.relink_constraints=True
        pb.rigify_parameters.parent_bone=pb.parent.name
bpy.ops.object.select_all(action='DESELECT')
meta.select_set(True);bpy.context.view_layer.objects.active=meta
generate_rig(bpy.context,meta)
rig=bpy.context.object
assert rig!=meta and rig.type=='ARMATURE'
rig.name='Jolly_Rigify';rig.parent=master
rig['rig_system']='Rigify';rig['rig_components']='15 basic.super_copy mechanical FK components'
rig['animation_help']='Use the Action Editor to choose a clip. Pose the colored controls; DEF bones drive the rigid metal panels.'
meta.parent=master;meta.hide_render=True;meta.hide_set(True)
meta['purpose']='Keep this metarig to regenerate the Rigify control rig.'
names=[('hips' if b.name=='root' else b.name) for b in old.data.bones]
for ob in parts:
    bone='hips' if ob['rigid_bone']=='root' else ob['rigid_bone']
    ob['rigid_bone']='DEF-'+bone
    for group in ob.vertex_groups:group.name='DEF-'+bone
    for mod in ob.modifiers:
        if mod.type=='ARMATURE':mod.object=rig
    ob.parent=rig
    ob['avatarPart']='head' if bone=='head' else 'body'
bpy.data.objects.remove(old,do_unlink=True)

# Join just the luminous expression strokes, preserving their source geometry.
expression=[o for o in parts if o.name.startswith(('Face | happy','Face | generous','Face | cheek'))]
# Apply the bevels before joining and adding shape keys. Armature remains live.
for ob in expression:
    bpy.context.view_layer.objects.active=ob
    for mod in list(ob.modifiers):
        if mod.type!='ARMATURE':bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.object.select_all(action='DESELECT')
for ob in expression:ob.select_set(True)
bpy.context.view_layer.objects.active=expression[0];bpy.ops.object.join()
face=bpy.context.object;face.name='Jolly_Expressions';face['avatarPart']='face'
# Work with model-space coordinates for predictable expression authoring.
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
basis=face.shape_key_add(name='Basis')
for name in ('Blink','Focused','Surprised','Delighted','Wink'):
    key=face.shape_key_add(name=name)
    for i,v in enumerate(basis.data):
        x,y,z=v.co;nx,nz=x,z
        if z>2.10: # Upward eye arcs.
            xc=-.211 if x<0 else .211
            if name=='Blink' or (name=='Wink' and x>0):nz=2.169+(z-2.169)*.12
            if name=='Focused':nz=2.163+(z-2.163)*.25+(abs(x)-.211)*.27
            if name=='Surprised':nx=xc+(x-xc)*.72;nz=2.18+(z-2.18)*1.25
            if name=='Delighted':nz=2.15+(z-2.15)*1.13
        elif abs(x)<.253: # Smile, including its rounded end caps.
            if name=='Focused':nx=x*.72;nz=2.005+(z-2.005)*.53
            if name=='Delighted':nx=x*1.07;nz=2.048+(z-2.048)*1.19
            if name=='Surprised':
                theta=math.atan2((z-2.045)/.131,x/.22)
                if theta>0:theta=math.pi if x<0 else TAU
                else:theta+=TAU
                theta=max(math.pi,min(TAU,theta))
                cx=.22*math.cos(theta);cz=2.045+.131*math.sin(theta)
                phi=2*(theta-math.pi)+math.pi/2
                nx=.065*math.cos(phi)+(x-cx)*.72
                nz=1.995+.078*math.sin(phi)+(z-cz)*.72
        key.data[i].co=(nx,y,nz)
keys=face.data.shape_keys
keys.name='Jolly | expressive display morphs'

TAU=math.tau
axes={'X':Vector((1,0,0)),'Y':Vector((0,1,0)),'Z':Vector((0,0,1))}
def rotate(name,x=0,y=0,z=0):
    pb=rig.pose.bones[name];q=Quaternion();rest=pb.bone.matrix_local.to_quaternion()
    for axis,angle in [('X',x),('Y',y),('Z',z)]:q=q@Quaternion(rest.inverted()@axes[axis],math.radians(angle))
    pb.rotation_quaternion=q

def translate(name,v):
    pb=rig.pose.bones[name];pb.location=pb.bone.matrix_local.to_quaternion().inverted()@Vector(v)

def reset():
    for pb in rig.pose.bones:
        pb.rotation_mode='QUATERNION';pb.rotation_quaternion=Quaternion();pb.location=(0,0,0);pb.scale=(1,1,1)
    for key in keys.key_blocks:key.value=0

def expression_value(name,value):keys.key_blocks[name].value=max(0,min(1,value))
def pulse(t,center,width):return max(0,1-abs(t-center)/width)
def ease(t):t=max(0,min(1,t));return t*t*(3-2*t)

# Durations match their intended gameplay state. Root translation stays in game physics.
clip_ends={'Idle':97,'Walk':33,'Run':21,'Jump':11,'Fall':25,'Land':9,
           'Wave':81,'Celebrate':65,'LookAround':97,'Nod':41,'ShakeHead':49}
clips={}
for name,end in clip_ends.items():
    action=bpy.data.actions.new(name);action.use_fake_user=True
    rig_slot=action.slots.new(id_type='OBJECT',name=rig.name)
    face_slot=action.slots.new(id_type='KEY',name=keys.name)
    rig.animation_data_create();rig.animation_data.action=action;rig.animation_data.action_slot=rig_slot
    keys.animation_data_create();keys.animation_data.action=action;keys.animation_data.action_slot=face_slot
    for frame in range(1,end+1):
        reset();t=(frame-1)/(end-1);a=TAU*t
        if name=='Idle':
            rotate('body',y=1.2*math.sin(a),z=1*math.sin(a))
            rotate('head',y=-2*math.sin(a),z=1.5*math.sin(a))
            translate('body',(0,0,.009*(1-math.cos(2*a))))
            rotate('upper_arm.L',x=2*math.sin(a),y=2)
            rotate('upper_arm.R',x=-2*math.sin(a),y=-2)
            expression_value('Blink',pulse(t,.70,.045))
        elif name in ('Walk','Run'):
            running=name=='Run';stride=34 if running else 23;bend=55 if running else 28
            lean=9 if running else 2
            rotate('body',x=lean,y=2*math.sin(a),z=3*math.sin(a))
            rotate('head',x=-lean*.65,y=-2*math.sin(a),z=-2*math.sin(a))
            translate('hips',(0,0,(.034 if running else .012)*(1-math.cos(2*a))))
            for side,phase in [('L',a),('R',a+math.pi)]:
                swing=math.sin(phase)
                rotate('thigh.'+side,x=stride*swing)
                rotate('shin.'+side,x=-max(0,swing)*bend)
                rotate('foot.'+side,x=-stride*swing+max(0,swing)*bend)
                rotate('upper_arm.'+side,x=-(32 if running else 18)*swing,y=3 if side=='L' else -3)
                rotate('forearm.'+side,x=-55-10*swing if running else -8-7*max(0,-swing))
            expression_value('Focused',.85 if running else 0)
        elif name in ('Jump','Fall','Land'):
            if name=='Jump':
                f=ease(t)
                rotate('body',x=4*(1-f));rotate('head',x=-10*f)
                for side,s in [('L',1),('R',-1)]:
                    rotate('upper_arm.'+side,x=-18*f,y=s*48*f)
                    rotate('forearm.'+side,x=-35*f)
                    rotate('thigh.'+side,x=18*f);rotate('shin.'+side,x=-36*f);rotate('foot.'+side,x=18*f)
                expression_value('Surprised',f)
            elif name=='Fall':
                rotate('head',x=5)
                for side,s in [('L',1),('R',-1)]:
                    rotate('upper_arm.'+side,x=-7,y=s*(45+3*math.sin(a)))
                    rotate('forearm.'+side,x=-25);rotate('shin.'+side,x=-8);rotate('foot.'+side,x=8)
                expression_value('Surprised',1)
            else:
                crouch=math.sin(math.pi*t)*(1-t)
                translate('hips',(0,0,-.08*crouch));rotate('body',x=12*crouch)
                for side,s in [('L',1),('R',-1)]:
                    rotate('thigh.'+side,x=27*crouch);rotate('shin.'+side,x=-54*crouch);rotate('foot.'+side,x=27*crouch)
                    rotate('upper_arm.'+side,y=s*18*(1-t))
                expression_value('Delighted',math.sin(math.pi*t))
        elif name=='Wave':
            w=ease(t/.22)*ease((1-t)/.22);wag=math.sin((t-.22)/.56*TAU*2)*w
            rotate('body',y=3*w,z=-2*w);rotate('head',y=-7*w,z=-3*w)
            rotate('upper_arm.R',x=-9*w,y=-103*w);rotate('forearm.R',y=-42*w-14*wag)
            rotate('hand.R',y=11*wag,z=7*w);rotate('upper_arm.L',y=6*w)
            expression_value('Delighted',w*.5);expression_value('Wink',pulse(t,.70,.05))
        elif name=='Celebrate':
            w=ease(t/.18)*ease((1-t)/.18)
            rotate('body',y=4*math.sin(a*2)*w);rotate('head',x=-6*w,y=-3*math.sin(a*2)*w)
            for side,s in [('L',1),('R',-1)]:
                rotate('upper_arm.'+side,y=s*(135+8*math.sin(a*3))*w)
                rotate('forearm.'+side,y=s*15*w)
                rotate('hand.'+side,z=s*15*math.sin(a*3)*w)
            translate('body',(0,0,.025*(1-math.cos(a*3))*w))
            expression_value('Delighted',w)
        else:
            w=math.sin(math.pi*t)**2
            if name=='LookAround':rotate('head',x=-3*w,y=5*math.sin(a),z=32*math.sin(a)*w)
            if name=='Nod':rotate('head',x=15*math.sin(a*2)*w)
            if name=='ShakeHead':rotate('head',z=24*math.sin(a*2)*w)
            expression_value('Blink',pulse(t,.85,.04))
        if name in ('Walk','Run'):
            # Plant the lowest shoe on the ground; Rigify keeps the legs rigid.
            bpy.context.view_layer.update()
            sole=[]
            for side,s in [('L',-1),('R',1)]:
                foot=rig.pose.bones['DEF-foot.'+side]
                deform=foot.matrix@foot.bone.matrix_local.inverted()
                for dx in (-.15,.15):
                    for y in (-.33,.13):sole.append((deform@Vector((s*.255+dx,y,0))).z)
            current=rig.pose.bones['hips'].bone.matrix_local.to_quaternion()@rig.pose.bones['hips'].location
            current.z-=min(sole)
            if name=='Run':current.z+=.045*max(0,math.sin(2*a))**2
            translate('hips',current)
        for bn in names:
            pb=rig.pose.bones[bn]
            assert pb.keyframe_insert('rotation_quaternion',frame=frame,group=bn)
            assert pb.keyframe_insert('location',frame=frame,group=bn)
        for k in list(keys.key_blocks)[1:]:assert k.keyframe_insert('value',frame=frame,group='Expression')
    assert action.frame_range[1]==end,(name,tuple(action.frame_range))
    clips[name]=(action,rig_slot,face_slot)

def use_clip(name,frame=1):
    a,rs,fs=clips[name]
    rig.animation_data.action=a;rig.animation_data.action_slot=rs
    keys.animation_data.action=a;keys.animation_data.action_slot=fs
    scene.frame_start=1;scene.frame_end=clip_ends[name];scene.frame_set(frame)
    bpy.context.view_layer.update()

# Stashed, muted tracks expose every action to Blender's exporter and Action Editor.
for name,(a,rs,fs) in clips.items():
    for target,slot in [(rig,rs),(keys,fs)]:
        track=target.animation_data.nla_tracks.new();track.name=name;track.mute=True
        strip=track.strips.new(name,1,a);strip.action_slot=slot
use_clip('Wave',33)
scene.render.fps=24
for m in list(scene.timeline_markers):scene.timeline_markers.remove(m)
for f,n in [(1,'Rest'),(20,'Hello!'),(40,'Wave'),(60,'Wink'),(81,'Rest')]:scene.timeline_markers.new(n,frame=f)
scene['clips']=' | '.join(clip_ends)
scene['rig_system']='Generated with the bundled Rigify add-on; metarig and editable control rig included.'
master['version']='02 | Rigify animation set'
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
rig.show_in_front=True
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.overlay.show_overlays=False
        elif area.type=='DOPESHEET_EDITOR':
            area.spaces.active.mode='ACTION'
readme=bpy.data.texts.get('START HERE | Jolly robot');readme.clear()
readme.write('JOLLY ROBOT / RIGIFY VERSION 02\n\n'
    'Space plays Wave. In the Action Editor select Idle, Walk, Run, Jump, Fall, Land,\n'
    'Wave, Celebrate, LookAround, Nod or ShakeHead. Set the timeline to the action range.\n'
    'For the saved wave the timeline is already set to 1-81 at 24 fps.\n\n'
    'Jolly_Rigify is the generated control rig. Enable viewport overlays and enter Pose Mode\n'
    'to adjust its controls. Jolly_Metarig is retained but hidden; unhide to regenerate.\n'
    'Mechanical FK Rigify components preserve the rigid metal panels.\n'
    'Jolly_Expressions has Blink, Focused, Surprised, Delighted and Wink morphs.\n'
    'Each Action has rig and face slots so expressions travel with the motion.\n\n'
    'The separate game export bakes the evaluated Rigify DEF bones and facial curves.\n'
    'Locomotion is in place: the game supplies movement, jumping height and collision.\n'
    'Original version 01 is unchanged. All art stays editable; no external textures.\n')
source=bpy.data.texts.new('animate_robot.py');source.write(Path(__file__).read_text())
BLEND=OUT/'jolly_robot_rigify_v02.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
print('RIGIFY_SAVED',BLEND,flush=True)

# Create a minimal skeleton, baking evaluated Rigify deformation into game clips.
export_col=bpy.data.collections.new('99 | Temporary export');scene.collection.children.link(export_col)
export_arm=bpy.data.armatures.new('Jolly | game skeleton')
game_rig=bpy.data.objects.new('Jolly_GameRig',export_arm);export_col.objects.link(game_rig)
game_rig.parent=master
bpy.context.view_layer.objects.active=game_rig;game_rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name in names:
    src=rig.data.bones['DEF-'+name];b=export_arm.edit_bones.new('DEF-'+name)
    b.matrix=src.matrix_local;b.length=src.length
    parent=meta.data.bones[name].parent
    if parent:b.parent=export_arm.edit_bones['DEF-'+parent.name]
bpy.ops.object.mode_set(mode='OBJECT')
game_rig.animation_data_create()
game_actions={}
for name,end in clip_ends.items():
    use_clip(name)
    a=bpy.data.actions.new('GAME_'+name);a.use_fake_user=True
    slot=a.slots.new(id_type='OBJECT',name=game_rig.name)
    game_rig.animation_data.action=a;game_rig.animation_data.action_slot=slot
    for frame in range(1,end+1):
        scene.frame_set(frame);bpy.context.view_layer.update()
        for bn in names:
            pb=game_rig.pose.bones['DEF-'+bn]
            pb.rotation_mode='QUATERNION';pb.matrix=rig.pose.bones['DEF-'+bn].matrix
            bpy.context.view_layer.update()
            for channel in ('location','rotation_quaternion','scale'):assert pb.keyframe_insert(channel,frame=frame,group=bn)
    game_actions[name]=(a,slot)

# Bake bevels at rest and merge static panels by body/head. Facial morphs stay intact.
rig.animation_data.action=None;keys.animation_data.action=None;reset();rig.data.pose_position='REST'
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
groups={'body':[],'head':[]}
for ob in [o for o in bpy.data.objects if o.type=='MESH' and 'rigid_bone' in o and o!=face]:
    me=bpy.data.meshes.new_from_object(ob.evaluated_get(deps));me.transform(ob.matrix_local)
    cp=bpy.data.objects.new('export '+ob.name,me);export_col.objects.link(cp)
    vg=cp.vertex_groups.new(name=ob['rigid_bone']);vg.add(list(range(len(me.vertices))),1,'REPLACE')
    groups[ob['avatarPart']].append(cp)
export_meshes=[]
for part,objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();ob=bpy.context.object
    ob.name='Jolly_'+part;ob['avatarPart']=part;ob.parent=game_rig
    mod=ob.modifiers.new('Game skin','ARMATURE');mod.object=game_rig
    export_meshes.append(ob)
game_face=face.copy();game_face.data=face.data.copy();export_col.objects.link(game_face)
game_face.name='Jolly_face';game_face.parent=game_rig
for mod in game_face.modifiers:
    if mod.type=='ARMATURE':mod.object=game_rig
game_keys=game_face.data.shape_keys;game_keys.animation_data_clear();game_keys.animation_data_create()
export_meshes.append(game_face)
for name,(a,slot) in game_actions.items():
    fs=a.slots.new(id_type='KEY',name=game_keys.name)
    game_keys.animation_data.action=a;game_keys.animation_data.action_slot=fs
    use_clip(name)
    for frame in range(1,clip_ends[name]+1):
        scene.frame_set(frame)
        for k in list(keys.key_blocks)[1:]:
            dest=game_keys.key_blocks[k.name];dest.value=k.value
            assert dest.keyframe_insert('value',frame=frame)
    for target,sl in [(game_rig,slot),(game_keys,fs)]:
        track=target.animation_data.nla_tracks.new();track.name=name;track.mute=True
        strip=track.strips.new(name,1,a);strip.action_slot=sl
    game_actions[name]=(a,slot,fs)
rig.data.pose_position='POSE'
# The exporter considers compatible unused slots as well as assigned actions.
# Remove authoring actions from this temporary export process after baking.
keep={a for a,_,_ in game_actions.values()}
for action in list(bpy.data.actions):
    if action not in keep:bpy.data.actions.remove(action)
for name,(a,_,_) in game_actions.items():a.name=name
a,rs,fs=game_actions['Idle']
game_rig.animation_data.action=a;game_rig.animation_data.action_slot=rs
game_keys.animation_data.action=a;game_keys.animation_data.action_slot=fs
scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for ob in [master,game_rig,*export_meshes]:ob.select_set(True)
bpy.context.view_layer.objects.active=game_rig
dest=PROJECT/'assets/models/jolly_robot.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,
    export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,
    export_frame_range=False,export_anim_slide_to_zero=True,export_cameras=False,export_lights=False,
    export_extras=True,export_def_bones=True,export_morph=True)
print('RIGIFY_EXPORTED',dest,flush=True)

# Keep a machine-readable build report and render real evaluated animation poses.
report={'rig_system':'Rigify','components':'basic.super_copy','control_bones':len(names),
        'metarig_retained':True,'original_unchanged':True,'height_m':1.85,
        'clips':{n:{'frames':e,'duration_s':(e-1)/24} for n,e in clip_ends.items()},
        'expressions':[k.name for k in list(keys.key_blocks)[1:]],'bytes':dest.stat().st_size}
(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.open_mainfile(filepath=str(BLEND));scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1000;scene.render.resolution_y=1000
scene.render.filepath=str(OUT/'jolly_robot_wave.png');bpy.ops.render.render(write_still=True)
print('RIGIFY_COMPLETE',flush=True)

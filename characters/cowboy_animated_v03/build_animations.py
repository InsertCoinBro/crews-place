"""Fit Rigify, skin the approved cowboy, author actions and bake a game skeleton.
Run in background Blender. The approved v02 masters are never overwritten.
"""
import bpy, bmesh, math, runpy, json
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
S=1.85/2.388
FPS=30
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='rigify')
bpy.ops.import_scene.gltf(filepath=str(HERE/'cowboy_static_v02.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for ob in meshes:
    world=ob.matrix_world.copy()
    ob.parent=None
    ob.data.transform(world)
    ob.matrix_world=Matrix.Identity(4)

# A fitted basic-human metarig provides real Rigify arm, leg, spine and head controls.
bpy.ops.object.armature_add()
meta=bpy.context.object;meta.name='Cowboy_Metarig'
bpy.ops.object.mode_set(mode='EDIT');meta.data.edit_bones.remove(meta.data.edit_bones[0]);bpy.ops.object.mode_set(mode='OBJECT')
rigify_file=Path(bpy.utils.script_paths()[0])/'addons_core/rigify/metarigs/basic/basic_human.py'
runpy.run_path(str(rigify_file))['create'](meta)
bpy.ops.object.mode_set(mode='EDIT')
bones=meta.data.edit_bones
def fit(name,head,tail):
    b=bones[name];b.head=Vector(head)*S;b.tail=Vector(tail)*S
    b.align_roll(Vector((0,1,0)))
zs=[1.13,1.29,1.43,1.57,1.73,1.83,1.90,2.19]
for i in range(7):fit('spine'+('.%03d'%i if i else ''),(0,0,zs[i]),(0,0,zs[i+1]))
for side,label in ((1,'L'),(-1,'R')):
    fit('pelvis.'+label,(0,0,1.13),(side*.11,0,1.13))
    fit('thigh.'+label,(side*.105,.01,1.13),(side*.15,-.045,.70))
    fit('shin.'+label,(side*.15,-.045,.70),(side*.166,.015,.205))
    fit('foot.'+label,(side*.166,.015,.205),(side*.166,-.23,.10))
    fit('toe.'+label,(side*.166,-.23,.10),(side*.166,-.35,.10))
    fit('heel.02.'+label,(side*.08,.075,.045),(side*.25,.075,.045))
    fit('shoulder.'+label,(side*.065,0,1.69),(side*.245,0,1.68))
    fit('upper_arm.'+label,(side*.245,0,1.68),(side*.395,-.025,1.42))
    fit('forearm.'+label,(side*.395,-.025,1.42),(side*.497,-.027,1.185))
    fit('hand.'+label,(side*.497,-.027,1.185),(side*.535,-.035,1.045))
    fit('breast.'+label,(side*.11,0,1.62),(side*.11,-.09,1.62))
bpy.ops.object.mode_set(mode='OBJECT')
for p in meta.pose.bones:
    if p.rigify_type in ('limbs.arm','limbs.leg'):
        p.rigify_parameters.segments=1
        p.rigify_parameters.bbones=1
bpy.ops.pose.rigify_generate()
rig=bpy.context.object;rig.name='Cowboy_Rigify'
rig.show_in_front=True
meta.hide_render=True;meta.hide_set(True)
for label in ('L','R'):
    rig.pose.bones['upper_arm_parent.'+label]['IK_Stretch']=0.0
    rig.pose.bones['upper_arm_parent.'+label]['pole_vector']=True
    rig.pose.bones['thigh_parent.'+label]['IK_Stretch']=0.0
bpy.context.view_layer.update()

# Smooth, explicit regional weights keep small facial details, hat and hardware
# rigid, while the knees, shoulders, elbows and ankles deform with their clothing.
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def mix(a,b,t):
    d={k:v*(1-t) for k,v in a.items()}
    for k,v in b.items():d[k]=d.get(k,0)+v*t
    return d
def torso(z):
    mids=[1.20,1.36,1.50,1.64,1.78,1.865,2.04]
    names=['DEF-spine'+('.%03d'%i if i else '') for i in range(7)]
    for i in range(6):
        if z<mids[i+1]:
            return mix({names[i]:1},{names[i+1]:1},smooth(mids[i],mids[i+1],z))
    return {names[-1]:1}
def limb_weights(x,z,arm=False):
    label='L' if x>=0 else 'R'
    if arm:
        d=mix({'DEF-forearm.'+label:1},{'DEF-upper_arm.'+label:1},smooth(1.365,1.475,z))
        return mix({'DEF-hand.'+label:1},d,smooth(1.145,1.225,z))
    d=mix({'DEF-shin.'+label:1},{'DEF-thigh.'+label:1},smooth(.64,.76,z))
    return mix({'DEF-foot.'+label:1},d,smooth(.19,.29,z))

for ob in meshes:
    part=ob.get('avatarPart','body')
    for v in ob.data.vertices:
        x,y,z=v.co/S
        if part in ('head','hat','face'):w={'DEF-spine.006':1}
        elif part=='gear':w={'DEF-spine':1}
        elif part=='boots':w=limb_weights(x,z)
        elif part=='trousers' or (part=='body' and z<1.19 and abs(x)<.25):
            hip=smooth(.99,1.18,z)
            hip=max(hip,(1-smooth(.025,.10,abs(x)))*smooth(.96,1.06,z))
            w=mix(limb_weights(x,z),{'DEF-spine':1},hip)
        else:
            w=mix(torso(z),limb_weights(x,z,True),smooth(.205,.30,abs(x)))
        w={k:v for k,v in w.items() if v>.0001};total=sum(w.values())
        for name,value in w.items():
            group=ob.vertex_groups.get(name) or ob.vertex_groups.new(name=name)
            group.add([v.index],value/total,'REPLACE')
    mod=ob.modifiers.new('Rigify skin deformation','ARMATURE');mod.object=rig
    ob.parent=rig
print('RIG_AND_WEIGHTS_READY',flush=True)

controls=['torso','hips','chest','head','hand_ik.L','hand_ik.R','foot_ik.L','foot_ik.R','upper_arm_ik_target.L','upper_arm_ik_target.R']
rest={name:rig.pose.bones[name].matrix.copy() for name in controls}
hand_dir={label:(rig.data.bones['DEF-hand.'+label].tail_local-rig.data.bones['DEF-hand.'+label].head_local).normalized() for label in ('L','R')}
def control(name,delta=(0,0,0),rot=(0,0,0),worldq=None):
    from mathutils import Euler
    mat=rest[name].copy()
    q=worldq or Euler(rot,'XYZ').to_quaternion()
    mat=(q.to_matrix().to_4x4()@mat)
    origin=rig.pose.bones[name].matrix.translation if name in ('chest','hips','head') else rest[name].translation
    mat.translation=origin+Vector(delta)*S
    rig.pose.bones[name].matrix=mat
    bpy.context.view_layer.update()
def hand(label,position=None,delta=(0,0,0),forward=False):
    name='hand_ik.'+label
    if position is not None:delta=Vector(position)-rest[name].translation/S
    q=hand_dir[label].rotation_difference(Vector((0,-1,0))) if forward else None
    control(name,delta,worldq=q)
def reset():
    for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
def gait(phase,run=False):
    p=phase%1;stance=.54 if run else .62;stride=.57 if run else .36
    if p<stance:
        return (0,-stride+2*stride*p/stance,0),0
    u=(p-stance)/(1-stance)
    return (0,stride-2*stride*smooth(0,1,u),(.28 if run else .13)*math.sin(math.pi*u)),.15*math.sin(math.pi*u)

def pose(kind,t):
    reset()
    for side,label in ((1,'L'),(-1,'R')):
        name='upper_arm_ik_target.'+label
        control(name,Vector((side*.42,.55,1.35))-rest[name].translation/S)
    # Explicit controls make every action editable through Rigify in the blend file.
    if kind=='Idle':
        control('chest',rot=(.008*math.sin(math.tau*t),0,0))
        for side,label in ((1,'L'),(-1,'R')):hand(label,delta=(-side*.025,0,.015))
    elif kind in ('Walk','Run'):
        run=kind=='Run'
        control('torso',(0,0,(-.075 if run else -.035)+.018*math.cos(4*math.pi*t)))
        control('chest',rot=(.16 if run else .035,0,.035*math.sin(math.tau*t)))
        for side,label,phase in ((1,'L',t),(-1,'R',t+.5)):
            delta,pitch=gait(phase,run);control('foot_ik.'+label,delta,rot=(pitch,0,0))
            swing=math.cos(math.tau*phase)
            if run:hand(label,(side*.34,-.06+.19*swing,1.38+.045*swing),forward=True)
            else:hand(label,(side*.45,.17*swing,1.23+.02*swing))
    elif kind in ('JumpStart','Land'):
        bend=smooth(0,1,t) if kind=='JumpStart' else math.sin(math.pi*t)
        control('torso',(0,.028*bend,-.17*bend))
        control('chest',rot=(.17*bend,0,0))
        for side,label in ((1,'L'),(-1,'R')):
            control('foot_ik.'+label)
            hand(label,(side*.45,.16*bend,1.22+.06*bend))
    elif kind in ('JumpRise','JumpFall'):
        tuck=(.24+.08*math.sin(math.pi*t)) if kind=='JumpRise' else .055
        control('torso',(0,0,-.045))
        control('chest',rot=(.08,0,0))
        for side,label in ((1,'L'),(-1,'R')):
            control('foot_ik.'+label,(side*.025,.10,tuck),rot=(-.15,0,0))
            hand(label,(side*.49,-.13,1.43))
    elif kind=='Dance':
        # Eight-count line dance: side-close, heel tap, return, mirror, clap.
        keys=[(0,0,0,0,0),(.10,0,.15,0,0),(.08,-.23,.05,0,0),(0,0,0,0,1),
              (-.10,0,-.15,0,0),(-.08,0,-.05,-.23,0),(0,0,0,0,0),(0,0,0,0,1),(0,0,0,0,0)]
        beat=t*8;i=min(7,int(beat));u=smooth(0,1,beat-i)
        vals=[keys[i][j]*(1-u)+keys[i+1][j]*u for j in range(5)]
        shift,ly,rx,ry,clap=vals
        control('torso',(shift,0,-.07-.025*math.cos(16*math.pi*t)))
        control('chest',rot=(.025,0,.10*math.sin(math.tau*t)))
        control('foot_ik.L',(shift*.5,ly,.055*math.sin(math.pi*(beat%1)) if i%2==0 else 0),rot=(.18 if ly<-.1 else 0,0,0))
        control('foot_ik.R',(rx,ry,.055*math.sin(math.pi*(beat%1)) if i%2 else 0),rot=(.18 if ry<-.1 else 0,0,0))
        for side,label in ((1,'L'),(-1,'R')):
            hand(label,(side*(.38-.32*clap)+shift*.3,-.13-.19*clap,1.34+.19*clap),forward=True)
    elif kind=='Reach':
        amount=smooth(0,.45,t) if t<.65 else 1-smooth(.65,1,t)
        control('chest',rot=(.05*amount,0,-.035*amount))
        origin=rest['hand_ik.R'].translation/S
        target=Vector((-.14,-.43,1.36))
        pos=origin.lerp(target,amount)
        q=Quaternion().slerp(hand_dir['R'].rotation_difference(Vector((0,-1,0))),amount)
        control('hand_ik.R',pos-origin,worldq=q)
        hand('L',( .45,0,1.23))
    elif kind=='Carry':
        hand('R',(-.28,-.29,1.36),forward=True)
        hand('L',(.45,0,1.23))

specs={'Idle':(60,True),'Walk':(30,True),'Run':(22,True),'JumpStart':(7,False),
       'JumpRise':(12,False),'JumpFall':(18,True),'Land':(8,False),'Dance':(120,True),
       'Reach':(30,False),'Carry':(30,True)}
rig.animation_data_create()
source_actions={}
for name,(frames,loop) in specs.items():
    action=bpy.data.actions.new('Rigify_'+name);action.use_fake_user=True
    rig.animation_data.action=action
    for frame in range(frames+1):
        bpy.context.scene.frame_set(frame+1);pose(name,frame/frames)
        for ctrl in controls:
            pb=rig.pose.bones[ctrl];pb.rotation_mode='QUATERNION'
            for prop in ('location','rotation_quaternion','scale'):pb.keyframe_insert(data_path=prop,frame=frame+1,group=ctrl)
    source_actions[name]=action
rig.animation_data.action=None;reset()
print('RIGIFY_ACTIONS_CREATED',flush=True)

# Bake the evaluated deformation bones into a compact ordinary skeleton for glTF.
used=set(g.name for o in meshes for g in o.vertex_groups)
for label in ('L','R'):used.add('DEF-toe.'+label)
names=[b.name for b in rig.data.bones if b.name in used]
bpy.ops.object.armature_add();game=bpy.context.object;game.name='CowboySkeleton'
bpy.ops.object.mode_set(mode='EDIT');game.data.edit_bones.remove(game.data.edit_bones[0])
for name in names:
    src=rig.data.bones[name];b=game.data.edit_bones.new(name)
    b.head=src.head_local;b.tail=src.tail_local;b.matrix=src.matrix_local
    b.length=src.length;b.use_deform=True
for name in names:
    src=rig.data.bones[name].parent
    while src and src.name not in used:src=src.parent
    if src:game.data.edit_bones[name].parent=game.data.edit_bones[src.name]
bpy.ops.object.mode_set(mode='OBJECT');game.animation_data_create()
for name in names:game.pose.bones[name].rotation_mode='QUATERNION'
game_actions={}
for name,(frames,loop) in specs.items():
    rig.animation_data.action=source_actions[name]
    action=bpy.data.actions.new(name);action.use_fake_user=True;game.animation_data.action=action
    for frame in range(frames+1):
        bpy.context.scene.frame_set(frame+1);bpy.context.view_layer.update()
        targets={n:rig.pose.bones[n].matrix.copy() for n in names}
        for n in names:
            b=game.data.bones[n];p=game.pose.bones[n]
            basis=b.matrix_local.inverted()@targets[n]
            if b.parent:
                basis=b.matrix_local.inverted()@b.parent.matrix_local@targets[b.parent.name].inverted()@targets[n]
            p.matrix_basis=basis
            for prop in ('location','rotation_quaternion','scale'):p.keyframe_insert(data_path=prop,frame=frame+1,group=n)
    game_actions[name]=action
    track=game.animation_data.nla_tracks.new();track.name=name;track.mute=True
    track.strips.new(name,1,action)
rig.animation_data.action=source_actions['Idle'];game.animation_data.action=None
for p in game.pose.bones:p.matrix_basis=Matrix.Identity(4)
for ob in meshes:
    ob.modifiers['Rigify skin deformation'].object=game
    ob.parent=game

scene=bpy.context.scene;scene.render.fps=FPS
scene.frame_start=1;scene.frame_end=121
game['avatarId']='cowboy';game['rigged']=True;game['sourceVersion']='animated-v03'
game['clipManifest']=json.dumps({n:{'seconds':f/FPS,'loop':l} for n,(f,l) in specs.items()})
bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT');game.select_set(True)
for ob in meshes:ob.select_set(True)
bpy.context.view_layer.objects.active=game
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/models/cowboy.glb'),export_format='GLB',
    use_selection=True,export_apply=False,export_yup=True,export_animations=True,
    export_animation_mode='ACTIONS',export_force_sampling=True,export_def_bones=True,
    export_anim_single_armature=False,
    export_cameras=False,export_lights=False,export_extras=True)
print('ANIMATED_GLB_EXPORTED',flush=True)

# Return the Blender editing copy to its Rigify controls. Keep the game skeleton
# alongside it, hidden, with all baked actions available for subsequent exports.
for ob in meshes:
    ob.modifiers['Rigify skin deformation'].object=rig;ob.parent=rig
game.hide_render=True;game.hide_set(True)
rig.animation_data.action=source_actions['Idle'];scene.frame_set(1)
for o in list(scene.objects):
    if o.type=='EMPTY' and not o.children and o.name!='root':bpy.data.objects.remove(o,do_unlink=True)

studio=bpy.data.collections.new('90 | Animation preview studio');scene.collection.children.link(studio)
def studio_obj(ob):
    for c in list(ob.users_collection):c.objects.unlink(ob)
    studio.objects.link(ob)
def mat(name,color):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Preview floor';floor.location.z=-.006
floor.data.materials.append(mat('Preview slate',(.07,.09,.095)));studio_obj(floor)
bpy.ops.object.camera_add(location=(3,-6,2.7));cam=bpy.context.object;cam.name='Animation preview camera'
cam.rotation_euler=(Vector((0,0,.95))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=2.5;studio_obj(cam);scene.camera=cam
for name,pos,power,size in [('Key',(-3,-4,5),420,4),('Fill',(3,-2,3),230,3),('Rim',(1,3,4),450,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler();studio_obj(o)
scene.world=bpy.data.worlds.new('Preview world');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.19,.22,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=850;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            sp=area.spaces.active;sp.region_3d.view_location=(0,0,.95);sp.region_3d.view_distance=3
            sp.region_3d.view_rotation=cam.rotation_euler.to_quaternion();sp.region_3d.view_perspective='ORTHO'
            sp.shading.color_type='MATERIAL'
readme=bpy.data.texts.new('ANIMATION GUIDE')
readme.write('Cowboy v03 / Rigify\n\nCowboy_Rigify is the editable control rig.\nCowboy_Metarig is the fitted skeleton template.\nCowboySkeleton is a hidden baked game rig.\n\nSelect a Rigify_ action in the Action Editor and press Play.\nActions: '+', '.join(specs)+'.\n\nRigid head/hat/accessories; skin weights on clothing and limbs.\nThe original mitten hands are retained, without individual finger articulation.\n')
text=bpy.data.texts.new('build_animations.py');text.write(Path(__file__).read_text())
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'cowboy_animated_v03.blend'))
(HERE/'animation_manifest.json').write_text(json.dumps({n:{'frames':f,'seconds':f/FPS,'loop':l} for n,(f,l) in specs.items()},indent=2))
for name,frame in [('Walk',8),('Run',6),('JumpStart',8),('Dance',47),('Reach',16)]:
    rig.animation_data.action=source_actions[name];scene.frame_set(frame)
    scene.render.filepath=str(HERE/(name.lower()+'_preview.png'))
    bpy.ops.render.render(write_still=True)
print('ANIMATION_BUILD_COMPLETE',flush=True)

"""Create Jolly, an editable metallic robot with three skeletal animation clips.

Run only in a new Blender process; this builder clears that process's scene.
"""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector, Quaternion

OUT = Path(__file__).resolve().parent
ASSETS = OUT.parents[1] / 'assets' / 'models'
ASSETS.mkdir(parents=True, exist_ok=True)
TAU = math.tau
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)

def collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c

SHELL = collection('01 | Silver shell')
FACE = collection('02 | Happy face and chest lights')
LIMBS = collection('03 | Arms, hands and legs')
DETAIL = collection('04 | Seams, bolts and mechanics')
RIG = collection('05 | Animation rig')
STUDIO = collection('90 | Studio - exclude from game')
parts = []

def material(name, hexcode, metal=0, rough=.4, emission=0):
    srgb = [int(hexcode[i:i+2],16)/255 for i in (0,2,4)]
    rgb = [c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in srgb]
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb,1)
    m.use_nodes = True
    node = m.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*rgb,1)
    node.inputs['Metallic'].default_value = metal
    node.inputs['Roughness'].default_value = rough
    if emission:
        node.inputs['Emission Color'].default_value = (*rgb,1)
        node.inputs['Emission Strength'].default_value = emission
    return m

silver = material('01 | Satin silver / main shell','A6ADB4',.82,.3)
edge = material('02 | Polished aluminum / trim','D3D8DC',.88,.23)
dark = material('03 | Graphite / joint bellows','353E46',.6,.39)
screen = material('04 | Smoked glass / face','15232B',.38,.24)
cyan = material('05 | Soft ice blue / expression','9EEDEB',.12,.29,1.8)
amber = material('06 | Warm heart / status','FFCF80',.1,.35,1.2)
rubber = material('07 | Charcoal rubber / soles','242C33',.02,.76)
floor_mat = material('Studio | slate blue','263644',.18,.58)
ped_mat = material('Studio | pedestal','425560',.45,.4)

def finish(ob, name, col, mat, bone=None, smooth=True):
    ob.name = name
    for c in list(ob.users_collection): c.objects.unlink(ob)
    col.objects.link(ob)
    if mat: ob.data.materials.append(mat)
    if ob.type == 'MESH':
        for p in ob.data.polygons: p.use_smooth = smooth
    if bone:
        ob['rigid_bone'] = bone
        parts.append(ob)
    return ob

def box(name, loc, dims, mat=silver, bone='body', col=SHELL, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob=bpy.context.object
    ob.dimensions=dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(ob,name,col,mat,bone)
    if bevel:
        mod=ob.modifiers.new('Soft machined corners','BEVEL')
        mod.width=bevel;mod.segments=3
        mod=ob.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
        mod.keep_sharp=True;mod.weight=50
    return ob

def sphere(name, loc, scale, mat=dark, bone='body', col=DETAIL):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc)
    ob=bpy.context.object;ob.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(ob,name,col,mat,bone)

def cylinder(name, a, b, radius, mat=dark, bone='body', col=DETAIL, vertices=24):
    a,b=Vector(a),Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=(b-a).length,location=(a+b)/2)
    ob=bpy.context.object;ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    finish(ob,name,col,mat,bone)
    mod=ob.modifiers.new('Rounded machined rim','BEVEL');mod.width=min(.01,radius/5);mod.segments=2
    ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return ob

def curve(name, points, radius, mat=cyan, bone='head', col=FACE, caps=True):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=1
    sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
    for p,co in zip(sp.points,points):p.co=(*co,1)
    cu.bevel_depth=radius;cu.bevel_resolution=2;cu.use_fill_caps=True
    ob=bpy.data.objects.new(name,cu);col.objects.link(ob)
    finish(ob,name,col,mat,bone)
    if caps:
        for i,p in enumerate((points[0],points[-1])):
            sphere(name+' | end '+str(i),p,(radius,)*3,mat,bone,col)
    return ob

def bolt(name,x,y,z,bone='body'):
    cylinder(name,(x,y+.007,z),(x,y-.008,z),.022,edge,bone,vertices=12)
    box(name+' | slot',(x,y-.01,z),(.022,.004,.004),dark,bone,DETAIL,.001)

def bar_between(name, a, b, width, depth, mat, bone):
    a,b=Vector(a),Vector(b)
    ob=box(name,(a+b)/2,(width,depth,(b-a).length),mat,bone,LIMBS,min(width*.22,.035))
    ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return ob

# A compact box torso with layered service panels and an optimistic little heart.
box('Torso | rounded square metal body',(0,0,1.35),(1.0,.60,.83),silver,bevel=.095)
box('Torso | dark front gasket',(0,-.304,1.35),(.87,.033,.69),dark,bevel=.07)
box('Torso | front service panel',(0,-.328,1.35),(.82,.035,.64),silver,bevel=.055)
box('Torso | polished top lip',(0,-.352,1.63),(.67,.024,.032),edge,bevel=.009)
box('Chest | inset indicator panel',(-.15,-.354,1.40),(.40,.033,.34),screen,'body',FACE,.043)
# A heart made from small inset lights: no texture dependency.
heart_rows=['0110110','1111111','1111111','0111110','0011100','0001000']
for row,line in enumerate(heart_rows):
    for col,v in enumerate(line):
        if v=='1':
            box('Chest | heart pixel %d %d'%(row,col),(-.15+(col-3)*.037,-.375,1.492-row*.037),(.030,.013,.030),amber,'body',FACE,.004)
for i in range(3):
    box('Chest | status strip '+str(i),(.205,-.353,1.45-i*.061),(.155,.022,.016),dark,bevel=.007)
    box('Chest | status light '+str(i),(.275,-.368,1.45-i*.061),(.016,.012,.016),cyan,'body',FACE,.005)
for x in (-.35,.35):
    for z in (1.09,1.60):bolt('Torso | captive screw',x,-.352,z)
for i in range(5):
    box('Torso | lower speaker slot '+str(i),(-.108+i*.054,-.351,1.113),(.029,.014,.048),dark,bevel=.009)
# Back is finished as well as the front.
box('Back | recessed service gasket',(0,.306,1.35),(.78,.035,.60),dark,bevel=.048)
box('Back | removable power pack',(0,.351,1.36),(.69,.10,.52),silver,bevel=.06)
for i in range(4):
    box('Back | cooling vent '+str(i),(0,.409,1.26+i*.065),(.40,.014,.023),dark,bevel=.009)
for x in (-.27,.27):
    for z in (1.15,1.56):
        cylinder('Back | screw',(x,.402,z),(x,.416,z),.018,edge,vertices=12)

# Floating neck and a big, very readable square smiley face.
cylinder('Neck | swivel',(0,0,1.735),(0,0,1.885),.125,dark,'head')
cylinder('Neck | silver collar',(0,0,1.76),(0,0,1.80),.17,edge,'head')
box('Head | rounded cube housing',(0,0,2.095),(1.01,.67,.69),silver,'head',SHELL,.105)
box('Face | polished bezel',(0,-.343,2.095),(.899,.055,.572),edge,'head',FACE,.079)
box('Face | smoked display',(0,-.375,2.095),(.819,.025,.501),screen,'head',FACE,.072)
for x in (-.211,.211):
    pts=[(x+.097*math.cos(a),-.398,2.144+.084*math.sin(a)) for a in [math.pi*i/24 for i in range(25)]]
    curve('Face | happy crescent eye',pts,.025)
pts=[(.220*math.cos(a),-.400,2.045+.131*math.sin(a)) for a in [math.pi+math.pi*i/36 for i in range(37)]]
curve('Face | generous curved smile',pts,.024)
for s in (-1,1):
    box('Face | cheek glint',(s*.307,-.397,2.043),(.058,.008,.018),cyan,'head',FACE,.008)
    cylinder('Head | ear joint',(s*.48,0,2.10),(s*.563,0,2.10),.145,dark,'head')
    cylinder('Head | ear cap',(s*.557,0,2.10),(s*.59,0,2.10),.118,edge,'head')
    cylinder('Head | ear center',(s*.587,0,2.10),(s*.60,0,2.10),.057,silver,'head')
    for z in (1.904,2.283):bolt('Face | bezel fastener',s*.380,-.383,z,'head')
cylinder('Antenna | socket',(.16,.03,2.427),(.16,.03,2.49),.066,dark,'head')
curve('Antenna | bent spring',[(.16,.03,2.475),(.18,.03,2.54),(.15,.03,2.575),(.20,.03,2.615)],.015,edge,'head',DETAIL)
sphere('Antenna | cheerful signal light',(.20,.03,2.637),(.05,.05,.05),cyan,'head',FACE)

# Short stable legs, oversized softly squared shoes, and unusually long arms.
box('Waist | dark flexible block',(0,0,.892),(.49,.38,.13),dark,'body',DETAIL,.04)
box('Pelvis | silver bridge',(0,0,.802),(.60,.41,.15),silver,'root',LIMBS,.043)
bone_specs=[('root',(0,0,0),(0,0,.30),None),
            ('body',(0,0,.84),(0,0,1.74),'root'),
            ('head',(0,0,1.78),(0,0,2.43),'body')]
for s,side in ((-1,'L'),(1,'R')):
    upper='upper_arm.'+side;fore='forearm.'+side;hand='hand.'+side
    shoulder=Vector((s*.63,0,1.64));elbow=Vector((s*.73,0,1.13));wrist=Vector((s*.84,-.02,.645))
    bone_specs.extend([(upper,shoulder,elbow,'body'),(fore,elbow,wrist,upper),
                       (hand,wrist,(s*.86,-.02,.40),fore)])
    cylinder('Shoulder '+side+' | axle',(s*.45,0,1.64),(s*.66,0,1.64),.133,dark,upper)
    sphere('Shoulder '+side+' | ball',shoulder,(.142,)*3,dark,upper)
    cylinder('Shoulder '+side+' | silver hub',(s*.67,-.065,1.64),(s*.67,-.133,1.64),.109,edge,upper)
    cylinder('Shoulder '+side+' | inset hub',(s*.67,-.136,1.64),(s*.67,-.15,1.64),.052,dark,upper)
    bar_between('Upper arm '+side+' | long casing',shoulder.lerp(elbow,.18),shoulder.lerp(elbow,.79),.175,.20,silver,upper)
    bar_between('Upper arm '+side+' | piston',shoulder.lerp(elbow,.66),elbow,.105,.115,edge,upper)
    sphere('Elbow '+side+' | round joint',elbow,(.106,)*3,dark,fore)
    cylinder('Elbow '+side+' | hinge pin',(elbow.x,-.105,elbow.z),(elbow.x,-.13,elbow.z),.065,edge,fore)
    bar_between('Forearm '+side+' | long cuff',elbow.lerp(wrist,.14),elbow.lerp(wrist,.85),.207,.221,silver,fore)
    bar_between('Forearm '+side+' | front inset',elbow.lerp(wrist,.3)+Vector((0,-.115,0)),elbow.lerp(wrist,.7)+Vector((0,-.115,0)),.078,.014,dark,fore)
    for t in (.20,.76):
        p=elbow.lerp(wrist,t)
        bar_between('Forearm '+side+' | end band',p+Vector((0,0,.013)),p-Vector((0,0,.013)),.214,.23,edge,fore)
    sphere('Wrist '+side+' | swivel',wrist,(.078,)*3,dark,hand)
    box('Hand '+side+' | palm',(s*.855,-.022,.535),(.205,.158,.174),silver,hand,LIMBS,.038)
    box('Hand '+side+' | palm pad',(s*.855,-.108,.54),(.13,.016,.102),dark,hand,LIMBS,.023)
    for i in range(3):
        x=s*.855+(i-1)*.068
        box('Hand '+side+' | finger '+str(i),(x,-.024,.405),(.057,.117,.139),edge,hand,LIMBS,.022)
        box('Hand '+side+' | finger crease '+str(i),(x,-.086,.412),(.048,.007,.014),dark,hand,LIMBS,.004)
    thumb=box('Hand '+side+' | thumb',(s*.721,-.025,.506),(.084,.118,.145),silver,hand,LIMBS,.032)
    thumb.rotation_euler.y=s*-.4
    thigh='thigh.'+side;shin='shin.'+side;foot='foot.'+side
    hip=(s*.225,0,.79);knee=(s*.245,0,.455);ankle=(s*.255,0,.197)
    bone_specs.extend([(thigh,hip,knee,'root'),(shin,knee,ankle,thigh),
                       (foot,ankle,(s*.255,-.24,.10),shin)])
    sphere('Hip '+side+' | socket',hip,(.113,)*3,dark,thigh)
    bar_between('Thigh '+side+' | squared casing',(s*.23,0,.721),(s*.24,0,.50),.225,.264,silver,thigh)
    sphere('Knee '+side+' | hinge',knee,(.105,)*3,dark,shin)
    cylinder('Knee '+side+' | cap',(s*.245,-.078,.455),(s*.245,-.118,.455),.091,edge,shin)
    bar_between('Shin '+side+' | lower casing',(s*.248,0,.405),(s*.254,0,.221),.228,.26,silver,shin)
    box('Boot '+side+' | soft rubber sole',(s*.255,-.104,.042),(.342,.53,.084),rubber,foot,LIMBS,.031)
    box('Boot '+side+' | round silver toe',(s*.255,-.104,.133),(.337,.52,.172),silver,foot,LIMBS,.063)
    box('Boot '+side+' | polished toe bumper',(s*.255,-.342,.103),(.26,.037,.066),edge,foot,LIMBS,.02)

# Rigid skinning gives hard mechanical joints without rubbery deformation.
root=bpy.data.objects.new('JOLLY | master - 1.85 m',None);RIG.objects.link(root)
root.empty_display_type='CIRCLE';root.empty_display_size=.7
root.scale=(1.85/2.687,)*3
root['avatarId']='jolly_robot';root['version']='01';root['front']='-Y in Blender; +Z in glTF'
arm=bpy.data.armatures.new('Jolly | articulated skeleton')
rig=bpy.data.objects.new('Jolly_Rig',arm);RIG.objects.link(rig);rig.parent=root
rig.show_in_front=True;arm.display_type='STICK'
bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name,head,tail,parent in bone_specs:
    b=arm.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for ob in parts:
    bone=ob['rigid_bone']
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    if ob.type=='CURVE':bpy.ops.object.convert(target='MESH')
    group=ob.vertex_groups.new(name=bone)
    group.add(list(range(len(ob.data.vertices))),1,'REPLACE')
    ob.parent=root
    mod=ob.modifiers.new('Rigid robot articulation','ARMATURE');mod.object=rig

# Animate using parent-space world axes, which are easy to read and revise.
axes={'X':Vector((1,0,0)),'Y':Vector((0,1,0)),'Z':Vector((0,0,1))}
def rotate(name, x=0, y=0, z=0):
    pb=rig.pose.bones[name];rest=pb.bone.matrix_local.to_quaternion()
    q=Quaternion()
    for axis,angle in [('X',x),('Y',y),('Z',z)]:
        q=q @ Quaternion(rest.inverted() @ axes[axis],math.radians(angle))
    pb.rotation_mode='QUATERNION';pb.rotation_quaternion=q

def reset():
    for pb in rig.pose.bones:
        pb.rotation_mode='QUATERNION';pb.rotation_quaternion=Quaternion();pb.location=(0,0,0);pb.scale=(1,1,1)

def keyframe(frame):
    for pb in rig.pose.bones:
        pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name)
        pb.keyframe_insert('location',frame=frame,group=pb.name)

rig.animation_data_create()
clips={}
for name,end in [('Happy_Idle',73),('Hello_Wave',97),('Jolly_Walk',33)]:
    action=bpy.data.actions.new(name);action.use_fake_user=True
    rig.animation_data.action=action
    for frame in range(1,end+1,2):
        reset();t=(frame-1)/(end-1);a=TAU*t
        if name=='Happy_Idle':
            rotate('body',y=2.0*math.sin(a),z=1.3*math.sin(a))
            rig.pose.bones['body'].location.y=.009*(1-math.cos(2*a))
            rotate('head',x=1.5*math.sin(a),y=-3*math.sin(a),z=2*math.sin(a+.4))
            rotate('upper_arm.L',x=3*math.sin(a),y=2+2*math.sin(a))
            rotate('upper_arm.R',x=-3*math.sin(a),y=-2+2*math.sin(a))
            rotate('forearm.L',x=-4);rotate('forearm.R',x=-4)
        elif name=='Hello_Wave':
            # Ease into a lifted right arm, wave twice, and return to the idle pose.
            w=min(1,max(0,t/.23),max(0,(1-t)/.23));w=w*w*(3-2*w)
            wag=math.sin((t-.23)/.54*TAU*2)*w
            rotate('body',y=3*w,z=-2*w)
            rotate('head',y=-8*w,z=-3*w)
            rotate('upper_arm.R',x=-9*w,y=-103*w)
            rotate('forearm.R',y=-42*w-14*wag)
            rotate('hand.R',y=11*wag,z=7*w)
            rotate('upper_arm.L',x=-5*w,y=7*w)
            rotate('forearm.L',x=-12*w)
        else:
            # In-place stylized walk; world translation belongs to the game.
            rig.pose.bones['root'].location.z=.011*(1-math.cos(2*a))
            rotate('body',x=2,y=2*math.sin(a),z=3*math.sin(a))
            rotate('head',x=-2,y=-2*math.sin(a),z=-2*math.sin(a))
            for side,phase in [('L',a),('R',a+math.pi)]:
                stride=math.sin(phase)
                rotate('thigh.'+side,x=23*stride)
                rotate('shin.'+side,x=-max(0,stride)*27)
                rotate('foot.'+side,x=-23*stride+max(0,stride)*27)
                rotate('upper_arm.'+side,x=-17*stride)
                rotate('forearm.'+side,x=-6-5*max(0,-stride))
    action['description']={'Happy_Idle':'Gentle, seamless happy sway','Hello_Wave':'Four-second friendly wave with return to rest','Jolly_Walk':'In-place stylized walk; translate the character in the game'}[name]
    clips[name]=action

scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=97
rig.animation_data.action=clips['Hello_Wave'];scene.frame_set(39)
for f,name in [(1,'Rest'),(23,'Hello!'),(49,'Wave'),(75,'Wave'),(97,'Rest / loop')]:
    scene.timeline_markers.new(name,frame=f)

# Small studio with broad softboxes, so the gray surfaces visibly read as metal.
cylinder('Studio | circular plinth',(0,0,-.07),(0,0,-.007),.92,ped_mat,None,STUDIO,96)
box('Studio | seamless floor',(0,0,-.10),(200,200,.05),floor_mat,None,STUDIO,0)
def camera(name,pos,target,scale):
    data=bpy.data.cameras.new(name);ob=bpy.data.objects.new(name,data);STUDIO.objects.link(ob)
    ob.location=pos;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO';data.ortho_scale=scale
    return ob
hero=camera('Camera | cheerful three-quarter',(3.5,-7,3.0),(.10,0,.94),2.67)
front=camera('Camera | neutral front',(0,-7,1.7),(0,0,.91),2.37)
rear=camera('Camera | rear details',(-3.2,7,2.7),(0,0,.90),2.47)
def light(name,pos,energy,size,color,target=(0,0,1)):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color
    ob=bpy.data.objects.new(name,data);STUDIO.objects.link(ob);ob.location=pos
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
light('Light | huge soft key',(-3.2,-4,5),650,4,(.92,.97,1))
light('Light | silver fill',(4,-2.5,3),520,3,(.78,.9,1))
light('Light | warm rim',(-1.5,3.5,4.8),850,3,(1,.83,.60))
light('Light | eye reflection',(0,-4,2.2),90,2,(1,1,1))
scene.world.use_nodes=True
bg=scene.world.node_tree.nodes.get('Background')
bg.inputs['Color'].default_value=(.24,.30,.36,1);bg.inputs['Strength'].default_value=.4
scene.camera=hero;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
scene.unit_settings.system='METRIC'
scene['character']='Jolly robot | metallic gray, square body, long arms, happy face'
scene['clips']='Happy_Idle (3 s), Hello_Wave (4 s), Jolly_Walk (1.333 s), at 24 fps'

# A useful opening view, with material colors and the wave ready on the timeline.
bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=rig
for screen_ui in bpy.data.screens:
    for area in screen_ui.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active
            space.region_3d.view_rotation=hero.rotation_euler.to_quaternion()
            space.region_3d.view_distance=3.2;space.region_3d.view_location=(.08,0,.94);space.region_3d.view_perspective='ORTHO'
            space.shading.type='MATERIAL';space.shading.studiolight_rotate_z=.4
            space.overlay.show_overlays=False
        elif area.type=='PROPERTIES':area.spaces.active.context='OBJECT'

readme=bpy.data.texts.new('START HERE | Jolly robot')
readme.write('JOLLY ROBOT / VERSION 01\n\nPress Space over the viewport to play the friendly wave.\n'
    'The active action is Hello_Wave. Happy_Idle and Jolly_Walk are also saved.\n'
    'Select Jolly_Rig and use the Dope Sheet > Action Editor to switch clips.\n'
    'Turn overlays on and enter Pose Mode to adjust the 15 named mechanical bones.\n'
    'Individual metal panels, face elements, fingers and bolts remain editable.\n'
    'The master scales the robot to 1.85 m; Blender front is -Y and up is Z.\n'
    'Collection 90 contains the presentation studio only.\n'
    'The compact GLB contains one skinned mesh, materials and three clips, without the studio.\n'
    'The walk is an initial in-place cycle; tune foot contact and speed when integrating.\n'
    'No external texture files, fonts or assets are required.\n')
source=bpy.data.texts.new('build_jolly_robot.py');source.write(Path(__file__).read_text())
blend=OUT/'jolly_robot_v01.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
print('JOLLY_SAVED',blend,flush=True)

# Bake evaluated beveled parts in REST position into one economical skinned mesh.
# Export is isolated from the saved editable file above.
rig.animation_data.action=None;reset();arm.pose_position='REST';bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get();EXPORT=collection('99 | Temporary game export')
copies=[]
for ob in parts:
    me=bpy.data.meshes.new_from_object(ob.evaluated_get(deps))
    me.transform(ob.matrix_local)
    cp=bpy.data.objects.new('export '+ob.name,me);EXPORT.objects.link(cp)
    # Recreate one rigid weight after evaluating bevels and curves.
    vg=cp.vertex_groups.new(name=ob['rigid_bone']);vg.add(list(range(len(me.vertices))),1,'REPLACE')
    copies.append(cp)
bpy.ops.object.select_all(action='DESELECT')
for ob in copies:ob.select_set(True)
bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join()
game_mesh=copies[0];game_mesh.name='Jolly_Robot';game_mesh.parent=root
mod=game_mesh.modifiers.new('Robot skin','ARMATURE');mod.object=rig
game_mesh['avatarId']='jolly_robot'
arm.pose_position='POSE';rig.animation_data.action=clips['Hello_Wave'];scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for ob in (root,rig,game_mesh):ob.select_set(True)
bpy.context.view_layer.objects.active=rig
dest=ASSETS/'jolly_robot.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,
    export_yup=True,export_animations=True,export_animation_mode='ACTIONS',
    export_force_sampling=True,export_frame_range=False,export_cameras=False,
    export_lights=False,export_extras=True,export_def_bones=True)
game_mesh.data.calc_loop_triangles()
report={'source':str(blend.relative_to(OUT.parents[1])), 'asset':'assets/models/jolly_robot.glb',
        'editable_parts':len(parts),'bones':len(arm.bones),'triangles':len(game_mesh.data.loop_triangles),
        'bytes':dest.stat().st_size,'height_m':1.85,'up':'+Y','forward':'+Z',
        'clips':{name:[int(v.frame_range[0]),int(v.frame_range[1])] for name,v in clips.items()},
        'studio_exported':False,'walk':'Initial in-place cycle; foot-contact tuning remains for integration'}
(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('EXPORT_REPORT',json.dumps(report),flush=True)

# Reload the pristine editable source for all previews.
bpy.ops.wm.open_mainfile(filepath=str(blend));scene=bpy.context.scene
scene.render.filepath=str(OUT/'jolly_robot_preview.png')
bpy.ops.render.render(write_still=True)
scene.frame_set(1);scene.camera=bpy.data.objects['Camera | neutral front']
scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.cycles.samples=24
scene.render.filepath=str(OUT/'jolly_robot_front.png');bpy.ops.render.render(write_still=True)
scene.camera=bpy.data.objects['Camera | rear details']
scene.render.filepath=str(OUT/'jolly_robot_rear.png');bpy.ops.render.render(write_still=True)
print('JOLLY_PREVIEWS_COMPLETE',flush=True)

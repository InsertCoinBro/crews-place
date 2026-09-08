"""Add the second-stage face to the saved cowboy, preserving existing geometry."""
import bpy
import bmesh
import math
import ast
import json
import hashlib
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parent
BASE=OUT.parent/'cowboy_shell_v01'
TAU=math.tau
bpy.ops.wm.open_mainfile(filepath=str(BASE/'cowboy_shell_v01.blend'))

# Reuse only geometry helper definitions, never the scene-building statements.
parsed=ast.parse((BASE/'build_cowboy.py').read_text())
helpers=ast.Module(body=[n for n in parsed.body if isinstance(n,ast.FunctionDef)],type_ignores=[])
exec(compile(helpers,'cowboy_geometry_helpers','exec'),globals())

def signature(ob):
    h=hashlib.sha256()
    h.update(str(tuple(tuple(r) for r in ob.matrix_world)).encode())
    if ob.type=='MESH':
        h.update(str([tuple(v.co) for v in ob.data.vertices]).encode())
        h.update(str([tuple(p.vertices) for p in ob.data.polygons]).encode())
    elif ob.type=='CURVE':
        h.update(str([[tuple(p.co) for p in s.points] for s in ob.data.splines]).encode())
    if ob.type in ('MESH','CURVE'):
        h.update(str([(m.name,tuple(m.diffuse_color)) for m in ob.data.materials]).encode())
    return h.hexdigest()

originals={o.name:signature(o) for o in bpy.data.objects}
FACE=collection('07 | Face - eyes nose and facial hair')
STUDIO=bpy.data.collections['90 | Studio - presentation only']
body=bpy.data.objects['BODY | complete editable mannequin']
root=bpy.data.objects['COWBOY | stage 01 master']
skin=bpy.data.materials['Clay skin | warm sandstone']
hair=material('Facial hair | dark walnut','442C20',.86)
hair_light=material('Facial hair | subtle sculpted strands','59402D',.83)
eye_white=material('Eyes | warm ivory','F5F1E8',.35)
iris_outer=material('Eyes | blue outer iris','174B76',.34)
iris_blue=material('Eyes | clear cornflower blue','388ED0',.3)
iris_inner=material('Eyes | pale blue inner iris','68B7E0',.3)
pupilmat=material('Eyes | deep pupils','111A22',.26)
glint=material('Eyes | catchlights','FFFFFF',.15)
lipmat=material('Mouth | natural warm lip','A87960',.78)
mouthmat=material('Mouth | soft crease','684533',.85)
nostrilmat=material('Nose | subtle nostril shadow','81573F',.85)

bpy.context.view_layer.update()
body_eval=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
def face_y(x,z):
    hit,co,no,idx=body_eval.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
    if not hit: raise RuntimeError('Facial point is off the head: %r'%((x,z),))
    return co.y

def face_curve(name,xzs,r,mat,offset=.003):
    return curve(name,[(x,face_y(x,z)-offset,z) for x,z in xzs],r,FACE,mat)

# Almond-shaped white lenses are fitted directly to the original face.
# Thin skin-colored rims provide eyelids without carving or changing the head.
for side,label in ((-1,'L'),(1,'R')):
    cx=side*.055;cz=2.047;w=.036
    def eye_depth(x,z,cx=cx):
        q=((x-cx)/w)**2+((z-cz)/.023)**2
        return face_y(x,z)-.0035-.0095*max(0,1-q)
    rings=[]
    for r in (1,.84,.6,.3,.055):
        ring=[]
        for j in range(64):
            a=TAU*j/64
            x=cx+w*r*math.cos(a)
            z=cz+r*(.022 if math.sin(a)>=0 else .0165)*math.sin(a)
            ring.append((x,eye_depth(x,z),z))
        rings.append(ring)
    eye=rings_mesh('Eye '+label+' | almond sclera',rings,FACE,eye_white,False,1)
    so=eye.modifiers.new('Eye shell depth','SOLIDIFY');so.thickness=.004
    upper=[];lower=[]
    for j in range(41):
        a=math.pi*j/40
        upper.append((cx+w*math.cos(a),cz+.022*math.sin(a)))
        lower.append((cx+w*math.cos(a),cz-.0165*math.sin(a)))
    face_curve('Eye '+label+' | upper eyelid',upper,.0037,skin,.005)
    face_curve('Eye '+label+' | lower eyelid',lower,.0025,skin,.0045)

    # Iris disks use the same curved eye surface, avoiding floating flat coins.
    for name,rad,mat,depth in (('dark blue limbal ring',.0145,iris_outer,.0007),
            ('blue iris',.0126,iris_blue,.0011),('inner blue iris',.0086,iris_inner,.0015),
            ('pupil',.0065,pupilmat,.0019)):
        rr=[]
        for r in (1,.92,.4,.04):
            rr.append([(cx+rad*r*math.cos(TAU*j/64),
                eye_depth(cx+rad*r*math.cos(TAU*j/64),cz+rad*r*math.sin(TAU*j/64))-depth,
                cz+rad*r*math.sin(TAU*j/64)) for j in range(64)])
        rings_mesh('Eye '+label+' | '+name,rr,FACE,mat,False,1)
    for dx,dz,radius in ((-.004,.005,.0024),(.003,-.003,.001)):
        x=cx+dx;z=cz+dz
        ellipsoid('Eye '+label+' | catchlight', (x,eye_depth(x,z)-.0025,z),
            (radius,.0009,radius),FACE,glint)

def smooth_outline(outline,steps=6):
    pts=[]
    for i,co in enumerate(outline):
        a=Vector(outline[(i-1)%len(outline)]);b=Vector(co)
        c=Vector(outline[(i+1)%len(outline)]);d=Vector(outline[(i+2)%len(outline)])
        for j in range(steps):
            t=j/steps
            p=.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
            pts.append(tuple(p))
    return pts

def hair_patch(name,outline,bulge=.006,mat=hair):
    outline=smooth_outline(outline)
    cx=sum(p[0] for p in outline)/len(outline);cz=sum(p[1] for p in outline)/len(outline)
    rings=[]
    for r in (1,.93,.73,.43,.12,.015):
        rings.append([(cx+(x-cx)*r,
            face_y(cx+(x-cx)*r,cz+(z-cz)*r)-.0018-bulge*(1-r*r),
            cz+(z-cz)*r) for x,z in outline])
    ob=rings_mesh(name,rings,FACE,mat,False,1)
    sol=ob.modifiers.new('Sculpted hair volume','SOLIDIFY');sol.thickness=.003
    return ob

# A broad bridge, softly rounded tip and nostril wings form one nose mesh.
noseparts=[ellipsoid('Nose bridge',(0,-.128,2.026),(.017,.024,.052),FACE,skin),
    ellipsoid('Nose tip',(0,-.153,1.993),(.024,.029,.019),FACE,skin)]
for side,label in ((-1,'L'),(1,'R')):
    noseparts.append(ellipsoid('Nose wing '+label,(side*.021,-.139,1.987),(.0115,.018,.011),FACE,skin))
nose=union_parts('NOSE | softly sculpted bridge and tip',noseparts,FACE,skin,.0016)
for side,label in ((-1,'L'),(1,'R')):
    ob=ellipsoid('Nose '+label+' | nostril shadow',(side*.016,-.158,1.981),(.005,.003,.0027),FACE,nostrilmat)
    ob.rotation_euler.y=side*.16

# Slightly arched brows keep the expression calm and readable under the brim.
for side,label in ((-1,'L'),(1,'R')):
    hair_patch('Brow '+label,[(side*x,z) for x,z in ((.019,2.084),(.036,2.097),
      (.065,2.097),(.089,2.086),(.09,2.081),(.063,2.087),(.038,2.087),(.022,2.079))],.0035)

# Mouth is understated beneath the mustache; the lip remains separate and editable.
face_curve('Mouth | quiet expression', [(-.047,1.94),(-.032,1.936),(-.016,1.934),(0,1.933),
    (.016,1.934),(.032,1.936),(.047,1.94)],.0016,mouthmat,.003)
lip_outline=[(-.033,1.931),(-.013,1.931),(0,1.93),(.013,1.931),(.033,1.931),
    (.018,1.922),(0,1.92),(-.018,1.922)]
hair_patch('Mouth | lower lip',lip_outline,.0035,lipmat)

# A classic split mustache and close-trimmed goatee. Cheeks remain clean shaven.
for side,label in ((-1,'L'),(1,'R')):
    hair_patch('Mustache '+label+' | swept shape',[(side*x,z) for x,z in ((.003,1.967),
        (.021,1.971),(.043,1.962),(.06,1.95),(.069,1.938),(.05,1.94),
        (.029,1.945),(.013,1.95),(.003,1.954))],.007)
    hair_patch('Goatee '+label+' | mouth connector',[(side*x,z) for x,z in ((.043,1.943),
        (.052,1.939),(.047,1.911),(.036,1.897),(.028,1.908),(.037,1.922))],.004)
hair_patch('GOATEE | tapered chin', [(-.044,1.915),(-.045,1.888),(-.028,1.86),
    (0,1.85),(.028,1.86),(.045,1.888),(.044,1.915),(.026,1.909),
    (.014,1.904),(0,1.915),(-.014,1.904),(-.026,1.909)],.0055)
hair_patch('Goatee | small soul patch',[(-.008,1.918),(.008,1.918),(.009,1.908),
    (0,1.899),(-.009,1.908)],.004)

# All new face objects follow the existing master. No ears are added.
for ob in FACE.objects:ob.parent=root

# Verify every pre-existing object's geometry, placement and color stayed intact.
unchanged={name:signature(bpy.data.objects[name])==sig for name,sig in originals.items()}
assert all(unchanged.values()),[name for name,ok in unchanged.items() if not ok]
assert all(math.isfinite(c) for ob in FACE.objects if ob.type=='MESH' for v in ob.data.vertices for c in v.co)
report={'source':'cowboy_shell_v01.blend','original_objects_checked':len(unchanged),
    'all_original_geometry_transforms_and_colors_unchanged':True,'new_face_objects':len(FACE.objects),
    'features':['blue eyes','eyelids','eyebrows','nose','mustache','goatee','subtle mouth'],
    'ears_added':False,'finite_new_mesh_coordinates':True}
(OUT/'validation.json').write_text(json.dumps(report,indent=2))
print('PRESERVATION_CHECK',json.dumps(report),flush=True)

scene=bpy.context.scene
scene['project']='Cowboy character | stage two face'
portrait=camera('Camera | face portrait',(1.25,-6,2.6),(0,-.02,2.055),.79)
scene.camera=bpy.data.objects['Camera | three-quarter']
scene.render.resolution_x=1200;scene.render.resolution_y=1400
scene.cycles.samples=48
scene.render.filepath=str(OUT/'cowboy_face_full.png')
text=bpy.data.texts.new('FACE UPDATE | version 02')
text.write('Stage 02: blue eyes, nose, eyebrows, a mustache and a goatee.\n'
    'All face additions are in collection 07 and follow the original master.\n'
    'Every original object retains its geometry, placement and material colors.\n'
    'No new ears were added. Original version 01 is preserved separately.\n')
source=bpy.data.texts.new('add_face.py');source.write(Path(__file__).read_text())
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active=nose
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cowboy_face_v02.blend'))
print('FACE_SAVED',flush=True)
bpy.ops.render.render(write_still=True)
scene.camera=portrait
scene.render.resolution_x=1200;scene.render.resolution_y=1200
scene.render.filepath=str(OUT/'cowboy_face_closeup.png')
bpy.ops.render.render(write_still=True)
print('FACE_RENDERS_COMPLETE',flush=True)

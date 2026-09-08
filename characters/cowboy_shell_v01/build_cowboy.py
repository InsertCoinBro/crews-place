"""Build the editable stage-one cowboy shell with Blender's Python API.

Run: Blender --background --factory-startup --python build_cowboy.py
All geometry is authored here. No external models or textures are required.
"""
import bpy
import bmesh
import math
import json
from pathlib import Path
from mathutils import Vector, Quaternion

OUT = Path(__file__).resolve().parent
TAU = math.tau
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for col in list(bpy.data.collections):
    bpy.data.collections.remove(col)

def collection(name):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col

BODY = collection('01 | Body - blank face and hands')
SHIRT = collection('02 | Western shirt')
PANTS = collection('03 | Denim trousers')
BOOTS = collection('04 | Cowboy boots')
HAT = collection('05 | Cowboy hat')
GEAR = collection('06 | Belt and holstered prop')
STUDIO = collection('90 | Studio - presentation only')

def material(name, hexcode, rough=.65, metal=0):
    rgb = [int(hexcode[i:i+2],16)/255 for i in (0,2,4)]
    linear = [c/12.92 if c < .04045 else ((c+.055)/1.055)**2.4 for c in rgb]
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*linear,1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*linear,1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    return m

skin = material('Clay skin | warm sandstone','C69A78',.73)
shirt = material('Shirt | faded burnt sienna','A54F38',.8)
shirttrim = material('Shirt | yoke and collar','B96347',.8)
seammat = material('Stitch | warm ochre','C78F65',.85)
denim = material('Trousers | blue charcoal denim','344951',.85)
denimtrim = material('Denim seams','49606A',.85)
leather = material('Leather | saddle brown','593721',.53)
leatheredge = material('Leather | edge and welt','8F5A33',.56)
solemat = material('Boot soles | dark leather','29221E',.74)
felt = material('Hat | sand felt','C6AC7D',.86)
feltedge = material('Hat | bound brim','A88B61',.8)
bandmat = material('Hat band | walnut','4D3526',.6)
brass = material('Hardware | aged brass','B59961',.3,.7)
steel = material('Revolver prop | blue steel','39464B',.29,.75)
wood = material('Revolver prop | walnut grip','703B27',.52)
floor_mat = material('Studio | warm charcoal','303839',.86)
plinthmat = material('Studio | slate pedestal','4B5554',.8)

def move_to(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)

def finish(obj,name,col,mat,smooth=True):
    obj.name = name
    move_to(obj,col)
    if mat:
        obj.data.materials.append(mat)
    if smooth and obj.type == 'MESH':
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj

def mesh(name, verts, faces, col, mat, subdiv=0):
    me=bpy.data.meshes.new(name+' | mesh')
    me.from_pydata(verts,[],faces)
    me.update()
    bm=bmesh.new();bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(me);bm.free()
    ob=bpy.data.objects.new(name,me)
    col.objects.link(ob)
    if mat: me.materials.append(mat)
    for p in me.polygons: p.use_smooth=True
    if subdiv:
        mod=ob.modifiers.new('Editable surface smoothing','SUBSURF')
        mod.levels=subdiv
        mod.render_levels=subdiv
    return ob

def rings_mesh(name,rings,col,mat,cap=True,subdiv=1):
    n=len(rings[0]); verts=[v for ring in rings for v in ring]
    faces=[]
    for k in range(len(rings)-1):
        for j in range(n):
            faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
    if cap:
        faces += [tuple(reversed(range(n))), tuple((len(rings)-1)*n+j for j in range(n))]
    return mesh(name,verts,faces,col,mat,subdiv)

def zloft(name, levels, col, mat, n=32, subdiv=1, power=2):
    # Each ring: z, half-width, half-depth, center-x, center-y.
    rings=[]
    for z,rx,ry,cx,cy in levels:
        ring=[]
        for i in range(n):
            a=TAU*i/n; c=math.cos(a); s=math.sin(a)
            ring.append((cx+rx*math.copysign(abs(c)**(2/power),c),
                         cy+ry*math.copysign(abs(s)**(2/power),s),z))
        rings.append(ring)
    return rings_mesh(name,rings,col,mat,True,subdiv)

def tube(name, points, radii, col, mat,n=24,subdiv=1):
    rings=[]
    for i,p in enumerate(points):
        p=Vector(p)
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        tangent.normalize()
        u=Vector((0,1,0)); u=(u-tangent*u.dot(tangent)).normalized()
        v=tangent.cross(u).normalized()
        rad=radii[i]; ra,rb=(rad,rad) if isinstance(rad,(float,int)) else rad
        rings.append([tuple(p+ra*math.cos(TAU*j/n)*u+rb*math.sin(TAU*j/n)*v) for j in range(n)])
    return rings_mesh(name,rings,col,mat,True,subdiv)

def ellipsoid(name,loc,scale,col,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=loc)
    ob=bpy.context.object; ob.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(ob,name,col,mat)

def box(name,loc,scale,col,mat,bevel=.01,rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    ob=bpy.context.object; ob.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    finish(ob,name,col,mat)
    if rot: ob.rotation_euler=rot
    if bevel:
        m=ob.modifiers.new('Soft tailored edges','BEVEL'); m.width=bevel; m.segments=3
        m=ob.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return ob

def curve(name,pts,radius,col,mat,cyclic=False):
    cu=bpy.data.curves.new(name+' | curve','CURVE'); cu.dimensions='3D'
    sp=cu.splines.new('POLY'); sp.points.add(len(pts)-1)
    for p,co in zip(sp.points,pts): p.co=(*co,1)
    sp.use_cyclic_u=cyclic; cu.bevel_depth=radius; cu.bevel_resolution=3
    ob=bpy.data.objects.new(name,cu); col.objects.link(ob); cu.materials.append(mat)
    return ob

def panel(name,pts,col,mat,thickness=.008,bevel=.005):
    ob=mesh(name,pts,[tuple(range(len(pts)))],col,mat)
    sol=ob.modifiers.new('Cloth thickness','SOLIDIFY'); sol.thickness=thickness
    be=ob.modifiers.new('Rounded edge','BEVEL'); be.width=bevel; be.segments=3
    no=ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return ob

def union_parts(name,parts,col,mat,voxel=.009):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in parts:
        bpy.context.view_layer.objects.active=ob
        ob.select_set(True)
        for mod in list(ob.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
        ob.select_set(False)
    for ob in parts: ob.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    ob=parts[0]; ob.name=name
    ob.data.materials.clear(); ob.data.materials.append(mat)
    for p in ob.data.polygons: p.material_index=0
    rem=ob.modifiers.new('Joined shell surface','REMESH'); rem.mode='VOXEL'; rem.voxel_size=voxel
    bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=ob.modifiers.new('Relax base volume','SMOOTH'); sm.factor=1.1; sm.iterations=5
    bpy.ops.object.modifier_apply(modifier=sm.name)
    for p in ob.data.polygons:p.use_smooth=True
    su=ob.modifiers.new('Surface smoothing - adjustable','SUBSURF');su.levels=1;su.render_levels=1
    return ob

# Reusable full-body mannequin beneath the removable wardrobe.
base=[]
base.append(zloft('Body torso',[(1.05,.12,.08,0,.005),(1.1,.185,.11,0,.005),(1.24,.176,.10,0,0),
 (1.42,.18,.116,0,0),(1.6,.233,.133,0,0),(1.69,.242,.113,0,0),(1.75,.15,.09,0,0)],BODY,skin))
base.append(tube('Neck',[(0,0,1.7),(0,0,1.73),(0,0,1.87),(0,0,1.9)],[.092,.09,.078,.073],BODY,skin))
base.append(zloft('Head blank',[(1.825,.06,.07,0,-.02),(1.845,.078,.09,0,-.028),
 (1.88,.107,.106,0,-.015),(1.94,.131,.12,0,-.004),(2.02,.139,.126,0,0),
 (2.12,.136,.121,0,.007),(2.18,.115,.103,0,.01),(2.21,.071,.065,0,.013),
 (2.218,.01,.01,0,.013)],BODY,skin,n=32,subdiv=2,power=2.45))
for s,label in ((-1,'L'),(1,'R')):
    base.append(ellipsoid('Ear '+label,(s*.138,.006,2.005),(.026,.035,.054),BODY,skin))
    base.append(tube('Arm '+label,[(s*.212,0,1.679),(s*.266,0,1.674),(s*.342,0,1.529),
        (s*.403,-.004,1.42),(s*.477,-.023,1.237),(s*.501,-.027,1.18)],
        [.075,.083,.074,.068,.048,.046],BODY,skin))
    base.append(ellipsoid('Palm '+label,(s*.523,-.034,1.105),(.055,.039,.095),BODY,skin))
    base.append(ellipsoid('Thumb '+label,(s*.479,-.051,1.115),(.029,.027,.057),BODY,skin))
    base.append(tube('Leg '+label,[(s*.104,.01,1.134),(s*.118,.008,1.07),(s*.139,.014,.88),
        (s*.152,-.018,.70),(s*.16,.015,.48),(s*.165,.02,.18)],
        [.081,.082,.073,.053,.047,.039],BODY,skin))
    base.append(ellipsoid('Foot '+label,(s*.165,-.065,.113),(.058,.152,.033),BODY,skin))
body=union_parts('BODY | complete editable mannequin',base,BODY,skin,.008)
body['stage']='Blank facial shell and mitten hands. Full body continues under removable clothing.'

# Long-sleeved Western shirt. Union only the large fabric volumes.
parts=[zloft('Shirt torso',[(1.185,.185,.113,0,0),(1.2,.191,.12,0,0),(1.31,.202,.128,0,0),
 (1.44,.207,.138,0,0),(1.60,.255,.149,0,0),(1.695,.278,.127,0,0),
 (1.742,.228,.109,0,0),(1.775,.139,.089,0,0),(1.779,.11,.083,0,0)],SHIRT,shirt,n=40,subdiv=2)]
for s,label in ((-1,'L'),(1,'R')):
    parts.append(tube('Sleeve '+label,[(s*.215,0,1.697),(s*.261,0,1.68),(s*.315,0,1.597),
        (s*.365,-.004,1.498),(s*.402,-.006,1.421),(s*.459,-.02,1.282),(s*.477,-.025,1.24)],
        [.083,.101,.097,.087,.083,.063,.061],SHIRT,shirt,subdiv=2))
    tube('Cuff '+label,[(s*.473,-.025,1.258),(s*.477,-.026,1.25),(s*.493,-.027,1.199),(s*.496,-.027,1.194)],
        [.064,.065,.06,.059],SHIRT,shirttrim,subdiv=1)
    ellipsoid('Cuff snap '+label,(s*.479,-.085,1.224),(.010,.004,.01),SHIRT,brass)
shirtob=union_parts('SHIRT | torso and sleeves',parts,SHIRT,shirt,.006)
shirtob['stage']='Separate from body. Collar, cuffs, placket and pockets remain individual parts.'

# Open split collar around the neck.
collar=[]
for k,(z,rx,ry) in enumerate(((1.758,.109,.091),(1.766,.11,.091),(1.817,.093,.078),(1.822,.092,.077))):
    collar.append([(rx*math.cos(TAU*j/48),ry*math.sin(TAU*j/48),z) for j in range(48)])
ob=rings_mesh('Collar | standing band',collar,SHIRT,shirttrim,False,1)
sol=ob.modifiers.new('Collar thickness','SOLIDIFY');sol.thickness=.007
for s,label in ((-1,'L'),(1,'R')):
    panel('Collar point '+label,[(s*.023,-.091,1.8),(s*.09,-.082,1.792),
        (s*.142,-.106,1.704),(s*.075,-.15,1.642)],SHIRT,shirttrim,.012,.007)
    panel('Western shoulder yoke '+label,[(s*.117,-.094,1.749),(s*.221,-.085,1.72),
        (s*.244,-.113,1.661),(s*.149,-.142,1.624),(s*.043,-.154,1.671)],SHIRT,shirttrim,.005,.004)
    # Patch pocket and its characteristic pointed flap.
    x=s*.133
    pocket=[(x-.044,-.139,1.59),(x+.044,-.139,1.59),(x+.043,-.143,1.488),
            (x,-.148,1.476),(x-.043,-.143,1.488)]
    panel('Chest pocket '+label,pocket,SHIRT,shirttrim,.004,.005)
    panel('Pocket flap '+label,[(x-.047,-.144,1.59),(x+.047,-.144,1.59),
        (x+.045,-.15,1.558),(x,-.159,1.54),(x-.045,-.15,1.558)],SHIRT,shirttrim,.006,.004)
    ellipsoid('Pocket snap '+label,(x,-.16,1.558),(.008,.004,.008),SHIRT,brass)
    curve('Pocket lower stitch '+label,[(x-.037,-.147,1.548),(x-.037,-.148,1.497),
        (x,-.152,1.485),(x+.037,-.148,1.497),(x+.037,-.147,1.548)],.0014,SHIRT,seammat)

# Front placket follows the torso instead of hovering as a straight strip.
pl=[]
for z,y in ((1.217,-.124),(1.31,-.131),(1.44,-.141),(1.60,-.155),(1.667,-.146),(1.72,-.12)):
    pl.extend([(-.017,y,z),(.017,y,z)])
plfaces=[(2*k,2*k+1,2*k+3,2*k+2) for k in range(5)]
ob=mesh('Shirt | center placket',pl,plfaces,SHIRT,shirttrim,1)
sol=ob.modifiers.new('Placket fabric','SOLIDIFY');sol.thickness=.004
for i,(z,y) in enumerate(((1.28,-.134),(1.38,-.144),(1.48,-.151),(1.58,-.159),(1.674,-.146))):
    ellipsoid('Shirt brass snap %02d'%i,(0,y,z),(.008,.004,.008),SHIRT,brass)

# Tailored flat pieces follow the actual smoothed shirt surface.
for ob in list(SHIRT.objects):
    if ob.name.startswith(('Western shoulder yoke','Chest pocket','Pocket flap','Shirt | center placket')):
        bpy.context.view_layer.objects.active=ob
        # Triangulation and simple subdivision add projection points inside n-gon panels.
        if not ob.name.startswith('Shirt | center placket'):
            tri=ob.modifiers.new('Panel tessellation','TRIANGULATE')
            bpy.ops.object.modifier_move_up(modifier=tri.name)
            bpy.ops.object.modifier_move_up(modifier=tri.name)
            bpy.ops.object.modifier_move_up(modifier=tri.name)
            su=ob.modifiers.new('Tailoring surface grid','SUBSURF');su.subdivision_type='SIMPLE';su.levels=3;su.render_levels=3
            while list(ob.modifiers).index(su)>1:
                bpy.ops.object.modifier_move_up(modifier=su.name)
        sw=ob.modifiers.new('Fitted to shirt fabric','SHRINKWRAP');sw.target=shirtob
        sw.wrap_method='PROJECT';sw.use_project_y=True;sw.use_positive_direction=True;sw.use_negative_direction=True
        sw.offset=.004 if not ob.name.startswith('Pocket flap') else .009
        while list(ob.modifiers).index(sw)>(2 if not ob.name.startswith('Shirt | center placket') else 1):
            bpy.ops.object.modifier_move_up(modifier=sw.name)

# Move front snaps and pocket stitches to the same surface as their cloth panels.
bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get()
shirt_eval=shirtob.evaluated_get(deps)
def shirt_front_y(x,z):
    hit,co,no,face=shirt_eval.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
    return co.y if hit else -.13
for ob in list(SHIRT.objects):
    if ob.name.startswith(('Shirt brass snap','Pocket snap')):
        ob.location.y=shirt_front_y(ob.location.x,ob.location.z)-(.014 if ob.name.startswith('Pocket snap') else .01)
    elif ob.name.startswith('Pocket lower stitch'):
        for sp in ob.data.splines:
            for p in sp.points:
                p.co.y=shirt_front_y(p.co.x,p.co.z)-.008

# Fitted denim, with volumes joined at the pelvis and room inside the boots.
denparts=[zloft('Trouser hip',[(.99,.126,.077,0,.012),(1.05,.184,.118,0,.013),
    (1.145,.206,.128,0,.009),(1.205,.195,.121,0,0),(1.23,.19,.116,0,0)],PANTS,denim,subdiv=2)]
for s,label in ((-1,'L'),(1,'R')):
    denparts.append(tube('Trouser leg '+label,[(s*.104,.009,1.115),(s*.119,.008,1.058),
        (s*.138,.013,.91),(s*.155,-.015,.748),(s*.16,-.015,.681),
        (s*.165,.009,.565),(s*.166,.015,.50)],
        [(.109,.1),(.113,.099),(.103,.093),(.091,.081),(.088,.076),(.08,.071),(.077,.068)],PANTS,denim,subdiv=2))
    curve('Trouser outside seam '+label,[(s*.204,.03,1.122),(s*.224,.037,1.045),
       (s*.239,.032,.92),(s*.235,.02,.76),(s*.233,.026,.638),(s*.234,.028,.57)],.0016,PANTS,denimtrim)
pantsob=union_parts('TROUSERS | joined denim shell',denparts,PANTS,denim,.006)

# Belt is an elliptical strip with its own thickness.
belt_rings=[]
for z in (1.179,1.182,1.237,1.241):
    belt_rings.append([(.203*math.cos(TAU*j/80),.133*math.sin(TAU*j/80),z) for j in range(80)])
ob=rings_mesh('Belt | continuous leather strap',belt_rings,GEAR,leather,False,1)
sol=ob.modifiers.new('Leather thickness','SOLIDIFY');sol.thickness=.012
# Rounded rectangular buckle frame lies on the front plane.
pts=[]
for cx,cz,start in ((.036,.017,0),(-.036,.017,90),(-.036,-.017,180),(.036,-.017,270)):
    for j in range(9):
        a=math.radians(start+j*90/8)
        pts.append((cx+.009*math.cos(a),-.149,1.21+cz+.009*math.sin(a)))
curve('Belt | brass buckle frame',pts,.007,GEAR,brass,True)
box('Buckle center bar',(0,-.15,1.21),(.007,.007,.044),GEAR,brass,.003)
box('Buckle tongue',(.014,-.156,1.21),(.035,.006,.005),GEAR,brass,.002)
for a in (-145,-35,35,145):
    t=math.radians(a)
    ob=box('Denim belt loop %s'%a,(.204*math.cos(t),.136*math.sin(t),1.212),(.018,.012,.077),PANTS,denim,.004)
    ob.rotation_euler.z=t-math.pi/2

# Boot shaping: tall Western shafts, slightly pointed toes, raised stacked heels.
for s,label in ((-1,'L'),(1,'R')):
    x=s*.166
    levels=[(.126,.086,.103),(.19,.09,.10),(.265,.082,.081),(.37,.092,.086),(.49,.108,.093),(.585,.111,.097),(.6,.11,.096)]
    rings=[]
    for z,rx,ry in levels:
        rings.append([(x+rx*math.cos(TAU*j/40),.015+ry*math.sin(TAU*j/40),
            z-(.044*abs(math.sin(TAU*j/40))**8 if z>.58 else 0)) for j in range(40)])
    shaft=rings_mesh('Boot '+label+' | sculpted shaft',rings,BOOTS,leather,False,2)
    sol=shaft.modifiers.new('Boot leather thickness','SOLIDIFY');sol.thickness=.009
    # Foot cross-sections travel from the pointed toe to the heel.
    footrings=[]
    for y,rx,rz,zc in ((-.358,.014,.01,.081),(-.35,.041,.022,.086),(-.30,.076,.04,.1),
       (-.23,.1,.047,.106),(-.12,.104,.068,.127),(-.015,.09,.101,.158),(.105,.083,.095,.15),
       (.137,.066,.073,.14),(.153,.012,.019,.132)):
        footrings.append([(x+rx*math.cos(TAU*j/32),y,zc+rz*math.sin(TAU*j/32)) for j in range(32)])
    rings_mesh('Boot '+label+' | pointed vamp',footrings,BOOTS,leather,True,2)
    outline=[(-.071,.143),(-.091,.107),(-.094,-.02),(-.11,-.12),(-.111,-.2),
      (-.091,-.286),(-.053,-.35),(0,-.37),(.053,-.35),(.091,-.286),(.111,-.2),
      (.11,-.12),(.094,-.02),(.091,.107),(.071,.143)]
    # Smooth the sole outline and lift the arch gradually, keeping welt and sole aligned.
    smoothed=[]
    for i,p1 in enumerate(outline):
        p0=Vector(outline[(i-1)%len(outline)]);p1=Vector(p1)
        p2=Vector(outline[(i+1)%len(outline)]);p3=Vector(outline[(i+2)%len(outline)])
        for j in range(6):
            t=j/6
            p=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
            smoothed.append(tuple(p))
    outline=smoothed
    def sole_z(y):
        t=max(0,min(1,(y+.19)/.17))
        return .023+.029*t*t*(3-2*t)
    solerings=[]
    for dz in (0,.004,.023,.026):
        solerings.append([(x+xx,y,sole_z(y)+dz) for xx,y in outline])
    rings_mesh('Boot '+label+' | shaped outsole',solerings,BOOTS,solemat,True,1)
    curve('Boot '+label+' | welt edging',[(x+xx*.985,y,sole_z(y)+.025) for xx,y in outline],.004,BOOTS,leatheredge,True)
    box('Boot '+label+' | stacked heel',(x,.074,.027),(.153,.135,.054),BOOTS,solemat,.012)
    curve('Boot '+label+' | heel layer',[(x-.071,.132,.028),(x+.071,.132,.028),(x+.075,.017,.028)],.002,BOOTS,leatheredge)
    pts=[(x+.111*math.cos(TAU*j/80),.015+.097*math.sin(TAU*j/80),.60-.044*abs(math.sin(TAU*j/80))**8) for j in range(80)]
    curve('Boot '+label+' | scalloped top binding',pts,.006,BOOTS,leatheredge,True)
    for side in (-1,1):
        box('Boot '+label+' | pull tab '+str(side),(x+side*.108,.016,.592),(.014,.027,.051),BOOTS,leatheredge,.006)
    # A restrained Western stitched V on each shaft.
    curve('Boot '+label+' | front V stitch',[(x-.068,-.057,.514),(x-.045,-.074,.481),(x,-.077,.429),
         (x+.045,-.074,.481),(x+.068,-.057,.514)],.002,BOOTS,leatheredge)
    curve('Boot '+label+' | front shaft seam',[(x,-.071,.269),(x,-.074,.345),(x,-.077,.423)],.0016,BOOTS,leatheredge)

# Broad curled felt brim, with a real opening for the head and shaped cattleman crown.
N=96
brimrings=[]
for t in (0,.04,.27,.62,.93,1):
    ring=[]
    for j in range(N):
        a=TAU*j/N;c=math.cos(a);sn=math.sin(a)
        rx=.136+(.356-.136)*t;ry=.124+(.29-.124)*t
        z=2.144 + .095*t**2*abs(c)**4 - .023*t*abs(sn)**5
        ring.append((rx*c,ry*sn,z))
    brimrings.append(ring)
brim=rings_mesh('HAT | swept cowboy brim',brimrings,HAT,felt,False,2)
sol=brim.modifiers.new('Felt thickness','SOLIDIFY');sol.thickness=.012
curve('Hat | bound brim edge',brimrings[-1],.006,HAT,feltedge,True)
crownrings=[]
for z,rx,ry,crease in ((2.145,.143,.131,0),(2.153,.147,.134,0),(2.197,.148,.131,0),
    (2.31,.134,.119,0),(2.375,.117,.109,.022),(2.389,.097,.085,.035),
    (2.387,.068,.054,.043),(2.378,.023,.022,.039)):
    ring=[]
    for j in range(64):
        a=TAU*j/64; c=math.cos(a);sn=math.sin(a)
        ring.append((rx*c,ry*sn,z-crease*abs(sn)**5))
    crownrings.append(ring)
crown=rings_mesh('HAT | creased cattleman crown',crownrings,HAT,felt,True,2)
bandrings=[]
for z,rx,ry in ((2.154,.15,.136),(2.158,.151,.137),(2.193,.152,.136),(2.197,.15,.135)):
    bandrings.append([(rx*math.cos(TAU*j/64),ry*math.sin(TAU*j/64),z) for j in range(64)])
ob=rings_mesh('Hat | leather band',bandrings,HAT,bandmat,False,1)
sol=ob.modifiers.new('Band thickness','SOLIDIFY');sol.thickness=.006
box('Hat band | small brass keeper',(.151,-.023,2.177),(.009,.03,.024),HAT,brass,.004)

# Stylized non-functional revolver silhouette, mostly covered by its leather holster.
# This is a visual character accessory, without mechanisms or manufacturing geometry.
holster=zloft('HOLSTER | tapered leather pouch',[(.862,.022,.025,.278,-.013),(.887,.035,.038,.281,-.013),
    (.956,.043,.043,.284,-.013),(1.078,.052,.051,.285,-.013),(1.122,.056,.051,.283,-.013),
    (1.136,.055,.05,.282,-.013)],GEAR,leather,n=32,subdiv=2,power=2.6)
box('Holster | belt hanger',(.242,.004,1.162),(.077,.029,.155),GEAR,leather,.014,rot=(0,-.12,0))
curve('Holster | front edge stitch',[(.251,-.061,1.112),(.247,-.059,1.064),(.249,-.055,.973),
    (.264,-.044,.903),(.278,-.039,.887),(.294,-.044,.904),(.321,-.054,.99),(.324,-.06,1.112)],.002,GEAR,leatheredge)
ellipsoid('Holster | brass rivet',(.283,-.065,1.1),(.007,.004,.007),GEAR,brass)
box('Revolver prop | concealed frame',(.285,-.005,1.139),(.062,.037,.094),GEAR,steel,.01)
ob=ellipsoid('Revolver prop | cylinder',(.283,-.009,1.169),(.036,.029,.044),GEAR,steel)
box('Revolver prop | walnut grip',(.319,.002,1.227),(.049,.043,.109),GEAR,wood,.014,rot=(0,-.38,0))
box('Revolver prop | grip backstrap',(.344,.012,1.227),(.007,.03,.085),GEAR,steel,.004,rot=(0,-.38,0))
box('Revolver prop | hammer silhouette',(.274,.006,1.231),(.016,.026,.032),GEAR,steel,.005,rot=(0,-.35,0))
ellipsoid('Revolver prop | grip pin',(.318,-.021,1.224),(.005,.0025,.005),GEAR,brass)

# One root transform makes future positioning straightforward.
root=bpy.data.objects.new('COWBOY | stage 01 master',None);BODY.objects.link(root)
root.empty_display_type='PLAIN_AXES';root.empty_display_size=.18
root['version']='01 - editable shell'
root['front']='-Y; Z up; ground at Z=0'
root['next_steps']='Face, hair, fingers, material detailing, retopology and rigging are intentionally deferred.'
for col in (BODY,SHIRT,PANTS,BOOTS,HAT,GEAR):
    for ob in col.objects:
        if ob!=root:ob.parent=root

# Neutral studio presentation. Exclude this collection when using the character elsewhere.
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=.91,depth=.072,location=(0,0,-.036))
ped=finish(bpy.context.object,'Studio | display pedestal',STUDIO,plinthmat)
bev=ped.modifiers.new('Rounded pedestal edge','BEVEL');bev.width=.026;bev.segments=4
ped.modifiers.new('Pedestal normals','WEIGHTED_NORMAL')
box('Studio | floor',(0,0,-.1),(200,200,.05),STUDIO,floor_mat,.0)

def camera(name,position,target,ortho):
    data=bpy.data.cameras.new(name);ob=bpy.data.objects.new(name,data);STUDIO.objects.link(ob)
    ob.location=position;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO';data.ortho_scale=ortho;data.lens=55
    return ob

hero=camera('Camera | three-quarter',(4,-8,3.45),(0,0,1.18),2.92)
front=camera('Camera | front',(0,-8,2.6),(0,0,1.18),2.85)
rear=camera('Camera | rear',(-3.8,8,3.3),(0,0,1.18),2.92)
def light(name,pos,energy,size,color,target=(0,0,1.15)):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color
    ob=bpy.data.objects.new(name,data);STUDIO.objects.link(ob);ob.location=pos
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
light('Light | large warm key',(-3,-4,6),500,4,(1,.87,.72))
light('Light | broad cool fill',(4,-2,3.8),360,3.5,(.72,.85,1))
light('Light | shoulder rim',(1,3,5),650,3,(1,.83,.62))
light('Light | face fill',(0,-4,2.1),65,2,(1,.95,.85))
scene=bpy.context.scene
scene.world.color=(.16,.16,.16)
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.16,.19,.21,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.35
scene.camera=hero
scene.render.engine='CYCLES';scene.cycles.samples=40
scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.unit_settings.system='METRIC'
scene['project']='Cowboy character | stage one shell'
scene['delivery']='Separate editable meshes and curves with named collections; no rig or final UVs.'

# Opening the blend file presents the character in a clean material-colored viewport.
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active=shirtob
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_rotation=hero.rotation_euler.to_quaternion()
            area.spaces.active.region_3d.view_distance=3.6
            area.spaces.active.region_3d.view_location=(0,0,1.2)
            area.spaces.active.region_3d.view_perspective='ORTHO'
            area.spaces.active.shading.type='SOLID'
            area.spaces.active.shading.color_type='MATERIAL'
            area.spaces.active.shading.light='STUDIO'
            area.spaces.active.shading.show_cavity=True
            area.spaces.active.shading.cavity_type='BOTH'
            area.spaces.active.overlay.show_overlays=False
        elif area.type=='PROPERTIES':
            area.spaces.active.context='OBJECT'

readme=bpy.data.texts.new('START HERE | cowboy shell')
readme.write('COWBOY / SHELL 01\n\nAn editable first pass built in Blender with Python.\n\n'
    'Collections 01-06 contain only the character. Collection 90 is the studio.\n'
    'Select COWBOY | stage 01 master to move everything together.\n'
    'Front faces -Y, Z is up; feet sit at Z=0.\n'
    'Body is a continuous mannequin under separate clothing.\n'
    'Hat, shirt, trousers, boots and gear are removable.\n'
    'Color blocks are editable materials; no external textures.\n\n'
    'Intentionally deferred: facial features, hair, separated fingers, final UVs,\n'
    'retopology, skeleton, weights and animation.\n'
    'This is a modeling shell, not an animation-ready production mesh.\n')
source=bpy.data.texts.new('build_cowboy.py');source.write(Path(__file__).read_text())
scene.render.filepath=str(OUT/'cowboy_shell_preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cowboy_shell_v01.blend'))
print('COWBOY_SAVED',str(OUT/'cowboy_shell_v01.blend'),flush=True)
bpy.ops.render.render(write_still=True)
scene.camera=rear
scene.render.resolution_x=900;scene.render.resolution_y=1050
scene.cycles.samples=24
scene.render.filepath=str(OUT/'cowboy_shell_rear.png')
bpy.ops.render.render(write_still=True)
print('RENDER_COMPLETE',flush=True)

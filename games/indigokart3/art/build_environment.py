"""Rebuild IndigoKart's original Blender scenery kit. Blender 4.5+ / 5.x.
Run: blender -b --python art/build_environment.py (from game directory).
All meshes/materials are original; no downloads or external textures.
"""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
random.seed(313)
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'models'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, metal=0, rough=.5, glow=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metal; bs.inputs['Roughness'].default_value=rough
    bs.inputs['Emission Color'].default_value=(*color,1); bs.inputs['Emission Strength'].default_value=glow
    return m
sand=mat('Warm limestone',(.63,.39,.21),rough=.92)
cream=mat('Ivory concrete',(.88,.83,.66),rough=.73)
leaf=mat('Palm jade',(.075,.30,.19),rough=.8)
bark=mat('Palm bark',(.29,.15,.07),rough=.85)
coral=mat('Terracotta enamel',(.85,.24,.10),rough=.4)
steel=mat('Midnight steel',(.035,.07,.11),metal=.65,rough=.3)
teal=mat('Lagoon glass',(.025,.44,.44),metal=.35,rough=.18)
neon=mat('Electric mint',(.2,1,.7),glow=4)
pink=mat('Electric pink',(1,.11,.37),glow=3)
gold=mat('Amber lantern',(1,.55,.12),glow=2.5)

def cube(name, loc, scale, material, bevel=.08):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('Hand softened edges','BEVEL'); mod.width=bevel; mod.segments=2
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def cone(name, loc, r1,r2,depth,material,verts=12):
    bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r1,radius2=r2,depth=depth,location=loc)
    o=bpy.context.object; o.name=name; o.data.materials.append(material); return o

def beam(name,a,b,width,material):
    a,b=Vector(a),Vector(b); o=cube(name,(a+b)/2,(width,width,(b-a).length),material,.02)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); return o

def begin(name):
    c=bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c)
    layer=bpy.context.view_layer.layer_collection.children[c.name]; bpy.context.view_layer.active_layer_collection=layer
    return c

def export(c):
    bpy.ops.object.select_all(action='DESELECT')
    for o in c.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(c.name+'.glb')),export_format='GLB',use_selection=True,export_apply=True)

c=begin('palm')
for i in range(10): cone('Ringed trunk',(.035*i*i,0,.35+i*.64),.34-i*.016,.30-i*.015,.73,bark)
for i in range(9):
    a=i*math.tau/9
    verts=[]
    for j in range(6):
        t=j/5; r=t*4.3; w=math.sin(t*math.pi)*.7
        x,y=math.cos(a)*r+.035*81,math.sin(a)*r; z=6.4+math.sin(t*math.pi)*1.1-t*1.2
        verts.extend([(x-math.sin(a)*w,y+math.cos(a)*w,z),(x,y,z+.16),(x+math.sin(a)*w,y-math.cos(a)*w,z)])
    faces=[]
    for j in range(5):
        for k in range(2): faces.append((j*3+k,j*3+k+1,(j+1)*3+k+1,(j+1)*3+k))
    me=bpy.data.meshes.new('Folded frond'); me.from_pydata(verts,[],faces); me.materials.append(leaf)
    ob=bpy.data.objects.new('Sculpted palm frond',me); c.objects.link(ob)
export(c)
c=begin('coastal-rocks')
for i in range(7):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(random.uniform(-3,3),random.uniform(-2,2),random.uniform(.1,1)))
    ob=bpy.context.object; ob.name='Eroded sandstone'; ob.scale=(random.uniform(1,3),random.uniform(1,2),random.uniform(1,4)); ob.data.materials.append(sand)
export(c)
c=begin('pavilion')
for x in [-3.3,3.3]:
    for y in [-2,2]: cube('Cedar post',(x,y,2),( .22,.22,4),bark)
cube('Floating terrazzo plinth',(0,0,.12),(8,6,.24),cream)
cube('Roof fascia',(0,0,4.3),(8.4,6.4,.3),coral)
for x in range(-4,5): cube('Roof slat',(x*.92,0,4.55),(.6,6.4,.15),cream)
cube('Counter',(0,1,1.0),(5,1,1.6),teal)
for x in [-2,0,2]:
    cone('Stool seat',(x,-.5,.95),.4,.4,.16,coral)
    cone('Stool leg',(x,-.5,.46),.09,.09,.9,steel)
    cone('Pendant',(x,0,3.7),.32,.13,.4,gold)
export(c)
c=begin('lighthouse')
cone('Foundation',(0,0,.35),3.6,3.4,.7,sand)
cone('Tower',(0,0,6.4),2.5,1.65,12,cream,20)
for z in [4,8]: cone('Vermilion band',(0,0,z),2.55-z*.066,2.5-z*.066,1.0,coral,20)
cone('Lantern balcony',(0,0,12.5),2.6,2.6,.25,steel,20)
cone('Lantern glass',(0,0,13.5),1.6,1.6,1.8,gold,12)
for i in range(8):
    a=i*math.tau/8; cube('Lantern frame',(math.cos(a)*1.6,math.sin(a)*1.6,13.5),(.12,.12,2),steel)
cone('Copper crown',(0,0,14.8),2.2,0,1.3,teal,20)
export(c)
c=begin('neon-tower')
cube('Basalt plinth',(0,0,.5),(7,7,1),steel)
cube('Tower',(0,0,11),(5,5,22),steel,.25)
for z in range(2,22,2):
    cube('Glass level',(0,0,z),(5.13,5.13,.65),teal)
    cube('Neon floor line',(0,0,z+.4),(5.2,5.2,.09),neon if z%4 else pink,.02)
for x in [-2.6,2.6]: cube('Corner blade',(x,0,11),(.12,5.3,22),steel)
cone('Spire',(0,0,24),.6,0,5,neon)
export(c)
c=begin('festival-arch')
for x in [-9.5,9.5]:
    cube('Arch pedestal',(x,0,.5),(2.2,2.5,1),cream)
    cube('Arch leg',(x,0,4.2),(1.0,1.2,7.7),steel)
    cube('Illuminated inset',(x,-.65,4.5),(.22,.1,6),neon)
cube('Bridge beam',(0,0,8.1),(20,1.2,1.5),steel)
cube('Warm bridge trim',(0,-.65,8.85),(20,.08,.12),gold)
for i in range(20):
    cube('Checker',(i-9.5,-.66,7.9),(.5,.06,.5),cream if i%2 else coral,.01)
export(c)
# Store an editable asset library: collections stay at their local origins for export.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art'/'indigokart-environments.blend'))
print('IndigoKart environment kit exported.')

"""Build the first-pass Tiger Simulator models in Blender 5.x.

Run: /Applications/Blender.app/Contents/MacOS/blender -b -t 4 --python models/build_assets.py
The exports are glTF/GLB files consumed directly by the browser game.
Coordinates use Blender Z-up; glTF maps this to Three.js Y-up.
"""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "models"
OUT.mkdir(parents=True, exist_ok=True)
random.seed(22)


def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def mat(name, color, roughness=0.85, metallic=0, emission=None):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = roughness
    p.inputs["Metallic"].default_value = metallic
    if emission:
        p.inputs["Emission Color"].default_value = (*emission, 1)
        p.inputs["Emission Strength"].default_value = 1.4
    return m


orange = mat("Tiger warm orange", (0.76, 0.28, 0.075))
orange_light = mat("Tiger ginger highlights", (0.96, 0.53, 0.18))
stripe = mat("Tiger russet stripes", (0.34, 0.14, 0.07))
cream = mat("Tiger white bib and paws", (0.91, 0.86, 0.73))
pink = mat("Soft pink", (0.77, 0.37, 0.42))
green_eye = mat("Tiger green eyes", (0.34, 0.65, 0.3), 0.2)
black = mat("Ink black", (0.035, 0.045, 0.035))
brown = mat("Tree bark", (0.36, 0.24, 0.15))
brown_dark = mat("Bark shadows", (0.21, 0.16, 0.1))
leaf = mat("Leaf green", (0.18, 0.38, 0.12))
leaf_light = mat("Sunlit leaf", (0.33, 0.53, 0.17))
leaf_dark = mat("Deep leaf", (0.10, 0.27, 0.13))
grass = mat("Lawn", (0.24, 0.44, 0.14))
grass_light = mat("Grass patch", (0.36, 0.54, 0.20))
brick = mat("Terracotta brick", (0.49, 0.24, 0.17))
brick_light = mat("Warm brick", (0.61, 0.35, 0.25))
stucco = mat("House siding cream", (0.70, 0.72, 0.58))
trim = mat("House white trim", (0.88, 0.85, 0.72))
roof = mat("Weathered roof", (0.39, 0.39, 0.36))
wood = mat("Fence weathered wood", (0.39, 0.31, 0.20))
wood_alt = mat("Fence light wood", (0.47, 0.37, 0.25))
concrete = mat("Drive concrete", (0.59, 0.56, 0.49))
truck_paint = mat("Old dark green truck", (0.10, 0.22, 0.21), 0.4, 0.22)
truck_glass = mat("Truck glass", (0.30, 0.48, 0.49), 0.12, 0.1)
rubber = mat("Tire rubber", (0.065, 0.065, 0.06))
silver = mat("Dull metal", (0.55, 0.56, 0.51), 0.3, 0.65)
gold = mat("Warm light", (1.0, 0.74, 0.33), 0.2, emission=(1.0, 0.57, 0.13))
ant_red = mat("Soldier ant red", (0.43, 0.10, 0.075))
ant_dark = mat("Soldier ant dark", (0.17, 0.045, 0.035))
helmet = mat("Ant helmet olive", (0.29, 0.33, 0.16), 0.65, 0.15)
brain = mat("Ant brain glow", (0.83, 0.86, 0.34), 0.3, emission=(0.46, 0.53, 0.1))
flower = mat("Tiny wildflowers", (0.86, 0.62, 0.67))


def uv(name, loc, scale, material, segments=16, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return o


def cube(name, loc, size, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        mod = o.modifiers.new("soft edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        o.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    return o


def cyl(name, loc, radius, depth, material, vertices=12, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    if rotation:
        o.rotation_euler = rotation
    o.data.materials.append(material)
    return o


def cone(name, loc, radius, depth, material, vertices=7):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=0, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    return o


def rod(name, a, b, radius, material, vertices=8):
    a, b = Vector(a), Vector(b)
    o = cyl(name, (a+b)/2, radius, (b-a).length, material, vertices)
    o.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return o


def torus(name, loc, major, minor, material, rot=None):
    bpy.ops.mesh.primitive_torus_add(major_segments=16, minor_segments=6,
        location=loc, major_radius=major, minor_radius=minor)
    o = bpy.context.object
    o.name = name
    if rot: o.rotation_euler = rot
    o.data.materials.append(material)
    return o


def export(name):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=str(OUT / f"{name}.glb"), export_format="GLB",
        export_apply=True, export_yup=True, export_normals=True,
        export_materials="EXPORT", export_cameras=False, export_lights=False)
    print(f"Exported {name}.glb: {len(bpy.context.scene.objects)} objects")


def merge_by_material():
    """Keep the large backyard economical to draw in a browser."""
    groups = {}
    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH" and obj.data.materials:
            groups.setdefault(obj.data.materials[0].name, []).append(obj)
    for name, objects in groups.items():
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.convert(target="MESH")
        bpy.ops.object.join()
        bpy.context.object.name = name


# Tiger: deliberately round and readable from the high trailing camera.
clear()
uv("body", (0, 0, .76), (.53, .82, .49), orange)
uv("white chest", (0, .50, .68), (.40, .30, .37), cream)
uv("head", (0, .73, 1.20), (.42, .40, .38), orange_light)
uv("white muzzle left", (-.17, 1.03, 1.04), (.20, .16, .16), cream)
uv("white muzzle right", (.17, 1.03, 1.04), (.20, .16, .16), cream)
uv("nose", (0, 1.174, 1.115), (.10, .05, .07), pink)
for side in (-1, 1):
    uv("ear orange", (side*.30, .61, 1.52), (.15, .12, .23), orange)
    uv("ear pink", (side*.30, .70, 1.53), (.095, .046, .15), pink)
    uv("eye", (side*.18, 1.062, 1.27), (.105, .045, .112), green_eye)
    uv("pupil", (side*.18, 1.102, 1.27), (.036, .018, .078), black)
    for rear in (-.48, .50):
        x = side*.37
        uv("leg", (x, rear, .39), (.17, .23, .36), orange)
        uv("white paw", (x, rear+.10, .14), (.19, .25, .12), cream)
    for k in range(3):
        rod("whisker", (side*.11, 1.12, 1.02-k*.04),
            (side*(.52+k*.035), 1.11, 1.07-k*.09), .008, cream, 6)
# Tiger's back and flank stripes, visible during movement.
for y in (-.50, -.22, .08, .34):
    uv("back stripe", (0, y, 1.175 - abs(y)*.15), (.39, .05, .028), stripe)
    for side in (-1, 1):
        uv("flank stripe", (side*.46, y, .81), (.036, .055, .20), stripe)
for side in (-1, 1):
    for y in (.61, .76, .89):
        uv("face stripe", (side*.31, y, 1.42), (.055, .038, .11), stripe)
# Curved, striped tail extends toward the camera.
points = [(0,-.65,.98), (.09,-.95,1.06), (.18,-1.24,1.23), (.20,-1.49,1.45), (.15,-1.62,1.64)]
for i in range(len(points)-1):
    rod("tail segment", points[i], points[i+1], .105-i*.011,
        stripe if i in (1,3) else orange, 12)
uv("tail tip", points[-1], (.09,.09,.10), cream)
export("tiger")
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "models" / "tiger.blend"))


# Soldier ant, facing Blender +Y / Three -Z.
clear()
uv("ant abdomen", (0,-.36,.28), (.31,.39,.27), ant_red)
uv("ant thorax", (0,.05,.30), (.20,.24,.20), ant_dark)
uv("ant head", (0,.40,.33), (.28,.27,.26), ant_red)
for side in (-1,1):
    uv("ant eye", (side*.20,.55,.42), (.055,.04,.055), black)
    rod("mandible", (side*.12,.60,.20), (side*.23,.77,.13), .028, ant_dark)
    for yi in (-.20,.04,.29):
        rod("upper leg", (side*.14,yi,.26), (side*.38,yi-.05,.20), .035, ant_dark)
        rod("lower leg", (side*.38,yi-.05,.20), (side*.50,yi-.13,.04), .028, ant_dark)
    rod("antenna", (side*.14,.56,.50), (side*.22,.78,.69), .018, ant_dark)
    rod("antenna tip", (side*.22,.78,.69), (side*.34,.86,.66), .015, ant_dark)
uv("helmet dome", (0,.39,.56), (.29,.28,.17), helmet)
cyl("helmet brim", (0,.39,.52), .34, .045, helmet, 16)
for x in (-.16,0,.16):
    uv("brain pip", (x,.38,.72), (.055,.065,.057), brain)
export("soldier-ant")
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "models" / "soldier-ant.blend"))


# Backyard. Structure follows the supplied photographs, with denser planting at cat scale.
clear()
cube("lawn", (0,0,-.13), (40,40,.25), grass)
for i in range(110):
    x,y = random.uniform(-18.6,18.6), random.uniform(-14.2,17.8)
    if x*x+(y-2.0)**2 < 13 or abs(x)<4 and y<-10: continue
    uv("lawn color patch", (x,y,.015), (random.uniform(.3,.7),random.uniform(.3,.7),.018),
       random.choice((grass_light,leaf_light,grass)), 8, 4)

# Patio and the back wall of the house.
cube("brick patio", (0,-17.8,.02), (24,4.5,.16), brick)
for i in range(13):
    cube("patio grout", (-11.4+i*1.9,-17.8,.103), (.025,4.4,.01), brick_light)
cube("house lower wall", (0,-21.3,3.6), (26,2.5,7.2), stucco)
cube("house upper story", (-2,-22.1,9.4), (20,5.2,4.5), stucco)
cube("house roof eave", (0,-20.75,7.55), (28,4.8,.38), roof)
cube("upper roof", (-2,-22.1,11.9), (22,7,.55), roof)
# Siding lines and trim.
for z in [i*.55 for i in range(1,13)]:
    cube("house siding", (0,-20.025,z), (25.8,.025,.026), trim)
for x in (-9,-6.4,6.4,9):
    cube("window pane", (x,-19.97,4.6), (1.8,.06,1.8), truck_glass)
    cube("window top trim", (x,-19.91,5.55), (2.1,.12,.14), trim)
    cube("window sill", (x,-19.91,3.65), (2.1,.18,.15), trim)
    cube("window mullion", (x,-19.89,4.6), (.08,.11,1.85), trim)
cube("back door", (0,-19.96,1.73), (2.05,.11,3.42), brown_dark)
cube("door window", (0,-19.87,2.45), (1.48,.035,1.12), truck_glass)
cube("cat flap frame", (0,-19.77,.61), (1.21,.17,1.06), trim, .06)
cube("cat flap", (0,-19.66,.59), (.93,.08,.84), brown_dark, .05)
uv("door knob", (.77,-19.81,1.55), (.08,.07,.08), gold)
# Open sky over the patio keeps the trailing game camera unobstructed.

# Wooden fence on three yard sides.
for side in (-1,1):
    x=side*19.7
    cube("side fence rails", (x,0,1.15), (.18,39,.16), wood)
    cube("side fence high rail", (x,0,2.25), (.18,39,.16), wood)
    for i in range(48):
        y=-18.8+i*.81
        cube("fence picket", (x,y,1.3), (.24,.67,2.6), wood if i%3 else wood_alt)
for i in range(49):
    x=-19.2+i*.8
    cube("back fence picket", (x,19.7,1.3), (.67,.24,2.6), wood if i%3 else wood_alt)
for z in (1.15,2.25):
    cube("back fence rail", (0,19.82,z), (39,.18,.16), wood)

# The large central tree, circular brick border, and low planted bed.
cyl("tree trunk", (0,2.5,2.7), .68, 5.4, brown, 14)
for a in range(12):
    t=2*math.pi*a/12
    x,y=3.3*math.cos(t),2.5+3.3*math.sin(t)
    c=cube("tree ring brick", (x,y,.19), (1.65,.49,.38), brick if a%2 else brick_light, .045)
    c.rotation_euler.z=t+math.pi/2
for a in range(17):
    t=2*math.pi*a/17
    r=random.uniform(.8,2.6)
    uv("tree bed fern", (r*math.cos(t),2.5+r*math.sin(t),.4),
        (.43,.43,.42), random.choice((leaf,leaf_light,leaf_dark)))
for a in range(7):
    t=2*math.pi*a/7
    end=(math.cos(t)*random.uniform(2.2,3.5), 2.5+math.sin(t)*random.uniform(2,3.2), random.uniform(6.5,8.5))
    rod("tree branch", (0,2.5,4.35), end, .17, brown, 9)
for i in range(17):
    t=2*math.pi*i/17
    r=random.uniform(1.2,3.4)
    uv("oak leafy crown", (r*math.cos(t),2.5+r*math.sin(t),random.uniform(7.0,9.1)),
       (random.uniform(1.2,2.1),random.uniform(1.2,2.1),random.uniform(.9,1.5)),
       random.choice((leaf,leaf_light,leaf_dark)), 12, 6)

# Leafy areas form visible cover and routes through open grass.
shrub_centers=[(-16,-15),(-15,-10),(-17,-3),(-15,9),(-13,16),
               (15,-14),(16,-7),(15,1),(16,11),(12,16),(-7,16),(5,15),
               (-8,-4),(-9,6),(10,5),(8,-9)]
for j,(sx,sy) in enumerate(shrub_centers):
    count=9 if j<12 else 6
    for k in range(count):
        x=sx+random.uniform(-1.4,1.4); y=sy+random.uniform(-1.3,1.3)
        z=random.uniform(.45,1.05)
        uv("tiger jungle shrub", (x,y,z),
           (random.uniform(.46,.88),random.uniform(.43,.8),random.uniform(.47,.94)),
           random.choice((leaf,leaf_light,leaf_dark)), 10, 6)
    for k in range(4):
        x=sx+random.uniform(-1.2,1.2); y=sy+random.uniform(-1.2,1.2)
        rod("wildflower stem", (x,y,.05), (x,y,.48), .02, leaf_dark, 5)
        uv("wildflower", (x,y,.5), (.09,.09,.07), flower, 8, 4)

# String lights from the house to the tree.
for sx in (-8,8):
    prev=(sx,-19.4,5.55)
    dest=(sx*.20,2.5,6.7)
    for i in range(1,13):
        t=i/12
        p=(prev[0]*(1-t)+dest[0]*t, prev[1]*(1-t)+dest[1]*t,
           prev[2]*(1-t)+dest[2]*t-1.0*math.sin(math.pi*t))
        if i==1: last=prev
        rod("string light cable", last,p,.009,brown_dark,5)
        if i%2==0:
            rod("bulb stem", p, (p[0],p[1],p[2]-.13), .022,black,6)
            uv("glowing bulb", (p[0],p[1],p[2]-.20), (.105,.105,.13),gold,8,5)
        last=p

# Garage and driveway to the right of the fenced garden.
cube("driveway", (25,-12,-.01), (15,21,.12), concrete)
cube("garage structure", (26,-3.9,3), (13,12,6), stucco)
cube("garage roof", (26,-3.9,6.4), (14,13,.72), roof)
cube("garage dark opening", (26,-10.0,2.72), (8.6,.11,4.9), brown_dark)
cube("sliding garage door", (30.5,-10.15,2.72), (1.55,.12,4.9), wood_alt)
for z in (.8,1.6,2.4,3.2,4.0):
    cube("garage door slat", (30.5,-10.25,z), (1.55,.05,.045), wood)
cube("garage door track", (26,-10.25,5.3), (10,.13,.16), silver)
for x in (21.45,30.55):
    cube("garage white jamb", (x,-10.22,2.75), (.2,.2,5.2), trim)

# An old dark pickup with canopy, simplified but recognizable.
cube("truck chassis", (25,-16.1,.78), (2.2,4.7,.66), truck_paint,.15)
cube("truck cab", (25,-15.25,1.53), (2.05,2.05,1.24), truck_paint,.19)
cube("truck canopy", (25,-17.53,1.43), (2.05,2.10,1.12), truck_paint,.12)
cube("truck windshield", (25,-14.19,1.67), (1.66,.05,.71), truck_glass)
cube("truck grille", (25,-13.69,.76), (1.65,.07,.48), silver)
for x in (23.82,26.18):
    for y in (-14.8,-17.7):
        cyl("truck tire", (x,y,.53), .43, .22, rubber,16,(0,math.pi/2,0))
        cyl("truck wheel hub", (x+(.13 if x>25 else -.13),y,.53), .19, .02,silver,16,(0,math.pi/2,0))
for x in (24.25,25.75):
    uv("truck headlamp", (x,-13.66,1.02), (.18,.04,.13), gold,10,5)
merge_by_material()
export("backyard")

# The three native Blender projects can be edited independently.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "models" / "backyard.blend"))

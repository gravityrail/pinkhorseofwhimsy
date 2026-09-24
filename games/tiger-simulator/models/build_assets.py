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


def coat_material():
    """Make a packed, UV mapped short-fur texture in Blender for glTF."""
    width, height = 768, 512
    image = bpy.data.images.new("Tiger fur and tabby markings", width=width, height=height)
    pixels = [0.0] * (width * height * 4)
    for y in range(height):
        v = y / (height - 1)
        for x in range(width):
            u = x / (width - 1)
            # Pale underside, warm ginger back, irregular painted tabby bands.
            white = max(0.0, min(1.0, (.33 - v) / .11))
            band = 0.0
            for n in range(7):
                center = .095 + n * .133 + .020 * math.sin(v * 15 + n * 1.8)
                dist = abs(u - center)
                dist = min(dist, 1 - dist)
                width_at_v = .020 + .010 * (1 - v)
                band = max(band, math.exp(-((dist / width_at_v) ** 2)))
            band *= max(0, min(1, (v - .34) / .20))
            band *= max(0, min(1, (.995 - v) / .055)) * .78
            # Tiny directional warm/cool fibers read as short fur close up.
            fiber = .016 * math.sin(u * 1540 + v * 220) * math.sin(v * 910 + u * 95)
            mottling = .020 * math.sin(u * 68 + v * 48) * math.sin(v * 117 - u * 41)
            grain = (((x * 73 + y * 151) % 37) / 37 - .5) * .018
            light = fiber + mottling + grain
            ginger = (.78 + light, .365 + light * .8, .105 + light * .35)
            dark = (.47, .21, .08)
            cream_fur = (.91 + light * .3, .84 + light * .3, .70 + light * .2)
            rgb = tuple((ginger[i] * (1 - band) + dark[i] * band) * (1 - white)
                        + cream_fur[i] * white for i in range(3))
            at = 4 * (y * width + x)
            pixels[at:at+4] = (*rgb, 1.0)
    image.pixels.foreach_set(pixels)
    image.pack()
    material = mat("Tiger painted short fur", (.8, .4, .15), roughness=.97)
    nodes = material.node_tree.nodes
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    material.node_tree.links.new(tex.outputs["Color"], nodes.get("Principled BSDF").inputs["Base Color"])
    return material


def tail_coat_material():
    """Packed fur grain and uneven tabby rings for the continuous tail mesh."""
    width, height = 256, 512
    image = bpy.data.images.new("Tiger tail ringed fur", width=width, height=height)
    pixels = [0.0] * (width * height * 4)
    for y in range(height):
        v = y / (height - 1)
        for x in range(width):
            u = x / (width - 1)
            ring = 0.0
            for center in (.17, .38, .60, .81, .96):
                edge = abs(v - center - .014 * math.sin(u * 17 + center * 29))
                ring = max(ring, math.exp(-((edge / .042) ** 4)))
            grain = .018 * math.sin(v * 1740 + u * 126) * math.sin(u * 640 + v * 72)
            ginger = (.76 + grain, .35 + grain * .75, .12 + grain * .4)
            russet = (.37 + grain, .15 + grain * .4, .065)
            rgb = tuple(ginger[i] * (1 - ring) + russet[i] * ring for i in range(3))
            at = 4 * (y * width + x)
            pixels[at:at+4] = (*rgb, 1.0)
    image.pixels.foreach_set(pixels)
    image.pack()
    material = mat("Tiger tail short fur and rings", (.75, .35, .12), roughness=.98)
    tex = material.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = image
    material.node_tree.links.new(tex.outputs["Color"],
        material.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
    return material


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
grass_blade = mat("Grass blades", (0.27, 0.43, 0.12), roughness=1)
brick = mat("Terracotta brick", (0.49, 0.24, 0.17))
brick_light = mat("Warm brick", (0.61, 0.35, 0.25))
stucco = mat("House siding cream", (0.70, 0.72, 0.58))
trim = mat("House white trim", (0.88, 0.85, 0.72))
roof = mat("Weathered roof", (0.39, 0.39, 0.36))
wood = mat("Fence weathered wood", (0.39, 0.31, 0.20))
wood_alt = mat("Fence light wood", (0.47, 0.37, 0.25))
concrete = mat("Drive concrete", (0.59, 0.56, 0.49))
interior_wood = mat("Warm indoor floor", (0.29, 0.20, 0.13))
interior_wall = mat("Quiet indoor plaster", (0.47, 0.47, 0.39))
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
coat = coat_material()
tail_coat = tail_coat_material()


def uv(name, loc, scale, material, segments=16, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    o.data.materials.append(material)
    if material == coat:
        # Project along the cat's spine and height. Sphere UV poles otherwise
        # pinch painted tabby stripes into a visible star on Tiger's back.
        layer = o.data.uv_layers.active or o.data.uv_layers.new(name="spine coat UV")
        for loop in o.data.loops:
            vertex = o.data.vertices[loop.vertex_index].co
            layer.data[loop.index].uv = ((vertex.y+1)*.5, (vertex.z+1)*.5)
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


def pivot(name, loc):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    bpy.context.view_layer.update()
    return obj


def parent_keep_world(obj, parent):
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world


def cat_ear(side):
    """Sculpted, outward facing ear rooted into the head's ginger coat."""
    cx = side * .29
    base_y, base_z = .59, 1.35
    outline = [(-.17,0),(.17,0),(.22,.19),(.185,.40),(.125,.46),(-.085,.33),(-.18,.17)]
    verts = []
    for face_sign in (-1,1):
        for dx,dz in outline:
            taper = dz/.46
            half_depth = .084*(1-taper)+.006
            verts.append((cx + side*dx,
                          base_y + .10*dz + face_sign*half_depth,
                          base_z+dz))
    faces = []
    n = len(outline)
    for k in range(1,n-1):
        faces.append((0,k+1,k))
        faces.append((n,n+k,n+k+1))
    for k in range(n):
        j = (k+1)%n
        faces.extend(((k,j,n+j),(k,n+j,n+k)))
    mesh = bpy.data.meshes.new("ear rounded shell")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(coat)
    coat_uv = mesh.uv_layers.new(name="ear fur UV")
    for loop in mesh.loops:
        vertex = mesh.vertices[loop.vertex_index].co
        coat_uv.data[loop.index].uv = (.027 + .012*(vertex.x-cx),
                                      .74 + .12*(vertex.z-base_z))
    for poly in mesh.polygons: poly.use_smooth = True
    obj = bpy.data.objects.new("sculpted ear",mesh)
    bpy.context.collection.objects.link(obj)
    # The inset is a cupped triangular patch rather than a miniature cone.
    inner = []
    for dx,dz in [(-.105,.09),(.105,.09),(.14,.19),(.115,.32),(.025,.34),(-.095,.18)]:
        taper = dz/.46
        half_depth = .084*(1-taper)+.006
        inner.append((cx+side*dx,base_y+.10*dz+half_depth+.008,base_z+dz))
    inner_mesh = bpy.data.meshes.new("ear pink inner")
    inner_mesh.from_pydata(inner, [], [(0,1,2,3),(0,3,4,5)])
    inner_mesh.materials.append(pink)
    inner_obj = bpy.data.objects.new("soft ear lining",inner_mesh)
    bpy.context.collection.objects.link(inner_obj)
    return obj,inner_obj


def continuous_tail(base):
    """One tapered tube, with UV fur rings and vertices available for live flexing."""
    rings, sides = 24, 14
    verts, faces, uvs = [], [], []
    for i in range(rings+1):
        s = i / rings
        center = Vector((.025*math.sin(s*math.pi), -1.37*s,
                         .08*s+.48*s*s))
        tangent = Vector((.025*math.pi*math.cos(s*math.pi), -1.37,
                          .08+.96*s)).normalized()
        side = tangent.cross(Vector((0,0,1))).normalized()
        up = side.cross(tangent).normalized()
        radius = (.115 + .026*math.sin(math.pi*s)) * min(1,(1-s)/.055)
        radius = max(radius,.006)
        for j in range(sides):
            angle = 2*math.pi*j/sides
            p = center + radius*(math.cos(angle)*side + math.sin(angle)*up)
            verts.append(tuple(p))
    for i in range(rings):
        for j in range(sides):
            nxt = (j+1)%sides
            faces.append((i*sides+j,i*sides+nxt,(i+1)*sides+nxt,(i+1)*sides+j))
            uvs.append(((j/sides,i/rings),(nxt/sides,i/rings),
                        (nxt/sides,(i+1)/rings),(j/sides,(i+1)/rings)))
    mesh = bpy.data.meshes.new("continuous tail with fur UV")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(tail_coat)
    uv_layer = mesh.uv_layers.new(name="tail coat UV")
    for poly, coords in zip(mesh.polygons,uvs):
        poly.use_smooth = True
        for loop_index, uv_coord in zip(poly.loop_indices,coords):
            uv_layer.data[loop_index].uv = uv_coord
    obj = bpy.data.objects.new("flexible_tail",mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = base
    obj.location = (0,0,0)
    return obj


surface_leaves = {"light": ([], []), "dark": ([], [])}


def scatter_surface_leaves(center, radii, count, size):
    """Tapered leaflets follow the rounded canopy instead of floating nearby."""
    origin = Vector(center)
    for _ in range(count):
        bearing=random.uniform(0,math.tau)
        elevation=random.uniform(.12,1.33)
        normal=Vector((math.cos(bearing)*math.cos(elevation),
                       math.sin(bearing)*math.cos(elevation),math.sin(elevation)))
        p=origin+Vector((normal.x*radii[0],normal.y*radii[1],normal.z*radii[2]))*.98
        tangent=Vector((-math.sin(bearing),math.cos(bearing),0))
        lateral=normal.cross(tangent).normalized()
        length=size*random.uniform(.7,1.25)
        width=length*random.uniform(.26,.38)
        verts,faces=surface_leaves["light" if random.random()<.6 else "dark"]
        at=len(verts)
        verts.extend((tuple(p-tangent*length*.48),
            tuple(p-lateral*width+normal*.025),
            tuple(p+lateral*width+normal*.025),
            tuple(p+tangent*length*.55+normal*.07)))
        faces.extend(((at,at+1,at+3),(at,at+3,at+2)))


def finish_surface_leaves():
    for kind,material in (("light",leaf_light),("dark",leaf_dark)):
        verts,faces=surface_leaves[kind]
        mesh=bpy.data.meshes.new("individual canopy leaves")
        mesh.from_pydata(verts,[],faces)
        mesh.materials.append(material)
        obj=bpy.data.objects.new("individual canopy leaves",mesh)
        bpy.context.collection.objects.link(obj)


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
uv("body", (0, 0, .76), (.53, .82, .49), coat, 32, 20)
uv("white chest", (0, .50, .68), (.40, .30, .37), cream)
head_pivot = pivot("head_pivot", (0,.68,1.18))
head_parts = [
    uv("head", (0, .73, 1.20), (.42, .40, .38), coat, 32, 20),
    uv("white muzzle left", (-.17, 1.03, 1.04), (.20, .16, .16), cream),
    uv("white muzzle right", (.17, 1.03, 1.04), (.20, .16, .16), cream),
    uv("nose", (0, 1.174, 1.115), (.10, .05, .07), pink),
]
for side in (-1, 1):
    head_parts.extend(cat_ear(side))
    head_parts.append(uv("eye", (side*.18, 1.062, 1.27), (.105, .045, .112), green_eye))
    head_parts.append(uv("pupil", (side*.18, 1.102, 1.27), (.036, .018, .078), black))
    for rear, position_name in ((-.48,"hind"), (.50,"front")):
        x = side*.37
        side_name = "left" if side < 0 else "right"
        shoulder = pivot(f"leg_{position_name}_{side_name}", (x,rear,.69))
        leg = uv(f"{position_name} {side_name} foreleg", (x, rear, .39),
                 (.17, .23, .34), coat, 20, 12)
        paw = uv(f"{position_name} {side_name} white paw", (x, rear+.10, .14),
                 (.19, .25, .12), cream, 20, 10)
        parent_keep_world(leg, shoulder)
        parent_keep_world(paw, shoulder)
    for k in range(3):
        head_parts.append(rod("whisker", (side*.11, 1.12, 1.02-k*.04),
            (side*(.52+k*.035), 1.11, 1.07-k*.09), .008, cream, 6))
for part in head_parts:
    parent_keep_world(part,head_pivot)
# Curved, banded tail is one textured mesh that can flex without cylinder seams.
tail_pivot = pivot("tail_pivot", (0,-.65,.98))
continuous_tail(tail_pivot)
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
cube("side yard beyond garage", (26,11,-.13), (14,18,.25), grass)
for i in range(110):
    x,y = random.uniform(-18.6,18.6), random.uniform(-14.2,17.8)
    if x*x+(y-2.0)**2 < 13 or abs(x)<4 and y<-10: continue
    uv("lawn color patch", (x,y,.015), (random.uniform(.3,.7),random.uniform(.3,.7),.018),
       random.choice((grass_light,grass)), 8, 4)

# Scattered tapered blades add a real grassy ground layer, with enough height
# for the browser wind shader to bend their tips as Tiger brushes through.
grass_vertices, grass_faces = [], []
for i in range(2050):
    if i < 1700:
        root_x,root_y = random.uniform(-18.8,18.8),random.uniform(-18.5,18.7)
    else:
        root_x,root_y = random.uniform(20.1,31.8),random.uniform(2.5,18.6)
    if root_y < -15.6 and abs(root_x) < 12.3: continue
    if root_x*root_x+(root_y-2.5)**2 < 11.7: continue
    for blade in range(random.randint(3,5)):
        x=root_x+random.uniform(-.11,.11)
        y=root_y+random.uniform(-.11,.11)
        height=random.uniform(.16,.39)
        width=random.uniform(.010,.025)
        angle=random.uniform(0,math.tau)
        dx,dy=math.cos(angle),math.sin(angle)
        lean=random.uniform(.03,.13)
        at=len(grass_vertices)
        grass_vertices.extend(((x-dx*width,y-dy*width,.012),
            (x+dx*width,y+dy*width,.012),
            (x-dx*width*.53+dy*lean*.5,y-dy*width*.53-dx*lean*.5,height*.57),
            (x+dx*width*.53+dy*lean*.5,y+dy*width*.53-dx*lean*.5,height*.57),
            (x+dy*lean,y-dx*lean,height)))
        grass_faces.extend(((at,at+1,at+3),(at,at+3,at+2),(at+2,at+3,at+4)))
grass_mesh = bpy.data.meshes.new("scattered tapered grass")
grass_mesh.from_pydata(grass_vertices,[],grass_faces)
grass_mesh.materials.append(grass_blade)
grass_obj = bpy.data.objects.new("scattered grass blades",grass_mesh)
bpy.context.collection.objects.link(grass_obj)

# Patio and the back wall of the house.
cube("brick patio", (0,-17.8,.02), (24,4.5,.16), brick)
for i in range(13):
    cube("patio grout", (-11.4+i*1.9,-17.8,.103), (.025,4.4,.01), brick_light)
# A true opening runs all the way through the wall so Tiger and the camera
# can leave the house at their real size.
for side in (-1,1):
    cube("house lower wall", (side*7.125,-21.3,3.6), (11.75,2.5,7.2), stucco)
cube("doorway header", (0,-21.3,5.32), (2.5,2.5,3.76), stucco)
cube("indoor floor", (0,-26.1,-.10), (25.5,12.0,.20), interior_wood)
cube("indoor ceiling", (0,-26.1,6.8), (25.5,12.0,.25), interior_wall)
for side in (-1,1):
    cube("indoor side wall", (side*12.85,-26.1,3.4), (.22,12,6.8), interior_wall)
cube("indoor back wall", (0,-32.0,3.4), (25.5,.2,6.8), interior_wall)
for i in range(11):
    cube("indoor floorboard seam", (0,-31.4+i*1.1,.012), (24.8,.018,.015), brown_dark)
cube("entry runner rug", (0,-25.0,.018), (2.7,6.0,.025), brown_dark)
cube("house upper story", (-2,-22.1,9.4), (20,5.2,4.5), stucco)
cube("house roof eave", (0,-20.75,7.55), (28,4.8,.38), roof)
cube("upper roof", (-2,-22.1,11.9), (22,7,.55), roof)
# Siding lines and trim.
for z in [i*.55 for i in range(1,13)]:
    for side in (-1,1):
        cube("house siding", (side*7.15,-20.025,z), (11.6,.025,.026), trim)
    if z > 3.5:
        cube("house siding over door", (0,-20.025,z), (2.5,.025,.026), trim)
for x in (-9,-6.4,6.4,9):
    cube("window pane", (x,-19.97,4.6), (1.8,.06,1.8), truck_glass)
    cube("window top trim", (x,-19.91,5.55), (2.1,.12,.14), trim)
    cube("window sill", (x,-19.91,3.65), (2.1,.18,.15), trim)
    cube("window mullion", (x,-19.89,4.6), (.08,.11,1.85), trim)
for side in (-1,1):
    cube("back door side panel", (side*1.0,-19.95,1.72), (.50,.13,3.44), brown_dark)
    cube("flap frame side", (side*.82,-19.75,.92), (.14,.17,1.84), trim, .04)
cube("back door upper panel", (0,-19.95,2.74), (1.54,.13,1.40), brown_dark)
cube("door window", (0,-19.86,2.83), (1.21,.035,.72), truck_glass)
cube("door top trim", (0,-19.78,3.48), (2.47,.20,.17), trim)
cube("flap frame top", (0,-19.75,1.84), (1.78,.18,.13), trim, .04)
cube("flap threshold", (0,-19.75,.045), (1.78,.23,.09), trim, .025)
uv("door knob", (1.03,-19.81,2.02), (.07,.07,.07), gold)
# Open sky over the patio keeps the trailing game camera unobstructed.

# The driveway is open to the yard. Its outer fence runs past the far wall of
# the garage, rather than dividing Tiger from the truck.
for x in (-19.7,33.2):
    cube("side fence rails", (x,0,1.15), (.18,39,.16), wood)
    cube("side fence high rail", (x,0,2.25), (.18,39,.16), wood)
    for i in range(48):
        y=-18.8+i*.81
        cube("fence picket", (x,y,1.3), (.24,.67,2.6), wood if i%3 else wood_alt)
for i in range(66):
    x=-19.2+i*.8
    cube("back fence picket", (x,19.7,1.3), (.67,.24,2.6), wood if i%3 else wood_alt)
for z in (1.15,2.25):
    cube("back fence rail", (6.8,19.82,z), (52.5,.18,.16), wood)

# The large central tree, circular brick border, and low planted bed.
cyl("tree trunk", (0,2.5,2.7), .68, 5.4, brown, 14)
for i in range(12):
    angle = math.tau*i/12
    x,y=.68*math.cos(angle),2.5+.68*math.sin(angle)
    rod("oak bark groove", (x,y,.65), (x*.9,2.5+(y-2.5)*.9,4.8), .026,
        brown_dark, 6)
for i in range(7):
    angle = math.tau*i/7
    rod("oak surface root", (0,2.5,.35),
        (1.45*math.cos(angle),2.5+1.45*math.sin(angle),.11), .12, brown, 8)
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
    center=(r*math.cos(t),2.5+r*math.sin(t),random.uniform(7.0,9.1))
    radii=(random.uniform(1.2,2.1),random.uniform(1.2,2.1),random.uniform(.9,1.5))
    uv("oak leafy crown", center, radii,
       random.choice((leaf,leaf_light,leaf_dark)), 12, 6)
    scatter_surface_leaves(center,radii,25,.42)

# Leafy areas form visible cover and routes through open grass.
shrub_centers=[(-16,-15),(-15,-10),(-17,-3),(-15,9),(-13,16),
               (15,-14),(16,-7),(15,1),(16,11),(12,16),(-7,16),(5,15),
               (-8,-4),(-9,6),(10,5),(8,-9)]
for j,(sx,sy) in enumerate(shrub_centers):
    count=9 if j<12 else 6
    for k in range(count):
        x=sx+random.uniform(-1.4,1.4); y=sy+random.uniform(-1.3,1.3)
        z=random.uniform(.45,1.05)
        radii=(random.uniform(.46,.88),random.uniform(.43,.8),random.uniform(.47,.94))
        uv("tiger jungle shrub", (x,y,z), radii,
           random.choice((leaf,leaf_light,leaf_dark)), 10, 6)
        scatter_surface_leaves((x,y,z),radii,10,.20)
    for k in range(4):
        x=sx+random.uniform(-1.2,1.2); y=sy+random.uniform(-1.2,1.2)
        rod("wildflower stem", (x,y,.05), (x,y,.48), .02, leaf_dark, 5)
        uv("wildflower", (x,y,.5), (.09,.09,.07), flower, 8, 4)

# Curved lance leaves grow from the shrub bases. Each has a raised center vein,
# tapered outline, and cup rather than an isolated rectangular plane.
for leaf_material in (leaf,leaf_light,leaf_dark):
    vertices, faces = [], []
    for sx,sy in shrub_centers:
        for i in range(5):
            angle = random.uniform(0,math.tau)
            x,y=sx+random.uniform(-.85,.85),sy+random.uniform(-.85,.85)
            height=random.uniform(.75,1.45)
            spread=random.uniform(.50,1.15)
            width=random.uniform(.16,.30)
            dx,dy=math.cos(angle),math.sin(angle)
            start=len(vertices)
            for k in range(6):
                t=k/5
                edge=width * math.sin(math.pi*t)**.78
                center_x=x+dx*spread*t
                center_y=y+dy*spread*t
                center_z=.10+height*(.18*t+.82*math.sin(t*math.pi*.68))
                vertices.extend(((center_x-dy*edge,center_y+dx*edge,center_z-.025),
                    (center_x,center_y,center_z+.035*math.sin(math.pi*t)),
                    (center_x+dy*edge,center_y-dx*edge,center_z-.025)))
            for k in range(5):
                a=start+k*3
                faces.extend(((a,a+1,a+4,a+3),(a+1,a+2,a+5,a+4)))
    mesh=bpy.data.meshes.new("cupped garden leaves")
    mesh.from_pydata(vertices,[],faces)
    mesh.materials.append(leaf_material)
    for poly in mesh.polygons: poly.use_smooth=True
    obj=bpy.data.objects.new("cupped garden leaves",mesh)
    bpy.context.collection.objects.link(obj)

finish_surface_leaves()

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

# The old pickup is over twice Tiger's length: a high cab and an open cargo tray.
cube("pickup ladder chassis", (25,-16.0,.84), (3.45,8.65,.45), truck_paint,.15)
cube("pickup cab", (25,-14.15,1.92), (3.25,2.90,2.17), truck_paint,.25)
cube("pickup cab roof", (25,-14.25,3.10), (3.40,3.05,.31), truck_paint,.17)
cube("pickup sloped hood", (25,-11.96,1.56), (3.22,1.83,1.22), truck_paint,.23)
cube("pickup windshield", (25,-12.68,2.26), (2.86,.055,1.18), truck_glass)
for side in (-1,1):
    cube("pickup side window", (25+side*1.65,-14.03,2.34), (.055,1.55,.84), truck_glass)
    cube("pickup door handle", (25+side*1.70,-14.5,1.58), (.09,.44,.08), silver)
cube("pickup tray floor", (25,-18.10,1.29), (3.45,4.25,.20), wood_alt,.04)
for side in (-1,1):
    cube("pickup tray wall", (25+side*1.64,-18.10,1.69), (.21,4.27,.78), truck_paint,.06)
cube("pickup tailgate", (25,-20.29,1.69), (3.45,.20,.78), truck_paint,.05)
cube("pickup bulkhead", (25,-15.96,1.66), (3.45,.18,.73), truck_paint,.05)
for x in (23.95,24.65,25.35,26.05):
    cube("pickup bed plank", (x,-18.11,1.405), (.035,3.98,.018), brown_dark)
cube("pickup grille", (25,-11.06,1.27), (2.52,.085,.55), silver)
cube("pickup front bumper", (25,-10.95,.69), (3.36,.18,.20), silver,.035)
cube("pickup rear bumper", (25,-20.43,.66), (3.36,.18,.20), silver,.035)
for x in (23.08,26.92):
    for y in (-12.55,-18.82):
        cyl("pickup tire", (x,y,.64), .63, .34, rubber,18,(0,math.pi/2,0))
        cyl("pickup wheel hub", (x+(.18 if x>25 else -.18),y,.64), .27, .025,silver,18,(0,math.pi/2,0))
for x in (23.94,26.06):
    uv("pickup headlamp", (x,-11.02,1.42), (.30,.055,.18), gold,12,7)
merge_by_material()
export("backyard")

# The three native Blender projects can be edited independently.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "models" / "backyard.blend"))

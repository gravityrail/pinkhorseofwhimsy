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


def pbr_mat(name, color, kind, roughness=.9):
    """Pack tileable albedo, roughness and tangent-space normal maps into glTF."""
    size = 128
    heights, colors, roughs = [], [], []
    for y in range(size):
        v = y / size
        for x in range(size):
            u = x / size
            broad = math.sin(math.tau * (u*3+v*2)) * math.sin(math.tau * (u*2-v*3))
            fine = math.sin(math.tau*u*17) * math.sin(math.tau*v*19)
            grain = math.sin(math.tau*(u*31+v*7)) * math.sin(math.tau*(v*27-u*5))
            if kind == 'wood':
                detail = .57*math.sin(math.tau*(u*16+.025*math.sin(v*math.tau*4))) + .23*fine + .2*broad
            elif kind == 'bark':
                detail = .58*math.sin(math.tau*(u*23+.03*math.sin(v*math.tau*6))) + .27*grain + .15*broad
            elif kind == 'leaf':
                vein = math.exp(-((u-.5)/.027)**2) + .37*math.exp(-((v-.52-abs(u-.5)*.66)/.038)**2)
                detail = .24*broad + .19*fine + .48*vein
            elif kind == 'grass':
                detail = .82*broad + .18*fine
            else:
                detail = .48*broad + .28*fine + .24*grain
            height = detail * (.68 if kind in ('bark','wood') else .42)
            heights.append(height)
            tint = max(.65, min(1.30, 1 + detail*(.10 if kind == 'grass' else .21 if kind != 'concrete' else .09)))
            colors.extend((*[max(0,min(1,c*tint)) for c in color],1))
            r = max(.35,min(1,roughness + detail*.085))
            roughs.extend((r,r,r,1))
    normals = []
    for y in range(size):
        for x in range(size):
            left=heights[y*size+(x-1)%size]
            right=heights[y*size+(x+1)%size]
            below=heights[((y-1)%size)*size+x]
            above=heights[((y+1)%size)*size+x]
            strength=.45 if kind == 'leaf' else .7
            nx=(left-right)*strength
            ny=(below-above)*strength
            n=Vector((nx,ny,1)).normalized()
            normals.extend(((n.x+1)*.5,(n.y+1)*.5,(n.z+1)*.5,1))
    m=mat(name,color,roughness)
    nodes=m.node_tree.nodes
    bsdf=nodes.get('Principled BSDF')
    for suffix,pixels,input_name in (('albedo',colors,'Base Color'),('roughness',roughs,'Roughness')):
        image=bpy.data.images.new(f'{name} {suffix}',width=size,height=size)
        image.pixels.foreach_set(pixels)
        image.pack()
        if suffix == 'roughness': image.colorspace_settings.name='Non-Color'
        texture=nodes.new('ShaderNodeTexImage'); texture.image=image
        texture.interpolation='Linear'; texture.extension='REPEAT'
        m.node_tree.links.new(texture.outputs['Color'],bsdf.inputs[input_name])
    image=bpy.data.images.new(f'{name} normal',width=size,height=size)
    image.pixels.foreach_set(normals); image.pack(); image.colorspace_settings.name='Non-Color'
    texture=nodes.new('ShaderNodeTexImage'); texture.image=image; texture.extension='REPEAT'
    normal_node=nodes.new('ShaderNodeNormalMap'); normal_node.inputs['Strength'].default_value=.42
    m.node_tree.links.new(texture.outputs['Color'],normal_node.inputs['Color'])
    m.node_tree.links.new(normal_node.outputs['Normal'],bsdf.inputs['Normal'])
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
brown = pbr_mat("Tree bark", (0.36, 0.24, 0.15), 'bark')
brown_dark = mat("Bark shadows", (0.21, 0.16, 0.1))
leaf = pbr_mat("Leaf green", (0.27, 0.49, 0.16), 'leaf')
leaf_light = pbr_mat("Sunlit leaf", (0.40, 0.59, 0.22), 'leaf')
leaf_dark = pbr_mat("Deep leaf", (0.17, 0.33, 0.13), 'leaf')
autumn_gold = pbr_mat("Autumn gold leaf", (0.78, 0.56, 0.16), 'leaf')
autumn_orange = pbr_mat("Autumn orange leaf", (0.77, 0.31, 0.10), 'leaf')
autumn_red = pbr_mat("Autumn red leaf", (0.54, 0.17, 0.11), 'leaf')
grass = pbr_mat("Lawn", (0.24, 0.44, 0.14), 'grass')
grass_light = pbr_mat("Grass patch", (0.36, 0.54, 0.20), 'grass')
grass_blade = pbr_mat("Grass blades", (0.27, 0.43, 0.12), 'grass', roughness=1)
brick = pbr_mat("Terracotta brick", (0.49, 0.24, 0.17), 'stone')
brick_light = mat("Warm brick", (0.61, 0.35, 0.25))
stucco = mat("House siding cream", (0.70, 0.72, 0.58))
trim = mat("House white trim", (0.88, 0.85, 0.72))
roof = mat("Weathered roof", (0.39, 0.39, 0.36))
wood = pbr_mat("Fence weathered wood", (0.39, 0.31, 0.20), 'wood')
wood_alt = pbr_mat("Fence light wood", (0.47, 0.37, 0.25), 'wood')
concrete = pbr_mat("Drive concrete", (0.59, 0.56, 0.49), 'concrete')
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
flower_gold = mat("Marigold petals", (0.96, 0.64, 0.12))
flower_violet = mat("Violet petals", (0.63, 0.38, 0.77))
flower_coral = mat("Coral petals", (0.93, 0.34, 0.27))
flower_foliage = pbr_mat("Flower foliage, still with blooms", (0.20, 0.38, 0.15), 'leaf')
soil = mat("Planter earth", (0.23, 0.17, 0.105))
patio_roof = pbr_mat("Patio canopy roof", (0.37, 0.36, 0.32), 'wood')
street = pbr_mat("Street asphalt", (0.18, 0.20, 0.19), 'concrete')
maroon = mat("Maroon front door", (0.32, 0.075, 0.11), .42)
rose_red = mat("Rose red petals", (0.75, 0.10, 0.18), .8)
rose_pink = mat("Rose pink petals", (0.92, 0.35, 0.47), .8)
neighbor_blue = mat("Neighbor blue siding", (0.42, 0.55, 0.61))
neighbor_yellow = mat("Neighbor yellow siding", (0.77, 0.67, 0.42))
neighbor_cream = mat("Neighbor cream siding", (0.71, 0.68, 0.58))
neighbor_brick = pbr_mat("Neighbor brick siding", (0.49, 0.30, 0.24), 'stone')
utility = mat("Utility poles and wires", (0.19, 0.17, 0.14))
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
    if material in (grass, brick, concrete, interior_wood):
        layer=o.data.uv_layers.active or o.data.uv_layers.new(name='ground tile UV')
        for loop in o.data.loops:
            vertex=o.data.vertices[loop.vertex_index].co
            layer.data[loop.index].uv=((vertex.x+loc[0])/2.6,(vertex.y+loc[1])/2.6)
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
    for index,yi in enumerate((-.20,.04,.29)):
        leg_root=pivot(f"ant_leg_{'left' if side<0 else 'right'}_{index}",
            (side*.14,yi,.26))
        upper=rod("upper leg", (side*.14,yi,.26), (side*.38,yi-.05,.20), .035, ant_dark)
        lower=rod("lower leg", (side*.38,yi-.05,.20), (side*.50,yi-.13,.04), .028, ant_dark)
        parent_keep_world(upper,leg_root)
        parent_keep_world(lower,leg_root)
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
for i in range(3100):
    if i < 1700:
        root_x,root_y = random.uniform(-18.8,18.8),random.uniform(-18.5,18.7)
    elif i < 2050:
        root_x,root_y = random.uniform(20.1,31.8),random.uniform(2.5,18.6)
    else:
        root_x,root_y = random.uniform(-18.7,18.7),random.uniform(-95.0,-64.2)
    if root_y > -64:
        if root_y < -15.6 and abs(root_x) < 12.3: continue
        if root_x*root_x+(root_y-2.5)**2 < 11.7: continue
    elif abs(root_x)<1.55 or (root_x+8)**2+(root_y+78)**2<30:
        continue
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
# The photographed patio has an angled canopy. Three timber supports sit on
# concrete plinths; the center walkway from the cat flap stays clear.
PATIO_CORNER_X=11.4
PATIO_FRONT_Y=-14.88
PATIO_FRONT_Z=5.27
awning=cube('angled patio canopy',(0,-17.5,6.16),(24.0,5.4,.19),patio_roof)
awning.rotation_euler.x=-math.atan2(1.82,5.4)
for x in (-10.3,-4.4,10.3):
    cube('patio post concrete block',(x,-14.95,.38),(.64,.64,.76),concrete,.05)
    cube('patio timber post',(x,-14.95,3.01),(.23,.23,4.58),wood,.035)
    rod('patio diagonal strut',(x,-14.95,4.56),(x,-16.18,5.9),.075,wood,8)
for x in (-PATIO_CORNER_X,PATIO_CORNER_X):
    rod('patio side fascia',(x,-20.13,7.05),(x,PATIO_FRONT_Y,PATIO_FRONT_Z),.11,wood,8)

def outdoor_bench(label,x,y,length,along_x=True):
    if along_x:
        cube(label+' seat',(x,y,.70),(length,.62,.17),wood_alt,.045)
        for dx in (-length*.42,length*.42):
            cube(label+' leg',(x+dx,y,.36),(.17,.48,.72),wood,.025)
        cube(label+' edge',(x,y-.31,.73),(length,.07,.09),wood,.025)
    else:
        cube(label+' seat',(x,y,.70),(.62,length,.17),wood_alt,.045)
        for dy in (-length*.42,length*.42):
            cube(label+' leg',(x,y+dy,.36),(.48,.17,.72),wood,.025)
        cube(label+' edge',(x-.31,y,.73),(.07,length,.09),wood,.025)

# Two seats make an L against the house; the third faces the flower planter.
outdoor_bench('wall bench',-7.25,-18.70,4.5)
outdoor_bench('return bench',-10.35,-17.15,2.5,False)
outdoor_bench('planter bench',6.10,-14.62,3.8)

def flower_plant(x,y,base,scale,petal):
    top=base+scale*random.uniform(.72,1.15)
    rod('flower stem',(x,y,base),(x,y,top),.012,flower_foliage,5)
    for sign in (-1,1):
        uv('flower leaves',(x+sign*scale*.17,y,base+scale*.38),
           (scale*.21,scale*.10,scale*.055),flower_foliage,10,6)
    uv('flower center',(x,y,top),(.055,.055,.052),flower_gold,8,5)
    for petal_index in range(5):
        angle=math.tau*petal_index/5
        uv('flower petal',(x+.09*math.cos(angle),y+.09*math.sin(angle),top),
           (.087,.087,.055),petal,8,5)

# Six by two foot raised timber planter, with several types of flowering plant.
px,py=6.0,-16.05
cube('planter soil',(px,py,.59),(3.68,1.22,.12),soil)
for side in (-1,1):
    cube('planter long plank',(px,py+side*.66,.36),(3.88,.13,.72),wood_alt,.025)
    cube('planter end plank',(px+side*1.91,py,.36),(.13,1.32,.72),wood,.025)
for i in range(23):
    x=px+random.uniform(-1.66,1.66)
    y=py+random.uniform(-.48,.48)
    flower_plant(x,y,.67,random.uniform(.38,.68),
                 (flower,flower_gold,flower_violet,flower_coral)[i%4])

# Terracotta pots add smaller patches of color to the patio itself.
for i,(x,y) in enumerate(((-11.3,-18.35),(-2.6,-18.4),(2.5,-18.6),
                          (11.1,-18.4),(-11.2,-16.0))):
    cyl('flower pot',(x,y,.27),.31,.54,brick,12)
    cyl('pot rim',(x,y,.52),.36,.10,brick_light,12)
    cyl('potted soil',(x,y,.57),.28,.025,soil,12)
    for n in range(5):
        angle=math.tau*n/5
        flower_plant(x+.18*math.cos(angle),y+.18*math.sin(angle),.59,
            random.uniform(.34,.52),(flower,flower_violet,flower_coral)[(i+n)%3])
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
# Return the perimeter to the house. The driveway remains open to the yard
# along its inner edge; the right return closes the far end behind the truck.
for x0,x1,y in ((-19.7,-13.05,-19.68),(13.05,33.2,-21.05)):
    for z in (1.15,2.25):
        cube('house-side fence return rail',((x0+x1)/2,y,z),(x1-x0,.18,.16),wood)
    count=math.ceil((x1-x0)/.77)
    for i in range(count+1):
        x=x0+(x1-x0)*i/count
        cube('house-side fence return picket',(x,y,1.3),(.60,.24,2.6),
             wood if i%3 else wood_alt)

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

# Leafy areas form visible cover and routes through open grass. Every hedge has
# a single rounded crown, a common woody root, and ordered leaf sprays.
shrub_centers=[(-16,-15),(-15,-10),(-17,-3),(-15,9),(-13,16),
               (15,-14),(16,-7),(15,1),(16,11),(12,16),(-7,16),(5,15),
               (-8,-4),(-9,6),(10,5),(8,-9)]
for j,(sx,sy) in enumerate(shrub_centers):
    # A grounded, softly irregular oval canopy reads as a hedge at game-camera
    # distance. Avoid alpha cards and exposed radial sticks entirely.
    spread=1.48 if j<12 else 1.22
    height=1.52 if j<12 else 1.27
    rod('shrub stem',(sx,sy,.05),(sx,sy,.59),.11,brown,8)
    canopy=uv('textured garden shrub',(sx,sy,height*.68),
        (spread,spread*.83,height*.67),leaf if j%3 else leaf_light,28,18)
    for vertex in canopy.data.vertices:
        angle=math.atan2(vertex.co.y,vertex.co.x)
        outline=1+.025*math.sin(angle*7+j)+.018*math.sin(angle*11-j*2)
        vertex.co.x*=outline
        vertex.co.y*=outline
    for k in range(2):
        angle=math.tau*k/2+j
        x,y=sx+(spread+.25)*math.cos(angle),sy+(spread+.25)*math.sin(angle)
        rod('wildflower stem',(x,y,.04),(x,y,.37),.012,flower_foliage,5)
        uv('wildflower',(x,y,.39),(.052,.052,.05),flower,8,4)

finish_surface_leaves()

# String lights tie directly to the yard-facing corners of the patio roof.
for side in (-1,1):
    sx=side*PATIO_CORNER_X
    anchor=(sx,PATIO_FRONT_Y,PATIO_FRONT_Z)
    uv('string light roof eyelet',anchor,(.07,.07,.07),silver,10,6)
    dest=(side*2.28,2.5,6.7)
    last=anchor
    for i in range(1,13):
        t=i/12
        p=(anchor[0]*(1-t)+dest[0]*t, anchor[1]*(1-t)+dest[1]*t,
           anchor[2]*(1-t)+dest[2]*t-1.0*math.sin(math.pi*t))
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

# A second playable space continues beyond the fence behind the pickup. The
# house is deep enough to form a real side passage rather than a shallow facade.
cube('continuous neighborhood terrain',(0,-72,-.34),(340,154,.35),grass)
cube('front half driveway',(25,-59.5,-.012),(15,77,.12),concrete)
cube('long house east wall',(13.03,-39.4,3.6),(.32,36.8,7.2),stucco)
cube('long house west wall',(-13.03,-39.4,3.6),(.32,36.8,7.2),stucco)
cube('long house upper story',(0,-41,9.38),(26,35,4.45),stucco)
cube('long house roof',(0,-40.3,11.82),(28,38,.50),roof)
cube('long house eave',(0,-40.3,7.35),(28,38,.32),roof)
for y in (-29,-35,-41,-47,-53):
    cube('side wall horizontal trim',(13.23,y,3.55),(.045,5.5,.045),trim)
cube('large driveway-side window',(13.24,-39.0,4.25),(.06,5.4,2.75),truck_glass)
for y in (-41.85,-36.15):
    cube('side window upright trim',(13.31,y,4.25),(.12,.16,3.06),trim)
for z in (2.78,5.73):
    cube('side window horizontal trim',(13.31,-39.0,z),(.12,5.92,.16),trim)
cube('side window mullion',(13.34,-39.0,4.25),(.08,.09,2.70),trim)
cube('side window middle rail',(13.34,-39.0,4.25),(.08,5.7,.08),trim)
# Front facade, maroon door, porch and steps open onto a full lawn.
cube('house front wall',(0,-58.07,3.6),(26,.34,7.2),stucco)
for side in (-1,1):
    x=side*7.7
    cube('front window pane',(x,-58.29,4.0),(3.2,.07,2.65),truck_glass)
    for frame_x in (x-1.68,x+1.68):
        cube('front window vertical trim',(frame_x,-58.37,4.0),(.16,.15,2.95),trim)
    for frame_z in (2.57,5.43):
        cube('front window horizontal trim',(x,-58.37,frame_z),(3.52,.15,.16),trim)
    cube('front window mullion',(x,-58.39,4.0),(.085,.09,2.65),trim)
cube('maroon front door',(0,-58.32,1.76),(2.15,.14,3.52),maroon,.06)
for x in (-1.16,1.16):
    cube('front door jamb',(x,-58.4,1.84),(.16,.18,3.73),trim)
cube('front door lintel',(0,-58.4,3.62),(2.50,.2,.18),trim)
uv('front door brass knob',(.74,-58.45,1.8),(.09,.08,.09),gold,12,8)
cube('front porch',(0,-61.0,.22),(12.0,5.5,.44),brick)
cube('front porch steps',(0,-64.12,.13),(4.8,.90,.26),brick_light)
cube('front porch lower step',(0,-64.75,.07),(5.5,.80,.14),brick)
for x in (-5.5,5.5):
    cube('front porch column base',(x,-63.0,.35),(.65,.65,.70),concrete,.05)
    cube('front porch post',(x,-63.0,2.35),(.29,.29,3.7),trim,.035)
cube('front porch canopy',(0,-61.2,4.38),(13.0,6.1,.32),roof)
cube('front path',(0,-79.3,.008),(2.7,29.6,.08),concrete)
cube('front lawn',(0,-79.0,-.13),(40,37.5,.25),grass)
for i in range(70):
    x,y=random.uniform(-18.5,18.5),random.uniform(-94,-66)
    if abs(x)<2 or (x+8)**2+(y+78)**2<32: continue
    uv('front lawn color patch',(x,y,.014),(.45,.48,.018),
       grass_light if i%3 else grass,8,4)

# A broad fall tree, with a rounded hemispherical crown and changing leaves.
tree_x,tree_y=-8,-79.0
cyl('front tree trunk',(tree_x,tree_y,2.80),.72,5.6,brown,16)
for angle in (0,.8,1.7,2.5,3.5,4.4,5.4):
    rod('front tree branch',(tree_x,tree_y,4.2),
        (tree_x+3.5*math.cos(angle),tree_y+3.0*math.sin(angle),6.8),.18,brown,9)
front_crown=uv('hemispherical front tree crown',(tree_x,tree_y,7.3),
    (5.65,5.35,3.25),leaf,32,20)
for vertex in front_crown.data.vertices:
    vertex.co.z=max(vertex.co.z,-.34)
for i in range(38):
    phi=random.uniform(.12,math.pi*.82)
    theta=random.uniform(0,math.tau)
    x=tree_x+5.25*math.sin(phi)*math.cos(theta)
    y=tree_y+4.95*math.sin(phi)*math.sin(theta)
    z=7.3+2.8*math.cos(phi)
    color=(leaf_light,leaf,autumn_gold,autumn_orange,autumn_red)[
        random.choices(range(5),weights=(7,10,4,3,1))[0]]
    uv('front tree seasonal foliage',(x,y,max(z,6.32)),
       (random.uniform(.53,.93),random.uniform(.54,.89),random.uniform(.38,.72)),
       color,12,8)

# Rose hedges define the street-facing edge without closing the walk to the gate.
for i,x in enumerate((-17.0,-14.0,-11.0,-8.0,-5.0,5.0,8.0,11.0,14.0,17.0)):
    y=-93.7+(.26 if i%2 else 0)
    rod('rose shrub woody stem',(x,y,.05),(x,y,.75),.12,brown,8)
    uv('rose shrub leafy mound',(x,y,.88),(1.25,.80,.84),
       leaf_dark if i%3 else leaf,16,10)
    for j in range(9):
        theta=math.tau*j/9+i*.3
        px=x+.74*math.cos(theta)
        py=y+.46*math.sin(theta)
        pz=1.45+.20*random.random()
        uv('rose bloom',(px,py,pz),(.22,.20,.16),
           rose_red if (i+j)%3 else rose_pink,10,6)

# Pavement, moving-along-the-block road, and houses on both sides of it.
cube('near sidewalk',(0,-97.05,.03),(338,2.0,.12),concrete)
cube('residential street',(0,-103.1,-.035),(340,10.5,.11),street)
cube('opposite sidewalk',(0,-109.15,.03),(338,2.0,.12),concrete)
for x in range(-160,161,12):
    cube('street center dash',(x,-103.1,.026),(4.5,.12,.018),flower_gold)

def make_neighbor_house(x,center_y,faces_street,color,index):
    sign=-1 if faces_street=='south' else 1
    front_y=center_y+sign*8.05
    cube('neighbor house body',(x,center_y,3.3),(20.0,16.0,6.6),color)
    cube('neighbor pitched roof',(x,center_y,7.05),(22.0,18.1,.68),roof)
    cube('neighbor porch',(x,front_y+sign*1.7,.19),(8.2,3.5,.38),brick)
    cube('neighbor front door',(x,front_y+sign*.13,1.58),(1.7,.09,3.16),
         maroon if index%3 else wood_alt)
    for wx in (x-5.5,x+5.5):
        cube('neighbor front window',(wx,front_y+sign*.12,3.5),
             (2.35,.10,2.15),truck_glass)
        cube('neighbor window sill',(wx,front_y+sign*.20,2.35),
             (2.62,.22,.12),trim)
    street_edge=-95.8 if sign<0 else -110.4
    mid=(front_y+street_edge)/2
    cube('neighbor front walk',(x,mid,.018),(1.55,abs(street_edge-front_y),.06),concrete)
    if index%2==0:
        fence_y=-91.3 if sign<0 else -113.0
        for n in range(22):
            fx=x-10.4+n*.99
            if abs(fx-x)<1.65: continue
            cube('neighbor front fence picket',(fx,fence_y,.61),(.22,.18,1.22),trim)
        cube('neighbor front fence rail',(x,fence_y,.96),(21.0,.10,.10),wood_alt)

near_houses=(-144,-112,-80,-48,48,80,112,144)
far_houses=(-112,-80,-48,-16,16,48,80,112)
neighbor_colors=(neighbor_blue,neighbor_yellow,neighbor_cream,neighbor_brick)
for i,x in enumerate(near_houses):
    cube('neighbor near lawn',(x,-78.0,-.13),(30,38,.25),grass)
    make_neighbor_house(x,-43.0,'south',neighbor_colors[i%4],i)
for i,x in enumerate(far_houses):
    cube('neighbor opposite lawn',(x,-118.0,-.13),(30,18,.25),grass)
    make_neighbor_house(x,-135.0,'north',neighbor_colors[(i+2)%4],i+1)

for side_y in (-95.6,-110.5):
    for x in range(-144,145,36):
        cyl('power line pole',(x,side_y,4.85),.16,9.7,utility,10)
        rod('power line crossarm',(x-1.1,side_y,8.3),(x+1.1,side_y,8.3),
            .075,wood,8)
        for dx in (-.82,.82):
            uv('power line insulator',(x+dx,side_y,8.46),(.10,.10,.14),trim,8,5)
    for x in range(-144,144,36):
        for dx in (-.82,.82):
            rod('overhead power line',(x+dx,side_y,8.5),
                (x+36+dx,side_y,8.5),.018,utility,5)
merge_by_material()
export("backyard")
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "models" / "backyard.blend"))

# The driveway condenser is an independent animated glTF. Its low roof is
# reachable with Tiger's ordinary jump, while the closed service cover hides
# the mouth until it wakes. Keep named hinges separate from static yard meshes.
clear()
ac_steel = pbr_mat("AC brushed galvanized steel", (.52,.58,.59), 'concrete', .66)
ac_steel.node_tree.nodes.get("Principled BSDF").inputs["Metallic"].default_value=.38
ac_dark = mat("AC recessed grille", (.055,.073,.080), .76, .12)
ac_inner = mat("AC mouth interior", (.12,.025,.035), .88)
ac_tooth = mat("AC enamel teeth", (.91,.87,.72), .32)
ac_lamp = mat("AC sleeping indicator", (.34,.10,.055), .30,
    emission=(.16,.015,.005))
cube('AC cabinet',(0,0,.63),(2.94,2.50,.84),ac_steel,.11)
cube('AC side electronics box',(1.71,.12,.57),(.58,1.38,.72),ac_steel,.07)
for y in (-.39,-.18,.03,.24,.45):
    cube('AC side cooling slot',(2.025,y,.58),(.025,.085,.43),ac_dark)
cube('AC top fan recess',(0,0,1.062),(2.32,1.92,.026),ac_dark,.035)
for y in (-.76,-.51,-.26,-.01,.24,.49,.74):
    cube('AC top fan slat',(0,y,1.078),(2.24,.055,.035),silver,.012)
for x in (-1.18,1.18):
    cube('AC front corner trim',(x,-1.285,.60),(.065,.045,.69),silver,.02)
cube('AC mouth recess',(0,-1.284,.57),(2.30,.048,.49),ac_inner,.03)
cube('AC mouth lower lip',(0,-1.323,.295),(2.35,.075,.095),ac_steel,.025)
upper_teeth=pivot('ac_upper_teeth',(0,0,0))
lower_teeth=pivot('ac_lower_teeth',(0,0,0))
for i in range(9):
    x=(i-4)*.235
    upper=cone('upper fang',(x,-1.355,.71),.088,.20,ac_tooth,4)
    upper.rotation_euler.x=math.pi
    parent_keep_world(upper,upper_teeth)
    lower=cone('lower fang',(x+.11,-1.355,.39),.080,.19,ac_tooth,4)
    parent_keep_world(lower,lower_teeth)
cover=cube('ac_mouth_cover',(0,-1.397,.58),(2.43,.075,.56),ac_steel,.035)
for x in (-.69,.69):
    uv('ac_eye_lamp',(x,-1.312,.965),(.12,.035,.065),ac_lamp,12,8)
for side,x in (('left',-1.10),('right',1.10)):
    for end,y in (('front',-.87),('rear',.87)):
        hinge=pivot(f'ac_leg_{end}_{side}',(x,y,.23))
        shin=cube('AC marching foot stem',(x,y,.125),(.17,.19,.21),ac_steel,.03)
        shoe=cube('AC marching foot pad',(x,y-.055,.035),(.37,.42,.07),ac_dark,.025)
        parent_keep_world(shin,hinge)
        parent_keep_world(shoe,hinge)
export("air-conditioner")
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "models" / "air-conditioner.blend"))

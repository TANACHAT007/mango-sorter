"""Build the web 3D model of the machine from the CAD export.
   06_cad_export/<project>_assembly.step  →  public/model/machine.glb
The STEP is tessellated (cascadio / OpenCascade), flattened to world coordinates, merged by colour (few draw calls) and the
parts that move in the real machine are split off into named nodes whose origin is their pivot, so the web viewer can
animate them:  P1 / P2 / P3 (paddle arms, home pose, rotate about +Z)  ·  W (weigh cradle, rotate about +X).
Units in the GLB: metres, Z up (same axes as model.py / 1000).
Run after every delivery build:  python scripts/make_glb.py   (needs: pip install cascadio trimesh)"""
import json
import os
import sys

import numpy as np
import trimesh

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(os.path.dirname(HERE))
STEP = os.path.join(PROJ, '06_cad_export', 'mango-sorting-conveyor_assembly.step')
OUT = os.path.join(HERE, '..', 'public', 'model')
os.makedirs(OUT, exist_ok=True)

# ---- geometry facts copied from 02_design/model.py (mm) -------------------------------------------------------------
PADDLES = {'P1': (440, 415, +1, True), 'P2': (620, 625, -1, False), 'P3': (830, 415, +1, False)}   # pivot x, y, side, drawn deployed
ARM_DEG, ARM_L = 60, 230
ARM_Z = (753.5, 818.0)                 # paddle arm + hub + inserts live in this z band
W_PIVOT = (450.0, 798.0)               # weigh cradle tilt axis (along x): y, z
W_BOX = ((44.5, 141.0), (340.0, 472.0), (750.0, 835.0))     # x, y, z box of everything that tilts with the cradle

raw = os.path.join(OUT, '_raw.glb')
if '--reuse' not in sys.argv or not os.path.exists(raw):
    import cascadio
    rc = cascadio.step_to_glb(STEP, raw, tol_linear=0.35, tol_angular=0.5)
    assert rc == 0, 'STEP conversion failed'
scene = trimesh.load(raw)


def colour_of(m):
    try:
        c = m.visual.material.baseColorFactor
        if c is not None:
            c = np.array(c, dtype=float)
            return tuple(np.round(c / (255.0 if c.max() > 1.0 else 1.0), 3)[:4])
    except Exception:
        pass
    return (0.6, 0.6, 0.6, 1.0)


def in_box(b, box, mm=True):
    lo, hi = b[0] * 1000, b[1] * 1000
    return all(box[i][0] <= lo[i] and hi[i] <= box[i][1] for i in range(3))


groups = {}                                    # (node, colour) -> [meshes in that node's frame]
pivots = {'static': np.zeros(3)}
for k, (px, py, sg, dep) in PADDLES.items():
    pivots[k] = np.array([px, py, 0.0]) / 1000
pivots['W'] = np.array([0.0, W_PIVOT[0], W_PIVOT[1]]) / 1000
count = {k: 0 for k in pivots}
for node in scene.graph.nodes_geometry:
    T, gname = scene.graph[node]
    m = scene.geometry[gname].copy()
    m.apply_transform(T)
    col = colour_of(m)
    comp = node.split(':')[0]
    parts = [m]
    if comp in ('Paddle_Diverters', 'Weigh_Station'):
        try:
            m.merge_vertices(merge_tex=True, merge_norm=True)      # tessellation gives unshared vertices per face
            parts = list(m.split(only_watertight=False)) or [m]
        except Exception:
            parts = [m]
    for part in parts:
        b = part.bounds
        if '--debug' in sys.argv and comp == 'Paddle_Diverters':
            print(' ', len(parts), np.round(b * 1000).astype(int).tolist(), col)
        target = 'static'
        if comp == 'Paddle_Diverters' and ARM_Z[0] <= b[0][2] * 1000 and b[1][2] * 1000 <= ARM_Z[1]:
            c = part.centroid[:2] * 1000
            k = min(PADDLES, key=lambda q: np.hypot(c[0] - PADDLES[q][0], c[1] - PADDLES[q][1]))
            if np.hypot(c[0] - PADDLES[k][0], c[1] - PADDLES[k][1]) < ARM_L + 10:
                target = k
        elif (comp == 'Weigh_Station' or comp.startswith('HW_')) and in_box(b, W_BOX):
            target = 'W'
        if target != 'static':
            part = part.copy()
            if target in PADDLES and PADDLES[target][3]:               # drawn deployed in the CAD → bring it home
                a = -np.radians(ARM_DEG) * PADDLES[target][2]
                part.apply_transform(trimesh.transformations.rotation_matrix(a, [0, 0, 1], pivots[target]))
            part.apply_translation(-pivots[target])
        count[target] += 1
        groups.setdefault((target, col), []).append(part)

out = trimesh.Scene()
for (target, col), meshes in groups.items():
    m = trimesh.util.concatenate(meshes) if len(meshes) > 1 else meshes[0]
    m.merge_vertices(merge_tex=True, merge_norm=True)
    rough, metal = (0.45, 0.85) if abs(col[0] - col[1]) < 0.03 and abs(col[1] - col[2]) < 0.03 and 0.5 < col[0] < 0.97 else (0.75, 0.0)
    m.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(
        baseColorFactor=list(col), roughnessFactor=rough, metallicFactor=metal, alphaMode='BLEND' if col[3] < 0.99 else 'OPAQUE'))
    name = f'{target}_{len(out.geometry)}'
    M = np.eye(4)
    M[:3, 3] = pivots[target]
    if target not in out.graph.nodes:
        out.graph.update(frame_to=target, frame_from=out.graph.base_frame, matrix=M)
    out.add_geometry(m, node_name=name, geom_name=name, parent_node_name=target)
glb = os.path.join(OUT, 'machine.glb')
out.export(glb)
tris = sum(len(g.faces) for g in out.geometry.values())
meta = {'units': 'm', 'up': 'Z', 'bounds': np.round(out.bounds, 4).tolist(), 'triangles': int(tris),
        'paddles': {k: {'pivot': [v[0] / 1000, v[1] / 1000], 'side': v[2]} for k, v in PADDLES.items()},
        'arm_deg': ARM_DEG, 'weigh': {'pivot_y': W_PIVOT[0] / 1000, 'pivot_z': W_PIVOT[1] / 1000, 'present': count['W'] > 0},
        'moving_parts': {k: v for k, v in count.items() if k != 'static'}}
json.dump(meta, open(os.path.join(OUT, 'machine.json'), 'w'), indent=1)
print('machine.glb', round(os.path.getsize(glb) / 1e6, 2), 'MB', tris, 'triangles', len(out.geometry), 'meshes', 'moving', meta['moving_parts'])

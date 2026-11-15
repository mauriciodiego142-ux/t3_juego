import json, struct, os

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hex_to_rgba(h):
    r, g, b = (h >> 16) & 255, (h >> 8) & 255, h & 255
    return [srgb_to_linear(v / 255) for v in (r, g, b)] + [1.0]

FACES = [
    ((0, 0, 1),  [(-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]),
    ((0, 0, -1), [(1, -1, -1), (-1, -1, -1), (-1, 1, -1), (1, 1, -1)]),
    ((1, 0, 0),  [(1, -1, 1), (1, -1, -1), (1, 1, -1), (1, 1, 1)]),
    ((-1, 0, 0), [(-1, -1, -1), (-1, -1, 1), (-1, 1, 1), (-1, 1, -1)]),
    ((0, 1, 0),  [(-1, 1, 1), (1, 1, 1), (1, 1, -1), (-1, 1, -1)]),
    ((0, -1, 0), [(-1, -1, -1), (1, -1, -1), (1, -1, 1), (-1, -1, 1)]),
]

def build_glb(name, boxes, path):
    # boxes: (cx, cy, cz, sx, sy, sz, color_hex)
    groups = {}
    for cx, cy, cz, sx, sy, sz, color in boxes:
        g = groups.setdefault(color, {"pos": [], "nor": [], "idx": []})
        for normal, corners in FACES:
            base = len(g["pos"])
            for (ux, uy, uz) in corners:
                g["pos"].append((cx + ux * sx / 2, cy + uy * sy / 2, cz + uz * sz / 2))
                g["nor"].append(normal)
            g["idx"] += [base, base + 1, base + 2, base, base + 2, base + 3]

    binary = bytearray()
    buffer_views, accessors, primitives, materials = [], [], [], []

    def add_view(data, target):
        while len(binary) % 4:
            binary.append(0)
        start = len(binary)
        binary.extend(data)
        buffer_views.append({"buffer": 0, "byteOffset": start, "byteLength": len(data), "target": target})
        return len(buffer_views) - 1

    for color, g in groups.items():
        pos_bytes = b"".join(struct.pack("<3f", *p) for p in g["pos"])
        nor_bytes = b"".join(struct.pack("<3f", *n) for n in g["nor"])
        idx_bytes = b"".join(struct.pack("<H", i) for i in g["idx"])
        v_pos = add_view(pos_bytes, 34962)
        v_nor = add_view(nor_bytes, 34962)
        v_idx = add_view(idx_bytes, 34963)
        xs = [p[0] for p in g["pos"]]; ys = [p[1] for p in g["pos"]]; zs = [p[2] for p in g["pos"]]
        accessors.append({"bufferView": v_pos, "componentType": 5126, "count": len(g["pos"]), "type": "VEC3",
                          "min": [min(xs), min(ys), min(zs)], "max": [max(xs), max(ys), max(zs)]})
        a_pos = len(accessors) - 1
        accessors.append({"bufferView": v_nor, "componentType": 5126, "count": len(g["nor"]), "type": "VEC3"})
        a_nor = len(accessors) - 1
        accessors.append({"bufferView": v_idx, "componentType": 5123, "count": len(g["idx"]), "type": "SCALAR"})
        a_idx = len(accessors) - 1
        materials.append({"pbrMetallicRoughness": {"baseColorFactor": hex_to_rgba(color),
                                                   "metallicFactor": 0.1, "roughnessFactor": 0.85}})
        primitives.append({"attributes": {"POSITION": a_pos, "NORMAL": a_nor}, "indices": a_idx,
                           "material": len(materials) - 1})

    while len(binary) % 4:
        binary.append(0)

    gltf = {
        "asset": {"version": "2.0", "generator": "make_glb.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": name}],
        "meshes": [{"name": name, "primitives": primitives}],
        "materials": materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(binary)}],
    }
    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4:
        json_bytes += b" "
    total = 12 + 8 + len(json_bytes) + 8 + len(binary)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(json_bytes), 0x4E4F534A)); f.write(json_bytes)
        f.write(struct.pack("<II", len(binary), 0x004E4942)); f.write(bytes(binary))
    print(path, total, "bytes,", len(groups), "materiales")

# ---- Pistola: el cañón apunta hacia -Z (origen cerca de la empuñadura)
pistola = [
    (0, 0.06, -0.18, 0.07, 0.09, 0.42, 0x2d2f33),
    (0, 0.055, -0.42, 0.04, 0.05, 0.06, 0x111111),
    (0, -0.07, -0.02, 0.07, 0.20, 0.10, 0x4a3524),
    (0, -0.02, -0.10, 0.05, 0.03, 0.12, 0x2d2f33),
    (0, 0.115, -0.36, 0.015, 0.03, 0.015, 0xdddddd),
]

# ---- Rifle: el cañón apunta hacia -Z
rifle = [
    (0, 0.04, -0.35, 0.08, 0.12, 0.90, 0x3b3f44),
    (0, 0.055, -0.95, 0.04, 0.04, 0.40, 0x1a1a1a),
    (0, 0.0, 0.25, 0.08, 0.16, 0.35, 0x5a4632),
    (0, -0.12, -0.05, 0.07, 0.20, 0.09, 0x2d2f33),
    (0, -0.14, -0.30, 0.06, 0.22, 0.10, 0x23262a),
    (0, 0.03, -0.68, 0.09, 0.10, 0.35, 0x5a4632),
    (0, 0.115, -0.20, 0.03, 0.06, 0.20, 0x111111),
]

# ---- Zombi: mira hacia +Z, los pies están en y = 0
zombi = [
    (-0.17, 0.45, 0.00, 0.28, 0.90, 0.30, 0x3a4a63),   # pierna izq
    (0.17, 0.42, 0.02, 0.28, 0.84, 0.30, 0x3a4a63),    # pierna der
    (0.00, 1.20, 0.00, 0.70, 0.75, 0.38, 0x5c6b4a),    # torso (ropa rota)
    (0.10, 1.25, 0.20, 0.25, 0.20, 0.02, 0x7a1414),    # mancha de sangre
    (-0.45, 1.35, 0.40, 0.20, 0.20, 0.80, 0x7fa07a),   # brazo izq extendido
    (0.45, 1.35, 0.40, 0.20, 0.20, 0.80, 0x7fa07a),    # brazo der extendido
    (0.00, 1.82, 0.03, 0.38, 0.40, 0.40, 0x8fb38a),    # cabeza
    (-0.10, 1.86, 0.23, 0.08, 0.06, 0.02, 0xffee66),   # ojo izq
    (0.10, 1.86, 0.23, 0.08, 0.06, 0.02, 0xffee66),    # ojo der
    (0.00, 1.72, 0.23, 0.18, 0.05, 0.02, 0x2a0a0a),    # boca
    (0.00, 2.04, 0.00, 0.40, 0.08, 0.40, 0x2b2118),    # cabello
]

os.makedirs("models", exist_ok=True)
build_glb("pistola", pistola, "models/pistola.glb")
build_glb("rifle", rifle, "models/rifle.glb")
build_glb("zombie", zombi, "models/zombie.glb")

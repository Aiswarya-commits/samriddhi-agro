#!/usr/bin/env python3
"""
Split a transparent product photo (PNG cut-out) into separate layers for the 3D story.

  python tools/split-photo.py content/photo-cereals.json

The config names the photo, the output folder and simple shapes (circle / rect) that
pick out big parts like a bowl or a spoon. Everything else that is large becomes the
"main" layer (e.g. the wheat). Small loose bits (flakes, grains, seeds) are cut out one
by one so they can fly and tumble in 3D. Writes the layer PNGs + manifest.json.
Needs: pip install pillow numpy scipy scikit-image
"""
import json, sys, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.segmentation import watershed
from skimage.feature import peak_local_max

ROOT = pathlib.Path(__file__).resolve().parent.parent
cfg = json.loads((ROOT / sys.argv[1]).read_text())
src = Image.open(ROOT / cfg["image"]).convert("RGBA")
A = np.array(src)
H, W = A.shape[:2]
alpha = A[..., 3] > 30
out = ROOT / cfg["out"]; out.mkdir(parents=True, exist_ok=True)
for f in out.glob("*.png"): f.unlink()

yy, xx = np.mgrid[0:H, 0:W]
lab, n = ndimage.label(alpha, structure=np.ones((3, 3)))
sizes = ndimage.sum(alpha, lab, range(1, n + 1))
big = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= cfg.get("min_big", 20000)])
small = alpha & ~big

layers = []
claimed = np.zeros_like(alpha)
def save(name, mask, kind, z, extra=None):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0: return
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    img = A[y0:y1, x0:x1].copy(); img[..., 3] = np.where(mask[y0:y1, x0:x1], img[..., 3], 0)
    F = cfg.get("edge_feather", 28)   # soften hard cuts where the photo was cropped
    if F:
        fy, fx = np.mgrid[y0:y1, x0:x1]
        ramp = np.minimum.reduce([np.clip(fx / F, 0, 1) if x0 == 0 else np.ones_like(fx, float),
                                  np.clip((W - 1 - fx) / F, 0, 1) if x1 >= W else np.ones_like(fx, float),
                                  np.clip(fy / F, 0, 1) if y0 == 0 else np.ones_like(fy, float),
                                  np.clip((H - 1 - fy) / F, 0, 1) if y1 >= H else np.ones_like(fy, float)])
        img[..., 3] = (img[..., 3] * ramp).astype(np.uint8)
    Image.fromarray(img).save(out / f"{name}.png", optimize=True)
    d = {"src": f"{name}.png", "kind": kind, "z": z, "x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)}
    if extra: d.update(extra)
    layers.append(d)

for part in cfg.get("parts", []):
    if "circle" in part:
        cx, cy, r = part["circle"]; m = big & ((xx - cx) ** 2 + (yy - cy) ** 2 <= r * r)
    else:
        x0, y0, x1, y1 = part["rect"]; m = big & (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
    m &= ~claimed; claimed |= m
    save(part["name"], m, part.get("kind", "solid"), part.get("z", 0))
save(cfg.get("main_name", "main"), big & ~claimed, cfg.get("main_kind", "sway"), cfg.get("main_z", -0.15))

# loose pieces: split touching clumps into single pieces with a watershed
dist = ndimage.distance_transform_edt(small)
peaks = peak_local_max(dist, min_distance=cfg.get("piece_spacing", 5), labels=ndimage.label(small)[0], exclude_border=False)
markers = np.zeros_like(lab)
for i, (py, px) in enumerate(peaks): markers[py, px] = i + 1
pieces = watershed(-dist, markers, mask=small)
k = 0
for i in range(1, pieces.max() + 1):
    m = pieces == i
    if m.sum() < cfg.get("min_piece", 25): continue
    save(f"piece-{k:02d}", m, "piece", round(0.05 + (k % 5) * 0.03, 3)); k += 1

(out / "manifest.json").write_text(json.dumps({"w": W, "h": H, "layers": layers}, indent=1))
print(f"{len(layers)} layers ({k} loose pieces) → {out.relative_to(ROOT)}")
"""SafeDive Coach v0.4 backend study, stage 1: run a pose model over every labelled clip and cache EVERY detection
per sampled frame (all people, boxes, 17 keypoints with confidences). Stage 2 (analyze_cache.py) then tries
person-selection, smoothing, thresholds and gates offline without re-running the model.

Usage: python3 infer_cache.py <weights.pt> <imgsz> [sample_fps=8] [src_dir] [out_dir]
Writes <out_dir>/<model>@<imgsz>/<clip>.json
"""
import glob, json, os, sys, time
os.environ.setdefault("OMP_NUM_THREADS", "4")
import cv2
from ultralytics import YOLO

weights, imgsz = sys.argv[1], int(sys.argv[2])
sample_fps = float(sys.argv[3]) if len(sys.argv) > 3 else 8.0
src = sys.argv[4] if len(sys.argv) > 4 else "/Users/kanavarora/drowning-detector/data/clips_labeled"
out_root = sys.argv[5] if len(sys.argv) > 5 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")
tag = os.path.basename(weights).replace(".pt", "") + "@" + str(imgsz)
out = os.path.join(out_root, tag); os.makedirs(out, exist_ok=True)
model = YOLO(weights)
clips = sorted(glob.glob(os.path.join(src, "*.mp4")) + glob.glob(os.path.join(src, "*.MOV")) + glob.glob(os.path.join(src, "*.mov")))
print(f"{tag}: {len(clips)} clips -> {out}", flush=True)
t_all = time.time(); n_frames = 0
for path in clips:
    name = os.path.splitext(os.path.basename(path))[0]
    dst = os.path.join(out, name + ".json")
    if os.path.exists(dst): continue
    cap = cv2.VideoCapture(path); fps = cap.get(cv2.CAP_PROP_FPS) or 30; w = int(cap.get(3)); h = int(cap.get(4))
    step = max(1, round(fps / sample_fps)); frames = []; i = 0; t0 = time.time()
    while True:
        ok, fr = cap.read()
        if not ok: break
        if i % step == 0:
            res = model.predict(fr, imgsz=imgsz, conf=0.25, verbose=False)[0]
            people = []
            if res.keypoints is not None and res.boxes is not None and len(res.boxes):
                kps = res.keypoints.data.cpu().numpy()      # [n,17,3]
                boxes = res.boxes.xyxy.cpu().numpy(); confs = res.boxes.conf.cpu().numpy()
                for p in range(len(boxes)):
                    people.append({"score": float(confs[p]), "box": [round(float(v), 1) for v in boxes[p]],
                                   "kps": [[round(float(x), 1), round(float(y), 1), round(float(c), 3)] for x, y, c in kps[p]]})
            frames.append({"t": round(i / fps, 3), "people": people})
        i += 1
    cap.release(); n_frames += len(frames)
    json.dump({"clip": name, "w": w, "h": h, "fps": fps, "sample_fps": fps / step, "frames": frames}, open(dst, "w"))
    print(f"  {name}: {len(frames)} frames, {(time.time() - t0) / max(len(frames), 1) * 1000:.0f} ms/frame", flush=True)
print(f"DONE {tag}: {n_frames} frames in {time.time() - t_all:.0f} s", flush=True)

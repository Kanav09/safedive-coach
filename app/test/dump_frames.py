"""Dump raw RGB frames from the sample clips for test/run_clips_yolo.js.

Node has no video decoder, so this script does the decoding: it reads each clip in
samples/, samples it at 10 frames per second at the clip's own resolution (the same
thing the browser app feeds the model), and writes
    test/frames/<clip>.rgb    raw bytes, n frames of h*w*3 (R,G,B)
    test/frames/<clip>.json   {"n": frames, "h": height, "w": width, "fps": 10}
Run:  python3 test/dump_frames.py        (needs opencv-python: pip install opencv-python)
Options (environment): FPS=10  WIDTH=0 (0 = native; e.g. 480 to shrink)  FRAMES=frames (output folder)
The .rgb files are large (~100 MB per clip) and gitignored; regenerate them any time.
"""
import json, os, sys
try:
    import cv2
except ImportError:
    sys.exit("opencv-python is missing: pip install opencv-python")

HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLES = os.path.join(HERE, "..", "samples")
OUT = os.path.join(HERE, os.environ.get("FRAMES", "frames"))
FPS = int(os.environ.get("FPS", 10))
WIDTH = int(os.environ.get("WIDTH", 0))      # 0 keeps the clip's own size
MAX_SECONDS = 30
os.makedirs(OUT, exist_ok=True)

for clip in sorted(os.listdir(SAMPLES)):
    if not clip.lower().endswith((".mp4", ".mov")):
        continue
    name = os.path.splitext(clip)[0]
    cap = cv2.VideoCapture(os.path.join(SAMPLES, clip))
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30
    step = src_fps / FPS                      # source frames per sampled frame
    frames, next_pick, index = [], 0.0, 0
    while True:
        ok, bgr = cap.read()
        if not ok or len(frames) >= FPS * MAX_SECONDS:
            break
        if index >= next_pick:
            h, w = bgr.shape[:2]
            if WIDTH and w != WIDTH:
                h = round(h * WIDTH / w); w = WIDTH
                bgr = cv2.resize(bgr, (w, h), interpolation=cv2.INTER_AREA)
            frames.append(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).tobytes())
            next_pick += step
        index += 1
    cap.release()
    if not frames:
        print(f"{name}: could not read any frames, skipped"); continue
    with open(os.path.join(OUT, name + ".rgb"), "wb") as f:
        for fr in frames: f.write(fr)
    with open(os.path.join(OUT, name + ".json"), "w") as f:
        json.dump({"n": len(frames), "h": h, "w": w, "fps": FPS}, f)
    print(f"{name}: {len(frames)} frames at {w}x{h}")

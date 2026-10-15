"""SafeDive Coach 48-hour feasibility test.

Runs a pose model over the self-filmed pool clips and asks one question:
does the body angle signal we would score in the app actually separate
"flat body, swimming" from "body dropping / vertical" on real phone footage?

Outputs (all in this folder, under out/):
  frames.csv      one row per frame per clip: metrics + keypoint confidence
  clips.csv       one row per clip: medians, readable-frame fraction, verdict
  fig_timeseries.png   torso angle over time, one panel per class
  fig_summary.png      per-clip median angle by class + readable fraction
  overlays/<clip>_<n>.jpg   skeleton drawn on sample frames for eyeballing
"""
import csv, glob, math, os, sys, time
import numpy as np
import cv2

os.environ.setdefault("OMP_NUM_THREADS", "2")
from ultralytics import YOLO

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, os.environ.get("TT_OUT", "out"))
OVR = os.path.join(OUT, "overlays")
os.makedirs(OVR, exist_ok=True)
SRC = os.environ.get("TT_SRC", "/Users/kanavarora/drowning-detector/data/clips_labeled")
WEIGHTS = os.environ.get("TT_WEIGHTS", "/Users/kanavarora/drowning-detector/yolo11s-pose.pt")
KP_THR = float(os.environ.get("TT_KP_THR", "0.5"))          # a keypoint counts as seen above this confidence
IMGSZ = int(os.environ.get("TT_IMGSZ", "640"))

# COCO keypoint order
NOSE, LSH, RSH, LEL, REL, LWR, RWR, LHIP, RHIP, LKN, RKN, LANK, RANK = 0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
SKEL = [(5, 6), (5, 7), (7, 9), (6, 8), (8, 10), (5, 11), (6, 12), (11, 12), (11, 13), (13, 15), (12, 14), (14, 16), (0, 5), (0, 6)]

clips = []
EXT = os.environ.get("TT_EXT", "mp4")
for cls, pat in [("swim", f"normal_swimming_IMG_*.{EXT}"), ("tread", f"treading_water_IMG_*.{EXT}"), ("distress", f"distress_IMG_*.{EXT}")]:
    for f in sorted(glob.glob(os.path.join(SRC, pat))):
        clips.append((cls, f))
print(f"{len(clips)} clips", flush=True)

model = YOLO(WEIGHTS)

def mid(a, b):
    return (a + b) / 2.0

def frame_metrics(kp, kc):
    """kp: (17,2) pixels, kc: (17,) confidence. Returns dict or None if torso unreadable."""
    torso_ok = all(kc[i] >= KP_THR for i in (LSH, RSH, LHIP, RHIP))
    if not torso_ok:
        return None
    sh = mid(kp[LSH], kp[RSH]); hp = mid(kp[LHIP], kp[RHIP])
    v = hp - sh
    torso_len = float(np.hypot(*v))
    if torso_len < 4:
        return None
    # 0 deg = body flat (horizontal), 90 deg = body vertical in the image
    torso_angle = math.degrees(math.atan2(abs(v[1]), abs(v[0])))
    # hips below shoulders, in torso lengths (positive = hips lower on screen)
    hip_drop = float(v[1]) / torso_len
    head_lift = None
    if kc[NOSE] >= KP_THR:
        head_lift = float(sh[1] - kp[NOSE][1]) / torso_len   # positive = nose above shoulders
    wrist_y = None
    if kc[LWR] >= KP_THR or kc[RWR] >= KP_THR:
        ys = [kp[i][1] for i in (LWR, RWR) if kc[i] >= KP_THR]
        wrist_y = float(min(ys)) / torso_len                 # highest wrist, torso units
    return dict(torso_angle=torso_angle, hip_drop=hip_drop, head_lift=head_lift, wrist_y=wrist_y, torso_len=torso_len, sh_x=float(sh[0]), sh_y=float(sh[1]))

def stroke_rate(wrist_series, fps):
    """Dominant oscillation of wrist height, cycles per second, or None."""
    s = np.array([w for w in wrist_series if w is not None], dtype=float)
    if len(s) < fps * 1.5:
        return None
    s = s - s.mean()
    spec = np.abs(np.fft.rfft(s * np.hanning(len(s))))
    freqs = np.fft.rfftfreq(len(s), d=1.0 / fps)
    band = (freqs >= 0.3) & (freqs <= 3.0)
    if not band.any():
        return None
    return float(freqs[band][np.argmax(spec[band])])

frame_rows, clip_rows = [], []
t0 = time.time()
for ci, (cls, path) in enumerate(clips):
    name = os.path.splitext(os.path.basename(path))[0]
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    n_total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    angles, drops, lifts, wrists, confs = [], [], [], [], []
    n_person, n_readable, fi = 0, 0, 0
    sample_at = set(np.linspace(0, max(n_total - 1, 0), 4).astype(int).tolist())
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        res = model.predict(frame, imgsz=IMGSZ, conf=0.25, verbose=False, device="cpu")[0]
        m = None
        if res.keypoints is not None and len(res.boxes) > 0:
            # single-swimmer clips: take the most confident person
            j = int(np.argmax(res.boxes.conf.cpu().numpy()))
            kp = res.keypoints.xy[j].cpu().numpy(); kc = res.keypoints.conf[j].cpu().numpy()
            n_person += 1
            m = frame_metrics(kp, kc)
            if fi in sample_at:
                img = frame.copy()
                for a, b in SKEL:
                    if kc[a] >= KP_THR and kc[b] >= KP_THR:
                        cv2.line(img, tuple(kp[a].astype(int)), tuple(kp[b].astype(int)), (0, 255, 0), 2)
                for k in range(17):
                    if kc[k] >= KP_THR:
                        cv2.circle(img, tuple(kp[k].astype(int)), 3, (0, 0, 255), -1)
                label = f"{cls} angle={m['torso_angle']:.0f}" if m else f"{cls} torso unreadable"
                cv2.putText(img, label, (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                cv2.imwrite(os.path.join(OVR, f"{name}_{fi:04d}.jpg"), img)
        if m:
            n_readable += 1
            angles.append(m["torso_angle"]); drops.append(m["hip_drop"]); lifts.append(m["head_lift"]); wrists.append(m["wrist_y"])
        frame_rows.append(dict(clip=name, cls=cls, frame=fi, t=fi / fps, person=int(m is not None or n_person > 0),
                               torso_angle=m["torso_angle"] if m else "", hip_drop=m["hip_drop"] if m else "",
                               head_lift=m["head_lift"] if m and m["head_lift"] is not None else "",
                               wrist_y=m["wrist_y"] if m and m["wrist_y"] is not None else "",
                               sh_x=m["sh_x"] if m else "", sh_y=m["sh_y"] if m else "", torso_len=m["torso_len"] if m else ""))
        fi += 1
    cap.release()
    readable = n_readable / max(fi, 1)
    lifts_v = [x for x in lifts if x is not None]
    row = dict(clip=name, cls=cls, frames=fi, secs=round(fi / fps, 1), person_frac=round(n_person / max(fi, 1), 2),
               readable_frac=round(readable, 2),
               angle_median=round(float(np.median(angles)), 1) if angles else "",
               angle_p25=round(float(np.percentile(angles, 25)), 1) if angles else "",
               angle_p75=round(float(np.percentile(angles, 75)), 1) if angles else "",
               hip_drop_median=round(float(np.median(drops)), 2) if drops else "",
               head_lift_median=round(float(np.median(lifts_v)), 2) if lifts_v else "",
               stroke_hz=round(stroke_rate(wrists, fps), 2) if stroke_rate(wrists, fps) else "",
               gate="SCORABLE" if readable >= 0.5 else "REFUSE")
    clip_rows.append(row)
    print(f"[{ci+1}/{len(clips)}] {name}: {fi} frames, readable {readable:.0%}, median angle {row['angle_median']}, {time.time()-t0:.0f}s", flush=True)

with open(os.path.join(OUT, "frames.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(frame_rows[0].keys())); w.writeheader(); w.writerows(frame_rows)
with open(os.path.join(OUT, "clips.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(clip_rows[0].keys())); w.writeheader(); w.writerows(clip_rows)

# ---- plots ----
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
colors = {"swim": "#1f77b4", "tread": "#ff7f0e", "distress": "#d62728"}
fig, axes = plt.subplots(3, 1, figsize=(11, 9), sharex=True, sharey=True)
for ax, cls in zip(axes, ["swim", "tread", "distress"]):
    for name in sorted({r["clip"] for r in frame_rows if r["cls"] == cls}):
        pts = [(r["t"], r["torso_angle"]) for r in frame_rows if r["clip"] == name and r["torso_angle"] != ""]
        if pts:
            ax.plot(*zip(*pts), color=colors[cls], alpha=0.6, lw=1)
    ax.set_title(f"{cls}: torso angle over time, one line per clip (0 = flat, 90 = vertical)")
    ax.set_ylabel("degrees"); ax.set_ylim(0, 90); ax.grid(alpha=0.3)
axes[-1].set_xlabel("seconds")
fig.tight_layout(); fig.savefig(os.path.join(OUT, "fig_timeseries.png"), dpi=130)

fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4.5))
for i, cls in enumerate(["swim", "tread", "distress"]):
    rows = [r for r in clip_rows if r["cls"] == cls and r["angle_median"] != ""]
    y = [r["angle_median"] for r in rows]
    a1.scatter(np.random.normal(i, 0.06, len(y)), y, color=colors[cls], s=50, zorder=3)
    if y:
        a1.hlines(np.median(y), i - 0.25, i + 0.25, color="k", lw=2)
    rf = [r["readable_frac"] for r in clip_rows if r["cls"] == cls]
    a2.scatter(np.random.normal(i, 0.06, len(rf)), rf, color=colors[cls], s=50, zorder=3)
a1.set_xticks([0, 1, 2]); a1.set_xticklabels(["swim", "tread", "distress"]); a1.set_ylabel("per-clip median torso angle (deg)")
a1.set_title("Does the angle separate flat swimming from a dropped body?"); a1.set_ylim(0, 90); a1.grid(alpha=0.3)
a2.set_xticks([0, 1, 2]); a2.set_xticklabels(["swim", "tread", "distress"]); a2.set_ylabel("fraction of frames with readable torso")
a2.axhline(0.5, color="gray", ls="--"); a2.set_title("Confidence gate (dashed = refuse-to-score line)"); a2.set_ylim(0, 1.05); a2.grid(alpha=0.3)
fig.tight_layout(); fig.savefig(os.path.join(OUT, "fig_summary.png"), dpi=130)
print("DONE", flush=True)

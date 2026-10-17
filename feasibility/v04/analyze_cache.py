"""SafeDive Coach v0.4 backend study, stage 2: from cached detections, try the choices the app makes and score them.
Everything here is a faithful port of app/js/metrics.js and app/js/scoring.js (same thresholds, same gates), plus the
candidates under test: which person to follow, keypoint smoothing, and the keypoint confidence threshold.

Usage: python3 analyze_cache.py cache/<tag> [more tags...]   -> prints a summary table, writes results/<tag>.csv
"""
import csv, glob, json, math, os, sys, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__))
META = {}
for r in csv.DictReader(open("/Users/kanavarora/drowning-detector/data/clips_labeled/metadata.csv")):
    META[os.path.splitext(r["filename"])[0]] = r

NOSE, LSH, RSH, LWR, RWR, LHIP, RHIP = 0, 5, 6, 9, 10, 11, 12
T = {"minReadable": 0.30, "minScoredSeconds": 1.0, "great": 15, "ok": 30}

# ---- metrics.js port ----
def frame_metrics(kps, thr):
    seen = lambda i: kps[i][2] >= thr
    if not all(seen(i) for i in (LSH, RSH, LHIP, RHIP)): return None
    sh = ((kps[LSH][0] + kps[RSH][0]) / 2, (kps[LSH][1] + kps[RSH][1]) / 2)
    hp = ((kps[LHIP][0] + kps[RHIP][0]) / 2, (kps[LHIP][1] + kps[RHIP][1]) / 2)
    dx, dy = hp[0] - sh[0], hp[1] - sh[1]; L = math.hypot(dx, dy)
    if L < 4: return None
    m = {"angle": math.degrees(math.atan2(abs(dy), abs(dx))), "hipDrop": dy / L, "shX": sh[0], "shY": sh[1], "L": L, "headLift": None, "wristY": None}
    if seen(NOSE): m["headLift"] = (sh[1] - kps[NOSE][1]) / L
    ws = [kps[i][1] for i in (LWR, RWR) if seen(i)]
    if ws: m["wristY"] = min(ws) / L
    return m

def mark_moving(frames, fps, win=15, min_body_per_sec=0.35):
    out = [False] * len(frames)
    for i, f in enumerate(frames):
        if not f: continue
        j0 = next((j for j in range(i - 1, max(-1, i - win - 1), -1) if frames[j]), i)
        j1 = next((j for j in range(i + 1, min(len(frames), i + win + 1)) if frames[j]), i)
        if j0 == j1: continue
        a, b = frames[j0], frames[j1]
        dist = math.hypot(b["shX"] - a["shX"], b["shY"] - a["shY"]) / f["L"]
        out[i] = dist / ((j1 - j0) / fps) >= min_body_per_sec
    return out

def stroke_rate(series, fps):
    s = [v for v in series if v is not None]
    if len(s) < fps * 1.5: return None
    mean = sum(s) / len(s); x = [v - mean for v in s]; best, bp = None, -1
    f = 0.3
    while f <= 3.0 + 1e-9:
        re = sum(x[n] * math.cos(2 * math.pi * f * n / fps) for n in range(len(x))); im = -sum(x[n] * math.sin(2 * math.pi * f * n / fps) for n in range(len(x)))
        p = re * re + im * im
        if p > bp: bp, best = p, f
        f += 0.05
    return best

def median(a):
    a = [v for v in a if v is not None]
    return st.median(a) if a else None

UPRIGHT_MAX = 60   # candidate rule: a torso steeper than this is standing / treading / climbing, never a swimming posture
def clip_summary(per_frame, fps, upright_max=None):
    n = len(per_frame); readable = sum(1 for f in per_frame if f); moving = mark_moving(per_frame, fps)
    scored = [f for f, m in zip(per_frame, moving) if f and m and (upright_max is None or f["angle"] <= upright_max)]
    upright = sum(1 for f in per_frame if f and upright_max is not None and f["angle"] > upright_max)
    return {"frames": n, "readableFrac": readable / n if n else 0, "movingFrac": len(scored) / n if n else 0, "uprightFrac": upright / n if n else 0,
            "angle": median([f["angle"] for f in scored]), "headLift": median([f["headLift"] for f in scored]),
            "hz": stroke_rate([f["wristY"] for f in scored], fps), "scoredFrames": len(scored), "moving": moving}

# ---- scoring.js port (body line part only matters for the study; the gate is the whole of it) ----
def gate(s, fps):
    if s["readableFrac"] < T["minReadable"]: return "REFUSE_READ"
    if s["scoredFrames"] / fps < T["minScoredSeconds"]: return "REFUSE_UPRIGHT" if s.get("uprightFrac", 0) > 0.5 * s["readableFrac"] else "REFUSE_STILL"
    return "SCORED"

def body_points(a):
    if a <= T["great"]: return 50
    if a <= T["ok"]: return 50 - 25 * (a - T["great"]) / (T["ok"] - T["great"])
    return max(0, min(25, 25 - 25 * (a - T["ok"]) / 30))

# ---- candidates under test ----
def select(frames, strategy):
    """Which person is the swimmer in each frame. Returns list of kps or None."""
    out = []; prev = None
    for fr in frames:
        people = fr["people"]
        if not people: out.append(None); prev = None; continue
        if strategy == "conf": p = max(people, key=lambda q: q["score"])
        elif strategy == "largest": p = max(people, key=lambda q: (q["box"][2] - q["box"][0]) * (q["box"][3] - q["box"][1]))
        elif strategy == "track":
            p = None
            if prev is not None:
                cx, cy = (prev["box"][0] + prev["box"][2]) / 2, (prev["box"][1] + prev["box"][3]) / 2
                diag = math.hypot(prev["box"][2] - prev["box"][0], prev["box"][3] - prev["box"][1])
                near = [(math.hypot((q["box"][0] + q["box"][2]) / 2 - cx, (q["box"][1] + q["box"][3]) / 2 - cy), q) for q in people]
                d, q = min(near, key=lambda x: x[0])
                if d <= 1.0 * diag: p = q
            if p is None: p = max(people, key=lambda q: q["score"])
        out.append(p); prev = p
    return out

def smooth(kps_list, win):
    """Temporal median of each keypoint over a window of selected frames (only across consecutive detected frames)."""
    if win <= 1: return kps_list
    out = []
    for i, k in enumerate(kps_list):
        if k is None: out.append(None); continue
        neigh = [kps_list[j] for j in range(i - win // 2, i + win // 2 + 1) if 0 <= j < len(kps_list) and kps_list[j] is not None]
        sm = []
        for kp in range(17):
            xs = [n[kp][0] for n in neigh]; ys = [n[kp][1] for n in neigh]; cs = [n[kp][2] for n in neigh]
            sm.append([st.median(xs), st.median(ys), k[kp][2] if len(cs) == 1 else st.median(cs)])
        out.append(sm)
    return out

def analyze(tag, strategy="conf", thr=0.4, win=1, upright_max=None):
    rows = []
    for path in sorted(glob.glob(os.path.join(HERE, "cache", tag, "*.json"))):
        d = json.load(open(path)); fps = d["sample_fps"]; name = d["clip"]; meta = META.get(name, {})
        people = select(d["frames"], strategy)
        kps = smooth([p["kps"] if p else None for p in people], win)
        per = [frame_metrics(k, thr) if k else None for k in kps]
        s = clip_summary(per, fps, upright_max)
        angles = [f["angle"] for f in per if f]
        jitter = median([abs(angles[i] - angles[i - 1]) for i in range(1, len(angles))]) if len(angles) > 2 else None
        # how often the followed person jumps by more than half a torso between consecutive detected frames
        jumps = 0; pairs = 0
        for i in range(1, len(per)):
            if per[i] and per[i - 1]:
                pairs += 1
                if math.hypot(per[i]["shX"] - per[i - 1]["shX"], per[i]["shY"] - per[i - 1]["shY"]) > 1.5 * per[i]["L"]: jumps += 1
        rows.append({"clip": name, "cls": meta.get("class", "?"), "session": meta.get("session", "?"), "tag": tag, "strategy": strategy, "thr": thr, "win": win, "upright": upright_max or 0,
                     "frames": s["frames"], "readable": round(s["readableFrac"], 3), "moving": round(s["movingFrac"], 3), "angle": None if s["angle"] is None else round(s["angle"], 1),
                     "jitter": None if jitter is None else round(jitter, 1), "jumpFrac": round(jumps / pairs, 3) if pairs else None,
                     "headLift": None if s["headLift"] is None else round(s["headLift"], 2), "hz": None if s["hz"] is None else round(s["hz"], 2),
                     "gate": gate(s, fps), "bodyPts": None if s["angle"] is None else round(body_points(s["angle"]))})
    return rows

def summarize(rows):
    by = {}
    for r in rows: by.setdefault(r["cls"], []).append(r)
    out = []
    for cls, rs in sorted(by.items()):
        scored = [r for r in rs if r["gate"] == "SCORED"]
        flat = [r for r in scored if r["angle"] is not None and r["angle"] < 35]
        out.append(f"  {cls:16} n={len(rs):2}  readable med={median([r['readable'] for r in rs]):.2f}  scored={len(scored)}/{len(rs)}  "
                   f"angle med={median([r['angle'] for r in scored]) if scored else float('nan'):5.1f}  flat(<35)={len(flat)}  jitter med={median([r['jitter'] for r in rs]) or 0:4.1f}  jumps med={median([r['jumpFrac'] for r in rs]) or 0:.3f}")
    return "\n".join(out)

if __name__ == "__main__":
    tags = sys.argv[1:] or sorted(os.path.basename(p) for p in glob.glob(os.path.join(HERE, "cache", "*")))
    os.makedirs(os.path.join(HERE, "results"), exist_ok=True)
    for tag in tags:
        tag = os.path.basename(tag.rstrip("/"))
        allrows = []
        for strategy in ("conf", "largest", "track"):
            for thr in (0.3, 0.4, 0.5):
                for win in (1, 3):
                    rows = analyze(tag, strategy, thr, win); allrows += rows
                    print(f"== {tag}  follow={strategy}  thr={thr}  smooth={win}"); print(summarize(rows))
        with open(os.path.join(HERE, "results", tag + ".csv"), "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(allrows[0].keys())); w.writeheader(); w.writerows(allrows)

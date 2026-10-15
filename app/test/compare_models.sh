#!/bin/bash
# Export extra YOLO sizes, dump frames at native 540p, and compare readability per model in the JS pipeline.
set -e
cd "$(dirname "$0")/.."
export OMP_NUM_THREADS=2
python3 - <<'PY'
from ultralytics import YOLO
import shutil, os
for name, sz in [('yolo11n-pose', 960), ('yolo11s-pose', 640)]:
    out = f'models/yolo/{name}-{sz}.onnx'
    if os.path.exists(out): continue
    p = YOLO(f'/Users/kanavarora/drowning-detector/{name}.pt').export(format='onnx', imgsz=sz, simplify=True, opset=17, dynamic=False, half=False)
    shutil.move(p, out); print('exported', out)
PY
python3 - <<'PY'
import cv2, json, numpy as np, os
clips = ['normal_swimming_IMG_0388','normal_swimming_IMG_0384','normal_swimming_IMG_0380','distress_IMG_0377','treading_water_IMG_0392','normal_swimming_IMG_0389']
FPS=10; os.makedirs('test/frames_540', exist_ok=True)
for name in clips:
    cap=cv2.VideoCapture(f'samples/{name}.mp4'); fps=cap.get(5) or 30; step=fps/FPS; frames=[]; want=0.0; i=0
    while True:
        ok,f=cap.read()
        if not ok: break
        if i>=want: frames.append(cv2.cvtColor(f,cv2.COLOR_BGR2RGB)); want+=step
        i+=1
    arr=np.stack(frames); open(f'test/frames_540/{name}.rgb','wb').write(arr.tobytes())
    json.dump({'n':len(frames),'h':arr.shape[1],'w':arr.shape[2],'fps':FPS},open(f'test/frames_540/{name}.json','w')); print(name, arr.shape)
PY
for m in yolo11n-pose yolo11n-pose-960 yolo11s-pose-640; do
  echo "=== $m ==="; MODEL=$m FRAMES=frames_540 node test/run_clips_yolo.js 2>&1 | grep -E "^\{|Error"
done
echo ALLDONE

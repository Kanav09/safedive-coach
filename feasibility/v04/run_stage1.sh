#!/bin/sh
# stage 1 over the 87 labelled clips at 8 samples a second, five model configs, smallest first
D=/Users/kanavarora/drowning-detector
python3 infer_cache.py $D/yolo11n-pose.pt 640 8
python3 infer_cache.py $D/yolo11n-pose.pt 960 8
python3 infer_cache.py $D/yolo11s-pose.pt 640 8
python3 infer_cache.py $D/yolo11s-pose.pt 960 8
python3 infer_cache.py /Users/kanavarora/safedive-coach/feasibility/yolo11m-pose.pt 640 8
echo ALL_DONE

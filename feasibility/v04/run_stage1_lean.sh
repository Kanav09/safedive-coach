#!/bin/sh
# lean plan: only configurations a phone could run (the 960 px and small runs resume where they stopped), then the originals
D=/Users/kanavarora/drowning-detector
python3 infer_cache.py $D/yolo11n-pose.pt 960 8
python3 infer_cache.py $D/yolo11s-pose.pt 640 8
python3 infer_cache.py $D/yolo11n-pose.pt 640 8 "$PWD/originals" "$PWD/cache_fullres"
echo ALL_DONE_LEAN

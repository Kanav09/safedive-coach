#!/bin/sh
# after the 540p study: the 31 full-resolution phone originals (1080p HEVC), the resolution a parent actually films at
until grep -q ALL_DONE stage1.log; do sleep 15; done
D=/Users/kanavarora/drowning-detector
python3 infer_cache.py $D/yolo11n-pose.pt 640 8 "$PWD/originals" "$PWD/cache_fullres"
python3 infer_cache.py $D/yolo11n-pose.pt 960 8 "$PWD/originals" "$PWD/cache_fullres"
python3 infer_cache.py $D/yolo11s-pose.pt 640 8 "$PWD/originals" "$PWD/cache_fullres"
echo ALL_DONE_B

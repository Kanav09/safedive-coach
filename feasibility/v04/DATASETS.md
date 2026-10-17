# Public swimming and drowning datasets, surveyed for SafeDive Coach (2026-10-17)

Fourteen candidates checked on their real pages; nothing downloaded. "Rel" is relevance 1–5 to our need: side view,
above water, phone-like footage of real swimmers, ideally children or beginners, with keypoints or stroke/distress labels.

| # | Dataset | What it is | Labels | Access and license | Size | Rel |
|---|---|---|---|---|---|---|
| 1 | **SwimXYZ** (Fiche et al., ACM MIG 2023) https://g-fiche.github.io/research-pages/swimxyz/ · https://zenodo.org/records/8399376 | Synthetic SMPL avatars; 11,520 monocular videos, 3.4 M frames; four strokes; front, aerial and side views, the side set split above-water / water-level / underwater | 2D + 3D joints in COCO-17 (our skeleton), COCO-25, 48-joint; 240 motion sequences | CC BY 4.0, open Zenodo download | ~300 GB total; video zips 34–40 GB each; labels 6.7 GB | 4 |
| 2 | Augsburg swimmer pose dataset (Greif & Lienhart 2009) https://www.uni-augsburg.de/de/fakultaet/fai/informatik/prof/mmc/research/research_projects/swimmer_pose_estimation_dataset | Real video, 15 backstroke cycles, >1,200 frames | 14 hand-labelled joints | Email the author; licence unstated | small | 2 |
| 3 | Augsburg swimming-channel set (Einfalt, Zecha, Lienhart 2018) https://arxiv.org/abs/1802.00634 | 24 videos, 7,146 frames, 720×576, side camera behind glass, elite adults | 14 joints | Not released | – | 1 (data) / 5 (method) |
| 4 | **SwimTrack** (MediaEval 2022, Centrale Lyon) https://ceur-ws.org/Vol-3583/paper38.pdf · https://github.com/centralelyon/swimtrack | Elite race video from the stands, HD–4K | Boxes; stroke events (hand entry, head peak) = stroke-rate truth | On request by email; small public sample on Roboflow (99 + 139 images) | – | 3 |
| 5 | Woinoski & Bajić (SFU 2020/21) https://arxiv.org/abs/2001.04433 | 35 USA Swimming broadcast videos, ~3,000 frames | 24,566 boxes in six phase classes; stroke rate | Release not found in the repo | – | 2 |
| 6 | SwimID (NW A&F University) https://github.com/cv416/SwimID | Indoor-pool CCTV, 14 channels | Boxes, track ids, actions: struggling / floating / sinking | Signed agreement by email, academic only | not stated | 3 |
| 7 | Underwater Drowning Detection Dataset (Zayed University 2025) https://figshare.com/articles/dataset/Underwater_Drowning_Detection_Dataset/29497235 | 5,613 underwater images 640×640, consented participants | YOLO boxes: swimming / struggling / drowning, balanced | CC BY 4.0, open | 1.6 GB | 2 |
| 8 | Roboflow "drowning" (children in buggy) https://universe.roboflow.com/children-in-buggy/drowning-f84fg | 8,570 images, elevated overhead pool views | Boxes: drowning / swimming / **treading_water** | CC BY 4.0, free Roboflow account to export | – | 3 |
| 9 | Roboflow "drowning detection" (Pool safety) https://universe.roboflow.com/pool-safety/drowning-detection-otnme | 8,370 images, mostly underwater | 9 classes (head back, hand up, submerged…) | CC BY 4.0, account | – | 2 |
| 10 | Roboflow "swimmer pose" (Philips Workspace) https://universe.roboflow.com/philips-workspace-mrt3b/swimmer-pose-cldkj | 201 images, elevated above-water lap swimmers | Keypoints, skeleton undocumented | CC BY 4.0, account | small | 2–3 |
| 11 | Kaggle "Swimming and Drowning DataSet" https://www.kaggle.com/datasets/alanoudawaji/swimming-and-drowning-dataset | Roboflow re-export, 20 k files | Boxes | Kaggle login; CC BY 4.0 at source | 388 MB | 2 |
| 12 | **Kinetics-700** swimming classes (DeepMind) | 700+ ten-second YouTube clips per class: backstroke, breast stroke, butterfly, front crawl; amateur and pool footage, children included | Class label only | YouTube links (decay); CVDF mirror | 710 GB whole; per clip small | 3 |
| 13 | Sports Videos in the Wild (MSU 2015) https://cvlab.cse.msu.edu/svw-download.html | 4,100 Coach's Eye app videos, 30 sports | Sport label | Direct download, licence not shown | – | 2 |
| 14 | Swimm_400 (Jacquelin et al. 2021) https://github.com/njacquelin/swimmers_detection | ~400 images | Swimmer positions | Google Drive, no licence | small | 2 |

Not found or not released under these names: AquaPose, SPD swimmer pose (retracted paper), VSD, DrownDetect, any "learn to swim" or children's swimming dataset, any real swimming motion capture.

## Papers worth knowing
- Einfalt, Zecha, Lienhart (WACV 2018): stroke-conditioned pose + temporal smoothing lifts PCK@0.2 from 90.1 to 95.7; the far-side wrist and the waterline-hidden head and legs are the worst joints. https://arxiv.org/abs/1802.00634
- Zecha et al. (CVPRW 2019): kinematic rectification adds +0.8 to 4.8 PCK; splash, bubbles, self-occlusion and refraction are the aquatic error modes.
- Giulietti et al., SwimmerNET (Sensors 2023): side-on filming hides far-side limbs. https://pmc.ncbi.nlm.nih.gov/articles/PMC9966167/
- Coifman, Hakim, Weiss, Riemer (Sports Biomechanics 2026): single-camera models reach AP 91.5% and stroke/kick-rate error under 1%; errors coincide with bubbles. https://doi.org/10.1080/14763141.2026.2715647
- Tran et al. (DroNet 2024): MediaPipe on 4K aerial video, detection 95–100% in training but down to 56% in competition splash. https://arxiv.org/html/2503.12981v1
- ViTPose-L fine-tuned on SwimXYZ: side-above-water PCK@0.05 0.754 → 0.984, showing how much a COCO model gains from swimming data. https://huggingface.co/willalexm/vitpose-l-swimxyz

## What this means for the app
- Nobody has published a child, beginner, phone-side-view keypoint set. Our own clips are still the only such data, so the 87-clip study in this folder is the validation, and growing it is the real path to accuracy.
- The cheapest external checks, if we want them: the SwimXYZ side-above-water subset (synthetic, COCO-17) for a torso-angle unit test with known ground truth; a few dozen Kinetics-700 clips for messy real video; the Roboflow treading set for the float-or-tread classifier. Each needs a download or an account, so they are a decision for the owner.
- The literature's recipe for better keypoints on swimmers is temporal smoothing and following one swimmer, which is exactly what v0.4 adds to the pipeline (js/track.js).

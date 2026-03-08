# TRELLIS.2 on RunPod — Setup Guide

Generate 3D GLB models from images using TRELLIS.2 on a RunPod GPU pod.

**Cost**: ~$0.59/hr (RTX 4090 on-demand). A typical session generating 5-10 models costs < $1.

## Prerequisites

- RunPod account with credits ($5-10 is plenty)
- RunPod API key (Settings > API Keys in the RunPod console)
- API key saved in `<project-root>/.env` as `RUNPOD_API_KEY=rpa_...`
- Python 3 with `runpod` package installed: `pip3 install runpod`

## Quick Start (CLI Tool)

All pod management is done via `runpod-trellis.py`:

```bash
cd games/trellis

# 1. Start a pod (creates RTX 4090 pod, ~$0.59/hr)
python3 runpod-trellis.py start

# 2. Wait for the container to boot (~2-3 min for image pull)
python3 runpod-trellis.py status

# 3. Install TRELLIS.2 and start the API server (~15-20 min first time)
python3 runpod-trellis.py setup

# 4. Generate a 3D model from an image
python3 runpod-trellis.py generate --image statue.png --output statue.glb

# 5. Stop the pod when done (saves money, volume persists)
python3 runpod-trellis.py stop
```

### Commands

| Command    | Description |
|------------|-------------|
| `start`    | Create or resume the TRELLIS.2 pod |
| `setup`    | SSH into the pod, install TRELLIS.2, start API server |
| `status`   | Show pod status, GPU info, and whether the API is ready |
| `generate` | Send an image to the API and download the resulting GLB |
| `stop`     | Stop the pod (preserves volume for fast restart) |
| `destroy`  | Remove the pod entirely including its volume |

### Generate Options

```
--image PATH         Input image (required)
--output PATH        Output GLB file (default: model.glb)
--resolution N       512, 1024, or 1536 (default: 1024)
--faces N            Decimation target (default: 100000)
--texture-size N     Texture resolution (default: 2048)
--url URL            Override server URL
```

## Manual Setup (Web Terminal)

If you prefer to set up manually via the RunPod console:

1. Create a GPU pod:
   - **GPU**: RTX 4090 (24GB)
   - **Image**: `runpod/pytorch:1.0.3-cu1281-torch260-ubuntu2204`
   - **Container Disk**: 80GB
   - **Volume**: 50GB at `/runpod-volume`
   - **Expose HTTP Ports**: `8000`

2. Open a web terminal and paste:

```bash
cd /workspace && \
apt-get update && apt-get install -y libgl1-mesa-glx libglib2.0-0 libegl1-mesa && \
git clone -b main https://github.com/microsoft/TRELLIS.2.git --recursive && \
cd TRELLIS.2 && \
. ./setup.sh --basic --flash-attn --nvdiffrast --nvdiffrec --cumesh --o-voxel --flexgemm && \
pip install flask && \
python3 -c "from trellis2.pipelines import Trellis2ImageTo3DPipeline; Trellis2ImageTo3DPipeline.from_pretrained('microsoft/TRELLIS.2-4B')"
```

3. Upload `server.py` and start:

```bash
# Upload server.py to /workspace/ via scp or paste
cd /workspace/TRELLIS.2
python3 /workspace/server.py
```

4. The API is at `https://<pod-id>-8000.proxy.runpod.net`

## Alternative: HuggingFace Spaces (Free but Limited)

TRELLIS.2 has a free demo at https://huggingface.co/spaces/microsoft/TRELLIS.2

```bash
# Uses the free HuggingFace Spaces API
node generate-model.mjs --image statue.png --output statue.glb --backend huggingface
```

Limitations:
- Free GPU quota (~120s/day) — enough for 1-2 models at 512 resolution
- Queue times during peak hours
- No control over settings

## Tips

- **Resolution 512**: ~3s generation, good for quick previews
- **Resolution 1024**: ~17s, good balance of quality and speed
- **Resolution 1536**: ~60s, highest quality
- **Faces**: 50k-100k is good for game props, keeps GLB file size small
- **Texture size**: 2048 default, use 1024 for smaller files
- Best input images:
  - Single object on plain/transparent background
  - Well-lit, clear details
  - RGBA PNG with transparent background is ideal (the API auto-removes backgrounds too)
- After first setup, **stopping and restarting** the pod is fast since everything is on the volume

#!/bin/bash
#
# RunPod Pod Setup Script for TRELLIS.2
#
# Use this as the "Docker Command" or run it after SSH-ing into a RunPod pod.
#
# Recommended pod config:
#   GPU: RTX 4090 (24GB) or A100 (40/80GB)
#   Image: nvidia/cuda:12.4.0-devel-ubuntu22.04 (or runpod/pytorch:2.6.0-py3.11-cuda12.4.0-devel-ubuntu22.04)
#   Disk: 80GB container disk (for model weights + code)
#   Volume: optional (to persist weights across restarts)
#
# Total setup time: ~15-20 minutes (mostly downloading model weights)

set -e

echo "=== TRELLIS.2 RunPod Setup ==="

# System deps
apt-get update && apt-get install -y --no-install-recommends \
    git wget curl libgl1-mesa-glx libglib2.0-0 libegl1-mesa \
    && rm -rf /var/lib/apt/lists/*

# Check if already installed (for pod restarts with persistent volume)
if [ -d "/workspace/TRELLIS.2" ] && [ -f "/workspace/.trellis-ready" ]; then
    echo "TRELLIS.2 already installed, starting server..."
    cd /workspace/TRELLIS.2
    pip install flask 2>/dev/null
    python3 /workspace/server.py
    exit 0
fi

cd /workspace

# Install PyTorch if not present
python3 -c "import torch; print(f'PyTorch {torch.__version__} CUDA {torch.version.cuda}')" 2>/dev/null || \
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

# Clone TRELLIS.2
if [ ! -d "TRELLIS.2" ]; then
    echo "Cloning TRELLIS.2..."
    git clone -b main https://github.com/microsoft/TRELLIS.2.git --recursive
fi

cd TRELLIS.2

# Install deps
echo "Installing dependencies (this takes ~5 minutes)..."
. ./setup.sh --basic --flash-attn --nvdiffrast --nvdiffrec --cumesh --o-voxel --flexgemm

# Install Flask for API
pip install flask

# Download model weights (first run only, ~20GB)
echo "Downloading model weights..."
python3 -c "
from trellis2.pipelines import Trellis2ImageTo3DPipeline
pipe = Trellis2ImageTo3DPipeline.from_pretrained('microsoft/TRELLIS.2-4B')
print('Model downloaded successfully!')
"

touch /workspace/.trellis-ready
echo "=== Setup complete! ==="

# Copy server script if uploaded, otherwise create a minimal one
if [ ! -f "/workspace/server.py" ]; then
    echo "No server.py found. Upload it to /workspace/server.py"
    echo "Or run manually:"
    echo "  cd /workspace/TRELLIS.2 && python3 /workspace/server.py"
fi

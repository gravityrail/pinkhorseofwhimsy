FROM nvidia/cuda:12.4.0-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
ENV OPENCV_IO_ENABLE_OPENEXR=1

# System deps
RUN apt-get update && apt-get install -y \
    git wget curl python3 python3-pip python3-dev \
    libgl1-mesa-glx libglib2.0-0 libegl1-mesa \
    && rm -rf /var/lib/apt/lists/*

# Python basics
RUN pip3 install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cu124

# Clone TRELLIS.2
WORKDIR /app
RUN git clone -b main https://github.com/microsoft/TRELLIS.2.git --recursive
WORKDIR /app/TRELLIS.2

# Install TRELLIS.2 dependencies (without --new-env since we're in Docker)
RUN . ./setup.sh --basic --flash-attn --nvdiffrast --nvdiffrec --cumesh --o-voxel --flexgemm

# Install API server deps
RUN pip3 install --no-cache-dir flask

# Pre-download model weights (cached in image)
RUN python3 -c "from trellis2.pipelines import Trellis2ImageTo3DPipeline; Trellis2ImageTo3DPipeline.from_pretrained('microsoft/TRELLIS.2-4B')"

# Copy our API server
COPY server.py /app/server.py

EXPOSE 8000

CMD ["python3", "/app/server.py"]

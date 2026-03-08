#!/usr/bin/env python3
"""
Manage a TRELLIS.2 RunPod pod and generate 3D models from images.

Usage:
  # Start a pod (first time takes ~15-20 min for setup)
  python3 runpod-trellis.py start

  # Check pod status
  python3 runpod-trellis.py status

  # Generate a 3D model from an image
  python3 runpod-trellis.py generate --image statue.png --output statue.glb

  # Stop the pod (saves money)
  python3 runpod-trellis.py stop

Environment:
  RUNPOD_API_KEY  - Your RunPod API key
"""

import runpod
import os
import sys
import time
import json
import argparse
import subprocess

# ─── Config ──────────────────────────────────────────────────────────────

POD_NAME = "trellis2-server"
GPU_TYPE = "NVIDIA RTX 4090"  # 24GB, $0.34/hr
CONTAINER_IMAGE = "runpod/pytorch:0.7.0-cu1241-torch260-ubuntu2204"
CONTAINER_DISK_GB = 80  # needs space for model weights + code
VOLUME_GB = 50  # persistent storage
STATE_FILE = os.path.join(os.path.dirname(__file__), ".runpod-state.json")

# Script that runs inside the pod to set up TRELLIS.2 and start the server
SETUP_SCRIPT = r"""#!/bin/bash
set -e

# Use python3 -m pip to ensure we target the correct Python (some RunPod images
# have multiple Python versions; bare 'pip' may point to the wrong one)
PIP="python3 -m pip"

# Check if already set up
if [ -f "/workspace/.trellis-ready" ] && [ -d "/workspace/TRELLIS.2" ]; then
    echo "TRELLIS.2 already installed"
else
    echo "=== Setting up TRELLIS.2 ==="
    apt-get update && apt-get install -y --no-install-recommends libgl1-mesa-glx libglib2.0-0 libegl1-mesa libjpeg-dev

    cd /workspace
    if [ ! -d "TRELLIS.2" ]; then
        git clone -b main https://github.com/microsoft/TRELLIS.2.git --recursive
    fi
    cd TRELLIS.2

    # Install basic deps
    $PIP install -q imageio imageio-ffmpeg tqdm easydict opencv-python-headless ninja \
        trimesh transformers gradio==6.0.1 tensorboard pandas lpips zstandard kornia timm
    $PIP install -q 'git+https://github.com/EasternJournalist/utils3d.git@9a4eb15e4021b67b12c460c7057d642626897ec8'
    $PIP install -q pillow-simd 2>/dev/null || true

    # Install flash-attn (may build from source, takes ~5-10 min)
    $PIP install flash-attn==2.7.3

    # Build CUDA extensions
    WORKDIR=$(pwd)
    mkdir -p /tmp/extensions

    git clone -b v0.4.0 https://github.com/NVlabs/nvdiffrast.git /tmp/extensions/nvdiffrast 2>/dev/null || true
    $PIP install /tmp/extensions/nvdiffrast --no-build-isolation

    git clone -b renderutils https://github.com/JeffreyXiang/nvdiffrec.git /tmp/extensions/nvdiffrec 2>/dev/null || true
    $PIP install /tmp/extensions/nvdiffrec --no-build-isolation

    git clone https://github.com/JeffreyXiang/CuMesh.git /tmp/extensions/CuMesh --recursive 2>/dev/null || true
    $PIP install /tmp/extensions/CuMesh --no-build-isolation

    git clone https://github.com/JeffreyXiang/FlexGEMM.git /tmp/extensions/FlexGEMM --recursive 2>/dev/null || true
    $PIP install /tmp/extensions/FlexGEMM --no-build-isolation

    cp -r o-voxel /tmp/extensions/o-voxel 2>/dev/null || true
    $PIP install /tmp/extensions/o-voxel --no-build-isolation

    cd $WORKDIR

    # Pre-download model weights
    python3 -c "from trellis2.pipelines import Trellis2ImageTo3DPipeline; Trellis2ImageTo3DPipeline.from_pretrained('microsoft/TRELLIS.2-4B')"

    touch /workspace/.trellis-ready
    echo "=== Setup complete ==="
fi

$PIP install -q flask

# Write the server script
cat > /workspace/server.py << 'PYEOF'
import os, sys, io, tempfile, traceback
os.environ['OPENCV_IO_ENABLE_OPENEXR'] = '1'
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'
sys.path.insert(0, '/workspace/TRELLIS.2')
from flask import Flask, request, send_file, jsonify
import torch

app = Flask(__name__)
pipeline = None

def get_pipeline():
    global pipeline
    if pipeline is None:
        print("Loading pipeline...")
        from trellis2.pipelines import Trellis2ImageTo3DPipeline
        pipeline = Trellis2ImageTo3DPipeline.from_pretrained("microsoft/TRELLIS.2-4B")
        pipeline.cuda()
        print("Ready!")
    return pipeline

@app.route('/health')
def health():
    return jsonify(status='ok', gpu=torch.cuda.get_device_name(0),
                   vram_gb=round(torch.cuda.get_device_properties(0).total_mem/1e9,1))

@app.route('/generate', methods=['POST'])
def generate():
    if 'image' not in request.files:
        return jsonify(error='No image'), 400
    resolution = int(request.form.get('resolution', 1024))
    faces = int(request.form.get('faces', 100000))
    texture_size = int(request.form.get('texture_size', 2048))
    try:
        from PIL import Image
        import o_voxel
        image = Image.open(request.files['image'].stream).convert('RGBA')
        print(f"Generating: {image.size} res={resolution} faces={faces}")
        mesh = get_pipeline().run(image, resolution=resolution)[0]
        max_faces = min(faces, 16777216)
        if mesh.faces.shape[0] > max_faces:
            mesh.simplify(max_faces)
        glb = o_voxel.postprocess.to_glb(
            vertices=mesh.vertices, faces=mesh.faces, attr_volume=mesh.attrs,
            coords=mesh.coords, attr_layout=mesh.layout, voxel_size=mesh.voxel_size,
            aabb=[[-0.5,-0.5,-0.5],[0.5,0.5,0.5]], decimation_target=max_faces,
            texture_size=texture_size, remesh=True, remesh_band=1, remesh_project=0, verbose=True)
        with tempfile.NamedTemporaryFile(suffix='.glb', delete=False) as f:
            glb.export(f.name, extension_webp=True)
            tmp = f.name
        print(f"Done: {os.path.getsize(tmp)} bytes")
        return send_file(tmp, mimetype='model/gltf-binary', as_attachment=True, download_name='model.glb')
    except Exception as e:
        traceback.print_exc()
        return jsonify(error=str(e)), 500

get_pipeline()
app.run(host='0.0.0.0', port=8000)
PYEOF

cd /workspace/TRELLIS.2
python3 /workspace/server.py
"""


def save_state(state):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f)

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {}


def find_pod():
    """Find our existing pod by name."""
    pods = runpod.get_pods()
    for pod in pods:
        if pod['name'] == POD_NAME:
            return pod
    return None


def get_pod_url(pod):
    """Get the HTTP URL for the pod's port 8000."""
    pod_id = pod['id']
    return f"https://{pod_id}-8000.proxy.runpod.net"


def cmd_start(args):
    """Start or resume the TRELLIS.2 pod."""
    pod = find_pod()

    if pod:
        status = pod.get('desiredStatus', '')
        if status == 'RUNNING':
            url = get_pod_url(pod)
            print(f"Pod already running: {pod['id']}")
            print(f"URL: {url}")
            save_state({'pod_id': pod['id'], 'url': url})
            return
        else:
            print(f"Pod exists but status={status}. Resuming...")
            runpod.resume_pod(pod['id'])
            pod_id = pod['id']
    else:
        # Load SSH public key if available
        ssh_key = None
        for key_path in [os.path.expanduser('~/.ssh/id_ed25519.pub'), os.path.expanduser('~/.ssh/id_rsa.pub')]:
            if os.path.exists(key_path):
                with open(key_path) as f:
                    ssh_key = f.read().strip()
                break

        env_vars = {}
        if ssh_key:
            env_vars['PUBLIC_KEY'] = ssh_key

        print(f"Creating new pod with {GPU_TYPE}...")
        pod = runpod.create_pod(
            name=POD_NAME,
            image_name=CONTAINER_IMAGE,
            gpu_type_id="NVIDIA GeForce RTX 4090",
            container_disk_in_gb=CONTAINER_DISK_GB,
            volume_in_gb=VOLUME_GB,
            ports="8000/http,22/tcp",
            env=env_vars if env_vars else None,
        )
        pod_id = pod['id']
        print(f"Created pod: {pod_id}")

    url = f"https://{pod_id}-8000.proxy.runpod.net"
    save_state({'pod_id': pod_id, 'url': url})
    print(f"URL: {url}")
    print()
    print("The pod is starting up. First-time setup takes ~15-20 minutes.")
    print("Use 'python3 runpod-trellis.py status' to check progress.")
    print("Once ready, 'python3 runpod-trellis.py generate --image X.png --output X.glb'")


def cmd_status(args):
    """Check pod status."""
    pod = find_pod()
    if not pod:
        print("No pod found. Run 'start' first.")
        return

    status = pod.get('desiredStatus', 'unknown')
    runtime = pod.get('runtime', {}) or {}
    uptime = runtime.get('uptimeInSeconds', 0)
    gpu = runtime.get('gpus', [{}])
    cost = pod.get('costPerHr', 0)

    print(f"Pod: {pod['id']}")
    print(f"Status: {status}")
    print(f"GPU: {pod.get('machine', {}).get('gpuDisplayName', 'unknown')}")
    print(f"Cost: ${cost}/hr")
    if uptime:
        print(f"Uptime: {uptime//60}m {uptime%60}s (${cost * uptime / 3600:.3f} spent)")

    url = get_pod_url(pod)
    print(f"URL: {url}")

    # Check if server is ready
    if status == 'RUNNING':
        import urllib.request
        try:
            req = urllib.request.urlopen(f"{url}/health", timeout=10)
            data = json.loads(req.read())
            print(f"\nServer: READY ({data.get('gpu')}, {data.get('vram_gb')}GB)")
        except Exception as e:
            print(f"\nServer: NOT READY (still setting up or starting)")
            print(f"  Check pod logs in RunPod console for progress")


def cmd_stop(args):
    """Stop the pod to save money."""
    pod = find_pod()
    if not pod:
        print("No pod found.")
        return

    print(f"Stopping pod {pod['id']}...")
    runpod.stop_pod(pod['id'])
    print("Pod stopped. Use 'start' to resume (will be faster with volume).")


def cmd_destroy(args):
    """Completely remove the pod (including volume)."""
    pod = find_pod()
    if not pod:
        print("No pod found.")
        return

    confirm = input(f"Destroy pod {pod['id']} and its volume? [y/N] ")
    if confirm.lower() != 'y':
        print("Cancelled.")
        return

    runpod.terminate_pod(pod['id'])
    if os.path.exists(STATE_FILE):
        os.remove(STATE_FILE)
    print("Pod destroyed.")


def cmd_setup(args):
    """Set up TRELLIS.2 on the running pod."""
    pod = find_pod()
    if not pod or pod.get('desiredStatus') != 'RUNNING':
        print("Pod not running. Run 'start' first and wait for it to be RUNNING.")
        return

    runtime = pod.get('runtime', {}) or {}
    ports = runtime.get('ports', []) or []
    ssh_port = None
    ssh_host = None
    for p in ports:
        if p.get('privatePort') == 22:
            ssh_host = p.get('ip')
            ssh_port = p.get('publicPort')
            break

    if not ssh_port:
        print("SSH port not ready yet. Wait a moment and try again.")
        print("You can also check the pod in RunPod console.")
        return

    print(f"SSH: ssh root@{ssh_host} -p {ssh_port}")
    print()

    # Write setup script to temp file and SCP it over
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sh', delete=False) as f:
        f.write(SETUP_SCRIPT)
        script_path = f.name

    print("Uploading and running setup script...")
    print("(This will take ~15-20 minutes on first run)")
    print()

    # SCP the script
    scp_cmd = ['scp', '-o', 'StrictHostKeyChecking=no', '-P', str(ssh_port),
               script_path, f'root@{ssh_host}:/workspace/setup.sh']
    subprocess.run(scp_cmd, check=True)

    # Run it via SSH
    ssh_cmd = ['ssh', '-o', 'StrictHostKeyChecking=no', '-p', str(ssh_port),
               f'root@{ssh_host}', 'bash', '/workspace/setup.sh']
    subprocess.run(ssh_cmd)

    os.unlink(script_path)


def cmd_generate(args):
    """Generate a 3D model from an image."""
    state = load_state()
    url = args.url or state.get('url')

    if not url:
        pod = find_pod()
        if pod and pod.get('desiredStatus') == 'RUNNING':
            url = get_pod_url(pod)
        else:
            print("No running pod found. Run 'start' first.")
            sys.exit(1)

    if not args.image:
        print("Error: --image is required")
        sys.exit(1)

    if not os.path.exists(args.image):
        print(f"Error: Image not found: {args.image}")
        sys.exit(1)

    import urllib.request

    # Health check
    try:
        req = urllib.request.urlopen(f"{url}/health", timeout=10)
        data = json.loads(req.read())
        print(f"Server: {data.get('gpu')} ({data.get('vram_gb')}GB)")
    except Exception:
        print(f"Server at {url} is not responding. Is the pod running and setup complete?")
        sys.exit(1)

    # Generate via curl (simpler than multipart in urllib)
    output = args.output or 'model.glb'
    resolution = str(args.resolution)
    faces = str(args.faces)
    texture_size = str(args.texture_size)

    print(f"Generating 3D from {args.image} (resolution={resolution}, faces={faces})...")
    print("This may take 10-60 seconds...")

    result = subprocess.run([
        'curl', '-s', '-X', 'POST', f'{url}/generate',
        '-F', f'image=@{args.image}',
        '-F', f'resolution={resolution}',
        '-F', f'faces={faces}',
        '-F', f'texture_size={texture_size}',
        '-o', output,
        '-w', '%{http_code}',
    ], capture_output=True, text=True, timeout=300)

    http_code = result.stdout.strip()
    if http_code == '200':
        size = os.path.getsize(output)
        print(f"Saved: {output} ({size:,} bytes / {size/1024:.1f} KB)")
    else:
        print(f"Error (HTTP {http_code})")
        if os.path.exists(output):
            with open(output) as f:
                print(f.read()[:500])
            os.remove(output)
        sys.exit(1)


def main():
    api_key = os.environ.get('RUNPOD_API_KEY')
    if not api_key:
        # Try loading from .env files (local dir, then project root)
        for env_dir in [os.path.dirname(__file__), os.path.join(os.path.dirname(__file__), '..', '..')]:
            env_file = os.path.join(env_dir, '.env')
            if os.path.exists(env_file):
                with open(env_file) as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith('RUNPOD_API_KEY='):
                            api_key = line.split('=', 1)[1].strip('"\'')
                            break
                if api_key:
                    break

    if not api_key:
        print("Error: Set RUNPOD_API_KEY environment variable or create a .env file")
        sys.exit(1)

    runpod.api_key = api_key

    parser = argparse.ArgumentParser(description='TRELLIS.2 on RunPod')
    sub = parser.add_subparsers(dest='command')

    sub.add_parser('start', help='Start or resume the TRELLIS.2 pod')
    sub.add_parser('setup', help='Install TRELLIS.2 and start server on the pod')
    sub.add_parser('status', help='Check pod status')
    sub.add_parser('stop', help='Stop the pod (preserves volume)')
    sub.add_parser('destroy', help='Remove pod completely')

    gen = sub.add_parser('generate', help='Generate a 3D model')
    gen.add_argument('--image', required=True, help='Input image path')
    gen.add_argument('--output', default='model.glb', help='Output GLB path')
    gen.add_argument('--resolution', type=int, default=1024, choices=[512, 1024, 1536])
    gen.add_argument('--faces', type=int, default=100000, help='Target face count')
    gen.add_argument('--texture-size', type=int, default=2048, help='Texture resolution')
    gen.add_argument('--url', help='Override server URL')

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    cmds = {
        'start': cmd_start,
        'setup': cmd_setup,
        'status': cmd_status,
        'stop': cmd_stop,
        'destroy': cmd_destroy,
        'generate': cmd_generate,
    }
    cmds[args.command](args)


if __name__ == '__main__':
    main()

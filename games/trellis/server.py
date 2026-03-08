#!/usr/bin/env python3
"""
Simple HTTP API server for TRELLIS.2 image-to-3D generation.
Runs on a GPU pod (e.g., RunPod) and accepts image uploads, returns GLB files.

Endpoints:
  POST /generate  - Upload an image, get a GLB file back
    Form fields:
      image: the input image file
      resolution: voxel resolution (default 1024, options: 512, 1024, 1536)
      faces: target face count for decimation (default 100000)
      texture_size: texture resolution (default 2048)

  GET /health     - Health check
"""

import os
import sys
import io
import tempfile
import traceback

os.environ['OPENCV_IO_ENABLE_OPENEXR'] = '1'
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'

sys.path.insert(0, '/app/TRELLIS.2')

from flask import Flask, request, send_file, jsonify
import torch

app = Flask(__name__)

# Global pipeline (loaded once)
pipeline = None

def get_pipeline():
    global pipeline
    if pipeline is None:
        print("Loading TRELLIS.2-4B pipeline...")
        from trellis2.pipelines import Trellis2ImageTo3DPipeline
        pipeline = Trellis2ImageTo3DPipeline.from_pretrained("microsoft/TRELLIS.2-4B")
        pipeline.cuda()
        print("Pipeline ready.")
    return pipeline


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'gpu': torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'none',
        'vram_gb': round(torch.cuda.get_device_properties(0).total_mem / 1e9, 1) if torch.cuda.is_available() else 0,
    })


@app.route('/generate', methods=['POST'])
def generate():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    resolution = int(request.form.get('resolution', 1024))
    faces = int(request.form.get('faces', 100000))
    texture_size = int(request.form.get('texture_size', 2048))

    if resolution not in (512, 1024, 1536):
        return jsonify({'error': 'Resolution must be 512, 1024, or 1536'}), 400

    try:
        from PIL import Image
        import o_voxel

        # Read uploaded image
        image_file = request.files['image']
        image = Image.open(image_file.stream).convert('RGBA')
        print(f"Generating 3D from image ({image.size}) at resolution {resolution}...")

        # Run pipeline
        pipe = get_pipeline()
        mesh = pipe.run(image, resolution=resolution)[0]

        # Simplify mesh
        max_faces = min(faces, 16777216)  # nvdiffrast limit
        if mesh.faces.shape[0] > max_faces:
            mesh.simplify(max_faces)

        # Export to GLB
        glb = o_voxel.postprocess.to_glb(
            vertices=mesh.vertices,
            faces=mesh.faces,
            attr_volume=mesh.attrs,
            coords=mesh.coords,
            attr_layout=mesh.layout,
            voxel_size=mesh.voxel_size,
            aabb=[[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]],
            decimation_target=max_faces,
            texture_size=texture_size,
            remesh=True,
            remesh_band=1,
            remesh_project=0,
            verbose=True,
        )

        # Save to temp file and send
        with tempfile.NamedTemporaryFile(suffix='.glb', delete=False) as f:
            glb.export(f.name, extension_webp=True)
            tmp_path = f.name

        print(f"Done! GLB exported ({os.path.getsize(tmp_path)} bytes)")
        return send_file(
            tmp_path,
            mimetype='model/gltf-binary',
            as_attachment=True,
            download_name='model.glb',
        )

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Pre-load pipeline on startup
    get_pipeline()
    app.run(host='0.0.0.0', port=8000)

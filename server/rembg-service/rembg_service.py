"""
BGOS Rembg Background Removal Microservice
------------------------------------------
FastAPI worker using Python rembg + ONNX Runtime.
Protected with X-BGOS-API-KEY secret header token.
Processes image in RAM buffer and returns transparent PNG bytes.
"""

import io
import os
from PIL import Image
from fastapi import FastAPI, Header, HTTPException, UploadFile, File
from fastapi.responses import Response
from rembg import remove, new_session

app = FastAPI(title="BGOS Rembg Worker", version="1.0.0")

# Secret internal API key from environment variable
SECRET_API_KEY = os.environ.get("BGOS_REMBG_SECRET", "bgos-rembg-internal-secret")

# Preload session on startup (u2net / birefnet-general)
MODEL_NAME = os.environ.get("REMBG_MODEL", "u2net")
session = new_session(MODEL_NAME)


@app.get("/health")
def health_check():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/remove-bg")
async def remove_background(
    file: UploadFile = File(...),
    x_bgos_api_key: str = Header(None, alias="X-BGOS-API-KEY"),
):
    # 1. Enforce Secret Token Authentication
    if not x_bgos_api_key or x_bgos_api_key != SECRET_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid or missing X-BGOS-API-KEY header")

    # 2. Read image bytes into memory buffer
    image_bytes = await file.read()
    if not image_bytes or len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Invalid image file or size exceeds 10MB")

    try:
        # 3. Perform background removal using rembg
        output_bytes = remove(image_bytes, session=session)

        # 4. Standard Mode Auto-Trim: compute tight non-transparent bounding box
        out_img = Image.open(io.BytesIO(output_bytes))
        orig_w, orig_h = out_img.size
        bbox = out_img.getbbox()

        if bbox:
            # 2px safety padding bounded to image dimensions to preserve anti-aliased edge alphas
            pad = 2
            left = max(0, bbox[0] - pad)
            top = max(0, bbox[1] - pad)
            right = min(orig_w, bbox[2] + pad)
            bottom = min(orig_h, bbox[3] + pad)
            cropped_img = out_img.crop((left, top, right, bottom))
            cropped_buf = io.BytesIO()
            cropped_img.save(cropped_buf, format="PNG")
            cropped_bytes = cropped_buf.getvalue()
            cropped_w, cropped_h = cropped_img.size
        else:
            cropped_bytes = output_bytes
            left, top, right, bottom = 0, 0, orig_w, orig_h
            cropped_w, cropped_h = orig_w, orig_h

        headers = {
            "X-Cutout-Bbox": f"{left},{top},{right},{bottom}",
            "X-Cutout-Orig-Size": f"{orig_w},{orig_h}",
            "X-Cutout-Size": f"{cropped_w},{cropped_h}",
        }

        # 5. Return trimmed PNG response directly from RAM
        return Response(content=cropped_bytes, media_type="image/png", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Background removal failed: {str(e)}")

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from yolo_detector import MiningYOLOEngine

router = APIRouter()

@router.post("/detect-stream")
async def detect_mining_stream(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Live Stream WebRTC Frame Detector:
    Processes single camera video frames in real time using OpenCV & YOLO.
    Returns 2D bounding boxes, object labels, confidence scores, and real-time status telemetry.
    """
    image_base64 = payload.get("image_base64")
    if not image_base64:
        raise HTTPException(status_code=400, detail="image_base64 parameter required")

    result = MiningYOLOEngine.detect_frame(image_base64)
    return result

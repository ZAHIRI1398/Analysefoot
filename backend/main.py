from fastapi import FastAPI, UploadFile, File, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import json
import base64
from typing import Optional

from models.yolo_detector import YOLODetector
from models.byte_tracker import ByteTracker
from config import Config

app = FastAPI(title="Football AI Analysis API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models (lazy loading for faster startup)
yolo_detector: Optional[YOLODetector] = None
byte_tracker: Optional[ByteTracker] = None

def get_models():
    global yolo_detector, byte_tracker
    if yolo_detector is None:
        yolo_detector = YOLODetector()
    if byte_tracker is None:
        byte_tracker = ByteTracker()
    return yolo_detector, byte_tracker

@app.get("/")
async def root():
    return {
        "message": "Football AI Analysis API",
        "status": "running",
        "device": Config.DEVICE
    }

@app.get("/health")
async def health_check():
    """Check if models are loaded"""
    try:
        detector, tracker = get_models()
        return {
            "status": "healthy",
            "yolo_loaded": detector is not None,
            "tracker_loaded": tracker is not None,
            "device": Config.DEVICE
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-frame")
async def analyze_frame(file: UploadFile = File(...)):
    """
    Analyse une frame vidéo et retourne les détections et tracks
    """
    try:
        detector, tracker = get_models()
        
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Resize if too large
        height, width = frame.shape[:2]
        if width > Config.MAX_FRAME_SIZE[0] or height > Config.MAX_FRAME_SIZE[1]:
            scale = min(
                Config.MAX_FRAME_SIZE[0] / width,
                Config.MAX_FRAME_SIZE[1] / height
            )
            frame = cv2.resize(frame, None, fx=scale, fy=scale)
        
        # YOLO detection
        detections = detector.detect(frame)
        
        # ByteTrack tracking
        tracks = tracker.update(detections, frame.shape)
        
        return {
            "success": True,
            "detections": detections,
            "tracks": tracks,
            "frame_shape": frame.shape,
            "timestamp": 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

@app.post("/analyze-base64")
async def analyze_base64(data: dict):
    """
    Analyse une frame envoyée en base64
    """
    try:
        detector, tracker = get_models()
        
        # Decode base64 image
        image_data = data.get('image')
        if not image_data:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # YOLO detection
        detections = detector.detect(frame)
        
        # ByteTrack tracking
        tracks = tracker.update(detections, frame.shape)
        
        return {
            "success": True,
            "detections": detections,
            "tracks": tracks,
            "frame_shape": frame.shape,
            "timestamp": data.get('timestamp', 0)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

@app.websocket("/ws/analyze")
async def websocket_analyze(websocket: WebSocket):
    """
    WebSocket pour analyse temps réel de flux vidéo
    """
    await websocket.accept()
    
    try:
        detector, tracker = get_models()
        
        while True:
            # Receive frame data
            data = await websocket.receive_text()
            frame_data = json.loads(data)
            
            # Decode base64 image
            image_data = frame_data.get('image')
            if not image_data:
                await websocket.send_json({"error": "No image data"})
                continue
            
            # Remove data URL prefix if present
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                await websocket.send_json({"error": "Invalid image format"})
                continue
            
            # Analyze frame
            detections = detector.detect(frame)
            tracks = tracker.update(detections, frame.shape)
            
            # Send results
            result = {
                "success": True,
                "detections": detections,
                "tracks": tracks,
                "frame_shape": frame.shape,
                "timestamp": frame_data.get('timestamp', 0)
            }
            await websocket.send_json(result)
            
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

@app.post("/reset-tracker")
async def reset_tracker():
    """
    Réinitialise le tracker (utile entre deux vidéos)
    """
    global byte_tracker
    byte_tracker = None
    return {"success": True, "message": "Tracker reset"}

if __name__ == "__main__":
    import uvicorn
    print("Starting Football AI Analysis API...")
    print(f"Device: {Config.DEVICE}")
    uvicorn.run(app, host="0.0.0.0", port=8001)

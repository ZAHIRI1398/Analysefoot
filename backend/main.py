import asyncio
from fastapi import FastAPI, UploadFile, File, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketDisconnect
import cv2
import numpy as np
import json
import base64
from typing import Optional

from models.yolo_detector import YOLODetector
from models.byte_tracker import ByteTracker
from models.team_assigner import TeamAssigner
from models.ball_assigner import BallAssigner
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
team_assigner: Optional[TeamAssigner] = None
ball_assigner: Optional[BallAssigner] = None

def get_models():
    global yolo_detector, byte_tracker, team_assigner, ball_assigner
    if yolo_detector is None:
        yolo_detector = YOLODetector()
    if byte_tracker is None:
        byte_tracker = ByteTracker()
    if team_assigner is None:
        team_assigner = TeamAssigner(Config.HOME_TEAM_COLOR, Config.AWAY_TEAM_COLOR)
    if ball_assigner is None:
        ball_assigner = BallAssigner()
    return yolo_detector, byte_tracker, team_assigner, ball_assigner

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
        detector, tracker, team_assigner, ball_assigner = get_models()
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
        detector, tracker, team_assigner, ball_assigner = get_models()
        
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
        
        # Team assignment based on jersey color
        if Config.USE_TEAM_ASSIGNMENT:
            detections = team_assigner.assign_teams(frame, detections)
        
        # Ball-to-player assignment and possession
        detections, possession = ball_assigner.assign_ball(detections)
        
        return {
            "success": True,
            "detections": detections,
            "tracks": tracks,
            "possession": possession,
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
        detector, tracker, team_assigner, ball_assigner = get_models()
        
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
        
        # Team assignment based on jersey color
        if Config.USE_TEAM_ASSIGNMENT:
            detections = team_assigner.assign_teams(frame, detections)
        
        # Ball-to-player assignment and possession
        detections, possession = ball_assigner.assign_ball(detections)
        
        return {
            "success": True,
            "detections": detections,
            "tracks": tracks,
            "possession": possession,
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
        detector, tracker, team_assigner, ball_assigner = await asyncio.to_thread(get_models)

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

            # Analyze frame without blocking the event loop
            detections = await asyncio.to_thread(detector.detect, frame)
            tracks = await asyncio.to_thread(tracker.update, detections, frame.shape)

            # Team assignment based on jersey color
            if Config.USE_TEAM_ASSIGNMENT:
                detections = await asyncio.to_thread(team_assigner.assign_teams, frame, detections)

            # Ball-to-player assignment and possession
            detections, possession = await asyncio.to_thread(ball_assigner.assign_ball, detections)

            # Send results
            result = {
                "success": True,
                "detections": detections,
                "tracks": tracks,
                "possession": possession,
                "frame_shape": frame.shape,
                "timestamp": frame_data.get('timestamp', 0)
            }
            await websocket.send_json(result)

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass

@app.post("/reset-tracker")
async def reset_tracker():
    """
    Réinitialise le tracker et les caches d'assignation (utile entre deux vidéos)
    """
    global byte_tracker, team_assigner, ball_assigner
    byte_tracker = None
    team_assigner = None
    ball_assigner = None
    return {"success": True, "message": "Tracker and caches reset"}

if __name__ == "__main__":
    import uvicorn
    print("Starting Football AI Analysis API...")
    print(f"Device: {Config.DEVICE}")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        ws_ping_interval=None,
        ws_ping_timeout=None,
    )

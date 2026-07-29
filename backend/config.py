import os
import torch


class Config:
    # Device configuration
    DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    # YOLOv8 Configuration
    # Prefer a project-specific weights file if present, otherwise choose a
    # generic COCO model suited to the device (yolov8x for GPU, yolov8n for CPU).
    # Also try the football_analysis-master object-detection model if available.
    YOLO_MODEL_PATH = (
        'models/weights/yolov8x-football.pt'
        if os.path.exists('models/weights/yolov8x-football.pt')
        else (
            'models/weights/object-detection.pt'
            if os.path.exists('models/weights/object-detection.pt')
            else ('yolov8x.pt' if DEVICE == 'cuda' else 'yolov8n.pt')
        )
    )
    # Base confidence sent to YOLO (kept low so small ball/distant players are not discarded)
    YOLO_CONFIDENCE = 0.1
    # Per-class minimum confidence applied after inference
    PERSON_CONFIDENCE = 0.3
    BALL_CONFIDENCE = 0.05
    REFEREE_CONFIDENCE = 0.5
    YOLO_IOU_THRESHOLD = 0.45
    YOLO_IMAGE_SIZE = 1280 if DEVICE == 'cuda' else 640
    # Classes we care about (COCO names and football-model names)
    TARGET_CLASS_NAMES = {'person', 'sports ball', 'player', 'ball', 'referee', 'goalkeeper'}
    
    # ByteTrack Configuration
    BYTE_TRACK_MODEL = 'osx_x_0.5'
    TRACK_BUFFER = 30
    
    # SigLIP Configuration
    SIGLIP_MODEL = 'google/siglip-base-patch16-224'
    
    # Team jersey colors (RGB). If None, team is inferred from player x-position.
    # Override these with the actual colors of the two clubs in the video.
    HOME_TEAM_COLOR = (232, 247, 248)
    AWAY_TEAM_COLOR = (172, 251, 145)
    USE_TEAM_ASSIGNMENT = True

    # Homography
    FIELD_WIDTH = 105  # mètres
    FIELD_HEIGHT = 68  # mètres
    
    # API Configuration
    MAX_FRAME_SIZE = (1920, 1080)
    ALLOWED_VIDEO_FORMATS = ['mp4', 'webm', 'mov', 'avi']

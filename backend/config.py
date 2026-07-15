import os
import torch


class Config:
    # Device configuration
    DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    # YOLOv8 Configuration
    # Prefer a project-specific weights file if present, otherwise fall back
    # to the ultralytics-hosted `yolov8x.pt` (will be downloaded automatically).
    YOLO_MODEL_PATH = (
        'models/weights/yolov8x-football.pt'
        if os.path.exists('models/weights/yolov8x-football.pt')
        else 'yolov8x.pt'
    )
    YOLO_CONFIDENCE = 0.5
    YOLO_IOU_THRESHOLD = 0.45
    YOLO_IMAGE_SIZE = 1280
    
    # ByteTrack Configuration
    BYTE_TRACK_MODEL = 'osx_x_0.5'
    TRACK_BUFFER = 30
    
    # SigLIP Configuration
    SIGLIP_MODEL = 'google/siglip-base-patch16-224'
    
    # Homography
    FIELD_WIDTH = 105  # mètres
    FIELD_HEIGHT = 68  # mètres
    
    # API Configuration
    MAX_FRAME_SIZE = (1920, 1080)
    ALLOWED_VIDEO_FORMATS = ['mp4', 'webm', 'mov', 'avi']

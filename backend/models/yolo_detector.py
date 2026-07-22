from ultralytics import YOLO
import torch
import cv2
import numpy as np
from config import Config

class YOLODetector:
    def __init__(self):
        print(f"Initializing YOLOv8 on {Config.DEVICE}...")
        self.model = YOLO(Config.YOLO_MODEL_PATH)
        self.model.to(Config.DEVICE)
        print("YOLOv8 loaded successfully")
        
    def detect(self, frame: np.ndarray) -> list:
        """
        Détecte joueurs, ballon, arbitres dans une frame
        Returns: List de dict avec bbox, confidence, class
        """
        results = self.model(
            frame,
            conf=Config.YOLO_CONFIDENCE,
            iou=Config.YOLO_IOU_THRESHOLD,
            imgsz=Config.YOLO_IMAGE_SIZE,
            verbose=False
        )

        detections = []
        for result in results:
            for box in result.boxes:
                class_name = self.model.names[int(box.cls[0])]
                class_name_lower = class_name.lower()

                if class_name_lower not in Config.TARGET_CLASS_NAMES:
                    continue

                confidence = float(box.conf[0].cpu().numpy())
                min_conf = Config.BALL_CONFIDENCE if 'ball' in class_name_lower else (
                    Config.REFEREE_CONFIDENCE if class_name_lower == 'referee' else Config.PERSON_CONFIDENCE
                )
                if confidence < min_conf:
                    continue

                bbox = box.xyxy[0].cpu().numpy()
                detection = {
                    'bbox': bbox.tolist(),
                    'confidence': confidence,
                    'class': int(box.cls[0].cpu().numpy()),
                    'class_name': class_name
                }
                detections.append(detection)

        return detections
    
    def detect_with_classes(self, frame: np.ndarray, target_classes: list = None) -> list:
        """
        Détecte uniquement certaines classes spécifiques
        """
        all_detections = self.detect(frame)
        
        if target_classes:
            filtered = [d for d in all_detections if d['class'] in target_classes]
            return filtered
        
        return all_detections

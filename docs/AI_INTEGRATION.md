# Intégration des Modèles IA - Football Analysis

## Architecture Complète

Pour intégrer les vrais modèles IA, vous avez besoin d'un backend Python qui exécute les modèles et une API pour communiquer avec le frontend React.

```
Frontend (React) → API (FastAPI) → Modèles IA (YOLOv8, ByteTrack, SigLIP)
```

## 1. Backend Python avec FastAPI

### Structure du projet

```
backend/
├── main.py                 # API FastAPI
├── models/
│   ├── yolo_detector.py    # YOLOv8 pour détection
│   ├── byte_tracker.py     # ByteTrack pour tracking
│   ├── siglip_embedder.py  # SigLIP pour embeddings
│   └── pose_estimator.py   # YOLOv8-pose pour terrain
├── utils/
│   ├── homography.py       # Calcul d'homographie
│   └── radar.py            # Génération vue radar
├── requirements.txt        # Dépendances Python
└── config.py              # Configuration des modèles
```

### Installation des dépendances

```bash
pip install fastapi uvicorn python-multipart
pip install ultralytics opencv-python numpy
pip install bytetracker
pip install torch torchvision
pip install siglip
pip install onnxruntime-gpu  # Pour accélération GPU
```

## 2. Configuration des Modèles

### config.py

```python
import torch

class Config:
    # Device configuration
    DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    # YOLOv8 Configuration
    YOLO_MODEL_PATH = 'models/weights/yolov8x-football.pt'
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
```

## 3. Implémentation YOLOv8

### models/yolo_detector.py

```python
from ultralytics import YOLO
import torch
import cv2
import numpy as np
from config import Config

class YOLODetector:
    def __init__(self):
        self.model = YOLO(Config.YOLO_MODEL_PATH)
        self.model.to(Config.DEVICE)
        
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
                detection = {
                    'bbox': box.xyxy[0].cpu().numpy().tolist(),
                    'confidence': float(box.conf[0].cpu().numpy()),
                    'class': int(box.cls[0].cpu().numpy()),
                    'class_name': self.model.names[int(box.cls[0])]
                }
                detections.append(detection)
                
        return detections
```

## 4. Implémentation ByteTrack

### models/byte_tracker.py

```python
from bytetracker import BYTETracker
import numpy as np
from config import Config

class ByteTracker:
    def __init__(self):
        self.tracker = BYTETracker(
            track_thresh=0.5,
            track_buffer=Config.TRACK_BUFFER,
            match_thresh=0.8,
            frame_rate=30
        )
        
    def update(self, detections: list, frame_shape: tuple) -> list:
        """
        Met à jour les tracks avec les nouvelles détections
        """
        if not detections:
            return []
            
        # Convertir détections au format ByteTrack
        tracked_objects = []
        for det in detections:
            bbox = det['bbox']
            tracked_objects.append({
                'bbox': [bbox[0], bbox[1], bbox[2]-bbox[0], bbox[3]-bbox[1]],
                'confidence': det['confidence'],
                'class': det['class']
            })
            
        # Mettre à jour le tracker
        tracks = self.tracker.update(
            tracked_objects,
            [frame_shape[0], frame_shape[1]]
        )
        
        return tracks
```

## 5. Implémentation SigLIP

### models/siglip_embedder.py

```python
from transformers import AutoModel, AutoProcessor
import torch
from config import Config

class SigLIPEmbedder:
    def __init__(self):
        self.model = AutoModel.from_pretrained(Config.SIGLIP_MODEL)
        self.processor = AutoProcessor.from_pretrained(Config.SIGLIP_MODEL)
        self.model.to(Config.DEVICE)
        
    def get_embedding(self, image_crop: np.ndarray) -> np.ndarray:
        """
        Génère l'embedding visuel d'un crop de joueur
        """
        inputs = self.processor(images=image_crop, return_tensors="pt")
        inputs = {k: v.to(Config.DEVICE) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            embedding = outputs.image_embeds.cpu().numpy()
            
        return embedding[0]
        
    def cluster_teams(self, embeddings: list) -> list:
        """
        Cluster les embeddings pour séparer les équipes
        """
        from sklearn.cluster import KMeans
        
        embeddings_array = np.array(embeddings)
        kmeans = KMeans(n_clusters=2, random_state=42)
        labels = kmeans.fit_predict(embeddings_array)
        
        return labels
```

## 6. API FastAPI

### main.py

```python
from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import json
import base64

from models.yolo_detector import YOLODetector
from models.byte_tracker import ByteTracker
from models.siglip_embedder import SigLIPEmbedder

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models
yolo_detector = YOLODetector()
byte_tracker = ByteTracker()
siglip_embedder = SigLIPEmbedder()

@app.post("/analyze-frame")
async def analyze_frame(file: UploadFile = File(...)):
    """
    Analyse une frame vidéo et retourne les détections
    """
    # Read image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # YOLO detection
    detections = yolo_detector.detect(frame)
    
    # ByteTrack tracking
    tracks = byte_tracker.update(detections, frame.shape)
    
    return {
        "detections": detections,
        "tracks": tracks,
        "frame_shape": frame.shape
    }

@app.websocket("/ws/analyze")
async def websocket_analyze(websocket: WebSocket):
    """
    WebSocket pour analyse temps réel de flux vidéo
    """
    await websocket.accept()
    
    try:
        while True:
            # Receive frame data
            data = await websocket.receive_text()
            frame_data = json.loads(data)
            
            # Decode base64 image
            image_bytes = base64.b64decode(frame_data['image'])
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            # Analyze frame
            detections = yolo_detector.detect(frame)
            tracks = byte_tracker.update(detections, frame.shape)
            
            # Send results
            result = {
                "detections": detections,
                "tracks": tracks,
                "timestamp": frame_data.get('timestamp', 0)
            }
            await websocket.send_json(result)
            
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## 7. Frontend Integration

### services/apiService.ts

```typescript
const API_BASE = 'http://localhost:8000';

export async function analyzeFrame(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/analyze-frame`, {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
}

export class WebSocketAnalyzer {
  private ws: WebSocket | null = null;
  
  connect(onFrame: (data: any) => void) {
    this.ws = new WebSocket('ws://localhost:8000/ws/analyze');
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onFrame(data);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  sendFrame(imageBase64: string, timestamp: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        image: imageBase64,
        timestamp
      }));
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

## 8. Entraînement des Modèles

### YOLOv8 Football Dataset

```bash
# Télécharger un dataset football annoté
# Exemple: Football Dataset sur Roboflow

# Entraîner YOLOv8
yolo detect train data=football-dataset/data.yaml epochs=100 imgsz=1280 batch=16

# Exporter en ONNX pour production
yolo export model=best.pt format=onnx
```

### ByteTrack

ByteTrack ne nécessite pas d'entraînement spécifique, il utilise les détections YOLO.

### SigLIP

SigLIP est pré-entraîné, mais vous pouvez fine-tuner sur des crops de maillots:

```python
from transformers import SigLIPForImageClassification, SigLIPProcessor

# Fine-tuning sur votre dataset de maillots
model = SigLIPForImageClassification.from_pretrained('google/siglip-base-patch16-224')
# ... code de fine-tuning standard
```

## 9. Optimisation Production

### TensorRT pour GPU

```python
# Convertir YOLO en TensorRT
from ultralytics import YOLO

model = YOLO('best.pt')
model.export(format='engine', device=0)  # TensorRT
```

### Quantification

```python
# Quantification INT8 pour meilleure performance
model.export(format='onnx', half=True, int8=True)
```

## 10. Déploiement

### Docker

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./models:/app/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## Ressources

- [YOLOv8 Documentation](https://docs.ultralytics.com/)
- [ByteTrack GitHub](https://github.com/ifzhang/ByteTrack)
- [SigLIP Paper](https://arxiv.org/abs/2303.15343)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

# Backend Football AI Analysis

API Python pour l'analyse de football avec YOLOv8, ByteTrack et SigLIP.

## Installation

```bash
# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt
```

## Configuration

1. Télécharger un modèle YOLOv8 entraîné sur le football:
   - Option 1: Utiliser un modèle pré-entraîné Ultralytics
   - Option 2: Entraîner votre propre modèle (voir docs/AI_INTEGRATION.md)

2. Placer le modèle dans `models/weights/yolov8x-football.pt`

3. Modifier `config.py` si nécessaire:
   - `DEVICE`: 'cuda' pour GPU, 'cpu' pour CPU
   - `YOLO_MODEL_PATH`: Chemin vers votre modèle
   - `YOLO_CONFIDENCE`: Seuil de confiance (0.5 par défaut)

## Démarrage

```bash
# Démarrer le serveur
python main.py

# Ou avec uvicorn directement
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### GET `/`
Statut de l'API

### GET `/health`
Vérifie si les modèles sont chargés

### POST `/analyze-frame`
Analyse une frame envoyée comme fichier multipart

### POST `/analyze-base64`
Analyse une frame envoyée en base64

### POST `/reset-tracker`
Réinitialise le tracker entre deux vidéos

### WebSocket `/ws/analyze`
Analyse temps réel via WebSocket

## Exemple d'utilisation

### Curl

```bash
# Analyser une image
curl -X POST "http://localhost:8000/analyze-frame" \
  -F "file=@frame.jpg"
```

### Python

```python
import requests

with open('frame.jpg', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/analyze-frame',
        files={'file': f}
    )
    result = response.json()
    print(result['detections'])
```

### WebSocket (JavaScript)

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/analyze');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Detections:', data.detections);
};

// Envoyer une frame
ws.send(JSON.stringify({
    image: base64ImageData,
    timestamp: 0
}));
```

## Structure des réponses

```json
{
  "success": true,
  "detections": [
    {
      "bbox": [x1, y1, x2, y2],
      "confidence": 0.95,
      "class": 0,
      "class_name": "player",
      "track_id": 1
    }
  ],
  "tracks": [...],
  "frame_shape": [height, width],
  "timestamp": 0
}
```

## Performance

- **CPU**: ~5-10 FPS
- **GPU (RTX 3060)**: ~30-45 FPS
- **GPU (RTX 4090)**: ~60+ FPS

## Dépannage

### CUDA Out of Memory
Réduire `YOLO_IMAGE_SIZE` dans `config.py` ou utiliser un batch size plus petit.

### Modèle non trouvé
Vérifiez que le chemin dans `YOLO_MODEL_PATH` est correct et que le fichier existe.

### Erreur d'import
Assurez-vous d'avoir installé toutes les dépendances avec `pip install -r requirements.txt`.

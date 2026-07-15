import numpy as np
from config import Config

class ByteTracker:
    """
    Implémentation simplifiée de ByteTrack pour le tracking multi-objets
    Pour une implémentation complète, utiliser: https://github.com/ifzhang/ByteTrack
    """
    def __init__(self):
        self.track_id_counter = 0
        self.tracks = {}  # track_id -> {bbox, confidence, class, last_seen}
        self.frame_count = 0
        
    def update(self, detections: list, frame_shape: tuple) -> list:
        """
        Met à jour les tracks avec les nouvelles détections
        Returns: List de tracks avec IDs persistants
        """
        self.frame_count += 1
        
        if not detections:
            # Nettoyer les tracks anciens
            self._cleanup_old_tracks()
            return list(self.tracks.values())
        
        # Association simple basée sur IoU (Intersection over Union)
        tracked_detections = self._associate_detections(detections, frame_shape)
        
        # Créer nouveaux tracks pour les détections non associées
        for det in tracked_detections:
            if 'track_id' not in det:
                self.track_id_counter += 1
                det['track_id'] = self.track_id_counter
                self.tracks[self.track_id_counter] = {
                    'bbox': det['bbox'],
                    'confidence': det['confidence'],
                    'class': det['class'],
                    'class_name': det['class_name'],
                    'track_id': self.track_id_counter,
                    'last_seen': self.frame_count,
                    'age': 0
                }
        
        # Nettoyer les tracks anciens
        self._cleanup_old_tracks()
        
        return list(self.tracks.values())
    
    def _associate_detections(self, detections: list, frame_shape: tuple) -> list:
        """
        Associe les détections aux tracks existants
        """
        tracked = []
        used_track_ids = set()
        
        for det in detections:
            best_match = None
            best_iou = 0.5  # Seuil IoU minimum
            
            for track_id, track in self.tracks.items():
                if track_id in used_track_ids:
                    continue
                    
                iou = self._calculate_iou(det['bbox'], track['bbox'])
                if iou > best_iou:
                    best_iou = iou
                    best_match = track_id
            
            if best_match:
                # Mettre à jour le track existant
                det['track_id'] = best_match
                self.tracks[best_match].update({
                    'bbox': det['bbox'],
                    'confidence': det['confidence'],
                    'last_seen': self.frame_count,
                    'age': self.tracks[best_match]['age'] + 1
                })
                used_track_ids.add(best_match)
            
            tracked.append(det)
        
        return tracked
    
    def _calculate_iou(self, bbox1: list, bbox2: list) -> float:
        """
        Calcule l'IoU entre deux bounding boxes
        """
        x1, y1, x2, y2 = bbox1
        x3, y3, x4, y4 = bbox2
        
        # Intersection
        xi1 = max(x1, x3)
        yi1 = max(y1, y3)
        xi2 = min(x2, x4)
        yi2 = min(y2, y4)
        
        if xi2 < xi1 or yi2 < yi1:
            return 0.0
        
        intersection = (xi2 - xi1) * (yi2 - yi1)
        
        # Union
        area1 = (x2 - x1) * (y2 - y1)
        area2 = (x4 - x3) * (y4 - y3)
        union = area1 + area2 - intersection
        
        return intersection / union if union > 0 else 0.0
    
    def _cleanup_old_tracks(self):
        """
        Supprime les tracks qui n'ont pas été vus récemment
        """
        max_age = Config.TRACK_BUFFER
        old_tracks = [
            track_id for track_id, track in self.tracks.items()
            if self.frame_count - track['last_seen'] > max_age
        ]
        
        for track_id in old_tracks:
            del self.tracks[track_id]

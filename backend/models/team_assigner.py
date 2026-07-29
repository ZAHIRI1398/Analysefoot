import cv2
import numpy as np
from sklearn.cluster import KMeans
from typing import Tuple, List, Dict
from config import Config


class TeamAssigner:
    """Assigne une équipe (home / away) à chaque joueur en analysant la couleur du maillot."""

    def __init__(self, home_color: Tuple[int, int, int], away_color: Tuple[int, int, int]):
        # Colors are expected in RGB for configuration; convert to BGR for OpenCV comparisons
        self.home_color = np.array(home_color[::-1], dtype=np.float32)
        self.away_color = np.array(away_color[::-1], dtype=np.float32)
        self.team_cache: Dict[int, str] = {}

    def _apply_green_mask(self, image: np.ndarray, threshold: float = 0.08) -> np.ndarray:
        """Masks out green (field) when it covers enough of the image."""
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        lower_green = np.array([36, 25, 25])
        upper_green = np.array([86, 255, 255])
        mask = cv2.inRange(hsv, lower_green, upper_green)

        total = image.shape[0] * image.shape[1]
        masked = cv2.countNonZero(cv2.bitwise_not(mask))
        if masked / total > threshold:
            return cv2.bitwise_and(image, image, mask=cv2.bitwise_not(mask))
        return image

    def _extract_jersey_color(self, image: np.ndarray) -> Tuple[int, int, int]:
        """Extract dominant jersey color from top half of player bbox using K-Means."""
        if image.size == 0:
            return (0, 0, 0)

        image = self._apply_green_mask(image)
        pixels = image.reshape(-1, 3).astype(np.float32)

        # Skip K-Means on tiny images
        if len(pixels) < 2:
            return tuple(image[0, 0].tolist())

        kmeans = KMeans(n_clusters=2, init='k-means++', n_init=10, random_state=42)
        kmeans.fit(pixels)

        labels = kmeans.labels_.reshape(image.shape[:2])
        corners = [labels[0, 0], labels[0, -1], labels[-1, 0], labels[-1, -1]]
        bg_cluster = max(set(corners), key=corners.count)
        player_cluster = 1 - bg_cluster

        color_bgr = kmeans.cluster_centers_[player_cluster]
        return (int(color_bgr[0]), int(color_bgr[1]), int(color_bgr[2]))

    def _predict_team(self, jersey_color_bgr: Tuple[int, int, int]) -> str:
        color = np.array(jersey_color_bgr, dtype=np.float32)
        home_dist = np.linalg.norm(color - self.home_color)
        away_dist = np.linalg.norm(color - self.away_color)
        return 'home' if home_dist < away_dist else 'away'

    def assign_teams(self, frame: np.ndarray, detections: List[Dict]) -> List[Dict]:
        """Add 'team' and 'team_color' fields to player detections."""
        height, width = frame.shape[:2]

        for det in detections:
            class_name = det.get('class_name', '').lower()
            track_id = det.get('track_id')

            if 'ball' in class_name:
                det['team'] = 'neutral'
                det['team_color_rgb'] = (250, 204, 21)
                det['team_color'] = (250, 204, 21)[::-1]
                continue
            if 'referee' in class_name:
                det['team'] = 'referee'
                det['team_color_rgb'] = (192, 132, 252)
                det['team_color'] = (192, 132, 252)[::-1]
                continue

            # Reuse cached team when available
            if track_id is not None and track_id in self.team_cache:
                team = self.team_cache[track_id]
                det['team'] = team
                det['team_color_rgb'] = self.home_color[::-1].tolist() if team == 'home' else self.away_color[::-1].tolist()
                det['team_color'] = self.home_color.tolist() if team == 'home' else self.away_color.tolist()
                continue

            x1, y1, x2, y2 = map(int, det['bbox'])
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(width, x2)
            y2 = min(height, y2)

            if x2 <= x1 or y2 <= y1:
                team = 'home'
                det['team'] = team
                det['team_color_rgb'] = self.home_color[::-1].tolist()
                det['team_color'] = self.home_color.tolist()
                if track_id is not None:
                    self.team_cache[track_id] = team
                continue

            player_img = frame[y1:y2, x1:x2]
            h = player_img.shape[0]
            top_half = player_img[0:h // 2, :]

            jersey_bgr = self._extract_jersey_color(top_half)
            team = self._predict_team(jersey_bgr)

            det['team'] = team
            det['team_color_rgb'] = self.home_color[::-1].tolist() if team == 'home' else self.away_color[::-1].tolist()
            det['team_color'] = self.home_color.tolist() if team == 'home' else self.away_color.tolist()

            if track_id is not None:
                self.team_cache[track_id] = team

        return detections

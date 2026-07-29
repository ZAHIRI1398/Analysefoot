import math
from typing import Dict, List, Optional, Tuple


class BallAssigner:
    """Simplified ball-to-player assignment with grace periods and possession tracking."""

    def __init__(self, max_ball_distance: float = 150.0, grace_frames: int = 20, ball_grace_frames: int = 10):
        self.max_ball_distance = max_ball_distance
        self.grace_frames = grace_frames
        self.ball_grace_frames = ball_grace_frames

        self.last_player_id: Optional[int] = None
        self.last_team: Optional[str] = None
        self.frames_since_ball = 0
        self.possession_history: List[str] = []
        self.max_history = 60

    def _get_center(self, bbox: List[float]) -> Tuple[float, float]:
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) / 2, (y1 + y2) / 2)

    def _get_bottom(self, bbox: List[float]) -> Tuple[float, float]:
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) / 2, y2)

    def _distance(self, p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
        return math.hypot(p1[0] - p2[0], p1[1] - p2[1])

    def assign_ball(self, detections: List[Dict]) -> Tuple[List[Dict], Dict[str, float]]:
        """Add 'has_ball' to the player with the ball and return possession ratios."""
        ball = next((d for d in detections if 'ball' in d.get('class_name', '').lower()), None)
        players = [d for d in detections if d.get('class_name', '').lower() in ('player', 'goalkeeper')]

        player_with_ball: Optional[Dict] = None
        current_team: Optional[str] = None

        if ball is not None:
            self.frames_since_ball = 0
            ball_center = self._get_bottom(ball['bbox'])

            best = None
            best_dist = float('inf')
            for p in players:
                player_bottom = self._get_bottom(p['bbox'])
                dist = self._distance(ball_center, player_bottom)
                if dist < best_dist and dist <= self.max_ball_distance:
                    best = p
                    best_dist = dist

            if best is not None:
                player_with_ball = best
                current_team = best.get('team')
                self.last_player_id = best.get('track_id')
                self.last_team = current_team
            else:
                # Keep last player with ball if within grace period
                if self.last_player_id is not None and self.frames_since_ball <= self.grace_frames:
                    player_with_ball = next((d for d in players if d.get('track_id') == self.last_player_id), None)
                    current_team = self.last_team
                self.frames_since_ball += 1
        else:
            self.frames_since_ball += 1
            if self.frames_since_ball <= self.ball_grace_frames:
                player_with_ball = next((d for d in players if d.get('track_id') == self.last_player_id), None)
                current_team = self.last_team

        # Mark player with ball
        for d in detections:
            if d is player_with_ball:
                d['has_ball'] = True
            else:
                d['has_ball'] = False

        # Track possession
        team = current_team if current_team in ('home', 'away') else 'neutral'
        self.possession_history.append(team)
        if len(self.possession_history) > self.max_history:
            self.possession_history.pop(0)

        total = len(self.possession_history)
        possession = {
            'home': self.possession_history.count('home') / total if total else 0.0,
            'away': self.possession_history.count('away') / total if total else 0.0,
            'neutral': self.possession_history.count('neutral') / total if total else 1.0,
        }

        return detections, possession

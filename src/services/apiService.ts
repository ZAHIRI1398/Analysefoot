const API_BASE = 'http://localhost:8001';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

export interface Detection {
  bbox: number[];
  confidence: number;
  class: number;
  class_name: string;
  track_id?: number;
}

export interface AnalysisResult {
  success: boolean;
  detections: Detection[];
  tracks: any[];
  frame_shape?: number[];
  timestamp: number;
}

export async function analyzeFrame(file: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/analyze-frame`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
}

export async function analyzeBase64(imageBase64: string, timestamp: number): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE}/analyze-base64`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: imageBase64,
      timestamp,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
}

export async function checkHealth(): Promise<any> {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}

export async function resetTracker(): Promise<any> {
  const response = await fetch(`${API_BASE}/reset-tracker`, {
    method: 'POST',
  });
  return response.json();
}

export class WebSocketAnalyzer {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private lastFrameShape: number[] | null = null;
  
  connect(
    onFrame: (data: AnalysisResult) => void,
    onError?: (error: any) => void,
    onOpen?: () => void
  ) {
    try {
      this.ws = new WebSocket(`${WS_BASE}/ws/analyze`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        if (onOpen) {
          onOpen();
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.frame_shape) {
            this.lastFrameShape = data.frame_shape;
          } else if (this.lastFrameShape) {
            data.frame_shape = this.lastFrameShape;
          }
          if (data.success) {
            onFrame(data);
          } else if (onError) {
            onError(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) {
          onError(error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.attemptReconnect(onFrame, onError, onOpen);
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      if (onError) {
        onError(error);
      }
    }
  }
  
  private attemptReconnect(
    onFrame: (data: AnalysisResult) => void,
    onError?: (error: any) => void,
    onOpen?: () => void
  ) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect(onFrame, onError, onOpen);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else if (onError) {
      onError(new Error('Max WebSocket reconnect attempts reached'));
    }
  }
  
  sendFrame(imageBase64: string, timestamp: number, frameWidth: number, frameHeight: number) {
    this.lastFrameShape = [frameHeight, frameWidth];
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          image: imageBase64,
          timestamp,
          frame_shape: this.lastFrameShape,
        }));
      } catch (error) {
        console.error('Error sending frame:', error);
      }
    } else {
      console.warn('WebSocket not connected');
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

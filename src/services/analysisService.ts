import { analyzeBase64, WebSocketAnalyzer } from './apiService'
import { playerStatsService } from './playerStatsService'

export interface Detection {
  id: string
  class: 'player' | 'ball' | 'referee'
  confidence: number
  bbox: { x: number; y: number; width: number; height: number }
  team?: 'home' | 'away'
  trackId?: number
}

export interface AnalysisFrame {
  timestamp: number
  detections: Detection[]
  radarPositions: Array<{ x: number; y: number; team: 'home' | 'away'; id: number }>
}

export class AnalysisService {
  private isAnalyzing = false
  private animationFrame: number | null = null
  private frameTimeout: number | null = null
  private onFrameCallback: ((frame: AnalysisFrame) => void) | null = null
  private videoElement: HTMLVideoElement | null = null
  private frameCount = 0
  private useRealAPI = false
  private wsAnalyzer: WebSocketAnalyzer | null = null
  private canvas: HTMLCanvasElement | null = null
  private activeLoopId = 0
  private readonly maxCaptureWidth = 640
  private readonly maxCaptureHeight = 360

  constructor(useRealAPI: boolean = false) {
    this.useRealAPI = useRealAPI
  }

  startAnalysis(
    video: HTMLVideoElement,
    onFrame: (frame: AnalysisFrame) => void
  ) {
    this.stopAnalysis()
    this.videoElement = video
    this.onFrameCallback = onFrame
    this.isAnalyzing = true
    this.frameCount = 0

    if (this.useRealAPI) {
      this.startRealAnalysis()
    } else {
      this.processFrame()
    }
  }

  stopAnalysis() {
    this.isAnalyzing = false
    this.activeLoopId++
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    if (this.frameTimeout !== null) {
      clearTimeout(this.frameTimeout)
      this.frameTimeout = null
    }
    if (this.wsAnalyzer) {
      this.wsAnalyzer.disconnect()
      this.wsAnalyzer = null
    }
    this.onFrameCallback = null
    this.videoElement = null
  }

  private startRealAnalysis() {
    // Create canvas for frame extraction
    this.canvas = document.createElement('canvas')
    
    // Connect WebSocket
    this.wsAnalyzer = new WebSocketAnalyzer()
    this.wsAnalyzer.connect(
      (data) => {
        const detections = this.convertAPIDetections(data.detections, data.frame_shape)
        const radarPositions = this.convertDetectionsToRadarPositions(detections)

        this.updatePlayerStats(detections, radarPositions)

        const frame: AnalysisFrame = {
          timestamp: data.timestamp,
          detections,
          radarPositions,
        }

        if (this.onFrameCallback) {
          this.onFrameCallback(frame)
        }
        this.frameCount++
      },
      (error) => {
        console.error('WebSocket error:', error)
        // Fallback to simulation without leaving the API loop running
        this.useRealAPI = false
        this.activeLoopId++
        this.processFrame()
      }
    )
    
    this.processFrameWithAPI()
  }

  private async processFrameWithAPI() {
    if (!this.isAnalyzing || !this.videoElement || !this.canvas) {
      return
    }

    const loopId = this.activeLoopId

    // Extract frame from video and resize for faster upload
    const ratio = Math.min(
      this.maxCaptureWidth / this.videoElement.videoWidth,
      this.maxCaptureHeight / this.videoElement.videoHeight,
      1
    )
    const captureWidth = Math.max(1, Math.floor(this.videoElement.videoWidth * ratio))
    const captureHeight = Math.max(1, Math.floor(this.videoElement.videoHeight * ratio))

    this.canvas.width = captureWidth
    this.canvas.height = captureHeight
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return
    
    ctx.drawImage(this.videoElement, 0, 0, captureWidth, captureHeight)
    const imageData = this.canvas.toDataURL('image/jpeg', 0.65)
    
    // Send to API via WebSocket
    if (this.wsAnalyzer && this.wsAnalyzer.isConnected()) {
      this.wsAnalyzer.sendFrame(imageData, this.videoElement.currentTime, captureWidth, captureHeight)
    }
    
    // Continue processing only if the loop is still active
    this.frameTimeout = window.setTimeout(() => {
      if (this.isAnalyzing && loopId === this.activeLoopId) {
        this.animationFrame = window.requestAnimationFrame(() => this.processFrameWithAPI())
      }
    }, 1000 / 15)
  }

  private processFrame() {
    if (!this.isAnalyzing || !this.videoElement || !this.onFrameCallback) {
      return
    }

    const loopId = this.activeLoopId

    // Simulate AI detection with realistic patterns
    const detections = this.simulateDetections()
    const radarPositions = this.simulateRadarPositions()

    // Update player statistics
    this.updatePlayerStats(detections, radarPositions)

    const frame: AnalysisFrame = {
      timestamp: this.videoElement.currentTime,
      detections,
      radarPositions,
    }

    this.onFrameCallback(frame)
    this.frameCount++

    // Process at ~15 FPS for performance
    this.frameTimeout = window.setTimeout(() => {
      if (this.isAnalyzing && loopId === this.activeLoopId) {
        this.animationFrame = window.requestAnimationFrame(() => this.processFrame())
      }
    }, 1000 / 15)
  }

  private updatePlayerStats(detections: Detection[], radarPositions: Array<{ x: number; y: number; team: 'home' | 'away'; id: number }>) {
    const timestamp = Date.now()
    
    radarPositions.forEach(pos => {
      // Initialize player if not exists
      playerStatsService.initializePlayer(pos.id, pos.team)
      
      // Update position
      playerStatsService.updatePlayerPosition(pos.id, pos.x, pos.y, timestamp)
    })

    // Simulate touches for players near ball
    const ballDetection = detections.find(d => d.class === 'ball')
    if (ballDetection) {
      const players = detections.filter(d => d.class === 'player')
      players.forEach(player => {
        const distance = this.calculateDistance(
          ballDetection.bbox.x + ballDetection.bbox.width / 2,
          ballDetection.bbox.y + ballDetection.bbox.height / 2,
          player.bbox.x + player.bbox.width / 2,
          player.bbox.y + player.bbox.height / 2
        )
        
        if (distance < 50 && player.trackId) {
          playerStatsService.recordTouch(player.trackId)
        }
      })
    }
  }

  private convertDetectionsToRadarPositions(detections: Detection[]): Array<{ x: number; y: number; team: 'home' | 'away'; id: number }> {
    const videoWidth = this.videoElement?.videoWidth || 1280
    const videoHeight = this.videoElement?.videoHeight || 720

    return detections
      .filter(d => d.class === 'player' && d.trackId !== undefined)
      .map(d => {
        const centerX = d.bbox.x + d.bbox.width / 2
        const bottomY = d.bbox.y + d.bbox.height
        const xPercent = Math.min(100, Math.max(0, (centerX / videoWidth) * 100))
        const yPercent = Math.min(100, Math.max(0, (bottomY / videoHeight) * 100))
        return {
          x: xPercent,
          y: yPercent,
          team: d.team || (xPercent < 50 ? 'home' : 'away'),
          id: d.trackId as number,
        }
      })
  }

  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }

  private convertAPIDetections(apiDetections: any[], frameShape?: number[]): Detection[] {
    const [frameHeight = 1, frameWidth = 1] = frameShape ?? []
    const widthScale = this.videoElement ? this.videoElement.videoWidth / frameWidth : 1
    const heightScale = this.videoElement ? this.videoElement.videoHeight / frameHeight : 1

    return apiDetections.map((det, index) => {
      const [x1, y1, x2, y2] = det.bbox
      const centerX = ((x1 + x2) / 2) / frameWidth
      const team = centerX < 0.45 ? 'home' : centerX > 0.55 ? 'away' : 'home'
      const trackId = det.track_id ?? (index + 1)

      return {
        id: `track-${trackId}`,
        class: this.mapClass(det.class_name),
        confidence: det.confidence,
        bbox: {
          x: x1 * widthScale,
          y: y1 * heightScale,
          width: (x2 - x1) * widthScale,
          height: (y2 - y1) * heightScale,
        },
        team,
        trackId,
      }
    })
  }

  private mapClass(className: string): 'player' | 'ball' | 'referee' {
    const classMap: { [key: string]: 'player' | 'ball' | 'referee' } = {
      'player': 'player',
      'ball': 'ball',
      'referee': 'referee',
      'person': 'player',
      'sports ball': 'ball',
    }
    return classMap[className.toLowerCase()] || 'player'
  }

  private simulateDetections(): Detection[] {
    const detections: Detection[] = []
    const numPlayers = 8 + Math.floor(Math.random() * 6) // 8-13 players visible
    const videoWidth = this.videoElement?.videoWidth || 1280
    const videoHeight = this.videoElement?.videoHeight || 720

    // Numéros de maillot réalistes
    const homeJerseyNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    const awayJerseyNumbers = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]

    // Simulate players
    for (let i = 0; i < numPlayers; i++) {
      const team = i < numPlayers / 2 ? 'home' : 'away'
      const x = Math.random() * (videoWidth - 100) + 50
      const y = Math.random() * (videoHeight - 150) + 100
      const width = 30 + Math.random() * 20
      const height = 60 + Math.random() * 30

      const jerseyNumber = team === 'home' 
        ? homeJerseyNumbers[i % homeJerseyNumbers.length]
        : awayJerseyNumbers[i % awayJerseyNumbers.length]

      detections.push({
        id: `player-${i}`,
        class: 'player',
        confidence: 0.75 + Math.random() * 0.2,
        bbox: { x, y, width, height },
        team,
        trackId: jerseyNumber,
      })
    }

    // Simulate ball
    if (Math.random() > 0.1) {
      const ballX = Math.random() * (videoWidth - 50) + 25
      const ballY = Math.random() * (videoHeight - 100) + 50

      detections.push({
        id: 'ball',
        class: 'ball',
        confidence: 0.85 + Math.random() * 0.14,
        bbox: { x: ballX, y: ballY, width: 15, height: 15 },
        trackId: 999,
      })
    }

    // Occasionally add referee
    if (Math.random() > 0.7) {
      const refX = Math.random() * (videoWidth - 100) + 50
      const refY = Math.random() * (videoHeight - 150) + 100

      detections.push({
        id: 'referee',
        class: 'referee',
        confidence: 0.7 + Math.random() * 0.2,
        bbox: { x: refX, y: refY, width: 35, height: 70 },
        trackId: 1000,
      })
    }

    return detections
  }

  private simulateRadarPositions(): Array<{ x: number; y: number; team: 'home' | 'away'; id: number }> {
    const positions: Array<{ x: number; y: number; team: 'home' | 'away'; id: number }> = []
    
    // Numéros de maillot réalistes (même que dans simulateDetections)
    const homeJerseyNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    const awayJerseyNumbers = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    
    // Simulate tactical formations
    const homeFormation = [
      { x: 15, y: 30 }, { x: 25, y: 50 }, { x: 35, y: 70 },
      { x: 45, y: 35 }, { x: 50, y: 50 }, { x: 45, y: 65 },
      { x: 60, y: 40 }, { x: 65, y: 55 }, { x: 70, y: 45 },
      { x: 80, y: 50 }
    ]
    
    const awayFormation = [
      { x: 85, y: 30 }, { x: 75, y: 50 }, { x: 65, y: 70 },
      { x: 55, y: 35 }, { x: 50, y: 50 }, { x: 55, y: 65 },
      { x: 40, y: 40 }, { x: 35, y: 55 }, { x: 30, y: 45 },
      { x: 20, y: 50 }
    ]

    // Add some randomness to positions
    homeFormation.forEach((pos, i) => {
      positions.push({
        x: pos.x + (Math.random() - 0.5) * 8,
        y: pos.y + (Math.random() - 0.5) * 8,
        team: 'home',
        id: homeJerseyNumbers[i % homeJerseyNumbers.length]
      })
    })

    awayFormation.forEach((pos, i) => {
      positions.push({
        x: pos.x + (Math.random() - 0.5) * 8,
        y: pos.y + (Math.random() - 0.5) * 8,
        team: 'away',
        id: awayJerseyNumbers[i % awayJerseyNumbers.length]
      })
    })

    return positions
  }

  exportAnalysis(frames: AnalysisFrame[]): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalFrames: frames.length,
      frames: frames.map(f => ({
        timestamp: f.timestamp,
        detectionCount: f.detections.length,
        players: f.detections.filter(d => d.class === 'player').length,
        ballDetected: f.detections.some(d => d.class === 'ball'),
      }))
    }
    
    return JSON.stringify(exportData, null, 2)
  }
}

export const analysisService = new AnalysisService()

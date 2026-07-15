import { useEffect, useRef, useCallback } from 'react'
import { Detection } from '../services/analysisService'

interface VideoOverlayProps {
  detections: Detection[]
  videoWidth: number
  videoHeight: number
  onPlayerClick?: (playerId: number) => void
  selectedPlayerId?: number | null
}

export function VideoOverlay({ detections, videoWidth, videoHeight, onPlayerClick, selectedPlayerId }: VideoOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const safeVideoWidth = Math.max(videoWidth, 1)
    const safeVideoHeight = Math.max(videoHeight, 1)

    // The canvas bitmap must match the actual displayed size so that
    // drawing coordinates map 1:1 with the video on screen.
    canvas.width = canvas.clientWidth || safeVideoWidth
    canvas.height = canvas.clientHeight || safeVideoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const scaleX = canvas.width / safeVideoWidth
    const scaleY = canvas.height / safeVideoHeight

    detections.forEach((detection) => {
      const { x, y, width, height } = detection.bbox
      const isSelected = detection.class === 'player' && detection.trackId === selectedPlayerId

      const drawX = x * scaleX
      const drawY = y * scaleY
      const drawWidth = width * scaleX
      const drawHeight = height * scaleY

      let color = 'rgb(250, 204, 21)' // ball yellow
      let fillColor = 'rgba(250, 204, 21, 0.2)'
      if (detection.class === 'referee') {
        color = 'rgb(192, 132, 252)'
        fillColor = 'rgba(192, 132, 252, 0.2)'
      } else if (detection.team === 'home') {
        color = 'rgb(34, 211, 238)'
        fillColor = 'rgba(34, 211, 238, 0.2)'
      } else if (detection.team === 'away') {
        color = 'rgb(163, 230, 53)'
        fillColor = 'rgba(163, 230, 53, 0.2)'
      }

      if (isSelected) {
        color = 'rgb(255, 255, 255)'
      }

      ctx.strokeStyle = color
      ctx.lineWidth = isSelected ? 4 : 2
      ctx.fillStyle = fillColor
      ctx.strokeRect(drawX, drawY, drawWidth, drawHeight)
      ctx.fillRect(drawX, drawY, drawWidth, drawHeight)

      // Label
      const label = detection.class === 'player' ? `#${detection.trackId}` : detection.class
      ctx.font = 'bold 16px Arial'
      ctx.textBaseline = 'bottom'
      const textMetrics = ctx.measureText(label)
      const paddingX = 8
      const paddingY = 4
      const labelHeight = 20
      const labelWidth = textMetrics.width + paddingX * 2
      let labelX = drawX + drawWidth / 2 - labelWidth / 2
      let labelY = drawY - labelHeight - 4

      // For the ball, the label is drawn on the ball to keep it readable
      if (detection.class === 'ball') {
        labelY = drawY + drawHeight / 2 - labelHeight / 2
      }

      // Keep label inside the canvas
      if (labelX < 0) labelX = 0
      if (labelX + labelWidth > canvas.width) labelX = canvas.width - labelWidth
      if (labelY < 0) labelY = drawY + 4
      if (labelY + labelHeight > canvas.height) labelY = canvas.height - labelHeight

      ctx.fillStyle = color
      ctx.fillRect(labelX, labelY, labelWidth, labelHeight)

      ctx.fillStyle = 'rgb(15, 23, 42)'
      ctx.textAlign = 'center'
      ctx.fillText(label, labelX + labelWidth / 2, labelY + labelHeight - paddingY)
      ctx.textAlign = 'start'
    })
  }, [detections, videoWidth, videoHeight, selectedPlayerId])

  useEffect(() => {
    draw()
  }, [draw])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clickX = (e.clientX - rect.left) * scaleX
    const clickY = (e.clientY - rect.top) * scaleY

    const videoScaleX = canvas.width / Math.max(videoWidth, 1)
    const videoScaleY = canvas.height / Math.max(videoHeight, 1)

    // Find clicked detection (players only, order top to bottom)
    const playerDetections = detections.filter((d) => d.class === 'player')
    for (let i = playerDetections.length - 1; i >= 0; i--) {
      const d = playerDetections[i]
      const { x, y, width, height } = d.bbox
      const drawX = x * videoScaleX
      const drawY = y * videoScaleY
      const drawWidth = width * videoScaleX
      const drawHeight = height * videoScaleY
      if (clickX >= drawX && clickX <= drawX + drawWidth && clickY >= drawY && clickY <= drawY + drawHeight) {
        if (d.trackId !== undefined) {
          onPlayerClick?.(d.trackId)
        }
        break
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="absolute inset-0 w-full h-full cursor-pointer"
    />
  )
}

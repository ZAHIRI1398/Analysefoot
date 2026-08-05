import { forwardRef, useEffect, useRef } from 'react'
import { Detection } from '../services/analysisService'

interface VideoOverlayProps {
  detections: Detection[]
  videoWidth: number
  videoHeight: number
  videoElement?: HTMLVideoElement | null
  onPlayerClick?: (playerId: number) => void
  selectedPlayerId?: number | null
}

export const VideoOverlay = forwardRef<HTMLCanvasElement, VideoOverlayProps>(
  function VideoOverlay(
    { detections, videoWidth, videoHeight, videoElement, onPlayerClick, selectedPlayerId },
    forwardedRef
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const getColor = (detection: Detection): [string, string] => {
      if (detection.teamColor) {
        const [r, g, b] = detection.teamColor
        return [`rgb(${r}, ${g}, ${b})`, `rgba(${r}, ${g}, ${b}, 0.25)`]
      }
      if (detection.class === 'referee') return ['rgb(192, 132, 252)', 'rgba(192, 132, 252, 0.25)']
      if (detection.class === 'ball') return ['rgb(250, 204, 21)', 'rgba(250, 204, 21, 0.4)']
      if (detection.team === 'home') return ['rgb(34, 211, 238)', 'rgba(34, 211, 238, 0.25)']
      if (detection.team === 'away') return ['rgb(163, 230, 53)', 'rgba(163, 230, 53, 0.25)']
      return ['rgb(250, 204, 21)', 'rgba(250, 204, 21, 0.25)']
    }

    const isColorDark = (color: string): boolean => {
      const match = color.match(/\d+/g)
      if (!match || match.length < 3) return false
      const [r, g, b] = match.slice(0, 3).map(Number)
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b
      return luminance < 128
    }

    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const safeVideoWidth = Math.max(videoWidth, 1)
      const safeVideoHeight = Math.max(videoHeight, 1)

      canvas.width = canvas.clientWidth || safeVideoWidth
      canvas.height = canvas.clientHeight || safeVideoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw the current video frame first so the canvas contains the full composed image
      if (videoElement && videoElement.readyState >= 2) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
      }

      const scaleX = canvas.width / safeVideoWidth
      const scaleY = canvas.height / safeVideoHeight

      detections.forEach((detection) => {
        const { x, y, width, height } = detection.bbox
        const isSelected = detection.class === 'player' && detection.trackId === selectedPlayerId

        const drawX = x * scaleX
        const drawY = y * scaleY
        const drawWidth = width * scaleX
        const drawHeight = height * scaleY
        const cx = drawX + drawWidth / 2
        const footY = drawY + drawHeight

        let [color] = getColor(detection)
        if (isSelected) color = 'rgb(255, 255, 255)'

        if (detection.class === 'ball') {
          // Ball marker: triangle above the ball (football_analysis-master style)
          ctx.beginPath()
          ctx.moveTo(cx, drawY)
          ctx.lineTo(cx - 8, drawY - 18)
          ctx.lineTo(cx + 8, drawY - 18)
          ctx.closePath()
          ctx.fillStyle = color
          ctx.fill()
          ctx.lineWidth = 1
          ctx.strokeStyle = 'rgb(15, 23, 42)'
          ctx.stroke()
        } else {
          // Player / referee marker: ellipse under the feet
          ctx.beginPath()
          const rx = Math.max(8, drawWidth / 2 + 4)
          const ry = Math.max(6, drawWidth * 0.12)
          ctx.ellipse(cx, footY, rx, ry, 0, -Math.PI / 6, (4 * Math.PI) / 3)
          ctx.strokeStyle = color
          ctx.lineWidth = isSelected ? 4 : 2
          ctx.stroke()

          // Ball-possession indicator (small triangle above the player)
          if (detection.hasBall) {
            ctx.beginPath()
            ctx.moveTo(cx, drawY - 22)
            ctx.lineTo(cx - 6, drawY - 36)
            ctx.lineTo(cx + 6, drawY - 36)
            ctx.closePath()
            ctx.fillStyle = 'rgb(250, 204, 21)'
            ctx.fill()
            ctx.lineWidth = 1
            ctx.strokeStyle = 'rgb(15, 23, 42)'
            ctx.stroke()
          }

          // ID badge below the ellipse
          const label = detection.class === 'player' ? `#${detection.trackId}` : detection.class
          ctx.font = 'bold 12px Arial'
          const textMetrics = ctx.measureText(label)
          const paddingX = 5
          const labelHeight = 16
          const labelWidth = textMetrics.width + paddingX * 2
          const labelX = cx - labelWidth / 2
          const labelY = footY + ry + 4

          // Clamp badge inside canvas
          const safeLabelX = Math.max(0, Math.min(labelX, canvas.width - labelWidth))
          const safeLabelY = Math.max(0, Math.min(labelY, canvas.height - labelHeight))

          ctx.fillStyle = color
          ctx.fillRect(safeLabelX, safeLabelY, labelWidth, labelHeight)

          ctx.fillStyle = isColorDark(color) ? 'white' : 'rgb(15, 23, 42)'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(label, safeLabelX + labelWidth / 2, safeLabelY + labelHeight / 2)
          ctx.textAlign = 'start'
          ctx.textBaseline = 'alphabetic'
        }
      })
    }

    useEffect(() => {
      draw()
      const handleResize = () => draw()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [detections, videoWidth, videoHeight, videoElement, selectedPlayerId])

    // Redraw when the video element advances (frame by frame)
    useEffect(() => {
      if (!videoElement) return
      const onSeek = () => draw()
      videoElement.addEventListener('seeked', onSeek)
      return () => videoElement.removeEventListener('seeked', onSeek)
    }, [videoElement])

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
        ref={(node) => {
          if (typeof forwardedRef === 'function') {
            forwardedRef(node)
          } else if (forwardedRef) {
            ;(forwardedRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node
          }
          ;(canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node
        }}
        onClick={handleClick}
        className="absolute inset-0 w-full h-full cursor-pointer"
      />
    )
  }
)

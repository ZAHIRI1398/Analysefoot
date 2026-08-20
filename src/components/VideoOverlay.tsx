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

    const getColor = (detection: Detection): string => {
      if (detection.team === 'home') return 'rgb(34, 211, 238)'
      if (detection.team === 'away') return 'rgb(163, 230, 53)'
      if (detection.class === 'referee') return 'rgb(192, 132, 252)'
      if (detection.class === 'ball') return 'rgb(250, 204, 21)'
      return 'rgb(250, 204, 21)'
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
      if (!canvas || !videoElement) return

      const safeVideoWidth = Math.max(videoWidth, 1)
      const safeVideoHeight = Math.max(videoHeight, 1)

      // Keep the canvas pixel size equal to the video so the overlay is 1:1 with bbox coordinates
      canvas.width = safeVideoWidth
      canvas.height = safeVideoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw the current video frame first so the canvas contains the full composed image
      if (videoElement.readyState >= 2) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
      }

      detections.forEach((detection) => {
        const { x, y, width, height } = detection.bbox
        const isSelected = detection.class === 'player' && detection.trackId === selectedPlayerId

        const color = isSelected ? 'rgb(255, 255, 255)' : getColor(detection)

        // Simple bounding box
        ctx.strokeStyle = color
        ctx.lineWidth = isSelected ? 4 : 2
        ctx.strokeRect(x, y, width, height)

        // Simple label at the top-left of the box
        const label = detection.class === 'player' ? `#${detection.trackId ?? '?'}` : detection.class
        ctx.font = 'bold 14px Arial'
        const paddingX = 6
        const labelHeight = 20
        const labelWidth = ctx.measureText(label).width + paddingX * 2
        const labelX = x
        const labelY = Math.max(y - labelHeight, labelHeight)

        ctx.fillStyle = color
        ctx.fillRect(labelX, labelY, labelWidth, labelHeight)

        ctx.fillStyle = isColorDark(color) ? 'white' : 'black'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, labelX + paddingX, labelY + labelHeight / 2)
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

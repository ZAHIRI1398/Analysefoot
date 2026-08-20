import { useEffect, useMemo, useState, useRef } from 'react'
import { AnalysisService } from './services/analysisService'
import { playerStatsService } from './services/playerStatsService'
import { PlayerStatsView } from './components/PlayerStats'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Crosshair,
  Database,
  Gauge,
  Layers3,
  LineChart,
  Map,
  MousePointer2,
  Radar,
  Route,
  SlidersHorizontal,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Video,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import './App.css'
import { VideoUploader } from './components/VideoUploader'
import { VideoOverlay } from './components/VideoOverlay'
import { AnalysisControls } from './components/AnalysisControls'
import { analysisService, AnalysisFrame, Detection } from './services/analysisService'

type Stage = {
  id: string
  title: string
  subtitle: string
  icon: typeof Camera
  color: string
  input: string
  output: string
  details: string[]
  tools: string[]
  metric: string
}

const stages: Stage[] = [
  {
    id: 'detect',
    title: 'YOLOv8 terrain',
    subtitle: 'Détection temps réel des joueurs, arbitres, ballons et lignes visibles.',
    icon: Crosshair,
    color: 'from-emerald-400 to-lime-300',
    input: 'Flux vidéo 25–60 FPS',
    output: 'Boîtes, classes, confiance',
    details: [
      'Optimisation des tailles d’images, seuils de confiance et NMS pour réduire les faux positifs.',
      'Export ONNX/TensorRT pour accélérer l’inférence sur GPU edge ou serveur.',
      'Jeux de données annotés avec angles broadcast, caméra fixe et conditions météo variées.',
    ],
    tools: ['Ultralytics', 'TensorRT', 'ONNX Runtime', 'Roboflow'],
    metric: 'mAP cible > 0,72',
  },
  {
    id: 'track',
    title: 'ByteTrack',
    subtitle: 'Suivi multi-objets robuste même avec occlusions et croisements.',
    icon: Route,
    color: 'from-cyan-300 to-sky-500',
    input: 'Détections YOLOv8 frame par frame',
    output: 'Identifiants persistants et trajectoires',
    details: [
      'Association des détections à forte et faible confiance pour récupérer les joueurs masqués.',
      'Filtrage Kalman et IoU matching pour stabiliser les pistes.',
      'Ré-identification facultative quand les caméras changent ou les joueurs se ressemblent.',
    ],
    tools: ['ByteTrack', 'Kalman Filter', 'IoU matching', 'ReID'],
    metric: 'IDF1 cible > 0,80',
  },
  {
    id: 'embed',
    title: 'SigLIP + UMAP',
    subtitle: 'Embeddings visuels pour regrouper équipes, arbitres et profils de joueurs.',
    icon: BrainCircuit,
    color: 'from-fuchsia-400 to-violet-500',
    input: 'Crops joueurs normalisés',
    output: 'Clusters d’équipes et similarités',
    details: [
      'SigLIP transforme chaque crop en vecteur sémantique robuste aux poses.',
      'UMAP projette les embeddings en 2D pour inspecter la séparation des maillots.',
      'Clustering HDBSCAN/K-Means pour assigner automatiquement l’équipe probable.',
    ],
    tools: ['SigLIP', 'UMAP', 'HDBSCAN', 'K-Means'],
    metric: 'Pureté clusters > 0,90',
  },
  {
    id: 'pose',
    title: 'YOLOv8x-pose',
    subtitle: 'Points de repère du terrain pour comprendre la géométrie visible.',
    icon: Target,
    color: 'from-amber-300 to-orange-500',
    input: 'Images du terrain annotées',
    output: 'Keypoints: corners, lignes, intersections',
    details: [
      'Entraînement spécialisé sur repères de terrain: surface, rond central, lignes de touche.',
      'Augmentations contrôlées: perspective, flou de mouvement, luminosité, zoom broadcast.',
      'Inférence des points clés pour estimer l’état géométrique à chaque frame.',
    ],
    tools: ['YOLOv8x-pose', 'Albumentations', 'Label Studio', 'PyTorch'],
    metric: 'Erreur keypoint < 6 px',
  },
  {
    id: 'homo',
    title: 'Homographie',
    subtitle: 'Transformation de perspective vers une carte métrique du terrain.',
    icon: Map,
    color: 'from-teal-300 to-emerald-500',
    input: 'Keypoints image + modèle terrain',
    output: 'Matrice H et coordonnées métriques',
    details: [
      'Calcul RANSAC pour rejeter les points instables ou masqués.',
      'Projection des pieds des joueurs, du ballon et des lignes virtuelles.',
      'Mise à jour temporelle lissée pour éviter les tremblements de la surimpression.',
    ],
    tools: ['OpenCV', 'RANSAC', 'DLT', 'Smoothing'],
    metric: 'Erreur terrain < 35 cm',
  },
  {
    id: 'radar',
    title: 'Vue radar tactique',
    subtitle: 'Projection descendante, zones de jeu et analyse spatiale exploitable.',
    icon: Radar,
    color: 'from-green-300 to-emerald-400',
    input: 'Coordonnées métriques trackées',
    output: 'Radar, heatmaps, zone de jeu',
    details: [
      'Reconstruction 2D top-down pour lecture tactique des occupations d’espaces.',
      'Calcul de convex hull, largeur, hauteur de bloc, distances inter-lignes.',
      'Superposition de lignes virtuelles: hors-jeu, pression, couloirs, densité.',
    ],
    tools: ['NumPy', 'GeoPandas', 'Canvas/WebGL', 'PostGIS'],
    metric: 'Latence bout-en-bout < 120 ms',
  },
]

const difficulties = [
  {
    title: 'Occlusions et collisions visuelles',
    text: 'Les joueurs se croisent, masquent le ballon et partagent des couleurs proches. ByteTrack réduit les pertes, mais la ré-identification reste critique.',
    fix: 'Ajouter crops temporels, embeddings maillot et règles de trajectoire.',
  },
  {
    title: 'Caméra broadcast dynamique',
    text: 'Zooms, panoramiques et changements de plan rendent l’homographie instable si les repères disparaissent.',
    fix: 'Lisser la matrice H, détecter les plans et recalibrer dès que des keypoints fiables réapparaissent.',
  },
  {
    title: 'Données annotées coûteuses',
    text: 'Les ballons et points de terrain nécessitent des labels précis, souvent frame par frame.',
    fix: 'Combiner annotation active, pré-labeling YOLO et contrôle qualité ciblé.',
  },
  {
    title: 'Temps réel en production',
    text: 'La chaîne complète peut dépasser la latence acceptable quand plusieurs modèles tournent ensemble.',
    fix: 'Profiler chaque étape, batcher intelligemment, quantifier et déployer sur GPU adapté.',
  },
]

const modules = [
  'Capture vidéo',
  'Détection YOLOv8',
  'Tracking ByteTrack',
  'Embeddings SigLIP',
  'Keypoints terrain',
  'Homographie',
  'Radar & analytics',
]

const radarPlayers = [
  { x: 18, y: 28, team: 'home' },
  { x: 29, y: 42, team: 'home' },
  { x: 42, y: 32, team: 'home' },
  { x: 54, y: 50, team: 'home' },
  { x: 66, y: 36, team: 'home' },
  { x: 31, y: 68, team: 'away' },
  { x: 47, y: 61, team: 'away' },
  { x: 62, y: 72, team: 'away' },
  { x: 77, y: 55, team: 'away' },
  { x: 84, y: 42, team: 'away' },
]

function App() {
  const [activeStage, setActiveStage] = useState(stages[0].id)
  const [latencyMode, setLatencyMode] = useState<'edge' | 'server'>('edge')
  const [selectedDifficulty, setSelectedDifficulty] = useState(0)
  const [copied, setCopied] = useState(false)
  const [imageSize, setImageSize] = useState(960)
  const [confidence, setConfidence] = useState(42)
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([])
  const [analysisFrames, setAnalysisFrames] = useState<AnalysisFrame[]>([])
  const [frameCount, setFrameCount] = useState(0)
  const [showAnalysisMode, setShowAnalysisMode] = useState(false)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [statsVersion, setStatsVersion] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const analysisServiceRef = useRef<AnalysisService | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    ;(window as any).mergePlayerStats = (targetId: number, ...sourceIds: number[]) => {
      playerStatsService.mergePlayers(targetId, sourceIds)
      setStatsVersion(v => v + 1)
      console.log('[mergePlayerStats] fused', sourceIds, 'into', targetId)
    }
    ;(window as any).listPlayers = () => playerStatsService.getAllPlayerStats().map(p => ({ id: p.id, team: p.team, distance: p.totalDistance.toFixed(0), touches: p.touches }))
  }, [])

  const stage = stages.find((item) => item.id === activeStage) ?? stages[0]
  const Icon = stage.icon

  const metrics = useMemo(() => {
    const edge = latencyMode === 'edge'
    return [
      { label: 'Latence cible', value: edge ? '85 ms' : '118 ms', icon: Gauge },
      { label: 'FPS inférence', value: edge ? '42' : '60', icon: Zap },
      { label: 'Stabilité IDs', value: stage.id === 'track' ? '91%' : '87%', icon: Shield },
      { label: 'Confiance pipeline', value: stage.id === 'homo' ? '94%' : '89%', icon: BadgeCheck },
    ]
  }, [latencyMode, stage.id])

  const yoloOptimization = useMemo(() => {
    const sizeImpact = (imageSize - 640) / 640
    const confImpact = (confidence - 35) / 100
    const latency = Math.round((latencyMode === 'edge' ? 24 : 42) + sizeImpact * 38 + Math.max(0, 0.5 - confidence / 100) * 18)
    const recall = Math.min(96, Math.max(68, Math.round(88 + sizeImpact * 8 - confImpact * 34)))
    const precision = Math.min(97, Math.max(70, Math.round(79 + confImpact * 42 - sizeImpact * 4)))
    const nms = confidence < 35 ? 0.62 : confidence > 55 ? 0.48 : 0.55

    return { latency, recall, precision, nms: nms.toFixed(2) }
  }, [confidence, imageSize, latencyMode])

  const copyBlueprint = async () => {
    const text = `Pipeline IA football: ${modules.join(' → ')}. Module actif: ${stage.title}. Objectif: ${stage.metric}.`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const handleVideoSelected = (url: string) => {
    setVideoSrc(url)
    setVideoElement(null)
  }

  const stopAnalysis = () => {
    if (videoElement) {
      videoElement.onended = null
      videoElement.pause()
    }
    if (analysisServiceRef.current) {
      analysisServiceRef.current.stopAnalysis()
      analysisServiceRef.current = null
    }
    setIsAnalyzing(false)
  }

  const startAnalysis = async () => {
    if (!videoElement) return

    // Wait for video metadata so AnalysisService and Overlay get correct dimensions
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      console.log('[App] waiting for video metadata...')
      await new Promise<void>((resolve) => {
        const onMeta = () => {
          videoElement.removeEventListener('loadedmetadata', onMeta)
          resolve()
        }
        videoElement.addEventListener('loadedmetadata', onMeta)
      })
    }

    if (videoElement.ended) {
      videoElement.currentTime = 0
    }
    videoElement.playsInline = true

    const service = new AnalysisService()
    analysisServiceRef.current = service
    videoElement.onended = stopAnalysis

    service.startAnalysis(videoElement, (frame) => {
      console.log('[App] frame callback', frame.detections.length)
      setCurrentDetections(frame.detections)
      setAnalysisFrames(prev => {
        const next = prev.length >= 1000 ? prev.slice(-999) : prev
        return next.concat(frame)
      })
      setFrameCount(prev => prev + 1)
    })

    setIsAnalyzing(true)
  }

  const handleToggleAnalysis = async () => {
    if (!videoElement) return
    if (isAnalyzing) {
      stopAnalysis()
    } else {
      await startAnalysis()
    }
  }

  const handleExportAnalysis = () => {
    const exportData = analysisService.exportAnalysis(analysisFrames)
    const blob = new Blob([exportData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `football-analysis-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleToggleRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      return
    }

    const canvas = overlayCanvasRef.current
    if (!canvas) return

    const stream = canvas.captureStream(30)
    const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
      ? 'video/webm; codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    recordedChunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `match-overlay-${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      recordedChunksRef.current = []
      mediaRecorderRef.current = null
    }

    recorder.start()
    mediaRecorderRef.current = recorder
    setIsRecording(true)
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-slate-50">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 py-8 sm:px-8 lg:px-10">
        <nav className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-emerald-950/40 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/30">
              <Trophy className="size-6" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.35em] text-emerald-200">Football AI Lab</p>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">Architecture IA appliquée au football</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-slate-300">
            {['YOLOv8', 'ByteTrack', 'SigLIP', 'Homographie'].map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1.5">{tag}</span>
            ))}
          </div>
        </nav>

        <header className="grid gap-10 lg:grid-cols-[1.04fr_.96fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
              <Sparkles className="size-4" /> Modèles, outils, inférence et analyse tactique
            </div>
            <div className="space-y-5">
              <h2 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                De la vidéo brute à la <span className="bg-gradient-to-r from-emerald-200 via-lime-200 to-cyan-200 bg-clip-text text-transparent">vue radar intelligente</span>.
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Une application interactive pour comprendre l’architecture complète: optimisation YOLOv8, déploiement avec inférence, ByteTrack, embeddings SigLIP/UMAP, homographie, points clés du terrain et analyse spatiale.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button 
                onClick={() => setShowAnalysisMode(!showAnalysisMode)}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 font-bold text-slate-950 shadow-xl shadow-emerald-400/20 transition hover:-translate-y-0.5 hover:bg-lime-200"
              >
                {showAnalysisMode ? 'Voir la démo' : 'Mode analyse vidéo'} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </button>
              <button onClick={copyBlueprint} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/15">
                {copied ? <CheckCircle2 className="size-4 text-emerald-300" /> : <Database className="size-4" />}
                {copied ? 'Architecture copiée' : 'Copier le blueprint'}
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="absolute -inset-1 -z-10 rounded-[2.2rem] bg-gradient-to-br from-emerald-400/30 via-cyan-400/10 to-lime-400/20 blur-xl" />
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#07140c]">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-100"><Video className="size-4" /> Match feed — inférence live</div>
                <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-200">LIVE</span>
              </div>
              <div className="relative aspect-video bg-[radial-gradient(circle_at_center,rgba(34,197,94,.15),transparent_32%),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] bg-[size:auto,64px_64px,64px_64px] p-4">
                <div className="absolute inset-6 rounded-[45%] border border-white/20" />
                <div className="absolute left-1/2 top-0 h-full border-l border-white/20" />
                <div className="absolute left-[9%] top-[28%] h-[44%] w-[18%] border border-white/20" />
                <div className="absolute right-[9%] top-[28%] h-[44%] w-[18%] border border-white/20" />
                {radarPlayers.map((player, index) => (
                  <motion.div
                    key={`${player.team}-${index}`}
                    className={`absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-[10px] font-black ${player.team === 'home' ? 'border-cyan-100 bg-cyan-400 text-slate-950' : 'border-lime-100 bg-lime-300 text-slate-950'}`}
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2.4 + index * 0.08, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {index + 1}
                  </motion.div>
                ))}
                <div className="absolute left-[71%] top-[47%] grid size-5 place-items-center rounded-full bg-white text-xs text-slate-950 shadow-[0_0_24px_rgba(255,255,255,.8)]">●</div>
                <div className="absolute bottom-4 left-4 rounded-2xl border border-emerald-300/20 bg-slate-950/70 p-3 backdrop-blur">
                  <p className="font-mono text-xs text-emerald-200">Homographie H estimée</p>
                  <p className="text-sm font-bold">Projection top-down prête</p>
                </div>
              </div>
            </div>
          </motion.div>
        </header>

        {/* Analysis Mode */}
        {showAnalysisMode && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <VideoUploader 
                onVideoSelected={handleVideoSelected}
                isAnalyzing={isAnalyzing}
                onToggleAnalysis={handleToggleAnalysis}
              />
              {videoSrc && (
                <div className="relative rounded-2xl border border-white/10 bg-black overflow-hidden">
                  <video
                    src={videoSrc}
                    className="w-full h-auto max-w-full block"
                    controls
                    onLoadedMetadata={(e) => {
                      const video = e.target as HTMLVideoElement
                      setVideoElement(video)
                    }}
                  />
                  <VideoOverlay 
                    ref={overlayCanvasRef}
                    detections={currentDetections}
                    videoWidth={videoElement?.videoWidth || 1280}
                    videoHeight={videoElement?.videoHeight || 720}
                    videoElement={videoElement}
                    onPlayerClick={setSelectedPlayerId}
                    selectedPlayerId={selectedPlayerId}
                  />
                </div>
              )}
            </div>
            <div className="space-y-4">
              <AnalysisControls
                isAnalyzing={isAnalyzing}
                isRecording={isRecording}
                frameCount={frameCount}
                frames={analysisFrames}
                onExport={handleExportAnalysis}
                onToggleRecording={videoElement ? handleToggleRecording : undefined}
              />
              <PlayerStatsView
                key={statsVersion}
                stats={playerStatsService.getAllPlayerStats()}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={setSelectedPlayerId}
                homePossession={playerStatsService.getTeamStats('home').possession}
                awayPossession={playerStatsService.getTeamStats('away').possession}
              />
            </div>
          </section>
        )}

        {!showAnalysisMode && (
          <>
        <section className="grid gap-4 md:grid-cols-4">
          {metrics.map((item) => {
            const MetricIcon = item.icon
            return (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/10 backdrop-blur">
                <MetricIcon className="mb-4 size-6 text-emerald-200" />
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-1 text-3xl font-black tracking-tight">{item.value}</p>
              </div>
            )
          })}
        </section>

        <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/10 backdrop-blur lg:grid-cols-[.9fr_1.1fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-lime-300 text-slate-950">
                <SlidersHorizontal className="size-6" />
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.35em] text-lime-200">Optimisation YOLOv8</p>
                <h3 className="text-3xl font-black tracking-tight">Console de réglage pour le terrain</h3>
              </div>
            </div>
            <p className="leading-8 text-slate-300">
              Ajustez la taille d’image et le seuil de confiance pour visualiser le compromis entre précision, rappel et latence d’inférence. Le but est de garder les ballons et joueurs lointains sans exploser le temps de calcul.
            </p>
            <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/50 p-5 font-mono text-sm text-emerald-100">
              <p>model = YOLOv8x(weights=&quot;football-field.pt&quot;)</p>
              <p>export = ONNX + TensorRT FP16</p>
              <p>nms_iou = {yoloOptimization.nms} · conf = {(confidence / 100).toFixed(2)} · imgsz = {imageSize}</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label htmlFor="image-size" className="font-bold text-white">Taille d’image</label>
                <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-sm text-lime-100">{imageSize}px</span>
              </div>
              <input id="image-size" type="range" min="640" max="1280" step="160" value={imageSize} onChange={(event) => setImageSize(Number(event.target.value))} className="w-full accent-lime-300" />
              <p className="mt-3 text-sm text-slate-400">640 = rapide, 1280 = meilleur pour ballon et joueurs éloignés.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label htmlFor="confidence" className="font-bold text-white">Seuil de confiance</label>
                <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-sm text-lime-100">{confidence}%</span>
              </div>
              <input id="confidence" type="range" min="20" max="70" step="1" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} className="w-full accent-lime-300" />
              <p className="mt-3 text-sm text-slate-400">Seuil bas = plus de rappel, seuil haut = moins de faux positifs.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Latence estimée', `${yoloOptimization.latency} ms`],
                ['Rappel joueurs/ballon', `${yoloOptimization.recall}%`],
                ['Précision objets', `${yoloOptimization.precision}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl bg-emerald-300 p-4 text-slate-950">
                  <p className="text-xs font-black uppercase tracking-widest opacity-70">{label}</p>
                  <p className="mt-2 text-3xl font-black">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pipeline" className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5 backdrop-blur">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.35em] text-emerald-200">Pipeline</p>
                <h3 className="text-2xl font-black">Étapes d’architecture</h3>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 p-1">
                {(['edge', 'server'] as const).map((mode) => (
                  <button key={mode} onClick={() => setLatencyMode(mode)} className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${latencyMode === mode ? 'bg-emerald-300 text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}>{mode}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {stages.map((item, index) => {
                const ItemIcon = item.icon
                const active = item.id === activeStage
                return (
                  <button key={item.id} onClick={() => setActiveStage(item.id)} className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${active ? 'border-emerald-300/50 bg-emerald-300/10 shadow-lg shadow-emerald-950/30' : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.07]'}`}>
                    <div className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${item.color} text-slate-950`}><ItemIcon className="size-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">0{index + 1}</p>
                      <p className="font-black text-white">{item.title}</p>
                      <p className="line-clamp-1 text-sm text-slate-400">{item.subtitle}</p>
                    </div>
                    <ChevronRight className={`size-5 text-slate-500 transition ${active ? 'translate-x-1 text-emerald-200' : 'group-hover:translate-x-1'}`} />
                  </button>
                )
              })}
            </div>
          </div>

          <motion.article key={stage.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className={`grid size-16 place-items-center rounded-3xl bg-gradient-to-br ${stage.color} text-slate-950 shadow-xl`}><Icon className="size-8" /></div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-200">Module actif</p>
                  <h3 className="text-3xl font-black tracking-tight">{stage.title}</h3>
                </div>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-100">{stage.metric}</span>
            </div>
            <p className="mt-5 text-lg leading-8 text-slate-300">{stage.subtitle}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-400"><Layers3 className="size-4 text-cyan-200" /> Entrée</p>
                <p className="text-xl font-black">{stage.input}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-400"><Activity className="size-4 text-lime-200" /> Sortie</p>
                <p className="text-xl font-black">{stage.output}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {stage.details.map((detail) => (
                <div key={detail} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
                  <p className="leading-7 text-slate-300">{detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {stage.tools.map((tool) => (
                <span key={tool} className="rounded-full bg-slate-950/60 px-3 py-1.5 font-mono text-xs font-bold text-cyan-100 ring-1 ring-white/10">{tool}</span>
              ))}
            </div>
          </motion.article>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-6 backdrop-blur">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.35em] text-emerald-200">Flux de données</p>
              <h3 className="text-3xl font-black">Orchestration bout-en-bout</h3>
            </div>
            <p className="max-w-2xl text-slate-400">Chaque bloc produit des artefacts vérifiables: détections, pistes, clusters, keypoints, matrice H, coordonnées métriques et indicateurs tactiques.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-7">
            {modules.map((module, index) => (
              <div key={module} className="relative rounded-3xl border border-white/10 bg-white/[0.05] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-2xl bg-emerald-300 font-black text-slate-950">{index + 1}</span>
                  {index < modules.length - 1 && <ArrowRight className="hidden size-4 text-emerald-200 md:block" />}
                </div>
                <p className="text-sm font-black leading-5">{module}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
            <div className="mb-6 flex items-center gap-3">
              <LineChart className="size-7 text-emerald-200" />
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-200">Analyse spatiale</p>
                <h3 className="text-3xl font-black">Zone de jeu et métriques tactiques</h3>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Largeur du bloc', '46 m', 'Distance entre joueurs extrêmes sur l’axe horizontal.'],
                ['Hauteur du bloc', '34 m', 'Distance défense-attaque projetée sur le terrain.'],
                ['Densité autour du ballon', '7 joueurs', 'Nombre de joueurs dans un rayon tactique de 18 m.'],
              ].map(([label, value, text]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-slate-400">{label}</p>
                  <p className="mt-2 text-3xl font-black text-emerald-100">{value}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-emerald-50">
              <p className="flex items-center gap-2 font-bold"><MousePointer2 className="size-5" /> Application de l’homographie</p>
              <p className="mt-2 leading-7 text-emerald-50/80">Les lignes virtuelles et la superposition terrain deviennent possibles lorsque les coordonnées image sont converties en coordonnées métriques fiables: ligne de hors-jeu, corridors de progression, zones de pression et distances au ballon.</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-6 backdrop-blur">
            <div className="mb-5 flex items-center gap-3">
              <AlertTriangle className="size-7 text-amber-200" />
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-200">Risques</p>
                <h3 className="text-3xl font-black">Difficultés de mise en œuvre</h3>
              </div>
            </div>
            <div className="space-y-3">
              {difficulties.map((item, index) => (
                <button key={item.title} onClick={() => setSelectedDifficulty(index)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedDifficulty === index ? 'border-amber-200/40 bg-amber-200/10' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'}`}>
                  <p className="font-black">{item.title}</p>
                  {selectedDifficulty === index && <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>}
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-3xl bg-amber-200 p-5 text-slate-950">
              <p className="font-black">Solution recommandée</p>
              <p className="mt-2 leading-7">{difficulties[selectedDifficulty].fix}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-300 to-cyan-200 p-1 shadow-2xl shadow-emerald-950/30">
          <div className="rounded-[1.8rem] bg-slate-950/90 p-7 md:p-9">
            <div className="grid gap-7 md:grid-cols-[.75fr_1.25fr] md:items-center">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.35em] text-emerald-200">Roadmap</p>
                <h3 className="mt-2 text-4xl font-black tracking-tight">Déployer l’IA football en production</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['1', 'Mesurer', 'Créer un jeu de validation par type de caméra et suivre mAP, IDF1, erreur homographie.'],
                  ['2', 'Optimiser', 'Quantification, TensorRT, seuils dynamiques et exécution asynchrone des modèles.'],
                  ['3', 'Superviser', 'Dashboards latence, dérive de données, taux de perte tracking et qualité keypoints.'],
                  ['4', 'Expliquer', 'Export radar, clips annotés et rapports tactiques lisibles par staff sportif.'],
                ].map(([num, title, text]) => (
                  <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                    <span className="mb-3 grid size-9 place-items-center rounded-2xl bg-white text-slate-950 font-black">{num}</span>
                    <p className="font-black text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/10 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>Football AI Architecture Lab — application éducative interactive avec mode analyse fonctionnel.</p>
          <p className="flex items-center gap-2"><Cpu className="size-4" /> Vite + React + TypeScript + Tailwind</p>
        </footer>
          </>
        )}
      </section>
    </main>
  )
}

export default App

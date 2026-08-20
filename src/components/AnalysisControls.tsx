import { Download, BarChart3, Video, Square } from 'lucide-react'
import { AnalysisFrame } from '../services/analysisService'

interface AnalysisControlsProps {
  isAnalyzing: boolean
  isRecording?: boolean
  frameCount: number
  frames: AnalysisFrame[]
  desiredFps?: number
  setDesiredFps?: (fps: number) => void
  onExport: () => void
  onToggleRecording?: () => void
}

export function AnalysisControls({ isAnalyzing, isRecording, frameCount, frames, desiredFps = 15, setDesiredFps, onExport, onToggleRecording }: AnalysisControlsProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6 backdrop-blur">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-slate-950">
          <BarChart3 className="size-5" />
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-200">Statistiques</p>
          <h3 className="text-lg font-black">Analyse en cours</h3>
        </div>
      </div>

      {setDesiredFps && (
        <div className="rounded-xl bg-white/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vitesse d'analyse</p>
            <span className="text-sm font-black text-white">{desiredFps} FPS</span>
          </div>
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={desiredFps}
            onChange={(e) => setDesiredFps(Number(e.target.value))}
            disabled={isAnalyzing}
            className="w-full accent-emerald-400"
          />
          <p className="mt-2 text-xs text-slate-400">Baissez pour mieux voir les IDs.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
          <p className={`mt-1 text-xl font-black ${isAnalyzing ? 'text-emerald-300' : 'text-slate-400'}`}>
            {isAnalyzing ? 'En cours' : 'Arrêté'}
          </p>
        </div>
        <div className="rounded-xl bg-white/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Frames analysées</p>
          <p className="mt-1 text-xl font-black text-white">{frameCount}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total frames</p>
          <p className="mt-1 text-xl font-black text-white">{frames.length}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Détections/sec</p>
          <p className="mt-1 text-xl font-black text-white">{isAnalyzing ? '~15' : '0'}</p>
        </div>
      </div>

      <button
        onClick={onToggleRecording}
        disabled={!onToggleRecording}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-emerald-500 hover:bg-emerald-600'
        }`}
      >
        {isRecording ? <Square className="size-4" /> : <Video className="size-4" />}
        {isRecording ? 'Arrêter l\'enregistrement' : 'Enregistrer la vidéo (overlay)'}
      </button>

      <button
        onClick={onExport}
        disabled={frames.length === 0}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 font-bold text-white transition hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="size-4" />
        Exporter l'analyse (JSON)
      </button>
    </div>
  )
}

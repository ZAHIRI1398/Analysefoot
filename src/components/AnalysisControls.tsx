import { Download, BarChart3, Cpu } from 'lucide-react'
import { AnalysisFrame } from '../services/analysisService'

interface AnalysisControlsProps {
  isAnalyzing: boolean
  frameCount: number
  frames: AnalysisFrame[]
  useRealAPI: boolean
  setUseRealAPI: (value: boolean) => void
  onExport: () => void
}

export function AnalysisControls({ isAnalyzing, frameCount, frames, useRealAPI, setUseRealAPI, onExport }: AnalysisControlsProps) {
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

      <div className="mb-4 flex items-center gap-3">
        <Cpu className="size-4 text-emerald-300" />
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-200">
          <input
            type="checkbox"
            checked={useRealAPI}
            onChange={(e) => setUseRealAPI(e.target.checked)}
            className="size-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
          />
          Utiliser l'API réelle (backend)
        </label>
      </div>

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
        onClick={onExport}
        disabled={frames.length === 0}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 font-bold text-white transition hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="size-4" />
        Exporter l'analyse (JSON)
      </button>
    </div>
  )
}

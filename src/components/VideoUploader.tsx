import { useRef, useState } from 'react'
import { Upload, X, Play, Pause } from 'lucide-react'

interface VideoUploaderProps {
  onVideoSelected: (url: string) => void
  isAnalyzing: boolean
  onToggleAnalysis: () => void
}

export function VideoUploader({ onVideoSelected, isAnalyzing, onToggleAnalysis }: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('video/')) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
      setVideoFile(file)
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      onVideoSelected(url)
    }
  }

  const handleRemoveVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
    }
    setVideoFile(null)
    setVideoUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6 backdrop-blur">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-slate-950">
          <Upload className="size-5" />
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-200">Upload</p>
          <h3 className="text-lg font-black">Charger une vidéo de match</h3>
        </div>
      </div>

      {!videoFile ? (
        <div className="rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.02] p-8 text-center transition hover:border-emerald-400/50 hover:bg-white/[0.04]">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
            id="video-upload"
          />
          <label
            htmlFor="video-upload"
            className="flex cursor-pointer flex-col items-center gap-3"
          >
            <div className="grid size-16 place-items-center rounded-2xl bg-white/10">
              <Upload className="size-8 text-slate-300" />
            </div>
            <div>
              <p className="font-bold text-white">Cliquez pour sélectionner une vidéo</p>
              <p className="mt-1 text-sm text-slate-400">MP4, WebM, MOV (max 500MB)</p>
            </div>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-400/20 text-emerald-300">
                <Play className="size-5" />
              </div>
              <div>
                <p className="font-bold text-white">{videoFile.name}</p>
                <p className="text-sm text-slate-400">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              onClick={handleRemoveVideo}
              className="rounded-xl bg-red-500/20 p-2 text-red-300 transition hover:bg-red-500/30"
            >
              <X className="size-5" />
            </button>
          </div>

          <button
            onClick={onToggleAnalysis}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold transition ${
              isAnalyzing
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-emerald-400 text-slate-950 hover:bg-lime-300'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Pause className="size-5" />
                Arrêter l'analyse
              </>
            ) : (
              <>
                <Play className="size-5" />
                Démarrer l'analyse
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

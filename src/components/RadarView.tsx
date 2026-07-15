import { motion } from 'framer-motion'

interface RadarViewProps {
  positions: Array<{ x: number; y: number; team: 'home' | 'away'; id: number }>
}

export function RadarView({ positions }: RadarViewProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6 backdrop-blur">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-slate-950">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            <path d="M2 12h20" />
          </svg>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-200">Tactique</p>
          <h3 className="text-lg font-black">Vue radar</h3>
        </div>
      </div>

      <div className="relative aspect-[105/68] overflow-hidden rounded-2xl border border-white/10 bg-[#0a1f0a]">
        {/* Field markings */}
        <div className="absolute inset-0">
          {/* Outer boundary */}
          <div className="absolute left-[5%] top-[5%] h-[90%] w-[90%] border-2 border-white/20" />
          
          {/* Center line */}
          <div className="absolute left-1/2 top-[5%] h-[90%] w-0 border-l-2 border-white/20" />
          
          {/* Center circle */}
          <div className="absolute left-1/2 top-1/2 h-[20%] w-[20%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
          
          {/* Left penalty area */}
          <div className="absolute left-[5%] top-[25%] h-[50%] w-[15%] border-2 border-white/20" />
          <div className="absolute left-[5%] top-[35%] h-[30%] w-[8%] border-2 border-white/20" />
          
          {/* Right penalty area */}
          <div className="absolute right-[5%] top-[25%] h-[50%] w-[15%] border-2 border-white/20" />
          <div className="absolute right-[5%] top-[35%] h-[30%] w-[8%] border-2 border-white/20" />
          
          {/* Goals */}
          <div className="absolute left-[5%] top-[42%] h-[16%] w-[2%] border-2 border-white/20" />
          <div className="absolute right-[5%] top-[42%] h-[16%] w-[2%] border-2 border-white/20" />
        </div>

        {/* Players */}
        {positions.map((player, index) => (
          <motion.div
            key={`${player.team}-${player.id}`}
            className={`absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-[9px] font-black ${
              player.team === 'home' 
                ? 'border-cyan-100 bg-cyan-400 text-slate-950' 
                : 'border-lime-100 bg-lime-300 text-slate-950'
            }`}
            style={{ left: `${player.x}%`, top: `${player.y}%` }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            {player.id}
          </motion.div>
        ))}

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex gap-2 rounded-xl bg-slate-950/80 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-full bg-cyan-400" />
            <span className="text-xs font-bold text-white">Équipe domicile</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-full bg-lime-300" />
            <span className="text-xs font-bold text-white">Équipe extérieure</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Joueurs</p>
          <p className="text-xl font-black text-white">{positions.length}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Domicile</p>
          <p className="text-xl font-black text-cyan-300">{positions.filter(p => p.team === 'home').length}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Extérieur</p>
          <p className="text-xl font-black text-lime-300">{positions.filter(p => p.team === 'away').length}</p>
        </div>
      </div>
    </div>
  )
}

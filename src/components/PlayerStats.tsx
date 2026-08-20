import { PlayerStats } from '../types/playerStats'
import { Activity, Users } from 'lucide-react'
import { useState } from 'react'
import { playerStatsService } from '../services/playerStatsService'

interface PlayerStatsViewProps {
  stats: PlayerStats[]
  selectedPlayerId: number | null
  onSelectPlayer: (id: number | null) => void
  homePossession?: number
  awayPossession?: number
  onPlayersMerged?: () => void
}

export function PlayerStatsView({ stats, selectedPlayerId, onSelectPlayer, homePossession = 50, awayPossession = 50, onPlayersMerged }: PlayerStatsViewProps) {
  console.log('[PlayerStatsView] stats', stats.length, stats[0])
  const homePlayers = stats.filter(p => p.team === 'home')
  const awayPlayers = stats.filter(p => p.team === 'away')

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Statistiques des Joueurs</h3>
          {selectedPlayerId && (
            <button
              onClick={() => onSelectPlayer(null)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Désélectionner
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-emerald-300">
          <Users className="w-4 h-4" />
          <h4 className="text-sm font-bold">Regrouper les IDs d'un joueur</h4>
        </div>
        <PlayerMergeForm onMerge={onPlayersMerged} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Home Team */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-emerald-400">Équipe Domicile</h4>
          <div className="space-y-2">
            {homePlayers.map(player => (
              <PlayerCard
                key={player.id}
                stats={player}
                isSelected={selectedPlayerId === player.id}
                onClick={() => onSelectPlayer(player.id)}
              />
            ))}
          </div>
        </div>

        {/* Away Team */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-blue-400">Équipe Extérieur</h4>
          <div className="space-y-2">
            {awayPlayers.map(player => (
              <PlayerCard
                key={player.id}
                stats={player}
                isSelected={selectedPlayerId === player.id}
                onClick={() => onSelectPlayer(player.id)}
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

interface PlayerCardProps {
  stats: PlayerStats
  isSelected: boolean
  onClick: () => void
}

function PlayerCard({ stats, isSelected, onClick }: PlayerCardProps) {
  const teamColor = stats.team === 'home' ? 'border-emerald-500/30' : 'border-blue-500/30'
  const selectedBg = isSelected ? 'bg-white/10' : 'bg-white/[0.02]'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border ${teamColor} ${selectedBg} hover:bg-white/5 transition-all`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            stats.team === 'home' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
          }`}>
            {stats.jerseyNumber || stats.id}
          </div>
          <span className="text-white font-medium">{stats.name || `Joueur #${stats.jerseyNumber || stats.id}`}</span>
        </div>
        <Activity className={`w-4 h-4 ${stats.team === 'home' ? 'text-emerald-400' : 'text-blue-400'}`} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-400">Distance</p>
          <p className="text-white font-semibold">{stats.totalDistance.toFixed(0)}m</p>
        </div>
        <div>
          <p className="text-slate-400">Touches</p>
          <p className="text-white font-semibold">{stats.touches}</p>
        </div>
      </div>
    </button>
  )
}

interface PlayerMergeFormProps {
  onMerge?: () => void
}

function PlayerMergeForm({ onMerge }: PlayerMergeFormProps) {
  const [name, setName] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const [ids, setIds] = useState('')
  const [error, setError] = useState('')

  const handleMerge = () => {
    const parsed = ids
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => Number(s))
      .filter(n => !isNaN(n) && n > 0)

    if (parsed.length < 2) {
      setError('Entrez au moins 2 IDs (le premier sera conservé).')
      return
    }

    const [targetId, ...sourceIds] = parsed
    const jersey = jerseyNumber.trim() ? Number(jerseyNumber.trim()) : undefined
    playerStatsService.mergePlayers(targetId, sourceIds, name.trim() || undefined, jersey)
    setError('')
    setIds('')
    onMerge?.()
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          type="text"
          placeholder="Nom du joueur"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
        <input
          type="number"
          placeholder="N° maillot"
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
        <input
          type="text"
          placeholder="IDs à fusionner (ex: 3, 5, 7)"
          value={ids}
          onChange={(e) => setIds(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={handleMerge}
        className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-600 transition"
      >
        Regrouper et voir les statistiques
      </button>
    </div>
  )
}

import { PlayerStats } from '../types/playerStats'
import { Activity } from 'lucide-react'

interface PlayerStatsViewProps {
  stats: PlayerStats[]
  selectedPlayerId: number | null
  onSelectPlayer: (id: number | null) => void
  homePossession?: number
  awayPossession?: number
}

export function PlayerStatsView({ stats, selectedPlayerId, onSelectPlayer, homePossession = 50, awayPossession = 50 }: PlayerStatsViewProps) {
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
          <span className="text-white font-medium">Joueur #{stats.jerseyNumber || stats.id}</span>
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


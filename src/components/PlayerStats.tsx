import { PlayerStats } from '../types/playerStats'
import { Activity, Zap, Footprints, MapPin, Timer } from 'lucide-react'

interface PlayerStatsViewProps {
  stats: PlayerStats[]
  selectedPlayerId: number | null
  onSelectPlayer: (id: number | null) => void
}

export function PlayerStatsView({ stats, selectedPlayerId, onSelectPlayer }: PlayerStatsViewProps) {
  const homePlayers = stats.filter(p => p.team === 'home')
  const awayPlayers = stats.filter(p => p.team === 'away')

  return (
    <div className="space-y-6">
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

      {/* Selected Player Detail */}
      {selectedPlayerId && (
        <PlayerDetailView stats={stats.find(p => p.id === selectedPlayerId)} />
      )}
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
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-slate-400">Distance</p>
          <p className="text-white font-semibold">{stats.totalDistance.toFixed(0)}m</p>
        </div>
        <div>
          <p className="text-slate-400">Vitesse moy.</p>
          <p className="text-white font-semibold">{stats.averageSpeed.toFixed(1)} km/h</p>
        </div>
        <div>
          <p className="text-slate-400">Touches</p>
          <p className="text-white font-semibold">{stats.touches}</p>
        </div>
      </div>
    </button>
  )
}

interface PlayerDetailViewProps {
  stats?: PlayerStats
}

function PlayerDetailView({ stats }: PlayerDetailViewProps) {
  if (!stats) return null

  const teamColor = stats.team === 'home' ? 'text-emerald-400' : 'text-blue-400'

  return (
    <div className="mt-6 p-6 rounded-2xl border border-white/10 bg-white/[0.05]">
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
          stats.team === 'home' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {stats.jerseyNumber || stats.id}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Joueur #{stats.jerseyNumber || stats.id}</h3>
          <p className={`text-sm ${teamColor}`}>{stats.team === 'home' ? 'Équipe Domicile' : 'Équipe Extérieur'}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Footprints}
          label="Distance Totale"
          value={`${stats.totalDistance.toFixed(0)} m`}
          color="emerald"
        />
        <StatCard
          icon={Zap}
          label="Vitesse Maximale"
          value={`${stats.maxSpeed.toFixed(1)} km/h`}
          color="yellow"
        />
        <StatCard
          icon={Activity}
          label="Vitesse Moyenne"
          value={`${stats.averageSpeed.toFixed(1)} km/h`}
          color="blue"
        />
        <StatCard
          icon={MapPin}
          label="Sprints"
          value={stats.sprintCount.toString()}
          color="red"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3 mt-6">
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-4 h-4 text-slate-400" />
            <p className="text-sm text-slate-400">Temps par Zone</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Défensif</span>
              <span className="text-white font-medium">{stats.timeInDefensiveThird.toFixed(0)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Milieu</span>
              <span className="text-white font-medium">{stats.timeInMidfield.toFixed(0)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Attaque</span>
              <span className="text-white font-medium">{stats.timeInAttackingThird.toFixed(0)}s</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <p className="text-sm text-slate-400 mb-3">Touches de balle</p>
          <p className="text-2xl font-bold text-white">{stats.touches}</p>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <p className="text-sm text-slate-400 mb-3">Position Moyenne</p>
          <p className="text-2xl font-bold text-white">
            ({stats.averagePosition.x.toFixed(0)}%, {stats.averagePosition.y.toFixed(0)}%)
          </p>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: any
  label: string
  value: string
  color: 'emerald' | 'yellow' | 'blue' | 'red'
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    emerald: 'text-emerald-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    red: 'text-red-400',
  }

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <Icon className={`w-6 h-6 ${colorClasses[color]} mb-2`} />
      <p className="text-sm text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  )
}

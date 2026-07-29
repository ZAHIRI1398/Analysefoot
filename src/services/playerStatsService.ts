import { PlayerStats, TeamStats } from '../types/playerStats'
import type { Detection } from './analysisService'

export class PlayerStatsService {
  private playerStats: Map<number, PlayerStats> = new Map()
  private teamStats: { home: TeamStats; away: TeamStats } = {
    home: {
      team: 'home',
      possession: 50,
      totalDistance: 0,
      averageSpeed: 0,
      passCount: 0,
      shotCount: 0,
    },
    away: {
      team: 'away',
      possession: 50,
      totalDistance: 0,
      averageSpeed: 0,
      passCount: 0,
      shotCount: 0,
    },
  }
  private lastPositions: Map<number, { x: number; y: number; timestamp: number }> = new Map()
  private fieldWidth = 105 // mètres
  private fieldHeight = 68 // mètres

  initializePlayer(playerId: number, team: 'home' | 'away', jerseyNumber?: number) {
    if (!this.playerStats.has(playerId)) {
      console.log('[PlayerStatsService] initializePlayer', playerId, team)
      this.playerStats.set(playerId, {
        id: playerId,
        team,
        jerseyNumber,
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        sprintCount: 0,
        frameCount: 0,
        averagePosition: { x: 50, y: 50 },
        positionHeatmap: [],
        timeInPossession: 0,
        touches: 0,
        timeInDefensiveThird: 0,
        timeInMidfield: 0,
        timeInAttackingThird: 0,
      })
    }
  }

  updatePlayerPosition(
    playerId: number,
    x: number, // position en pourcentage (0-100)
    y: number,
    timestamp: number
  ) {
    const stats = this.playerStats.get(playerId)
    if (!stats) return

    const lastPos = this.lastPositions.get(playerId)
    
    // Convertir en mètres
    const currentXMeters = (x / 100) * this.fieldWidth
    const currentYMeters = (y / 100) * this.fieldHeight

    if (lastPos) {
      const timeDiff = (timestamp - lastPos.timestamp) / 1000 // en secondes
      console.log('[PlayerStatsService] updatePlayerPosition', playerId, x, y, 'timeDiff', timeDiff)

      if (timeDiff > 0) {
        // Capper les sauts temporels à 3s pour éviter des vitesses aberrantes
        const effectiveTimeDiff = Math.min(timeDiff, 3)
        const lastXMeters = (lastPos.x / 100) * this.fieldWidth
        const lastYMeters = (lastPos.y / 100) * this.fieldHeight

        const distance = Math.sqrt(
          Math.pow(currentXMeters - lastXMeters, 2) +
          Math.pow(currentYMeters - lastYMeters, 2)
        )

        // Limiter la vitesse à des valeurs réalistes (max 40 km/h pour un footballeur)
        const speed = Math.min((distance / effectiveTimeDiff) * 3.6, 40) // en km/h

        stats.totalDistance += distance
        stats.averageSpeed = (stats.averageSpeed * (stats.frameCount || 0) + speed) / ((stats.frameCount || 0) + 1)
        stats.maxSpeed = Math.max(stats.maxSpeed, speed)

        // Compter les sprints (vitesse > 25 km/h)
        if (speed > 25) {
          stats.sprintCount++
        }

        // Mettre à jour la position moyenne avec le compteur du joueur
        stats.averagePosition = {
          x: (stats.averagePosition.x * (stats.frameCount || 0) + x) / ((stats.frameCount || 0) + 1),
          y: (stats.averagePosition.y * (stats.frameCount || 0) + y) / ((stats.frameCount || 0) + 1),
        }

        // Ajouter à la heatmap
        stats.positionHeatmap.push({ x, y, intensity: 1 })
        if (stats.positionHeatmap.length > 1000) {
          stats.positionHeatmap.shift()
        }

        // Calculer le temps passé dans chaque zone avec le vrai intervalle
        if (stats.team === 'home') {
          if (x < 33) {
            stats.timeInDefensiveThird += effectiveTimeDiff
          } else if (x > 66) {
            stats.timeInAttackingThird += effectiveTimeDiff
          } else {
            stats.timeInMidfield += effectiveTimeDiff
          }
        } else {
          if (x > 66) {
            stats.timeInDefensiveThird += effectiveTimeDiff
          } else if (x < 33) {
            stats.timeInAttackingThird += effectiveTimeDiff
          } else {
            stats.timeInMidfield += effectiveTimeDiff
          }
        }

        stats.frameCount++
      }
    } else {
      // Première position connue : juste stocker sans calculer de vitesse/temps
      stats.positionHeatmap.push({ x, y, intensity: 1 })
    }

    this.lastPositions.set(playerId, { x, y, timestamp })
  }

  recordTouch(playerId: number) {
    const stats = this.playerStats.get(playerId)
    if (stats) {
      stats.touches++
    }
  }

  recordPossession(playerId: number, duration: number) {
    const stats = this.playerStats.get(playerId)
    if (stats) {
      stats.timeInPossession += duration
    }
 }

  getPlayerStats(playerId: number): PlayerStats | undefined {
    return this.playerStats.get(playerId)
  }

  getAllPlayerStats(): PlayerStats[] {
    const stats = Array.from(this.playerStats.values())
    console.log('[PlayerStatsService] getAllPlayerStats', stats.length)
    return stats
  }

  getTeamStats(team: 'home' | 'away'): TeamStats {
    const players = Array.from(this.playerStats.values()).filter(p => p.team === team)
    
    const totalDistance = players.reduce((sum, p) => sum + p.totalDistance, 0)
    const averageSpeed = players.length > 0 
      ? players.reduce((sum, p) => sum + p.averageSpeed, 0) / players.length 
      : 0
    
    return {
      team,
      possession: this.teamStats[team].possession,
      totalDistance,
      averageSpeed,
      passCount: this.teamStats[team].passCount,
      shotCount: this.teamStats[team].shotCount,
    }
  }

  updateTeamPossession(homePossession: number) {
    this.teamStats.home.possession = homePossession
    this.teamStats.away.possession = 100 - homePossession
  }

  recordPass(team: 'home' | 'away') {
    this.teamStats[team].passCount++
  }

  recordShot(team: 'home' | 'away') {
    this.teamStats[team].shotCount++
  }

  reset() {
    this.playerStats.clear()
    this.lastPositions.clear()
    this.teamStats = {
      home: {
        team: 'home',
        possession: 50,
        totalDistance: 0,
        averageSpeed: 0,
        passCount: 0,
        shotCount: 0,
      },
      away: {
        team: 'away',
        possession: 50,
        totalDistance: 0,
        averageSpeed: 0,
        passCount: 0,
        shotCount: 0,
      },
    }
  }

  exportStats() {
    return {
      players: Array.from(this.playerStats.values()),
      teams: this.teamStats,
      timestamp: new Date().toISOString(),
    }
  }
}

export const playerStatsService = new PlayerStatsService()

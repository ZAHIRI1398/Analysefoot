export interface PlayerStats {
  id: number
  team: 'home' | 'away'
  jerseyNumber?: number
  name?: string
  
  // Mouvement
  totalDistance: number // en mètres
  averageSpeed: number // en km/h
  maxSpeed: number // en km/h
  sprintCount: number
  
  // Position
  averagePosition: { x: number; y: number } // position moyenne sur le terrain
  positionHeatmap: Array<{ x: number; y: number; intensity: number }>
  
  // Activité
  timeInPossession: number // en secondes
  touches: number
  
  // Zones
  timeInDefensiveThird: number // en secondes
  timeInMidfield: number // en secondes
  timeInAttackingThird: number // en secondes
  
  // Internal
  frameCount: number

  // Performance
  passAccuracy?: number // pourcentage
  shotCount?: number
}

export interface TeamStats {
  team: 'home' | 'away'
  possession: number // pourcentage
  totalDistance: number
  averageSpeed: number
  passCount: number
  shotCount: number
}

export interface Player {
  id: string;
  name: string;
}

// A round is a map of player IDs to their score for that round
export interface RoundScores {
  [playerId: string]: number;
}

export type GameHistory = RoundScores[];
// Golf Scoring Utilities for Straight and Champagne Scramble

export type PlayerScore = {
  name: string;
  handicap: number;
  holeScores: number[]; // Gross scores for each hole
};

export type TeamData = {
  teamName: string;
  players: PlayerScore[];
  holeCount: number;
  scrambleMode: "straight" | "champagne";
};

export type ScoringResult = {
  grossTotal: number;
  teamHandicap: number;
  netScore?: number; // For straight scramble
  pointsTotal?: number; // For champagne scramble
  breakdown?: string; // Detailed scoring breakdown
};

// Standard stroke index for 18 holes (hole difficulty ranking)
const STROKE_INDEX_18: number[] = [10, 4, 14, 2, 16, 8, 12, 6, 18, 11, 1, 15, 7, 17, 5, 13, 3, 9];

/**
 * Calculate team handicap for Straight Scramble
 * Formula: (Sum of Individual Player Handicaps) × 0.10, rounded to nearest whole number
 */
export function calculateTeamHandicap(playerHandicaps: number[]): number {
  const sum = playerHandicaps.reduce((acc, h) => acc + h, 0);
  return Math.round(sum * 0.1);
}

/**
 * Calculate gross total from hole scores
 */
export function calculateGrossTotal(holeScores: number[]): number {
  return holeScores.reduce((acc, score) => acc + score, 0);
}

/**
 * Calculate Straight Scramble Net Score
 * Team Net Score = Team Gross Score − Team Handicap
 */
export function calculateStraightScramble(teamData: TeamData): ScoringResult {
  const playerHandicaps = teamData.players.map((p) => p.handicap);
  const teamHandicap = calculateTeamHandicap(playerHandicaps);

  // Assume first player has team gross scores (or sum from all players)
  const grossTotal = calculateGrossTotal(teamData.players[0].holeScores);
  const netScore = grossTotal - teamHandicap;

  return {
    grossTotal,
    teamHandicap,
    netScore,
    breakdown: `Gross: ${grossTotal}, Team HCP: ${teamHandicap}, Net: ${netScore}`,
  };
}

/**
 * Get stroke index for a hole number, scaled for hole count
 */
function getStrokeIndex(holeNumber: number, totalHoles: number): number {
  if (totalHoles === 18) {
    return STROKE_INDEX_18[holeNumber - 1];
  }

  // Scale stroke index for 13 or 16 hole events
  // Use proportional distribution based on 18-hole index
  const scaledIndex = Math.floor(((holeNumber - 1) / totalHoles) * 18);
  return STROKE_INDEX_18[scaledIndex];
}

/**
 * Calculate handicap strokes allocated to a specific hole for a player
 */
function getHoleHandicapStrokes(playerHandicap: number, holeNumber: number, totalHoles: number): number {
  const strokeIndex = getStrokeIndex(holeNumber, totalHoles);

  // Player gets 1 stroke on holes where their handicap >= stroke index
  if (playerHandicap >= strokeIndex) {
    return 1;
  }

  // For high handicappers, they get 2 strokes on easier holes
  if (playerHandicap >= strokeIndex + 18) {
    return 2;
  }

  return 0;
}

/**
 * Convert net score to Stableford points
 * Assumes par 4 for all holes (can be enhanced with actual par data)
 */
function netScoreToStableford(netScore: number, par: number = 4): number {
  const scoreToPar = netScore - par;

  if (scoreToPar >= 2) return 0; // Double bogey or worse
  if (scoreToPar === 1) return 1; // Bogey
  if (scoreToPar === 0) return 2; // Par
  if (scoreToPar === -1) return 3; // Birdie
  if (scoreToPar === -2) return 4; // Eagle
  if (scoreToPar === -3) return 5; // Albatross
  if (scoreToPar === -4) return 6; // Condor

  return 0;
}

/**
 * Calculate Champagne Scramble (Stableford Best-Ball)
 * Steps:
 * 1. Allocate handicap strokes to each hole for each player
 * 2. Calculate net score per hole per player
 * 3. Convert net score to Stableford points
 * 4. Take best (highest) points from any teammate for each hole
 * 5. Sum all best-hole points for team total
 */
export function calculateChampagneScramble(teamData: TeamData): ScoringResult {
  const { players, holeCount } = teamData;
  const playerHandicaps = players.map((p) => p.handicap);
  const teamHandicap = calculateTeamHandicap(playerHandicaps);

  let teamPointsTotal = 0;
  const holeBreakdown: string[] = [];

  // Calculate gross total (sum first player's scores for team gross)
  const grossTotal = calculateGrossTotal(players[0].holeScores);

  // Process each hole
  for (let holeNum = 1; holeNum <= holeCount; holeNum++) {
    const holeIndex = holeNum - 1;
    let bestPoints = 0;

    // Calculate points for each player on this hole
    for (const player of players) {
      const grossScore = player.holeScores[holeIndex];
      const handicapStrokes = getHoleHandicapStrokes(player.handicap, holeNum, holeCount);
      const netScore = grossScore - handicapStrokes;
      const points = netScoreToStableford(netScore);

      if (points > bestPoints) {
        bestPoints = points;
      }
    }

    teamPointsTotal += bestPoints;
    holeBreakdown.push(`H${holeNum}: ${bestPoints}pts`);
  }

  return {
    grossTotal,
    teamHandicap,
    pointsTotal: teamPointsTotal,
    breakdown: `Total Points: ${teamPointsTotal} (${holeBreakdown.join(", ")})`,
  };
}

/**
 * Main scoring function that routes to appropriate algorithm
 */
export function calculateTeamScore(teamData: TeamData): ScoringResult {
  if (teamData.scrambleMode === "straight") {
    return calculateStraightScramble(teamData);
  } else {
    return calculateChampagneScramble(teamData);
  }
}

/**
 * Compare two teams for tie-breaking
 * Returns: -1 if team1 wins, 1 if team2 wins, 0 if still tied
 * 
 * Tie-breaking hierarchy:
 * 1. Lower gross total
 * 2. Lower team handicap
 * 3. Shared position (return 0)
 */
export function breakTie(
  team1: { grossTotal: number; teamHandicap: number },
  team2: { grossTotal: number; teamHandicap: number }
): number {
  // Primary: Lower gross total wins
  if (team1.grossTotal !== team2.grossTotal) {
    return team1.grossTotal < team2.grossTotal ? -1 : 1;
  }

  // Secondary: Lower team handicap wins
  if (team1.teamHandicap !== team2.teamHandicap) {
    return team1.teamHandicap < team2.teamHandicap ? -1 : 1;
  }

  // Tertiary: Shared position
  return 0;
}

/**
 * Sort teams and assign ranks
 * For straight scramble: lower net score wins
 * For champagne scramble: higher points total wins
 */
export function rankTeams(
  teams: Array<{
    id: number;
    scrambleMode: "straight" | "champagne";
    netScore?: number;
    pointsTotal?: number;
    grossTotal: number;
    teamHandicap: number;
  }>
): Array<{ id: number; rank: number }> {
  // Separate teams by scramble mode
  const straightTeams = teams.filter((t) => t.scrambleMode === "straight");
  const champagneTeams = teams.filter((t) => t.scrambleMode === "champagne");

  const rankings: Array<{ id: number; rank: number }> = [];

  // Rank straight scramble teams (lower net score wins)
  straightTeams.sort((a, b) => {
    if (a.netScore !== b.netScore) {
      return (a.netScore || 0) - (b.netScore || 0);
    }
    return breakTie(a, b);
  });

  straightTeams.forEach((team, index) => {
    rankings.push({ id: team.id, rank: index + 1 });
  });

  // Rank champagne scramble teams (higher points wins)
  champagneTeams.sort((a, b) => {
    if (a.pointsTotal !== b.pointsTotal) {
      return (b.pointsTotal || 0) - (a.pointsTotal || 0);
    }
    return breakTie(a, b);
  });

  champagneTeams.forEach((team, index) => {
    rankings.push({ id: team.id, rank: index + 1 });
  });

  return rankings;
}

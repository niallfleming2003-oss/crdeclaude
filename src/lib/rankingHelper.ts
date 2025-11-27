import { rankTeams } from "./scoring";

export type TeamForRanking = {
  id: number;
  scrambleMode: "straight" | "champagne";
  netScore?: number;
  pointsTotal?: number;
  grossTotal: number;
  teamHandicap: number;
};

/**
 * Calculate and apply ranks to teams
 */
export function applyRankings<T extends TeamForRanking>(teams: T[]): Array<T & { rank: number }> {
  if (teams.length === 0) {
    return [];
  }

  const rankings = rankTeams(teams);
  const rankMap = new Map(rankings.map((r) => [r.id, r.rank]));

  return teams.map((team) => ({
    ...team,
    rank: rankMap.get(team.id) || 0,
  }));
}

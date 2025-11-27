import type { EntityConfig } from "../hooks/useEntity";

export const teamEntityConfig: EntityConfig = {
  name: "Team",
  orderBy: "created_at ASC",
  properties: {
    eventId: { type: "integer", description: "Reference to parent event" },
    teamName: { type: "string", description: "Team name (Irish county or default)" },
    scrambleMode: {
      type: "string",
      enum: ["straight", "champagne"],
      description: "Scoring mode: straight or champagne",
    },
    playerNames: { type: "string", description: "JSON array of player names" },
    playerHandicaps: { type: "string", description: "JSON array of player handicaps" },
    holeCount: { type: "integer", description: "Number of holes played (13, 16, or 18)" },
    grossTotal: { type: "integer", description: "Total gross score" },
    teamHandicap: { type: "integer", description: "Calculated team handicap" },
    netScore: { type: "integer", description: "Net score for straight scramble" },
    pointsTotal: { type: "integer", description: "Points total for champagne scramble" },
    rank: { type: "integer", description: "Team ranking position" },
    holeScores: { type: "string", description: "JSON array of hole-by-hole scores for all players" },
  },
  required: ["eventId", "teamName", "scrambleMode", "playerNames", "playerHandicaps", "holeCount"],
};

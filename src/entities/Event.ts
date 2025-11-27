import type { EntityConfig } from "../hooks/useEntity";

export const eventEntityConfig: EntityConfig = {
  name: "Event",
  orderBy: "created_at DESC",
  properties: {
    eventDate: { type: "string", description: "Event date in ISO format" },
    holeCount: { type: "integer", description: "Number of holes (9, 13, 16, or 18)" },
    scrambleMode: {
      type: "string",
      enum: ["straight", "champagne"],
      description: "Scramble format for the event",
    },
    status: {
      type: "string",
      enum: ["active", "published", "archived"],
      default: "active",
      description: "Event publication status",
    },
    teamCount: { type: "integer", default: "0", description: "Number of teams in event" },
    publishedAt: { type: "string", description: "Timestamp when results were published", default: "" },
  },
  required: ["eventDate", "holeCount", "scrambleMode", "status"],
};

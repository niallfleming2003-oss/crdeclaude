import type { EntityConfig } from "../hooks/useEntity";

export const scorecardEntityConfig: EntityConfig = {
  name: "Scorecard",
  orderBy: "created_at DESC",
  properties: {
    eventId: { type: "integer", description: "Reference to parent event" },
    teamId: { type: "integer", description: "Reference to team created from this scorecard" },
    imageUrl: { type: "string", description: "Path to uploaded scorecard image" },
    ocrData: { type: "string", description: "JSON blob of OCR extracted data" },
    scrambleMode: {
      type: "string",
      enum: ["straight", "champagne"],
      description: "User-selected scramble mode",
    },
    holeCount: { type: "integer", description: "Detected or user-specified hole count" },
    processingStatus: {
      type: "string",
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      description: "OCR processing status",
    },
  },
  required: ["eventId", "imageUrl"],
};

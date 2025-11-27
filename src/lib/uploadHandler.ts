import { calculateTeamScore } from "./scoring";
import { extractScorecardData } from "./ocr";
import { uploadImageToStorage } from "./storage";

/**
 * Process uploaded scorecards and create team records
 * Handles upload ¨ OCR ¨ scoring ¨ team creation
 */
export async function processUploadedScorecard(
  eventId: number,
  file: File,
  _holeCount: number,
  scrambleMode: "straight" | "champagne",
  onTeamCreated: (teamData: {
    eventId: number;
    teamName: string;
    scrambleMode: "straight" | "champagne";
    playerNames: string;
    playerHandicaps: string;
    holeCount: number;
    grossTotal: number;
    teamHandicap: number;
    netScore?: number;
    pointsTotal?: number;
    rank: number;
    holeScores: string;
  }) => Promise<void>
) {
  try {
    // Step 1: Upload image to Google Cloud Storage via backend
    console.log("Uploading image to storage...");
    const imageUrl = await uploadImageToStorage(file);
    console.log("Image uploaded:", imageUrl);

    // Step 2: Extract scorecard data using Google Cloud Vision OCR
    console.log("Extracting scorecard data with OCR...");
    const ocrData = await extractScorecardData(imageUrl);
    console.log("OCR extraction complete:", {
      players: ocrData.playerNames.length,
      holes: ocrData.detectedHoleCount,
      confidence: ocrData.confidence,
    });

    // Step 3: Validate / normalise extracted data

    if (!ocrData.playerNames || ocrData.playerNames.length === 0) {
      throw new Error(
        "No players detected in scorecard. Please ensure scorecard is legible."
      );
    }

    // Ensure handicaps array has same length as playerNames (pad missing as 0)
    let playerHandicaps = ocrData.playerHandicaps || [];
    if (playerHandicaps.length < ocrData.playerNames.length) {
      const missing = ocrData.playerNames.length - playerHandicaps.length;
      console.warn(
        `Only ${playerHandicaps.length} handicaps found for ${ocrData.playerNames.length} players. Padding missing with 0.`
      );
      playerHandicaps = [
        ...playerHandicaps,
        ...Array.from({ length: missing }, () => 0),
      ];
    }

    // Ensure holeScores has one row per player
    const holeScores =
      ocrData.holeScores && ocrData.holeScores.length > 0
        ? ocrData.holeScores
        : ocrData.playerNames.map(() =>
            Array.from(
              { length: ocrData.detectedHoleCount || 18 },
              () => 0
            )
          );

    // Step 4: Calculate team score using extracted data
    const scoringResult = calculateTeamScore({
      teamName: ocrData.teamName || "Unnamed Team",
      players: ocrData.playerNames.map((name, idx) => ({
        name,
        handicap: playerHandicaps[idx] ?? 0,
        holeScores: holeScores[idx] || [],
      })),
      holeCount: ocrData.detectedHoleCount || 18,
      scrambleMode,
    });

    console.log("Scoring calculated:", {
      grossTotal: scoringResult.grossTotal,
      teamHandicap: scoringResult.teamHandicap,
      netScore: scoringResult.netScore,
      pointsTotal: scoringResult.pointsTotal,
    });

    // Step 5: Create team record
    await onTeamCreated({
      eventId,
      teamName: ocrData.teamName || "Team",
      scrambleMode,
      playerNames: JSON.stringify(ocrData.playerNames),
      playerHandicaps: JSON.stringify(playerHandicaps),
      holeCount: ocrData.detectedHoleCount || 18,
      grossTotal: scoringResult.grossTotal,
      teamHandicap: scoringResult.teamHandicap,
      netScore: scoringResult.netScore,
      pointsTotal: scoringResult.pointsTotal,
      rank: 0, // Will be recalculated after all uploads
      holeScores: JSON.stringify(holeScores),
    });

    console.log("Team created successfully:", ocrData.teamName);
  } catch (error) {
    console.error("Error processing scorecard:", error);
    throw error;
  }
}

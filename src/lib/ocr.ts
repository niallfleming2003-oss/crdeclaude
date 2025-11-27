const PROJECT_ID = import.meta.env.VITE_GOOGLE_PROJECT_ID;
const VISION_API_URL = "http://localhost:4000/api/vision";

export type OCRResult = {
  playerNames: string[];
  playerHandicaps: number[];
  holeScores: number[][];
  detectedHoleCount: number;
  teamName?: string;
  confidence: number;
};

type BoundingBox = {
  vertices: Array<{ x: number; y: number }>;
};

type TextAnnotation = {
  description: string;
  boundingPoly: BoundingBox;
};

/**
 * Extract scorecard data using FULL Vision API response with bounding boxes
 */
export async function extractScorecardData(
  imageUrl: string
): Promise<OCRResult> {
  if (!PROJECT_ID) {
    throw new Error("Missing VITE_GOOGLE_PROJECT_ID environment variable");
  }

  console.log("Sending image to OCR:", imageUrl);

  const response = await fetch(VISION_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageUrl, includeAnnotations: true }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    const msg =
      data?.error || data?.message || response.statusText || "Unknown Vision API error";
    console.error("Vision API error full response:", data);
    throw new Error(`Vision API error: ${msg}`);
  }

  // Get both text and structured annotations
  const fullText: string = data.text || "";
  const annotations: TextAnnotation[] = data.annotations || [];

  console.log("OCR received:", {
    textLength: fullText.length,
    annotationCount: annotations.length,
  });

  // Use spatial parsing if we have annotations, otherwise fall back to text parsing
  if (annotations && annotations.length > 0) {
    return parseScorecardWithBoundingBoxes(annotations, fullText);
  } else {
    console.warn("No bounding box data available, using fallback text parsing");
    return parseScorecard(fullText);
  }
}

/**
 * IMPROVED: Parse scorecard using bounding box positions
 */
function parseScorecardWithBoundingBoxes(
  annotations: TextAnnotation[],
  fullText: string
): OCRResult {
  // Helper to get Y position (vertical) of a bounding box
  const getY = (box: BoundingBox): number => {
    const vertices = box.vertices;
    return Math.min(...vertices.map((v) => v.y));
  };

  // Helper to get X position (horizontal) of a bounding box
  const getX = (box: BoundingBox): number => {
    const vertices = box.vertices;
    return Math.min(...vertices.map((v) => v.x));
  };

  // Group annotations by vertical position (rows)
  const rowGroups = groupByRows(annotations, 20); // 20px tolerance

  console.log(`Detected ${rowGroups.length} rows in scorecard`);

  // Find player rows (contain names and handicaps)
  const playerRows = findPlayerRows(rowGroups);
  console.log(`Found ${playerRows.length} player rows`);

  // Extract players
  const players = playerRows.map((row) => extractPlayer(row));

  // Detect hole count from header row
  const holeCount = detectHoleCount(rowGroups);
  console.log(`Detected hole count: ${holeCount}`);

  // Extract scores for each player
  const holeScores = players.map((player) =>
    extractScoresFromRow(player.row, holeCount)
  );

  const playerNames = players.map((p) => p.name);
  const playerHandicaps = players.map((p) => p.handicap);

  const hasRealScores = holeScores.some((row) => row.some((s) => s > 0));
  const confidence =
    playerNames.length >= 3 && hasRealScores ? 0.8 : playerNames.length >= 2 ? 0.6 : 0.4;

  return {
    playerNames,
    playerHandicaps,
    holeScores,
    detectedHoleCount: holeCount,
    teamName: generateTeamName(),
    confidence,
  };
}

/**
 * Group text annotations by vertical position (same Y = same row)
 */
function groupByRows(
  annotations: TextAnnotation[],
  tolerance: number
): TextAnnotation[][] {
  const sorted = [...annotations].sort((a, b) => {
    const yA = Math.min(...a.boundingPoly.vertices.map((v) => v.y));
    const yB = Math.min(...b.boundingPoly.vertices.map((v) => v.y));
    return yA - yB;
  });

  const rows: TextAnnotation[][] = [];
  let currentRow: TextAnnotation[] = [];
  let lastY = -1000;

  for (const ann of sorted) {
    const y = Math.min(...ann.boundingPoly.vertices.map((v) => v.y));

    if (lastY === -1000 || Math.abs(y - lastY) <= tolerance) {
      currentRow.push(ann);
      lastY = y;
    } else {
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [ann];
      lastY = y;
    }
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Find rows that likely contain player information
 */
function findPlayerRows(rows: TextAnnotation[][]): TextAnnotation[][] {
  const playerRows: TextAnnotation[][] = [];

  for (const row of rows) {
    const text = row.map((a) => a.description).join(" ");

    // Skip header rows
    if (/\b(hole|par|index|yard)/i.test(text)) continue;

    // Look for rows with names (letters) and numbers (handicaps/scores)
    const hasLetters = /[A-Za-z]{2,}/.test(text);
    const hasNumbers = /\d+/.test(text);

    // Look for explicit name indicators
    const hasNameMarker = /\bname\b/i.test(text);

    // Must have letters (for names) or explicit name marker
    if (hasLetters || hasNameMarker) {
      playerRows.push(row);
    }
  }

  return playerRows;
}

/**
 * Extract player name and handicap from a row
 */
function extractPlayer(row: TextAnnotation[]): {
  name: string;
  handicap: number;
  row: TextAnnotation[];
} {
  const tokens = row
    .map((a) => ({
      text: a.description,
      x: Math.min(...a.boundingPoly.vertices.map((v) => v.x)),
    }))
    .sort((a, b) => a.x - b.x); // Sort left to right

  let name = "";
  let handicap = 0;

  // Strategy 1: Find "Name" keyword, then grab following text
  const nameIdx = tokens.findIndex((t) => /^name$/i.test(t.text));
  if (nameIdx >= 0) {
    // Take words after "Name" that are letters (not numbers)
    const nameParts = tokens
      .slice(nameIdx + 1)
      .filter((t) => /^[A-Za-z.'\s]+$/.test(t.text))
      .map((t) => t.text);
    name = nameParts.slice(0, 3).join(" "); // Take up to 3 words
  } else {
    // Strategy 2: Take first alphabetic tokens as name
    const nameParts = tokens
      .filter((t) => /^[A-Za-z.'\s]+$/.test(t.text) && t.text.length > 1)
      .map((t) => t.text);
    name = nameParts.slice(0, 3).join(" ");
  }

  // Find handicap: look for "Hcap" or "Cap" followed by number
  const hcapIdx = tokens.findIndex((t) => /^(hcap|cap)$/i.test(t.text));
  if (hcapIdx >= 0 && hcapIdx < tokens.length - 1) {
    const nextToken = tokens[hcapIdx + 1].text;
    const num = parseInt(nextToken, 10);
    if (!isNaN(num) && num >= 0 && num <= 54) {
      handicap = num;
    }
  } else {
    // Look for standalone numbers in reasonable handicap range (0-36)
    const hcapCandidate = tokens.find((t) => {
      const num = parseInt(t.text, 10);
      return !isNaN(num) && num >= 0 && num <= 36;
    });
    if (hcapCandidate) {
      handicap = parseInt(hcapCandidate.text, 10);
    }
  }

  // Clean up name
  name = name
    .replace(/\b(name|hcap|cap|heap)\b/gi, "")
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return { name: name || "PLAYER", handicap, row };
}

/**
 * Detect hole count from scorecard (9, 13, 16, or 18)
 */
function detectHoleCount(rows: TextAnnotation[][]): number {
  // Look for a row with sequential numbers 1-18 or 1-9
  for (const row of rows) {
    const numbers = row
      .map((a) => parseInt(a.description, 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 18);

    if (numbers.length >= 6) {
      const max = Math.max(...numbers);
      if ([9, 13, 16, 18].includes(max)) return max;
      if (max >= 9 && max <= 18) return max;
    }
  }

  return 18; // Default
}

/**
 * Extract hole scores from a player row
 */
function extractScoresFromRow(
  row: TextAnnotation[],
  holeCount: number
): number[] {
  // Get all numbers from the row that could be scores (2-12)
  const scores = row
    .map((a) => parseInt(a.description, 10))
    .filter((n) => !isNaN(n) && n >= 2 && n <= 12);

  // Pad or trim to match hole count
  while (scores.length < holeCount) scores.push(0);
  return scores.slice(0, holeCount);
}

/**
 * FALLBACK: Original text-based parsing for when no bounding boxes available
 */
function parseScorecard(text: string): OCRResult {
  const cleaned = text.replace(/\r/g, "");
  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Simplified version of your original logic
  const players: { name: string; handicap: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/\bName\b/i.test(line)) continue;

    // Extract name from next few lines
    const nameParts = [];
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const next = lines[j];
      if (/^[A-Za-z.\s]{2,}$/.test(next)) {
        nameParts.push(next);
      } else {
        break;
      }
    }

    const name = nameParts.join(" ").toUpperCase() || "PLAYER";

    // Look for handicap
    let handicap = 0;
    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
      const m = lines[j].match(/\b(\d{1,2})\s*(hcap|cap)\b/i);
      if (m) {
        handicap = parseInt(m[1], 10);
        break;
      }
    }

    players.push({ name, handicap });
  }

  const holeCount = 18;
  const holeScores = players.map(() => Array(holeCount).fill(0));

  return {
    playerNames: players.map((p) => p.name),
    playerHandicaps: players.map((p) => p.handicap),
    holeScores,
    detectedHoleCount: holeCount,
    teamName: generateTeamName(),
    confidence: players.length > 0 ? 0.4 : 0.2,
  };
}

function generateTeamName(): string {
  const counties = [
    "ANTRIM", "ARMAGH", "CARLOW", "CAVAN", "CLARE", "CORK",
    "DERRY", "DONEGAL", "DOWN", "DUBLIN", "FERMANAGH", "GALWAY",
    "KERRY", "KILDARE", "KILKENNY", "LAOIS", "LEITRIM", "LIMERICK",
    "LONGFORD", "LOUTH", "MAYO", "MEATH", "MONAGHAN", "OFFALY",
    "ROSCOMMON", "SLIGO", "TIPPERARY", "TYRONE", "WATERFORD",
    "WESTMEATH", "WEXFORD", "WICKLOW",
  ];
  const index = Math.floor(Date.now() % counties.length);
  return counties[index];
}

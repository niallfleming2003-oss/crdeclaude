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
    body: JSON.stringify({ imageUrl }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    const msg =
      data?.error || data?.message || response.statusText || "Unknown Vision API error";
    console.error("Vision API error full response:", data);
    throw new Error(`Vision API error: ${msg}`);
  }

  const fullText: string = data.text || "";
  console.log("OCR raw text:", fullText);

  return parseScorecard(fullText);
}

/**
 * Parse OCR text for:
 * - Player names (handles "Name" on one line, name on following lines)
 * - Handicaps around "Hcap", "cap", or "15 Name"
 * - Hole count (usually 18)
 * - Possible gross scores (2–12) per hole
 */
function parseScorecard(text: string): OCRResult {
  const cleaned = text.replace(/\r/g, "");

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // ---------- 1. Infer hole count ----------
  function inferHoleCount(allLines: string[]): number {
    let bestGuess = 18;

    for (const line of allLines) {
      const nums = line.match(/\b\d{1,2}\b/g);
      if (!nums || nums.length < 6) continue;

      const intNums = nums.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
      if (intNums.length < 6) continue;

      const max = Math.max(...intNums);
      if ([9, 13, 16, 18].includes(max)) {
        return max;
      }
      if (max >= 9 && max <= 18) {
        bestGuess = max;
      }
    }

    return bestGuess;
  }

  const holeCount = inferHoleCount(lines);

  // ---------- 2. Find players (names + handicaps) ----------

  type ParsedPlayer = {
    name: string;
    handicap: number;
    lineIndex: number;
  };

  const players: ParsedPlayer[] = [];

  // Words that are layout, not part of a name
  const layoutKeywords = [
    "hole",
    "yards",
    "yard's",
    "par",
    "index",
    "blue",
    "white",
    "green",
    "pts",
    "points",
    "ladies",
  ];

  const layoutRegex = new RegExp(
    layoutKeywords.map((w) => "\\b" + w + "\\b").join("|"),
    "i"
  );

  // Clean a raw name string to something sensible
  function cleanName(raw: string): string {
    let out = raw;

    // Cut off when we hit layout keywords
    const m = out.match(layoutRegex);
    if (m && m.index !== undefined) {
      out = out.slice(0, m.index);
    }

    // Remove "NAME", "HCAP", "CAP", "HEAP" words if they got pulled in
    out = out.replace(/\b(NAME|HCAP|Hcap|CAP|Cap|HEAP|Heap)\b/gi, "");

    // Remove pure numbers that creep into the name (e.g. "SHEEDY 15 NAME")
    out = out.replace(/\b\d{1,2}\b/g, "");

    // Strip random junk at the end
    out = out.replace(/[^A-Za-z.'\s]+$/g, "");

    // Squash multiple spaces
    out = out.replace(/\s+/g, " ").trim();

    // Uppercase for consistency
    out = out.toUpperCase();

    // If we ended up with just "NAME" or empty, treat as no name
    if (out === "NAME") return "";

    return out;
  }

  // Find handicap near a name line, looking only FORWARD a few lines
  function findHandicapNearLine(centerIndex: number): number {
    const end = Math.min(lines.length - 1, centerIndex + 8);

    // Pass 1: explicit Hcap / cap on the same or later lines
    for (let i = centerIndex; i <= end; i++) {
      const line = lines[i];

      let m = line.match(/\bHcap\b[:\s]*([0-9]{1,2})/i);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n)) return n;
      }

      m = line.match(/([0-9]{1,2})\s*\bHcap\b/i);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n)) return n;
      }

      m = line.match(/\b[cC]ap\b[:\s]*([0-9]{1,2})/);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n)) return n;
      }
    }

    // Pass 2: number just above or below an Hcap/Cap line (within this forward window)
    for (let i = centerIndex; i <= end; i++) {
      const line = lines[i];
      if (!/\bHcap\b/i.test(line) && !/\b[cC]ap\b/i.test(line)) continue;

      const prev = lines[i - 1] || "";
      const next = lines[i + 1] || "";

      let m = prev.match(/\b([0-9]{1,2})\b/);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n)) return n;
      }

      m = next.match(/\b([0-9]{1,2})\b/);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n)) return n;
      }
    }

    // Pass 3: "15 Name" within this forward window
    for (let i = centerIndex; i <= end; i++) {
      const line = lines[i];
      const m = line.match(/\b([0-9]{1,2})\s+Name\b/i);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n)) return n;
      }
    }

    return 0;
  }

  // Scan for "Name" markers and collect the actual player name lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!/\bName\b/i.test(line)) continue;

    // Case 1: "15 Name J.MU CONNOR" or "Name J.MU CONNOR"
    const inlineMatch = line.match(/^(?:(\d{1,2})\s+)?Name\b\s*(.*)$/i);
    let rawHandicap: number | null = null;
    const nameParts: string[] = [];

    if (inlineMatch) {
      const handicapStr = inlineMatch[1];
      const inlineName = inlineMatch[2] || "";

      if (handicapStr) {
        const n = parseInt(handicapStr, 10);
        if (!isNaN(n)) rawHandicap = n;
      }

      if (inlineName && inlineName.length > 0) {
        nameParts.push(inlineName);
      }
    }

    // Case 2: line basically just "Name" and the actual name is below it
    if (nameParts.length === 0) {
      // Look at the next few lines to build a name
      for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
        const nextLine = lines[j];
        if (!nextLine) continue;

        // Skip pure single letter / number like "A" / "B" / "2"
        if (/^[A-Z0-9]$/.test(nextLine)) continue;

        // Skip pure Hcap/Heap/Cap lines
        if (/^(Hcap|Heap|Cap|cap)$/i.test(nextLine)) continue;

        // If the line looks like layout (Hole / Yards / Par / Index etc), stop
        if (layoutRegex.test(nextLine)) break;

        nameParts.push(nextLine);
      }
    }

    const rawName = cleanName(nameParts.join(" "));
    if (!rawName || rawName.length < 2) continue;

    // Avoid duplicates
    if (players.some((p) => p.name === rawName)) continue;

    const handicap =
      rawHandicap !== null ? rawHandicap : findHandicapNearLine(i);

    players.push({
      name: rawName,
      handicap,
      lineIndex: i,
    });
  }

  console.log("Parsed players from OCR (names + handicaps):", players);

  // No players? Bail with low confidence
  if (players.length === 0) {
    return {
      playerNames: [],
      playerHandicaps: [],
      holeScores: [],
      detectedHoleCount: 0,
      teamName: generateTeamName(),
      confidence: 0.2,
    };
  }

  const playerNames = players.map((p) => p.name);
  const playerHandicaps = players.map((p) => p.handicap);

  // ---------- 3. Extract possible hole scores for each player ----------

  function extractScoresForPlayer(
    allLines: string[],
    startIndex: number,
    endIndex: number,
    targetHoles: number
  ): number[] {
    const scores: number[] = [];

    for (let i = startIndex + 1; i < endIndex && scores.length < targetHoles; i++) {
      const line = allLines[i];

      // Skip obvious non-score lines
      if (/\bName\b/i.test(line)) continue;
      if (/\bPar\b/i.test(line)) continue;
      if (/\bIndex\b/i.test(line)) continue;
      if (/\bTotal\b/i.test(line)) continue;
      if (/\bPoints?\b/i.test(line)) continue;
      if (/\bHcap\b/i.test(line)) continue;
      if (/\bHeap\b/i.test(line)) continue;

      const nums = line.match(/\b\d{1,2}\b/g);
      if (!nums) continue;

      for (const token of nums) {
        const n = parseInt(token, 10);
        if (isNaN(n)) continue;

        // Typical gross score range
        if (n < 2 || n > 12) continue;

        scores.push(n);
        if (scores.length >= targetHoles) break;
      }
    }

    while (scores.length < targetHoles) scores.push(0);
    if (scores.length > targetHoles) scores.length = targetHoles;

    return scores;
  }

  const holeScores: number[][] = [];

  players.forEach((player, idx) => {
    const thisStart = player.lineIndex;
    const nextPlayer = players[idx + 1];
    const thisEnd = nextPlayer ? nextPlayer.lineIndex : lines.length;

    const scores = extractScoresForPlayer(lines, thisStart, thisEnd, holeCount);
    holeScores.push(scores);
  });

  // ---------- 4. Confidence estimate ----------

  const hasAnyRealScores = holeScores.some((row) => row.some((s) => s > 0));
  const base =
    players.length >= 3 ? 0.5 : players.length === 2 ? 0.45 : 0.4;
  const confidence = hasAnyRealScores ? base + 0.2 : base;

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
 * Friendly Irish county team name
 */
function generateTeamName(): string {
  const counties = [
    "ANTRIM",
    "ARMAGH",
    "CARLOW",
    "CAVAN",
    "CLARE",
    "CORK",
    "DERRY",
    "DONEGAL",
    "DOWN",
    "DUBLIN",
    "FERMANAGH",
    "GALWAY",
    "KERRY",
    "KILDARE",
    "KILKENNY",
    "LAOIS",
    "LEITRIM",
    "LIMERICK",
    "LONGFORD",
    "LOUTH",
    "MAYO",
    "MEATH",
    "MONAGHAN",
    "OFFALY",
    "ROSCOMMON",
    "SLIGO",
    "TIPPERARY",
    "TYRONE",
    "WATERFORD",
    "WESTMEATH",
    "WEXFORD",
    "WICKLOW",
  ];

  const index = Math.floor(Date.now() % counties.length);
  return counties[index];
}

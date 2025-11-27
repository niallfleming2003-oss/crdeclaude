# OCR Integration Guide for Cairde10

This document explains how to integrate Google Cloud Vision OCR API with the Cairde10 golf scorecard application.

## Overview

The application is designed with OCR integration points ready. When a user uploads scorecard images, the system needs to:

1. Extract player names
2. Extract player handicaps (numeric)
3. Extract hole-by-hole gross scores
4. Detect hole count (13, 16, or 18)
5. Create team records with calculated scores

## Integration Points

### 1. File Upload Handler

**Location:** `src/components/PlayerUpload.tsx` (line ~135)

The `handleSubmitAll` function currently has a placeholder for OCR processing:

```typescript
// Current placeholder code
for (const card of uploadedCards) {
  console.log("Processing scorecard:", {
    eventId,
    scrambleMode: card.scrambleMode,
    holeCount: card.holeCount,
    imageFile: card.file.name,
  });
}
```

**Replace with OCR integration:**

```typescript
for (const card of uploadedCards) {
  // 1. Upload image to storage
  const imageUrl = await uploadImageToStorage(card.file);
  
  // 2. Call Google Cloud Vision OCR
  const ocrData = await extractScorecardData(imageUrl);
  
  // 3. Create scorecard entity
  const scorecardId = await createScorecard({
    eventId,
    imageUrl,
    ocrData: JSON.stringify(ocrData),
    scrambleMode: card.scrambleMode,
    holeCount: ocrData.detectedHoleCount || card.holeCount,
    processingStatus: "completed",
  });
  
  // 4. Create team from OCR data
  await createTeamFromOCR(eventId, scorecardId, ocrData, card.scrambleMode);
}
```

## Google Cloud Vision OCR Setup

### Step 1: Enable API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable Cloud Vision API
3. Create API credentials (API key or Service Account)

### Step 2: Install SDK

```bash
npm install @google-cloud/vision
```

### Step 3: OCR Function

Create a new file: `src/lib/ocr.ts`

```typescript
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: 'path/to/service-account-key.json',
});

export type OCRResult = {
  playerNames: string[];
  playerHandicaps: number[];
  holeScores: number[][]; // [player][hole]
  detectedHoleCount: number;
  teamName?: string;
};

export async function extractScorecardData(imageUrl: string): Promise<OCRResult> {
  // Perform OCR
  const [result] = await client.documentTextDetection(imageUrl);
  const fullText = result.fullTextAnnotation;
  
  if (!fullText) {
    throw new Error('No text detected in image');
  }
  
  // Parse scorecard structure
  const lines = fullText.text?.split('\n') || [];
  
  // SCORECARD PARSING LOGIC:
  // 1. Identify player name rows (usually first column)
  // 2. Extract handicaps (numeric values in name rows)
  // 3. Parse hole-by-hole scores (grid structure)
  // 4. Detect hole count from column count
  
  const playerNames: string[] = [];
  const playerHandicaps: number[] = [];
  const holeScores: number[][] = [];
  let detectedHoleCount = 18;
  
  // Example parsing (customize based on your scorecard format):
  for (const line of lines) {
    // Skip header rows
    if (line.includes('Hole') || line.includes('Player')) continue;
    
    // Extract player data
    const nameMatch = line.match(/^([A-Za-z\s]+)/);
    const handicapMatch = line.match(/HCP\s*(\d+)/i);
    const scoresMatch = line.match(/\d+/g);
    
    if (nameMatch && handicapMatch && scoresMatch) {
      playerNames.push(nameMatch[1].trim());
      playerHandicaps.push(parseInt(handicapMatch[1]));
      holeScores.push(scoresMatch.map(s => parseInt(s)));
      
      // Detect hole count from first player's scores
      if (holeScores.length === 1) {
        detectedHoleCount = scoresMatch.length;
      }
    }
  }
  
  return {
    playerNames,
    playerHandicaps,
    holeScores,
    detectedHoleCount,
  };
}
```

## Data Structure Mapping

### OCR Output → Team Entity

```typescript
import { calculateTeamScore, rankTeams } from './scoring';

async function createTeamFromOCR(
  eventId: number,
  scorecardId: number,
  ocrData: OCRResult,
  scrambleMode: 'straight' | 'champagne'
) {
  const { playerNames, playerHandicaps, holeScores, detectedHoleCount } = ocrData;
  
  // Generate team name (Irish county or player names)
  const teamName = generateTeamName(playerNames);
  
  // Calculate scores using scoring utilities
  const scoringInput = {
    teamName,
    players: playerNames.map((name, i) => ({
      name,
      handicap: playerHandicaps[i],
      holeScores: holeScores[i],
    })),
    holeCount: detectedHoleCount,
    scrambleMode,
  };
  
  const result = calculateTeamScore(scoringInput);
  
  // Create team entity
  await createTeam({
    eventId,
    teamName,
    scrambleMode,
    playerNames: JSON.stringify(playerNames),
    playerHandicaps: JSON.stringify(playerHandicaps),
    holeCount: detectedHoleCount,
    grossTotal: result.grossTotal,
    teamHandicap: result.teamHandicap,
    netScore: result.netScore,
    pointsTotal: result.pointsTotal,
    holeScores: JSON.stringify(holeScores),
    rank: 0, // Will be calculated after all teams are added
  });
  
  // Update scorecard with team reference
  await updateScorecard(scorecardId, { teamId: teamId });
}
```

## Irish County Team Names

```typescript
const IRISH_COUNTIES = [
  'Antrim', 'Armagh', 'Carlow', 'Cavan', 'Clare', 'Cork', 'Derry',
  'Donegal', 'Down', 'Dublin', 'Fermanagh', 'Galway', 'Kerry', 'Kildare',
  'Kilkenny', 'Laois', 'Leitrim', 'Limerick', 'Longford', 'Louth', 'Mayo',
  'Meath', 'Monaghan', 'Offaly', 'Roscommon', 'Sligo', 'Tipperary',
  'Tyrone', 'Waterford', 'Westmeath', 'Wexford', 'Wicklow'
];

let countyIndex = 0;

function generateTeamName(playerNames: string[]): string {
  // Use Irish county names sequentially
  const teamName = IRISH_COUNTIES[countyIndex % IRISH_COUNTIES.length];
  countyIndex++;
  return teamName;
}
```

## Ranking Teams After Upload

After all scorecards are processed, recalculate rankings:

```typescript
import { rankTeams } from './scoring';

async function recalculateRankings(eventId: number) {
  const eventTeams = await getTeamsByEvent(eventId);
  
  const rankings = rankTeams(eventTeams.map(team => ({
    id: team.id,
    scrambleMode: team.scrambleMode,
    netScore: team.netScore,
    pointsTotal: team.pointsTotal,
    grossTotal: team.grossTotal,
    teamHandicap: team.teamHandicap,
  })));
  
  // Update each team's rank
  for (const { id, rank } of rankings) {
    await updateTeam(id, { rank });
  }
}
```

## Error Handling

```typescript
export async function processScorecard(
  file: File,
  eventId: number,
  scrambleMode: 'straight' | 'champagne'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Upload image
    const imageUrl = await uploadImageToStorage(file);
    
    // Extract data
    const ocrData = await extractScorecardData(imageUrl);
    
    // Validate extracted data
    if (ocrData.playerNames.length === 0) {
      return { success: false, error: 'No players detected. Please ensure scorecard is legible.' };
    }
    
    if (ocrData.playerHandicaps.length !== ocrData.playerNames.length) {
      return { success: false, error: 'Could not detect all handicaps. Please re-upload.' };
    }
    
    // Create entities
    const scorecardId = await createScorecard({
      eventId,
      imageUrl,
      ocrData: JSON.stringify(ocrData),
      scrambleMode,
      processingStatus: 'completed',
    });
    
    await createTeamFromOCR(eventId, scorecardId, ocrData, scrambleMode);
    
    return { success: true };
  } catch (error) {
    console.error('OCR processing error:', error);
    return { 
      success: false, 
      error: 'Failed to process scorecard. Please ensure image is clear and try again.' 
    };
  }
}
```

## Testing OCR

### Sample Scorecard Format

The OCR should be able to parse scorecards in this format:

```
GOLF SCORECARD
Date: 2024-01-15

Player Name       HCP    1  2  3  4  5  6  7  8  9  OUT  10 11 12 13 14 15 16 17 18  IN  TOTAL
John Smith        8      4  5  3  4  5  4  3  5  4  37   5  4  4  3  5  4  5  4  4   38   75
Jane Doe          12     5  6  4  5  6  5  4  6  5  46   6  5  5  4  6  5  6  5  5   47   93
Bob Jones         6      4  4  3  4  4  4  3  5  4  35   4  4  4  3  5  4  4  4  4   36   71

Team: Cork
```

### Test Cases

1. **Standard 18-hole scorecard** with 3 players
2. **13-hole scorecard** (shortened course)
3. **16-hole scorecard** 
4. **Handwritten variations** (test OCR accuracy)
5. **2-player and 4-player teams**
6. **Missing team name** (should default to player names)

## Environment Variables

Add to `.env`:

```
VITE_GOOGLE_CLOUD_PROJECT_ID=your-project-id
VITE_GOOGLE_CLOUD_API_KEY=your-api-key
# OR use service account key file path
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## Next Steps

1. Set up Google Cloud Vision API credentials
2. Implement `extractScorecardData()` function
3. Test with sample scorecard images
4. Fine-tune OCR parsing logic for your scorecard format
5. Add image storage (Firebase Storage, AWS S3, etc.)
6. Implement error handling and retry logic
7. Add user feedback for OCR confidence scores

## Current Implementation Status

✅ Database entities (Event, Team, Scorecard)  
✅ Scoring algorithms (Straight & Champagne Scramble)  
✅ Tie-breaking logic  
✅ Upload interface with bulk support  
✅ Organizer dashboard  
✅ Public leaderboard  
✅ Publish/unpublish controls  
✅ CSV export  
⏳ OCR integration (ready for your implementation)  
⏳ Image storage  
⏳ PDF export (requires library)  

The application is fully functional and ready for OCR integration!

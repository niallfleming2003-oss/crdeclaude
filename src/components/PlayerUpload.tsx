import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Alert, AlertDescription } from "./ui/alert";
import { Upload, Image as ImageIcon, CheckCircle2 } from "lucide-react";

type UploadedCard = {
  file: File;
  preview: string;
  scrambleMode: "straight" | "champagne" | null;
  holeCount: number | null;
};

type PlayerUploadProps = {
  eventId: number;
  onUploadComplete: () => void;
};

export default function PlayerUpload({ eventId, onUploadComplete }: PlayerUploadProps) {
  const [uploadedCards, setUploadedCards] = useState<UploadedCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newCards: UploadedCard[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file);
        newCards.push({
          file,
          preview,
          scrambleMode: null,
          holeCount: 18, // Default to 18, can be auto-detected by OCR
        });
      }
    });

    setUploadedCards((prev) => [...prev, ...newCards]);

    // Auto-select first card for mode selection
    if (uploadedCards.length === 0 && newCards.length > 0) {
      setCurrentCardIndex(0);
    }
  };

  const updateCardMode = (index: number, mode: "straight" | "champagne") => {
    setUploadedCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, scrambleMode: mode } : card))
    );

    // Move to next card that needs mode selection
    const nextIndex = uploadedCards.findIndex((c, i) => i > index && c.scrambleMode === null);
    if (nextIndex !== -1) {
      setCurrentCardIndex(nextIndex);
    } else {
      setCurrentCardIndex(null);
    }
  };

  const handleSubmitAll = async () => {
    // Check all cards have mode selected
    const incompletCards = uploadedCards.filter((c) => c.scrambleMode === null);
    if (incompletCards.length > 0) {
      alert("Please select scramble mode for all scorecards before submitting");
      return;
    }

    setUploading(true);

    try {
      // Simulate OCR processing for each card
      for (const card of uploadedCards) {
        // In production, this would:
        // 1. Upload image to storage
        // 2. Call OCR API to extract data
        // 3. Create scorecard and team entities
        // 4. Calculate scores

        // For now, we'll create placeholder data structure
        console.log("Processing scorecard:", {
          eventId,
          scrambleMode: card.scrambleMode,
          holeCount: card.holeCount,
          imageFile: card.file.name,
        });

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setUploadSuccess(true);
      setTimeout(() => {
        onUploadComplete();
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeCard = (index: number) => {
    setUploadedCards((prev) => prev.filter((_, i) => i !== index));
    if (currentCardIndex === index) {
      setCurrentCardIndex(null);
    }
  };

  const canSubmit = uploadedCards.length > 0 && uploadedCards.every((c) => c.scrambleMode !== null);

  if (uploadSuccess) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-12 pb-12 text-center">
          <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Scorecards Uploaded!</h2>
          <p className="text-gray-600 text-lg">
            Your scorecards are being processed. Results will be published by the organizer.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Upload Scorecards</CardTitle>
          <CardDescription className="text-base">
            Upload photos of handwritten scorecards from your event. You can select multiple images at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="lg"
              className="w-full text-lg py-6"
              variant="outline"
            >
              <Upload className="mr-3 h-6 w-6" />
              Select Scorecard Images
            </Button>
          </div>

          {uploadedCards.length > 0 && (
            <Alert>
              <AlertDescription className="text-base">
                {uploadedCards.length} scorecard{uploadedCards.length > 1 ? "s" : ""} selected.
                Please select the scramble mode for each card.
              </AlertDescription>
            </Alert>
          )}

          {uploadedCards.map((card, index) => (
            <Card key={index} className={currentCardIndex === index ? "border-blue-500 border-2" : ""}>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <img
                      src={card.preview}
                      alt={`Scorecard ${index + 1}`}
                      className="w-full rounded-lg border border-gray-200"
                    />
                    <Button
                      onClick={() => removeCard(index)}
                      variant="destructive"
                      size="sm"
                      className="mt-3 w-full"
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-lg font-semibold mb-3 block">
                        <ImageIcon className="inline mr-2 h-5 w-5" />
                        Scorecard {index + 1}
                      </Label>
                      {card.scrambleMode && (
                        <div className="text-sm text-green-600 font-medium mb-2">
                          ✓ Mode selected
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-base font-medium mb-3 block">
                        Select Scramble Mode:
                      </Label>
                      <RadioGroup
                        value={card.scrambleMode || ""}
                        onValueChange={(value) =>
                          updateCardMode(index, value as "straight" | "champagne")
                        }
                      >
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <RadioGroupItem value="straight" id={`straight-${index}`} />
                          <Label
                            htmlFor={`straight-${index}`}
                            className="flex-1 cursor-pointer text-base"
                          >
                            <div className="font-semibold">Straight Scramble</div>
                            <div className="text-sm text-gray-600">Net lowest score wins</div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <RadioGroupItem value="champagne" id={`champagne-${index}`} />
                          <Label
                            htmlFor={`champagne-${index}`}
                            className="flex-1 cursor-pointer text-base"
                          >
                            <div className="font-semibold">Champagne Scramble</div>
                            <div className="text-sm text-gray-600">
                              Stableford best-ball points
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {uploadedCards.length > 0 && (
            <Button
              onClick={handleSubmitAll}
              disabled={!canSubmit || uploading}
              size="lg"
              className="w-full text-lg py-6"
            >
              {uploading ? (
                <>Processing {uploadedCards.length} Scorecard(s)...</>
              ) : (
                <>Submit All Scorecards</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

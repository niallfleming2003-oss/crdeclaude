import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { processUploadedScorecard } from "../lib/uploadHandler";

type UploadedCard = {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "completed" | "error";
  message?: string;
};

type OrganizerUploadProps = {
  eventId: number;
  holeCount: number;
  scrambleMode: "straight" | "champagne";
  onUploadComplete: () => void;
  onCreateTeam: (teamData: any) => Promise<void>;
};

export default function OrganizerUpload({
  eventId,
  holeCount,
  scrambleMode,
  onUploadComplete,
  onCreateTeam,
}: OrganizerUploadProps) {
  const [uploadedCards, setUploadedCards] = useState<UploadedCard[]>([]);
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
          status: "pending",
        });
      }
    });

    setUploadedCards((prev) => [...prev, ...newCards]);
  };

  const handleSubmitAll = async () => {
    if (uploadedCards.length === 0) {
      alert("Please select at least one scorecard image");
      return;
    }

    setUploading(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < uploadedCards.length; i++) {
        const card = uploadedCards[i];

        try {
          // Update status to uploading
          setUploadedCards((prev) =>
            prev.map((c, idx) => (idx === i ? { ...c, status: "uploading" } : c))
          );

          // Process the scorecard
          await processUploadedScorecard(
            eventId,
            card.file,
            holeCount,
            scrambleMode,
            onCreateTeam
          );

          // Update status to completed
          setUploadedCards((prev) =>
            prev.map((c, idx) =>
              idx === i ? { ...c, status: "completed", message: "Successfully processed" } : c
            )
          );

          successCount++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";

          setUploadedCards((prev) =>
            prev.map((c, idx) =>
              idx === i ? { ...c, status: "error", message: errorMessage } : c
            )
          );

          errorCount++;
          console.error(`Error processing scorecard ${i + 1}:`, error);
        }
      }

      setUploading(false);

      if (errorCount === 0) {
        setUploadSuccess(true);
        setTimeout(() => {
          setUploadedCards([]);
          setUploadSuccess(false);
          onUploadComplete();
        }, 2000);
      } else {
        alert(
          `Processed ${successCount} scorecard(s) successfully. ${errorCount} failed. See details above.`
        );
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
      setUploading(false);
    }
  };

  const removeCard = (index: number) => {
    setUploadedCards((prev) => prev.filter((_, i) => i !== index));
  };

  if (uploadSuccess) {
    return (
      <Card>
        <CardContent className="pt-4 pb-6 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Scorecards Processed!</h2>
          <p className="text-gray-600 text-sm">
            Your scorecards have been extracted and teams created. Review the leaderboard to
            verify results.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Event Format Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-blue-900">
            <strong>Format:</strong> {holeCount}-hole {scrambleMode === "straight" ? "Straight" : "Champagne"}
          </p>
          <p className="text-xs text-blue-800 mt-1">
            OCR will extract player names, handicaps, and scores from each image.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Upload Scorecards</CardTitle>
          <CardDescription className="text-sm">
            Upload photos of handwritten scorecards. Google Cloud Vision will extract player data
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              size="sm"
              className="w-full text-xs"
              variant="outline"
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Select Images
            </Button>
          </div>

          {uploadedCards.length > 0 && (
            <Alert>
              <AlertDescription className="text-xs">
                {uploadedCards.length} scorecard{uploadedCards.length > 1 ? "s" : ""} selected.
                {uploading && " Processing..."}
              </AlertDescription>
            </Alert>
          )}

          {uploadedCards.map((card, index) => (
            <Card key={index} className={`p-3 ${card.status === "error" ? "border-red-300 bg-red-50" : ""}`}>
              <div className="flex gap-3">
                <img
                  src={card.preview}
                  alt={`Scorecard ${index + 1}`}
                  className="w-20 h-24 rounded border border-gray-200 object-cover"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold">Scorecard {index + 1}</p>
                      {card.status === "completed" && (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                      {card.status === "error" && (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      {card.status === "uploading" && (
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 truncate">{card.file.name}</p>
                    {card.message && (
                      <p
                        className={`text-xs mt-1 ${card.status === "error" ? "text-red-600" : "text-green-600"}`}
                      >
                        {card.message}
                      </p>
                    )}
                  </div>
                  {card.status === "pending" && (
                    <Button
                      onClick={() => removeCard(index)}
                      variant="destructive"
                      size="sm"
                      className="text-xs w-full"
                      disabled={uploading}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {uploadedCards.length > 0 && (
            <Button
              onClick={handleSubmitAll}
              disabled={uploading}
              size="sm"
              className="w-full text-xs"
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

      {/* Info about OCR */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-amber-900">
            <strong>Note:</strong> OCR accuracy depends on image quality. Ensure scorecards are
            well-lit and legible. Failed extractions will show errors above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

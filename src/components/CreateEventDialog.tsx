import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Input } from "./ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";

type CreateEventDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: (data: {
    eventDate: string;
    holeCount: 9 | 13 | 16 | 18;
    scrambleMode: "straight" | "champagne";
  }) => Promise<void>;
};

export default function CreateEventDialog({ isOpen, onClose, onCreateEvent }: CreateEventDialogProps) {
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [holeCount, setHoleCount] = useState<9 | 13 | 16 | 18>(18);
  const [scrambleMode, setScrambleMode] = useState<"straight" | "champagne">("straight");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!eventDate) {
      alert("Please select an event date");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateEvent({
        eventDate,
        holeCount,
        scrambleMode,
      });
      // Reset form
      setEventDate(new Date().toISOString().split("T")[0]);
      setHoleCount(18);
      setScrambleMode("straight");
      onClose();
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">Create New Event</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Set up your golf competition with format details
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Event Date */}
          <div className="space-y-2">
            <Label htmlFor="eventDate" className="text-base font-semibold">
              Event Date
            </Label>
            <Input
              id="eventDate"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="text-sm py-2"
            />
          </div>

          {/* Hole Count */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Number of Holes</Label>
            <RadioGroup value={holeCount.toString()} onValueChange={(v) => setHoleCount(parseInt(v) as 9 | 13 | 16 | 18)}>
              <div className="grid grid-cols-2 gap-4">
                {[9, 13, 16, 18].map((holes) => (
                  <div key={holes} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value={holes.toString()} id={`holes-${holes}`} />
                    <Label htmlFor={`holes-${holes}`} className="flex-1 cursor-pointer text-sm font-medium">
                      {holes} Holes
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Scramble Mode */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Scramble Format</Label>
            <RadioGroup value={scrambleMode} onValueChange={(v) => setScrambleMode(v as "straight" | "champagne")}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="straight" id="straight" />
                  <Label htmlFor="straight" className="flex-1 cursor-pointer">
                    <div className="font-semibold text-sm">Straight Scramble</div>
                    <div className="text-xs text-gray-600">Net lowest score wins</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="champagne" id="champagne" />
                  <Label htmlFor="champagne" className="flex-1 cursor-pointer">
                    <div className="font-semibold text-sm">Champagne Scramble</div>
                    <div className="text-xs text-gray-600">Stableford best-ball points</div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-900">
                <strong>Event Summary:</strong> {holeCount}-hole {scrambleMode === "straight" ? "Straight" : "Champagne"} Scramble on {eventDate}
              </p>
            </CardContent>
          </Card>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="text-base" disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-base"
          >
            {isSubmitting ? "Creating..." : "Create Event"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

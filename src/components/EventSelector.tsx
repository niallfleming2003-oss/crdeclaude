import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Plus, Trash2 } from "lucide-react";

type Event = {
  id: number;
  eventDate: string;
  holeCount: number;
  scrambleMode: "straight" | "champagne";
  status: "active" | "published" | "archived";
  teamCount: number;
};

type EventSelectorProps = {
  events: Event[];
  currentEventId: number | null;
  onSelectEvent: (eventId: number) => void;
  onCreateNew: () => void;
  onDeleteEvent: (eventId: number) => void;
};

export default function EventSelector({
  events,
  currentEventId,
  onSelectEvent,
  onCreateNew,
  onDeleteEvent,
}: EventSelectorProps) {
  // Only show events with status "active" or "published"
  const validEvents = events.filter((e) => e.status === "active" || e.status === "published");

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Events</h3>
            <Button size="sm" onClick={onCreateNew} className="text-xs">
              <Plus className="mr-1 h-3 w-3" />
              New Event
            </Button>
          </div>

          {validEvents.length === 0 ? (
            <p className="text-xs text-gray-500">No events yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {validEvents.map((event) => (
                <div key={event.id} className="flex gap-1 items-center">
                  <Button
                    variant={currentEventId === event.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSelectEvent(event.id)}
                    className="text-xs h-auto py-2 px-2"
                  >
                    <div className="flex flex-col items-start">
                      <span>{event.eventDate}</span>
                      <span className="text-xs opacity-75">
                        {event.holeCount}h • {event.teamCount} teams
                      </span>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Delete this event? Ok to delete, Cancel to keep.")) {
                        onDeleteEvent(event.id);
                      }
                    }}
                    className="text-xs h-auto py-2 px-1"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

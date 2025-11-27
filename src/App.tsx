import { useState, useEffect, useMemo } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import OrganizerUpload from "./components/OrganizerUpload";
import OrganizerDashboard from "./components/OrganizerDashboard";
import PublicLeaderboard from "./components/PublicLeaderboard";
import CreateEventDialog from "./components/CreateEventDialog";
import EventSelector from "./components/EventSelector";
import { useEntity } from "./hooks/useEntity";
import { eventEntityConfig } from "./entities/Event";
import { teamEntityConfig } from "./entities/Team";
import { scorecardEntityConfig } from "./entities/Scorecard";
import { Trophy } from "lucide-react";
import { rankTeams } from "./lib/scoring";

type Event = {
  id: number;
  eventDate: string;
  holeCount: number;
  scrambleMode: "straight" | "champagne";
  status: "active" | "published" | "archived";
  teamCount: number;
  publishedAt?: string;
  created_at: string;
  updated_at: string;
};

type Team = {
  id: number;
  eventId: number;
  teamName: string;
  playerNames: string;
  playerHandicaps: string;
  scrambleMode: "straight" | "champagne";
  holeCount: number;
  grossTotal: number;
  teamHandicap: number;
  netScore?: number;
  pointsTotal?: number;
  rank: number;
  holeScores: string;
  created_at: string;
  updated_at: string;
};

type Scorecard = {
  id: number;
  eventId: number;
  teamId?: number;
  imageUrl: string;
  ocrData?: string;
  scrambleMode: "straight" | "champagne";
  holeCount?: number;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
};

export default function App() {
  const [userRole, setUserRole] = useState<"player" | "organizer">("player");
  const [selectedTab, setSelectedTab] = useState("leaderboard");
  const [showCreateEventDialog, setShowCreateEventDialog] = useState(false);

  const {
    items: events,
    create: createEvent,
    update: updateEvent,
    loading: eventsLoading,
  } = useEntity<Event>(eventEntityConfig);

  const {
    items: allTeams,
    create: createTeam,
  } = useEntity<Team>(teamEntityConfig);

  const {
    items: scorecards,
  } = useEntity<Scorecard>(scorecardEntityConfig);

  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize or get current active event
  useEffect(() => {
    if (eventsLoading) return;

    if (events.length === 0) {
      setIsInitializing(false);
      setShowCreateEventDialog(true);
    } else {
      const activeEvent = events.find((e) => e.status === "active") || events[0];
      setCurrentEvent(activeEvent);
      setIsInitializing(false);
    }
  }, [events, eventsLoading]);

  // Calculate proper rankings for event teams
  const eventTeams = useMemo(() => {
    if (!currentEvent) return [];

    const teamsForEvent = allTeams.filter((t) => t.eventId === currentEvent.id);

    // Parse team data
    const parsedTeams = teamsForEvent.map((team) => ({
      ...team,
      playerNames: JSON.parse(team.playerNames) as string[],
      playerHandicaps: JSON.parse(team.playerHandicaps) as number[],
    }));

    // Calculate rankings
    const rankings = rankTeams(
      teamsForEvent.map((t) => ({
        id: t.id,
        scrambleMode: t.scrambleMode,
        netScore: t.netScore,
        pointsTotal: t.pointsTotal,
        grossTotal: t.grossTotal,
        teamHandicap: t.teamHandicap,
      }))
    );

    // Apply ranks to parsed teams
    const rankedTeams = parsedTeams.map((team) => {
      const ranking = rankings.find((r) => r.id === team.id);
      return {
        ...team,
        rank: ranking?.rank || 0,
      };
    });

    // Sort by rank
    return rankedTeams.sort((a, b) => a.rank - b.rank);
  }, [currentEvent, allTeams]);

  // Update event team count when teams change
  useEffect(() => {
    if (currentEvent && eventTeams.length !== currentEvent.teamCount) {
      updateEvent(currentEvent.id, {
        ...currentEvent,
        teamCount: eventTeams.length,
      }).catch(() => {});
    }
  }, [eventTeams.length, currentEvent, updateEvent]);

  const handleCreateEvent = async (data: {
    eventDate: string;
    holeCount: 9 | 13 | 16 | 18;
    scrambleMode: "straight" | "champagne";
  }) => {
    try {
      await createEvent({
        eventDate: data.eventDate,
        holeCount: data.holeCount,
        scrambleMode: data.scrambleMode,
        status: "active",
        teamCount: 0,
      });
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  };

  const handleSelectEvent = (eventId: number) => {
    const selected = events.find((e) => e.id === eventId);
    if (selected) {
      setCurrentEvent(selected);
    }
  };

  const handleCreateNewEvent = () => {
    setShowCreateEventDialog(true);
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      const event = events.find((e) => e.id === eventId);
      if (event) {
        await updateEvent(eventId, { ...event, status: "archived" });
        if (currentEvent?.id === eventId) {
          const remaining = events.filter((e) => e.id !== eventId && (e.status === "active" || e.status === "published"));
          setCurrentEvent(remaining.length > 0 ? remaining[0] : null);
        }
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event.");
    }
  };

  const handlePublish = async () => {
    if (!currentEvent) return;
    try {
      await updateEvent(currentEvent.id, {
        ...currentEvent,
        status: "published",
        publishedAt: new Date().toISOString(),
      });
      setCurrentEvent({ ...currentEvent, status: "published" });
    } catch (error) {
      console.error("Error publishing:", error);
      alert("Failed to publish. Please try again.");
    }
  };

  const handleUnpublish = async () => {
    if (!currentEvent) return;
    try {
      await updateEvent(currentEvent.id, {
        ...currentEvent,
        status: "active",
      });
      setCurrentEvent({ ...currentEvent, status: "active" });
    } catch (error) {
      console.error("Error unpublishing:", error);
      alert("Failed to unpublish. Please try again.");
    }
  };

  const handleExportCSV = () => {
    if (!currentEvent) return;

    const csvRows = [
      [
        "Rank",
        "Team Name",
        "Players",
        "Handicaps",
        "Mode",
        "Gross Total",
        "Net/Points",
        "Event Date",
      ],
    ];

    eventTeams.forEach((team) => {
      csvRows.push([
        team.rank.toString(),
        team.teamName,
        team.playerNames.join(", "),
        team.playerHandicaps.join(", "),
        team.scrambleMode === "straight" ? "Straight Scramble" : "Champagne Scramble",
        team.grossTotal.toString(),
        team.scrambleMode === "straight"
          ? `${team.netScore} (net)`
          : `${team.pointsTotal} pts`,
        currentEvent.eventDate,
      ]);
    });

    const csvContent = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `golf-results-${currentEvent.eventDate}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    alert("PDF export will be available when you integrate a PDF generation library");
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Trophy className="w-16 h-16 text-green-600 mx-auto mb-4 animate-bounce" />
            <p className="text-xl text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cairde10</h1>
                <p className="text-gray-600 text-xs">Golf Scorecard OCR System</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 min-h-[calc(100vh-200px)] overflow-y-auto">
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Trophy className="w-20 h-20 text-blue-600 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-900 mb-3">No Active Event</h2>
              <p className="text-gray-600 text-lg mb-6">
                Create an event to get started with scoring scorecards.
              </p>
              <Button size="lg" onClick={handleCreateNewEvent} className="bg-green-600 hover:bg-green-700">
                Create First Event
              </Button>
            </CardContent>
          </Card>
        </main>

        <CreateEventDialog
          isOpen={showCreateEventDialog}
          onClose={() => setShowCreateEventDialog(false)}
          onCreateEvent={handleCreateEvent}
        />
      </div>
    );
  }

  const eventScorecards = scorecards
    .filter((s) => s.eventId === currentEvent.id)
    .map((scorecard) => ({
      id: scorecard.id,
      teamName: "Team " + scorecard.id,
      imageUrl: scorecard.imageUrl,
      uploadedAt: new Date(scorecard.created_at).toLocaleString(),
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cairde10</h1>
                <p className="text-gray-600 text-xs">Golf Scorecard OCR System</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={userRole === "player" ? "default" : "outline"}
                onClick={() => {
                  setUserRole("player");
                  setSelectedTab("leaderboard");
                }}
                size="sm"
                className="text-xs"
              >
                Player
              </Button>
              <Button
                variant={userRole === "organizer" ? "default" : "outline"}
                onClick={() => {
                  setUserRole("organizer");
                  setSelectedTab("manage");
                }}
                size="sm"
                className="text-xs"
              >
                Organizer
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 overflow-y-auto">
        {userRole === "player" ? (
          <div>
            <PublicLeaderboard
              eventDate={currentEvent.eventDate}
              teams={eventTeams}
              isPublished={currentEvent.status === "published"}
            />
          </div>
        ) : (
          <>
            <EventSelector
              events={events}
              currentEventId={currentEvent.id}
              onSelectEvent={handleSelectEvent}
              onCreateNew={handleCreateNewEvent}
              onDeleteEvent={handleDeleteEvent}
            />

            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="manage" className="text-sm py-2">
                  Manage
                </TabsTrigger>
                <TabsTrigger value="upload" className="text-sm py-2">
                  Upload
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="text-sm py-2">
                  Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manage">
                <OrganizerDashboard
                  currentEvent={currentEvent}
                  teams={eventTeams}
                  scorecards={eventScorecards}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                  onExportCSV={handleExportCSV}
                  onExportPDF={handleExportPDF}
                  onCreateNewEvent={handleCreateNewEvent}
                />
              </TabsContent>

              <TabsContent value="upload">
                <OrganizerUpload
                  eventId={currentEvent.id}
                  holeCount={currentEvent.holeCount}
                  scrambleMode={currentEvent.scrambleMode}
                  onUploadComplete={() => {
                    setSelectedTab("manage");
                  }}
                  onCreateTeam={createTeam}
                />
              </TabsContent>

              <TabsContent value="leaderboard">
                <OrganizerDashboard
                  currentEvent={currentEvent}
                  teams={eventTeams}
                  scorecards={eventScorecards}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                  onExportCSV={handleExportCSV}
                  onExportPDF={handleExportPDF}
                  onCreateNewEvent={handleCreateNewEvent}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {/* Create Event Dialog */}
      <CreateEventDialog
        isOpen={showCreateEventDialog}
        onClose={() => setShowCreateEventDialog(false)}
        onCreateEvent={handleCreateEvent}
      />
    </div>
  );
}

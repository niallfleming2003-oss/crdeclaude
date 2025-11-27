import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { formatRank } from "../lib/ordinal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Upload, Eye, Download, Archive, Trophy } from "lucide-react";

type Team = {
  id: number;
  teamName: string;
  playerNames: string[];
  playerHandicaps: number[];
  scrambleMode: "straight" | "champagne";
  grossTotal: number;
  teamHandicap: number;
  netScore?: number;
  pointsTotal?: number;
  rank: number;
  holeCount: number;
};

type Scorecard = {
  id: number;
  teamName: string;
  imageUrl: string;
  uploadedAt: string;
};

type Event = {
  id: number;
  eventDate: string;
  holeCount: number;
  scrambleMode: "straight" | "champagne";
  status: "active" | "published" | "archived";
  teamCount: number;
};

type OrganizerDashboardProps = {
  currentEvent: Event;
  teams: Team[];
  scorecards: Scorecard[];
  onPublish: () => void;
  onUnpublish: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onCreateNewEvent: () => void;
};

export default function OrganizerDashboard({
  currentEvent,
  teams,
  scorecards,
  onPublish,
  onUnpublish,
  onExportCSV,
  onExportPDF,
  onCreateNewEvent,
}: OrganizerDashboardProps) {
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
  const [selectedScorecard, setSelectedScorecard] = useState<Scorecard | null>(null);

  const handlePublish = () => {
    onPublish();
    setShowPublishDialog(false);
  };

  const handleUnpublish = () => {
    onUnpublish();
    setShowUnpublishDialog(false);
  };

  const isPublished = currentEvent.status === "published";

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <Badge className="bg-yellow-500 text-white hover:bg-yellow-600 text-base px-3 py-1">
          <Trophy className="mr-1 h-4 w-4" />
          1st Place
        </Badge>
      );
    if (rank === 2)
      return (
        <Badge className="bg-gray-400 text-white hover:bg-gray-500 text-base px-3 py-1">
          <Trophy className="mr-1 h-4 w-4" />
          2nd Place
        </Badge>
      );
    if (rank === 3)
      return (
        <Badge className="bg-orange-600 text-white hover:bg-orange-700 text-base px-3 py-1">
          <Trophy className="mr-1 h-4 w-4" />
          3rd Place
        </Badge>
      );
    return <Badge variant="outline" className="text-base px-3 py-1">{formatRank(rank)}</Badge>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">Organizer Dashboard</CardTitle>
              <CardDescription className="text-sm mt-1">
                Event Date: {currentEvent.eventDate} • {currentEvent.holeCount}-hole {currentEvent.scrambleMode === "straight" ? "Straight" : "Champagne"} Scramble • {currentEvent.teamCount} team(s)
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onCreateNewEvent} size="sm" variant="outline" className="text-xs">
                <Archive className="mr-1 h-4 w-4" />
                New Event
              </Button>
              {isPublished ? (
                <Button
                  onClick={() => setShowUnpublishDialog(true)}
                  size="sm"
                  variant="destructive"
                  className="text-xs"
                >
                  Unpublish
                </Button>
              ) : (
                <Button
                  onClick={() => setShowPublishDialog(true)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-xs"
                  disabled={teams.length === 0}
                >
                  <Upload className="mr-1 h-4 w-4" />
                  Publish
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Status Banner */}
      {isPublished && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <p className="text-green-800 text-lg font-medium text-center">
              ✓ Results are publicly visible to all players
            </p>
          </CardContent>
        </Card>
      )}

      {!isPublished && teams.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-blue-800 text-lg font-medium text-center">
              Private leaderboard ready for review. Click Publish Results when ready.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leaderboard" className="text-base">
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="scorecards" className="text-base">
            Scorecards ({scorecards.length})
          </TabsTrigger>
        </TabsList>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="text-2xl">
                  {isPublished ? "Published" : "Private"} Leaderboard
                </CardTitle>
                <div className="flex gap-3">
                  <Button onClick={onExportCSV} variant="outline" size="lg">
                    <Download className="mr-2 h-5 w-5" />
                    Export CSV
                  </Button>
                  <Button onClick={onExportPDF} variant="outline" size="lg">
                    <Download className="mr-2 h-5 w-5" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No teams registered yet.</p>
                  <p className="text-base mt-2">Scorecards will appear here as they are uploaded.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-base">Rank</TableHead>
                        <TableHead className="text-base">Team Name</TableHead>
                        <TableHead className="text-base">Players</TableHead>
                        <TableHead className="text-base">Handicaps</TableHead>
                        <TableHead className="text-base">Mode</TableHead>
                        <TableHead className="text-base">Gross</TableHead>
                        <TableHead className="text-base">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams.map((team) => (
                        <TableRow key={team.id}>
                          <TableCell>{getRankBadge(team.rank)}</TableCell>
                          <TableCell className="font-semibold text-base">
                            {team.teamName}
                          </TableCell>
                          <TableCell className="text-base">
                            {team.playerNames.join(", ")}
                          </TableCell>
                          <TableCell className="text-base">
                            {team.playerHandicaps.join(", ")}
                          </TableCell>
                          <TableCell className="text-base">
                            <Badge variant="secondary">
                              {team.scrambleMode === "straight"
                                ? "Straight"
                                : "Champagne"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-base">{team.grossTotal}</TableCell>
                          <TableCell className="font-bold text-base">
                            {team.scrambleMode === "straight"
                              ? `${team.netScore} (net)`
                              : `${team.pointsTotal} pts`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scorecards Tab */}
        <TabsContent value="scorecards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Uploaded Scorecards</CardTitle>
              <CardDescription className="text-base">
                Review scorecard images and OCR-extracted data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scorecards.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No scorecards uploaded yet.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {scorecards.map((scorecard) => (
                    <Card key={scorecard.id} className="overflow-hidden">
                      <div className="aspect-video bg-gray-100 relative">
                        <img
                          src={scorecard.imageUrl}
                          alt={`Scorecard for ${scorecard.teamName}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="pt-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {scorecard.teamName}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Uploaded: {scorecard.uploadedAt}
                        </p>
                        <Button
                          onClick={() => setSelectedScorecard(scorecard)}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Full Size
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">Publish Results?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              This will make the leaderboard publicly visible to all players. You can unpublish
              later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-base">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublish}
              className="bg-green-600 hover:bg-green-700 text-base"
            >
              Publish Results
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unpublish Confirmation Dialog */}
      <AlertDialog open={showUnpublishDialog} onOpenChange={setShowUnpublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">Unpublish Results?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              This will hide the leaderboard from players. The data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-base">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnpublish} className="text-base">
              Unpublish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scorecard Preview Dialog */}
      <AlertDialog
        open={selectedScorecard !== null}
        onOpenChange={() => setSelectedScorecard(null)}
      >
        <AlertDialogContent className="max-w-4xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              {selectedScorecard?.teamName}
            </AlertDialogTitle>
          </AlertDialogHeader>
          {selectedScorecard && (
            <div className="mt-4">
              <img
                src={selectedScorecard.imageUrl}
                alt="Scorecard preview"
                className="w-full rounded-lg border border-gray-200"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogAction className="text-base">Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Trophy, Clock } from "lucide-react";
import { formatRank } from "../lib/ordinal";

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

type PublicLeaderboardProps = {
  eventDate: string;
  teams: Team[];
  isPublished: boolean;
};

export default function PublicLeaderboard({
  eventDate,
  teams,
  isPublished,
}: PublicLeaderboardProps) {
  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <Badge className="bg-yellow-500 text-white hover:bg-yellow-600 text-lg px-4 py-2">
          <Trophy className="mr-2 h-5 w-5" />
          1st Place
        </Badge>
      );
    if (rank === 2)
      return (
        <Badge className="bg-gray-400 text-white hover:bg-gray-500 text-lg px-4 py-2">
          <Trophy className="mr-2 h-5 w-5" />
          2nd Place
        </Badge>
      );
    if (rank === 3)
      return (
        <Badge className="bg-orange-600 text-white hover:bg-orange-700 text-lg px-4 py-2">
          <Trophy className="mr-2 h-5 w-5" />
          3rd Place
        </Badge>
      );
    return (
      <Badge variant="outline" className="text-lg px-4 py-2">
        {formatRank(rank)}
      </Badge>
    );
  };

  if (!isPublished) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Clock className="w-20 h-20 text-blue-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Results Pending</h2>
            <p className="text-gray-600 text-lg">
              The organizer is reviewing the scorecards. Results will be published soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-none">
        <CardHeader className="text-center pb-8">
          <Trophy className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <CardTitle className="text-4xl font-bold">Official Leaderboard</CardTitle>
          <CardDescription className="text-xl mt-3 text-gray-700">
            Event Date: {eventDate}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Final Results</CardTitle>
          <CardDescription className="text-base">
            {teams.length} team{teams.length !== 1 ? "s" : ""} competed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base font-semibold">Rank</TableHead>
                  <TableHead className="text-base font-semibold">Team Name</TableHead>
                  <TableHead className="text-base font-semibold">Players</TableHead>
                  <TableHead className="text-base font-semibold">Handicaps</TableHead>
                  <TableHead className="text-base font-semibold">Mode</TableHead>
                  <TableHead className="text-base font-semibold">Gross</TableHead>
                  <TableHead className="text-base font-semibold">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow
                    key={team.id}
                    className={
                      team.rank <= 3
                        ? "bg-gradient-to-r from-yellow-50 to-orange-50 font-medium"
                        : ""
                    }
                  >
                    <TableCell>{getRankBadge(team.rank)}</TableCell>
                    <TableCell className="font-bold text-lg">{team.teamName}</TableCell>
                    <TableCell className="text-base">
                      {team.playerNames.join(", ")}
                    </TableCell>
                    <TableCell className="text-base">
                      {team.playerHandicaps.join(", ")}
                    </TableCell>
                    <TableCell className="text-base">
                      <Badge variant="secondary" className="text-sm">
                        {team.scrambleMode === "straight" ? "Straight" : "Champagne"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-base font-medium">{team.grossTotal}</TableCell>
                    <TableCell className="font-bold text-lg">
                      {team.scrambleMode === "straight"
                        ? `${team.netScore} (net)`
                        : `${team.pointsTotal} pts`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 Podium */}
      {teams.length >= 3 && (
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Top 3 Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {teams.slice(0, 3).map((team) => (
                <Card
                  key={team.id}
                  className={
                    team.rank === 1
                      ? "border-yellow-500 border-2 shadow-lg"
                      : team.rank === 2
                      ? "border-gray-400 border-2"
                      : "border-orange-600 border-2"
                  }
                >
                  <CardHeader className="text-center">
                    {getRankBadge(team.rank)}
                    <CardTitle className="text-xl mt-3">{team.teamName}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-2">
                    <p className="text-base">{team.playerNames.join(", ")}</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {team.scrambleMode === "straight"
                        ? `${team.netScore} (net)`
                        : `${team.pointsTotal} pts`}
                    </p>
                    <p className="text-sm text-gray-600">Gross: {team.grossTotal}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

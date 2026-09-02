import type { Job, JobMatch } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type JobWithMatches = Job & { matches: JobMatch[] };

export function MatchAnalysis({ job }: { job: JobWithMatches }) {
  const match = job.matches[0];
  if (!match) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Match Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This job has not been analyzed against your profile yet. Click &quot;Match this job&quot;
            to analyze it.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Match Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Match score</p>
            <p className="text-2xl font-bold">{match.matchScore}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Credibility</p>
            <p className="text-2xl font-bold">
              {job.credibilityScore ?? "N/A"}{job.credibilityScore != null ? "/100" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Seniority</p>
            <p className="font-medium">{match.seniorityAssessment || "N/A"}</p>
          </div>
        </div>

        {match.reasons.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Why it matches</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {match.reasons.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        )}

        {match.missing.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium">Missing requirements</p>
            <div className="flex flex-wrap gap-2">
              {match.missing.map((m) => (
                <Badge key={m} variant="destructive">
                  {m}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-emerald-600">All identified requirements are matched.</p>
        )}
      </CardContent>
    </Card>
  );
}
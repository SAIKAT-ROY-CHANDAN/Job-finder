import { requireUserId, ApiError } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSalary, timeAgo } from "@/lib/utils";
import { ApplyButton } from "@/components/jobs/apply-button";
import { MatchAnalysis } from "@/components/jobs/match-analysis";
import { SourceLogo } from "@/components/jobs/source-logo";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  await requireUserId();
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: { company: true, requirements: true, source: true, matches: true },
  });
  if (!job) throw new ApiError(404, "Job not found");

  const label =
    job.credibilityScore != null
      ? job.credibilityScore >= 90
        ? "Highly credible"
        : job.credibilityScore >= 75
          ? "Likely credible"
          : job.credibilityScore >= 50
            ? "Verify carefully"
            : "Suspicious"
      : "Not assessed";

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <SourceLogo source={job.source} />
            <div>
              <h1 className="text-3xl font-bold">{job.title}</h1>
              <p className="mt-1 text-lg text-muted-foreground">
                {job.company?.name}
                {job.source?.name ? ` · via ${job.source.name}` : ""} ·{" "}
                {job.remote ? "Remote" : job.location || "Location TBD"}
              </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {job.matchScore != null && (
                <Badge variant="success">Match {job.matchScore}%</Badge>
              )}
              {job.credibilityScore != null && (
                <Badge variant={job.credibilityScore >= 75 ? "success" : "warning"}>
                  Credibility {job.credibilityScore}/100 · {label}
                </Badge>
              )}
              {job.sourceUrl && (
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  View original posting
                </a>
              )}
            </div>
            </div>
          </div>
          <ApplyButton jobId={job.id} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Salary & Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Salary</p>
              <p className="font-medium">
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency || "USD")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium">
                {job.remote ? "Remote" : job.location || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Posted</p>
              <p className="font-medium">{timeAgo(job.postedAt)}</p>
            </div>
          </CardContent>
        </Card>

        {job.requirements && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.requirements.requiredTech.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Required technologies</p>
                  <div className="flex flex-wrap gap-2">
                    {job.requirements.requiredTech.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {job.requirements.preferredTech.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Preferred technologies</p>
                  <div className="flex flex-wrap gap-2">
                    {job.requirements.preferredTech.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-4 text-sm sm:grid-cols-3">
                {job.requirements.minimumYears != null && (
                  <div>
                    <span className="text-muted-foreground">Min experience:</span>{" "}
                    {job.requirements.minimumYears} years
                  </div>
                )}
                {job.requirements.industry && (
                  <div>
                    <span className="text-muted-foreground">Industry:</span> {job.requirements.industry}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <MatchAnalysis job={job} />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {job.description || "No description available."}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

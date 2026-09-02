import Link from "next/link";
import type { Job, Company, JobRequirement, JobSource } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceLogo } from "@/components/jobs/source-logo";
import { timeAgo, formatSalary } from "@/lib/utils";

export type JobWithRelations = Job & {
  company: Company | null;
  requirements: JobRequirement | null;
  source: JobSource | null;
};

export function JobCard({ job }: { job: JobWithRelations }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start gap-3">
          <SourceLogo source={job.source} />
          <div>
            <h3 className="text-lg font-semibold">{job.title}</h3>
            <p className="text-sm text-muted-foreground">
              {job.company?.name} · {job.remote ? "Remote" : job.location || "Location TBD"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {job.matchScore != null && (
            <Badge variant={job.matchScore >= 75 ? "success" : job.matchScore >= 50 ? "warning" : "outline"}>
              Match {job.matchScore}%
            </Badge>
          )}
          {job.credibilityScore != null && (
            <Badge variant={job.credibilityScore >= 75 ? "success" : "outline"}>
              Credibility {job.credibilityScore}/100
            </Badge>
          )}
        </div>

        <p className="text-sm font-medium">
          {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency || "USD")}
        </p>

        {job.source?.name && (
          <p className="text-xs text-muted-foreground">via {job.source.name}</p>
        )}

        {job.requirements && job.requirements.requiredTech.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {job.requirements.requiredTech.slice(0, 4).join(" · ")}
            {job.requirements.requiredTech.length > 4 && (
              <span> +{job.requirements.requiredTech.length - 4} more</span>
            )}
          </p>
        )}

        <p className="text-xs text-muted-foreground">Posted {timeAgo(job.postedAt)}</p>

        <div className="flex gap-2 pt-1">
          <Link href={`/jobs/${job.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Job
            </Button>
          </Link>
          <Link href={`/jobs/${job.id}`} className="flex-1">
            <Button className="w-full">Apply</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

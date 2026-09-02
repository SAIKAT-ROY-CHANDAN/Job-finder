import Link from "next/link";
import type { Job, Company, JobRequirement, JobSource } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceLogo } from "@/components/jobs/source-logo";
import { timeAgo, formatSalary } from "@/lib/utils";

type JobWithRelations = Job & {
  company: Company | null;
  requirements: JobRequirement | null;
  source: JobSource | null;
};

export function RecommendedJobs({ jobs }: { jobs: JobWithRelations[] }) {
  if (jobs.length === 0) {
    return (
      <p className="text-muted-foreground">
        No highly matched jobs yet. Add jobs to your database to see recommendations.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <Card key={job.id}>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start gap-3">
              <SourceLogo source={job.source} />
              <div>
                <h3 className="font-semibold">{job.title}</h3>
                <p className="text-sm text-muted-foreground">{job.company?.name}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {job.remote && <Badge variant="secondary">Remote</Badge>}
              <Badge variant="success">{job.matchScore}% match</Badge>
              <Badge variant="warning">{job.credibilityScore}/100 reliable</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency || "USD")}
            </p>
            {job.source?.name && (
              <p className="text-xs text-muted-foreground">via {job.source.name}</p>
            )}
            {job.requirements && job.requirements.requiredTech.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {job.requirements.requiredTech.slice(0, 4).join(" · ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{timeAgo(job.postedAt)}</p>
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
      ))}
    </div>
  );
}

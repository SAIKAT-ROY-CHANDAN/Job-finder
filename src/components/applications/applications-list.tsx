"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type ApplicationRow = {
  id: string;
  status: string;
  createdAt: string;
  appliedAt: string | null;
  job: { title: string; company: { name: string } | null; matchScore: number | null; credibilityScore: number | null };
  resume: { id: string; name: string } | null;
};

const statuses = [
  { value: "", label: "All" },
  { value: "SAVED", label: "Saved" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY_TO_APPLY", label: "Ready to Apply" },
  { value: "SUBMITTED", label: "Applied" },
  { value: "VIEWED", label: "Viewed" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

const statusVariant = (status: string) => {
  switch (status) {
    case "SUBMITTED":
    case "VIEWED":
      return "success" as const;
    case "INTERVIEW":
    case "OFFER":
      return "success" as const;
    case "REJECTED":
    case "WITHDRAWN":
      return "destructive" as const;
    case "READY_TO_APPLY":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
};

export function ApplicationsList({ applications }: { applications: ApplicationRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStatus = searchParams.get("status") || "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              const params = new URLSearchParams();
              if (s.value) params.set("status", s.value);
              router.push(`/applications?${params.toString()}`);
            }}
            className={`rounded-full px-3 py-1 text-sm ${
              activeStatus === s.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-accent"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {applications.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No applications yet. Apply to a job to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{app.job.title}</h3>
                    {app.job.company?.name && (
                      <span className="text-sm text-muted-foreground">{app.job.company.name}</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {app.job.matchScore != null && <span>Match {app.job.matchScore}%</span>}
                    {app.job.credibilityScore != null && (
                      <span>Credibility {app.job.credibilityScore}/100</span>
                    )}
                    <span>Created {formatDate(app.createdAt)}</span>
                    {app.appliedAt && <span>Applied {formatDate(app.appliedAt)}</span>}
                    {app.resume && <span>Resume: {app.resume.name}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {app.resume && (
                    <a href={`/api/resumes/${app.resume.id}/pdf`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        View Resume
                      </Button>
                    </a>
                  )}
                  <Badge variant={statusVariant(app.status)}>{app.status.replace(/_/g, " ")}</Badge>
                  <Link href={`/applications/${app.id}`}>
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

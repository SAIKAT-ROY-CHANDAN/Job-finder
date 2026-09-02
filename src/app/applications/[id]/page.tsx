import { requireUserId, ApiError } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const userId = await requireUserId();
  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      job: { include: { company: true } },
      resume: true,
      answers: true,
      events: { orderBy: { createdAt: "asc" } },
      coverLetter: true,
    },
  });
  if (!application) throw new ApiError(404, "Application not found");
  if (application.userId !== userId) throw new ApiError(403, "Forbidden");

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{application.job.title}</h1>
            <Badge variant="secondary">{application.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            {application.job.company?.name} · Applied {application.appliedAt ? formatDate(application.appliedAt) : "Not yet"}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {application.resume && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resume Used</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 text-sm">
                  <p className="text-muted-foreground">{application.resume.name}</p>
                  <a href={`/api/resumes/${application.resume.id}/pdf`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      View PDF
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )}

            {application.coverLetter && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cover Letter</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {application.coverLetter.content}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {application.answers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Application Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {application.answers.map((a, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium">{a.question}</p>
                      <p className="text-sm text-muted-foreground">{a.answer}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {application.events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {application.events.map((ev, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 text-muted-foreground">{formatDate(ev.createdAt)}</span>
                      <Badge variant="secondary">{ev.eventType.replace(/_/g, " ")}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

import { requireUserId } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ResumeManager } from "@/components/resume/resume-manager";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const userId = await requireUserId();
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      isMaster: true,
      isJobSpecific: true,
      jobId: true,
      createdAt: true,
    },
  });
  const jobIds = resumes.filter((r) => r.jobId).map((r) => r.jobId as string);
  const jobs = jobIds.length
    ? await prisma.job.findMany({ where: { id: { in: jobIds } }, select: { id: true, title: true } })
    : [];
  const jobTitles = new Map(jobs.map((j) => [j.id, j.title]));

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Resume</h1>
          <p className="mt-1 text-muted-foreground">
            Generate your master resume from your profile, or a tailored resume for a specific job.
          </p>
        </div>
        <ResumeManager
          hasProfile={!!profile}
          resumes={resumes.map((r) => ({
            ...r,
            jobTitle: r.jobId ? jobTitles.get(r.jobId) ?? null : null,
          })) as never[]}
          jobsUrl="/jobs"
        />
      </div>
    </DashboardShell>
  );
}

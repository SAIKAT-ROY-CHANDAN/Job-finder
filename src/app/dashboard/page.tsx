import { requireUserId } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecommendedJobs } from "@/components/dashboard/recommended-jobs";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await requireUserId();

  const profile = await prisma.profile.findUnique({ where: { userId } });
  const [totalJobs, highMatchJobs, applications, appliedCount, interviewCount, offers] =
    await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { matchScore: { gte: 75 } } }),
      prisma.application.count({ where: { userId } }),
      prisma.application.count({ where: { userId, status: "APPLIED" } }),
      prisma.application.count({ where: { userId, status: "INTERVIEW" } }),
      prisma.application.count({ where: { userId, status: "OFFER" } }),
    ]);

  const recommended = await prisma.job.findMany({
    where: { matchScore: { gte: 70 } },
    orderBy: [{ matchScore: "desc" }, { postedAt: "desc" }],
    take: 6,
    include: { company: true, requirements: true, source: true },
  });

  if (!profile) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-3xl py-16 text-center">
          <h1 className="text-3xl font-bold">Welcome to JobPilot</h1>
          <p className="mt-4 text-muted-foreground">
            Complete your Master Profile to start receiving highly matched job recommendations.
          </p>
          <a
            href="/profile"
            className="mt-8 inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground"
          >
            Build your profile
          </a>
        </div>
      </DashboardShell>
    );
  }

  const responseRate = appliedCount > 0 ? Math.round(((interviewCount + offers) / appliedCount) * 100) : 0;

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Overview of your job search and applications.
          </p>
        </div>

        <DashboardStats
          totalJobs={totalJobs}
          highMatchJobs={highMatchJobs}
          applications={appliedCount}
          interviews={interviewCount + offers}
          responseRate={responseRate}
        />

        <section>
          <h2 className="mb-4 text-xl font-semibold">Recommended Jobs</h2>
          <RecommendedJobs jobs={recommended} />
        </section>
      </div>
    </DashboardShell>
  );
}

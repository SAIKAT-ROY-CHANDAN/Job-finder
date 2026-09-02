import { requireUserId } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { JobsFilter } from "@/components/jobs/jobs-filter";
import { DiscoverJobsButton } from "@/components/jobs/discover-jobs-button";
import { JobCard, type JobWithRelations } from "@/components/jobs/job-card";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const userId = await requireUserId();

  const minMatch = Number(searchParams.minMatch || "0");
  const minCredibility = Number(searchParams.minCredibility || "0");
  const remote = searchParams.remote === "true";
  const q = searchParams.q?.toLowerCase();
  const tech = searchParams.tech?.toLowerCase();

  const profile = await prisma.profile.findUnique({ where: { userId } });
  const preferredTitles = profile?.preferredTitles ?? [];
  const preferredTech = profile?.preferredTech ?? [];
  const preferredIndustries = profile?.preferredIndustries ?? [];

  const where: Record<string, unknown> = {};

  if (minMatch > 0) where["matchScore"] = { gte: minMatch };
  if (minCredibility > 0) where["credibilityScore"] = { gte: minCredibility };
  if (remote) where["remote"] = true;

  const or: Record<string, unknown>[] = [];

  if (q) {
    or.push({ title: { contains: q, mode: "insensitive" } });
  }

  for (const title of preferredTitles) {
    if (title.trim()) {
      or.push({ title: { contains: title.trim(), mode: "insensitive" } });
    }
  }

  const techTerms = [...new Set([...(tech ? [tech] : []), ...preferredTech.map((t) => t.toLowerCase())])].filter(
    (t) => t.trim(),
  );
  if (techTerms.length > 0) {
    or.push({
      OR: [
        ...techTerms.map((t) => ({
          requirements: {
            is: {
              OR: [{ requiredTech: { has: t } }, { preferredTech: { has: t } }],
            },
          },
        })),
        ...techTerms.map((t) => ({ title: { contains: t, mode: "insensitive" } })),
        ...techTerms.map((t) => ({ description: { contains: t, mode: "insensitive" } })),
      ],
    });
  }

  for (const industry of preferredIndustries) {
    if (industry.trim()) {
      or.push({
        requirements: {
          is: {
            industry: { contains: industry.trim(), mode: "insensitive" },
          },
        },
      });
    }
  }

  if (or.length > 0) where["OR"] = or;

  const jobs = (await prisma.job.findMany({
    where,
    orderBy: [{ matchScore: "desc" }, { postedAt: "desc" }],
    take: 60,
    include: { company: true, requirements: true, source: true },
  })) as JobWithRelations[];

  const hasProfileCriteria = preferredTitles.length > 0 || preferredTech.length > 0 || preferredIndustries.length > 0;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Jobs</h1>
            <p className="mt-1 text-muted-foreground">
              {hasProfileCriteria
                ? "Jobs currently matching your profile's preferred titles, technologies and industries."
                : "Set preferred titles, technologies and industries in your profile to auto-search matching jobs."}
            </p>
          </div>
          <DiscoverJobsButton />
        </div>

        <JobsFilter />

        {jobs.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No jobs found. Try adjusting your filters, or ingest job sources.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

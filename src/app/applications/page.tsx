import { requireUserId } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ApplicationsList } from "@/components/applications/applications-list";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireUserId();
  const status = searchParams.status;
  const where: Record<string, unknown> = {};
  if (status) where["status"] = status;

  const applications = await prisma.application.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      job: { include: { company: true } },
      resume: { select: { id: true, name: true } },
      answers: true,
    },
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Applications</h1>
          <p className="mt-1 text-muted-foreground">
            Track every application from prepared to offer.
          </p>
        </div>
        <ApplicationsList applications={applications as never[]} />
      </div>
    </DashboardShell>
  );
}

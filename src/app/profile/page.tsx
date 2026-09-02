import { requireUserId } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProfileForm } from "@/components/profile/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userId = await requireUserId();
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      user: {
        include: {
          experiences: true,
          skills: true,
          education: true,
          certifications: true,
          projects: true,
        },
      },
    },
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Master Profile</h1>
          <p className="mt-1 text-muted-foreground">
            Your professional information, stored once and used for every job match and application.
          </p>
        </div>
        <ProfileForm initial={profile as never} />
      </div>
    </DashboardShell>
  );
}

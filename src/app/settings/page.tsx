import { requireUserId } from "@/lib/server-helpers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireUserId();
  return (
    <DashboardShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Application Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              JobPilot never mass-applies. Each application requires your explicit confirmation
              before submission.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

import { Card, CardContent } from "@/components/ui/card";

interface DashboardStatsProps {
  totalJobs: number;
  highMatchJobs: number;
  applications: number;
  interviews: number;
  responseRate: number;
}

export function DashboardStats({
  totalJobs,
  highMatchJobs,
  applications,
  interviews,
  responseRate,
}: DashboardStatsProps) {
  const stats = [
    { label: "Total Jobs Found", value: totalJobs },
    { label: "High Match Jobs (75%+)", value: highMatchJobs },
    { label: "Applications", value: applications },
    { label: "Interviews", value: interviews },
    { label: "Response Rate", value: `${responseRate}%` },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="py-4">
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

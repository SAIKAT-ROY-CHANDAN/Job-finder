"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

type ResumeRow = {
  id: string;
  name: string;
  isMaster: boolean;
  isJobSpecific: boolean;
  jobId: string | null;
  createdAt: string;
  jobTitle?: string | null;
};

export function ResumeManager({
  hasProfile,
  resumes,
  jobsUrl,
}: {
  hasProfile: boolean;
  resumes: ResumeRow[];
  jobsUrl: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<ResumeRow[]>(resumes);
  const [refreshing, setRefreshing] = useState(false);

  const loadResumes = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/resumes");
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        const jobTitles = new Map(
          resumes.filter((r) => r.jobTitle).map((r) => [r.id, r.jobTitle as string]),
        );
        setList(
          (data.data as ResumeRow[]).map((r) => ({
            ...r,
            jobTitle: r.jobId ? jobTitles.get(r.id) ?? null : null,
          })),
        );
      }
    } catch {
      // keep current list
    } finally {
      setRefreshing(false);
    }
  };

  const generateMaster = async () => {
    if (!hasProfile) {
      toast({ title: "No profile", description: "Build your master profile first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/resumes", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Generation failed", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Master resume generated" });
      await loadResumes();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Master Resume</p>
            <p className="text-sm text-muted-foreground">
              Generated from your Master Profile.
            </p>
          </div>
          <Button onClick={generateMaster} disabled={loading}>
            {loading ? "Generating..." : "Generate Master Resume"}
          </Button>
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {refreshing ? "Refreshing..." : "No resumes generated yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-3 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{r.isJobSpecific && r.jobTitle ? r.jobTitle : r.name}</p>
                    {r.isMaster && <Badge variant="secondary">Master</Badge>}
                    {r.isJobSpecific && <Badge variant="success">Job-specific</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.name} · {formatDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.isJobSpecific && r.jobId && (
                    <Link href={`/jobs/${r.jobId}`}>
                      <Button variant="outline" size="sm">
                        View job
                      </Button>
                    </Link>
                  )}
                  <a href={`/api/resumes/${r.id}/pdf`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      View PDF
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!hasProfile && (
        <Link href="/profile">
          <Button variant="outline">Build Master Profile</Button>
        </Link>
      )}
    </div>
  );
}

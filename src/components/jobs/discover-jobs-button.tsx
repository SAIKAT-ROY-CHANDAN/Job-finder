"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

type SourceRun = {
  name: string;
  fetched: number;
  relevant: number;
  created: number;
};

type DiscoverResult = {
  fetched: number;
  relevant: number;
  created: number;
  skipped: number;
  analyzed: number;
  errors: string[];
  sources: SourceRun[];
};

export function DiscoverJobsButton() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50, filterByProfile: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Discovery failed", description: data.error, variant: "destructive" });
        return;
      }
      const r: DiscoverResult = data.data;
      if (r.created > 0) {
        toast({
          title: `Found ${r.created} new job${r.created === 1 ? "" : "s"}`,
          description: `Scanned ${r.relevant} relevant of ${r.fetched} fetched; ${r.analyzed} matched to your profile.`,
        });
      } else {
        toast({
          title: "No new jobs found",
          description: `Scanned ${r.relevant} relevant of ${r.fetched} fetched (${r.skipped} already in database).`,
        });
      }
      if (r.sources.length > 0) {
        toast({
          title: "By source",
          description: r.sources
            .map((s) => `${s.name}: ${s.created} new / ${s.relevant} relevant`)
            .join(" · "),
        });
      }
      if (r.errors.length > 0) {
        toast({ title: "Source warnings", description: r.errors.join(" · "), variant: "destructive" });
      }
      router.refresh();
    } catch {
      toast({ title: "Discovery error", description: "Could not reach job sources.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={run} disabled={loading}>
      {loading ? "Searching jobs from your profile..." : "Discover jobs from my profile"}
    </Button>
  );
}

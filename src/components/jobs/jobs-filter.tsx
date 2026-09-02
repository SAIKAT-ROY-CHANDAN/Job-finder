"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function JobsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [minMatch, setMinMatch] = useState(searchParams.get("minMatch") || "");
  const [minCredibility, setMinCredibility] = useState(searchParams.get("minCredibility") || "");
  const [tech, setTech] = useState(searchParams.get("tech") || "");
  const [remote, setRemote] = useState(searchParams.get("remote") === "true");

  const apply = () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (minMatch) params.set("minMatch", minMatch);
    if (minCredibility) params.set("minCredibility", minCredibility);
    if (tech) params.set("tech", tech);
    if (remote) params.set("remote", "true");
    router.push(`/jobs?${params.toString()}`);
  };

  const reset = () => {
    setQ("");
    setMinMatch("");
    setMinCredibility("");
    setTech("");
    setRemote(false);
    router.push("/jobs");
  };

  return (
    <Card>
      <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1.5">
          <Label>Search</Label>
          <Input placeholder="Job title" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Min Match %</Label>
          <Input
            placeholder="70"
            type="number"
            value={minMatch}
            onChange={(e) => setMinMatch(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Min Credibility</Label>
          <Input
            placeholder="70"
            type="number"
            value={minCredibility}
            onChange={(e) => setMinCredibility(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Technology</Label>
          <Input placeholder="e.g. React" value={tech} onChange={(e) => setTech(e.target.value)} />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remote}
              onChange={(e) => setRemote(e.target.checked)}
              className="h-4 w-4"
            />
            Remote only
          </label>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={apply} className="flex-1">
            Filter
          </Button>
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

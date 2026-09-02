"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";

type ApplicationPackage = {
  applicationId: string;
  resumeFileName: string;
  resume: Record<string, unknown>;
  coverLetter?: string;
  questions: { question: string; answer: string; isGenerated: boolean }[];
  fields: { field: string; value: string; completed: boolean }[];
  destinationUrl?: string;
};

export function ApplyButton({ jobId }: { jobId: string }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"idle" | "loading" | "review" | "submitting" | "done">("idle");
  const [pkg, setPkg] = useState<ApplicationPackage | null>(null);

  const handleApply = async () => {
    setStep("loading");
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to prepare", description: data.error || "Please try again.", variant: "destructive" });
        setStep("idle");
        return;
      }
      if (data.data?.alreadySubmitted) {
        toast({ title: "Already applied", description: "You already submitted an application for this job." });
        setStep("done");
        return;
      }
      setPkg(data.data);
      setStep("review");
    } catch {
      toast({ title: "Error", variant: "destructive" });
      setStep("idle");
    }
  };

  const handleConfirmSubmit = async () => {
    if (!pkg?.applicationId) return;
    setStep("submitting");
    try {
      const res = await fetch(`/api/applications/${pkg.applicationId}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Submission failed", description: data.error, variant: "destructive" });
        setStep("review");
        return;
      }
      toast({ title: "Application submitted!", description: data.data.duplicate ? "Already submitted." : "Good luck!" });
      setStep("done");
    } catch {
      toast({ title: "Error", variant: "destructive" });
      setStep("review");
    }
  };

  if (step === "idle") {
    return <Button onClick={handleApply}>Apply</Button>;
  }

  if (step === "loading") {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Preparing application...</span>
      </div>
    );
  }

  if (step === "done") {
    return <Badge variant="success">Application submitted</Badge>;
  }

  // "review" or "submitting" step
  if (!pkg?.fields || !pkg.questions) return null;

  const completedFields = pkg.fields.filter((f) => f.completed).length;
  const totalFields = pkg.fields.length;
  const fieldsPct = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  const questionsPrepared = pkg.questions.filter((q) => q.answer !== "Information unavailable").length;

  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="text-lg">Application Ready</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Resume</p>
            <p className="font-medium">{pkg.resumeFileName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cover letter</p>
            <p className="font-medium">{pkg.coverLetter ? "Generated" : "N/A"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Questions</p>
            <p className="font-medium">
              {questionsPrepared}/{pkg.questions.length} prepared
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Fields</p>
            <p className="font-medium">{completedFields}/{totalFields} completed</p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Field completion</span>
            <span>{fieldsPct}%</span>
          </div>
          <Progress value={fieldsPct} />
        </div>

        {pkg.coverLetter && (
          <div>
            <p className="mb-1 text-sm font-medium">Cover letter preview</p>
            <p className="line-clamp-4 text-xs text-muted-foreground">{pkg.coverLetter}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button onClick={handleConfirmSubmit} disabled={step === "submitting"}>
            {step === "submitting" ? "Submitting..." : "Submit Application"}
          </Button>
          <Button variant="outline" onClick={() => setStep("idle")}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

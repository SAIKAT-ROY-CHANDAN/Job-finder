import type { RawJobInput } from "@/lib/discovery/discovery";

export interface RemotiveJob {
  id: string;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string | null;
  category?: string | null;
  tags?: string[];
  job_type?: string | null;
  publication_date: string;
  candidate_required_location?: string | null;
  salary?: string | null;
  description: string;
}

interface RemotiveResponse {
  "job-count"?: number;
  jobs: RemotiveJob[];
}

/**
 * Fetch remote jobs from the free Remotive public API.
 * https://remotive.com/api/remote-jobs
 */
export async function fetchRemotiveJobs(limit = 50): Promise<RemotiveJob[]> {
  const url = `https://remotive.com/api/remote-jobs?limit=${limit}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`Remotive API returned ${res.status}`);
  }
  const data: RemotiveResponse = await res.json();
  return data.jobs ?? [];
}

function parseSalary(text?: string | null): { min?: number; max?: number; currency?: string } {
  if (!text) return {};
  const money = text.match(/(\d[\d,]*k?)(?:\s*[-–]\s*(\d[\d,]*k?))?/i);
  if (!money) return {};
  const toNumber = (s: string): number | undefined => {
    const cleaned = s.replace(/,/g, "").toLowerCase();
    const k = cleaned.endsWith("k");
    const numeric = parseFloat(cleaned);
    if (isNaN(numeric)) return undefined;
    return k ? Math.round(numeric * 1000) : Math.round(numeric);
  };
  const min = toNumber(money[1]);
  const max = money[2] ? toNumber(money[2]) : min;
  const isUsd = /usd|us\$|\$/i.test(text);
  return { min, max, currency: isUsd ? "USD" : undefined };
}

/**
 * Normalize Remotive jobs into RawJobInput that the pipeline can ingest,
 * derivign tags/tech from the job category + tags to aid matching.
 */
export function normalizeRemotiveJobs(jobs: RemotiveJob[]): RawJobInput[] {
  return jobs
    .filter((j) => j && j.title && j.company_name)
    .map((j) => {
      const salary = parseSalary(j.salary);
      return {
        sourceName: "Remotive",
        sourceType: "API_SOURCE" as const,
        title: j.title,
        company: j.company_name,
        description: j.description || undefined,
        location: j.candidate_required_location || undefined,
        remote: true,
        salaryMin: salary.min,
        salaryMax: salary.max,
        salaryCurrency: salary.currency,
        sourceUrl: j.url,
        tech: j.tags ?? [],
        category: j.category ?? undefined,
        publishedAt: j.publication_date ? new Date(j.publication_date) : undefined,
        sourceLogoUrl: "https://remotive.com/favicon.ico",
        sourceHomePageUrl: "https://remotive.com",
      };
    });
}

import { stripHtml } from "@/lib/discovery/providers/rss";
import type { RawJobInput } from "@/lib/discovery/discovery";

export interface ArbeitnowJob {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
}

interface ArbeitnowResponse {
  data?: ArbeitnowJob[];
}

/**
 * Arbeitnow public JSON API (keyless). Europe-heavy board where remote flag
 * is explicit per posting.
 * https://www.arbeitnow.com/api/job-board-api
 */
export async function fetchArbeitnowJobs(limit = 50): Promise<ArbeitnowJob[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`Arbeitnow API returned ${res.status}`);
  }
  const data: ArbeitnowResponse = await res.json();
  return (data.data ?? []).slice(0, limit);
}

/**
 * Normalize Arbeitnow jobs into RawJobInput. `remote` is explicit per job;
 * tags are the closest thing to tech/category metadata on this board.
 */
export function normalizeArbeitnowJobs(jobs: ArbeitnowJob[]): RawJobInput[] {
  return jobs
    .filter((j) => j && j.title && j.company_name)
    .map((j) => {
      const tech = (j.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean);
      return {
        sourceName: "Arbeitnow",
        sourceType: "API_SOURCE" as const,
        title: j.title!.trim(),
        company: j.company_name!.trim(),
        description: j.description ? stripHtml(j.description).slice(0, 8000) || undefined : undefined,
        location: j.location?.trim() || undefined,
        remote: j.remote === true,
        sourceUrl: j.url?.trim() || undefined,
        tech,
        category: tech[0],
        publishedAt: j.created_at ? new Date(j.created_at * 1000) : undefined,
        sourceLogoUrl: "https://www.arbeitnow.com/favicon.ico",
        sourceHomePageUrl: "https://www.arbeitnow.com",
      };
    });
}
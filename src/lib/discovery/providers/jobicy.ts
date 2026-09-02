import { stripHtml } from "@/lib/discovery/providers/rss";
import type { RawJobInput } from "@/lib/discovery/discovery";

export interface JobicyJob {
  id?: number;
  url?: string;
  jobSlug?: string;
  jobTitle?: string;
  companyName?: string;
  companyLogo?: string | null;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string | null;
  jobLevel?: string | null;
  jobExcerpt?: string | null;
  jobDescription?: string | null;
  pubDate?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
}

interface JobicyResponse {
  success?: boolean;
  jobs?: JobicyJob[];
}

/**
 * Jobicy public JSON API (v2). No key required.
 * https://github.com/jobicy/remote-jobs-api
 * `geo`/`industry`/`tag` filters are intentionally omitted: the profile-based
 * relevance filter downstream decides what is worth ingesting.
 */
export async function fetchJobicyJobs(limit = 50): Promise<JobicyJob[]> {
  const url = new URL("https://jobicy.com/api/v2/remote-jobs");
  url.searchParams.set("count", String(Math.min(Math.max(limit, 1), 200)));
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`Jobicy API returned ${res.status}`);
  }
  const data: JobicyResponse = await res.json();
  return data.jobs ?? [];
}

/**
 * Normalize Jobicy jobs into RawJobInput. Location and industry metadata come
 * from jobGeo/jobIndustry; the category feeds the relevance filter while the
 * HTML description is flattened for tokenization.
 */
export function normalizeJobicyJobs(jobs: JobicyJob[]): RawJobInput[] {
  return jobs
    .filter((j) => j && j.jobTitle && j.companyName)
    .map((j) => {
      const geo = j.jobGeo?.trim();
      const description = stripHtml(j.jobDescription ?? j.jobExcerpt ?? "").slice(0, 8000) || undefined;
      return {
        sourceName: "Jobicy",
        sourceType: "API_SOURCE" as const,
        title: j.jobTitle!.trim(),
        company: j.companyName!.trim(),
        description,
        location: geo || undefined,
        remote: true,
        sourceUrl: j.url?.trim() || undefined,
        salaryMin: j.salaryMin ?? undefined,
        salaryMax: j.salaryMax ?? undefined,
        salaryCurrency: j.salaryCurrency ?? undefined,
        tech: (j.jobIndustry ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean),
        category: (j.jobIndustry ?? [])[0],
        publishedAt: j.pubDate ? new Date(j.pubDate) : undefined,
        sourceLogoUrl: "https://jobicy.com/favicon.ico",
        sourceHomePageUrl: "https://jobicy.com",
      };
    });
}
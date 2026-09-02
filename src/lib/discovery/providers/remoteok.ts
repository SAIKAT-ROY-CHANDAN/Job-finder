import { stripHtml } from "@/lib/discovery/providers/rss";
import type { RawJobInput } from "@/lib/discovery/discovery";

export interface RemoteOkJob {
  slug?: string;
  id?: string;
  date?: string;
  company?: string;
  company_logo?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  apply_url?: string | null;
  salary_min?: number;
  salary_max?: number;
  url?: string;
}

interface RemoteOkMeta {
  last_updated?: number;
  legal?: string;
}

/**
 * RemoteOK public JSON API.
 * https://remoteok.com/api
 * Returns a JSON array whose first element is metadata (last_updated/legal);
 * the remaining elements are job postings.
 */
export async function fetchRemoteOkJobs(limit = 50): Promise<RemoteOkJob[]> {
  const res = await fetch("https://remoteok.com/api", {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`RemoteOK API returned ${res.status}`);
  }
  const data: Array<RemoteOkMeta | RemoteOkJob> = await res.json();
  const isJob = (e: RemoteOkMeta | RemoteOkJob): e is RemoteOkJob =>
    e !== null && "id" in e && "position" in e;
  return data.filter(isJob).slice(0, limit);
}

/**
 * Normalize RemoteOK jobs into RawJobInput. Salary fields are 0 when the
 * employer discloses nothing, so only positive values are carried over.
 * Prefers the external apply link for the source URL, falling back to the
 * RemoteOK listing (keeps cross-source dedupe stable).
 */
export function normalizeRemoteOkJobs(jobs: RemoteOkJob[]): RawJobInput[] {
  return jobs
    .filter((j) => j && j.position && j.company)
    .map((j) => {
      const salaryMin = j.salary_min && j.salary_min > 0 ? j.salary_min : undefined;
      const salaryMax = j.salary_max && j.salary_max > 0 ? j.salary_max : salaryMin;
      return {
        sourceName: "RemoteOK",
        sourceType: "API_SOURCE" as const,
        title: j.position!.trim(),
        company: j.company!.trim(),
        description: j.description ? stripHtml(j.description).slice(0, 8000) || undefined : undefined,
        location: j.location?.trim() || undefined,
        remote: true,
        sourceUrl: j.apply_url?.trim() || j.url?.trim() || undefined,
        salaryMin,
        salaryMax,
        salaryCurrency: salaryMin ? "USD" : undefined,
        tech: (j.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean),
        publishedAt: j.date ? new Date(j.date) : undefined,
        sourceLogoUrl: "https://remoteok.com/favicon.ico",
        sourceHomePageUrl: "https://remoteok.com",
      };
    });
}
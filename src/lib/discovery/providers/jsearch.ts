import type { RawJobInput } from "@/lib/discovery/discovery";

export const JSEARCH_BASE_URL = "https://jsearch.p.rapidapi.com/search";

export interface JSearchJob {
  job_id?: string;
  job_title?: string;
  job_description?: string;
  employer_name?: string;
  employer_logo?: string | null;
  job_city?: string | null;
  job_country?: string | null;
  job_is_remote?: boolean;
  job_apply_link?: string;
  job_salary_currency?: string | null;
  job_salary_min?: number | null;
  job_salary_max?: number | null;
  job_posted_at_datetime_utc?: string;
  job_publisher?: string;
  job_expired?: boolean;
}

export interface JSearchResponse {
  data?: JSearchJob[];
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Normalize JSearch (Google-for-Jobs) results into RawJobInput.
 * Purely deterministic, sourced from the Google-jobs inventory; roles whose
 * publisher is LinkedIn are surfaced under a dedicated "LinkedIn" source so
 * those postings stay visible without scraping LinkedIn directly.
 */
export function normalizeJSearchJobs(data: JSearchJob[]): RawJobInput[] {
  const googleLogo = "https://www.google.com/favicon.ico";
  const linkedInLogo = "https://www.linkedin.com/favicon.ico";

  return (data ?? [])
    .filter((j) => j && j.job_title && j.employer_name && !j.job_expired)
    .map((j) => {
      const isLinkedIn = j.job_publisher?.toLowerCase() === "linkedin";
      const locationParts = [j.job_city, j.job_country].filter(Boolean).join(", ");
      return {
        sourceName: isLinkedIn ? "LinkedIn" : "Google Jobs",
        sourceType: "GOOGLE_JOBS" as const,
        title: j.job_title!.trim(),
        company: j.employer_name!.trim(),
        description: j.job_description?.trim() || undefined,
        location: j.job_is_remote ? "Remote" : locationParts || undefined,
        remote: j.job_is_remote === true,
        sourceUrl: j.job_apply_link?.trim() || undefined,
        salaryMin: toNumber(j.job_salary_min),
        salaryMax: toNumber(j.job_salary_max),
        salaryCurrency: j.job_salary_currency ?? undefined,
        publishedAt: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc) : undefined,
        sourceLogoUrl: isLinkedIn ? linkedInLogo : googleLogo,
        sourceHomePageUrl: isLinkedIn ? "https://www.linkedin.com" : "https://www.google.com",
      } satisfies RawJobInput;
    });
}

/**
 * Fetch Google-Jobs listings via the JSearch (RapidAPI) free tier.
 * Returns an empty list when RAPIDAPI_KEY is not configured, so the
 * provider is an optional source rather than a hard dependency.
 */
export async function fetchJSearchJobs(
  queries: string[],
  options?: { limit?: number },
): Promise<{ jobs: RawJobInput[]; fetched: number; errors: string[] }> {
  const apiKey = process.env.RAPIDAPI_KEY;
  const jobs: RawJobInput[] = [];
  const errors: string[] = [];
  let fetched = 0;

  if (!apiKey) {
    return { jobs, fetched, errors };
  }

  const limit = options?.limit ?? 15;
  for (const q of queries) {
    if (!q.trim()) continue;
    try {
      const url = new URL(JSEARCH_BASE_URL);
      url.searchParams.set("query", q.trim());
      url.searchParams.set("num_pages", "1");
      url.searchParams.set("page", "1");
      url.searchParams.set("date_posted", "month");
      const res = await fetch(url.toString(), {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        errors.push(`JSearch (${q}): HTTP ${res.status}`);
        continue;
      }
      const body: JSearchResponse = await res.json();
      const batch = normalizeJSearchJobs(body.data ?? []);
      fetched += batch.length;
      jobs.push(...batch.slice(0, limit));
    } catch (e: any) {
      errors.push(`JSearch (${q}): ${e?.message ?? String(e)}`);
    }
  }

  return { jobs, fetched, errors };
}
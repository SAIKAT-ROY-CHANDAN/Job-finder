import { prisma } from "@/lib/db";
import { ingestJobBatch, type RawJobInput } from "@/lib/discovery/discovery";
import { fetchRemotiveJobs, normalizeRemotiveJobs } from "@/lib/discovery/providers/remotive";
import { fetchRssFeeds } from "@/lib/discovery/providers/rss";
import { fetchJSearchJobs } from "@/lib/discovery/providers/jsearch";
import { fetchRemoteOkJobs, normalizeRemoteOkJobs } from "@/lib/discovery/providers/remoteok";
import { fetchJobicyJobs, normalizeJobicyJobs } from "@/lib/discovery/providers/jobicy";
import { fetchArbeitnowJobs, normalizeArbeitnowJobs } from "@/lib/discovery/providers/arbeitnow";
import { fetchLinkedInJobs, isLinkedInEnabled } from "@/lib/discovery/providers/linkedin";

const DEFAULT_RSS_FEEDS = [
  "https://weworkremotely.com/remote-jobs.rss",
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-design-jobs.rss",
  "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
];

function normalizeToken(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9+#.]/g, "");
}

interface RelevantJob {
  title: string;
  description?: string;
  tech?: string[];
  category?: string;
}

/**
 * Decide whether a job is relevant to the user's profile.
 * Matches on preferred titles (title overlap), preferred technologies
 * (tech tags/category/title/description), and preferred industries (category).
 * Source-agnostic: works for any provider's normalized job shape.
 */
export function isRelevantToProfile(
  job: RelevantJob,
  preferredTitles: string[],
  preferredTech: string[],
  preferredIndustries: string[],
): boolean {
  const title = normalizeToken(job.title);
  const tagsN = (job.tech ?? []).map(normalizeToken);
  const categoryN = normalizeToken(job.category || "");
  const descN = normalizeToken((job.description || "").slice(0, 2000));

  const titleMatch = (preferredTitles || []).some((t) => {
    const nt = normalizeToken(t);
    return nt.length > 0 && (title.includes(nt) || nt.includes(title));
  });

  const techMatch = (preferredTech || []).some((t) => {
    const nt = normalizeToken(t);
    if (!nt) return false;
    return tagsN.some((tag) => tag.includes(nt) || nt.includes(tag)) || title.includes(nt) || descN.includes(nt);
  });

  const industryMatch = (preferredIndustries || []).some((ind) => {
    const ni = normalizeToken(ind);
    return ni.length > 0 && (categoryN.includes(ni) || title.includes(ni));
  });

  return titleMatch || techMatch || industryMatch;
}

export interface SourceRun {
  name: string;
  fetched: number;
  relevant: number;
  created: number;
}

export interface DiscoverJobsResult {
  fetched: number;
  relevant: number;
  created: number;
  skipped: number;
  analyzed: number;
  errors: string[];
  sources: SourceRun[];
}

function configuredRssFeeds(): string[] {
  const fromEnv = (process.env.JOB_RSS_FEED_URLS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...fromEnv, ...DEFAULT_RSS_FEEDS])];
}

/**
 * Discover jobs from all configured sources (Remotive, RSS feeds, RemoteOK,
 * Jobicy, Arbeitnow, optionally LinkedIn via guest scraping, and optionally
 * Google Jobs via JSearch) based on the user's profile, ingest new ones, and
 * (optionally) run match analysis on each so the profile-based jobs search
 * reflects them immediately. Errors in one source never abort others.
 */
export async function discoverJobsForUser(
  userId: string,
  options?: { limit?: number; filterByProfile?: boolean; analyze?: boolean },
): Promise<DiscoverJobsResult> {
  const limit = options?.limit ?? 50;
  const filterByProfile = options?.filterByProfile ?? true;
  const analyze = options?.analyze ?? true;

  const result: DiscoverJobsResult = {
    fetched: 0,
    relevant: 0,
    created: 0,
    skipped: 0,
    analyzed: 0,
    errors: [],
    sources: [],
  };

  const profile = await prisma.profile.findUnique({ where: { userId } });
  const preferredTitles = profile?.preferredTitles ?? [];
  const preferredTech = profile?.preferredTech ?? [];
  const preferredIndustries = profile?.preferredIndustries ?? [];
  const profileId = profile?.id;

  const filter = (jobs: RawJobInput[]) =>
    filterByProfile ? jobs.filter((j) => isRelevantToProfile(j, preferredTitles, preferredTech, preferredIndustries)) : jobs;

  async function runSource(name: string, rawJobs: RawJobInput[]): Promise<void> {
    const sourceRun: SourceRun = { name, fetched: rawJobs.length, relevant: 0, created: 0 };
    const relevant = filter(rawJobs);
    sourceRun.relevant = relevant.length;
    result.fetched += rawJobs.length;
    result.relevant += relevant.length;

    if (relevant.length > 0) {
      const ingest = await ingestJobBatch(relevant, { profileId, userId });
      sourceRun.created = ingest.created;
      result.created += ingest.created;
      result.skipped += ingest.skipped;
      result.analyzed += ingest.analyzed;
    }

    result.sources.push(sourceRun);
  }

  try {
    const remotive = await fetchRemotiveJobs(limit);
    await runSource("Remotive", normalizeRemotiveJobs(remotive));
  } catch (e: any) {
    result.errors.push(`Remotive: ${e?.message ?? String(e)}`);
  }

  try {
    const rss = await fetchRssFeeds(configuredRssFeeds());
    await runSource("RSS feeds", rss.jobs);
    result.errors.push(...rss.errors);
  } catch (e: any) {
    result.errors.push(`RSS: ${e?.message ?? String(e)}`);
  }

  try {
    const remoteok = await fetchRemoteOkJobs(limit);
    await runSource("RemoteOK", normalizeRemoteOkJobs(remoteok));
  } catch (e: any) {
    result.errors.push(`RemoteOK: ${e?.message ?? String(e)}`);
  }

  try {
    const jobicy = await fetchJobicyJobs(limit);
    await runSource("Jobicy", normalizeJobicyJobs(jobicy));
  } catch (e: any) {
    result.errors.push(`Jobicy: ${e?.message ?? String(e)}`);
  }

  try {
    const arbeitnow = await fetchArbeitnowJobs(limit);
    await runSource("Arbeitnow", normalizeArbeitnowJobs(arbeitnow));
  } catch (e: any) {
    result.errors.push(`Arbeitnow: ${e?.message ?? String(e)}`);
  }

  if (isLinkedInEnabled() && preferredTitles.length > 0) {
    try {
      const linkedin = await fetchLinkedInJobs(preferredTitles.slice(0, 5), {
        limit: Math.min(15, limit),
      });
      await runSource("LinkedIn", linkedin.jobs);
      result.errors.push(...linkedin.errors);
    } catch (e: any) {
      result.errors.push(`LinkedIn: ${e?.message ?? String(e)}`);
    }
  }

  const queries = (preferredTitles || []).filter(Boolean).slice(0, 5);
  if (queries.length > 0) {
    try {
      const jsearch = await fetchJSearchJobs(queries, { limit: Math.min(15, limit) });
      await runSource("Google Jobs", jsearch.jobs);
      result.errors.push(...jsearch.errors);
    } catch (e: any) {
      result.errors.push(`Google Jobs: ${e?.message ?? String(e)}`);
    }
  }

  if (analyze && profileId) {
    result.analyzed += await backfillAnalysis(userId, profileId);
  }

  return result;
}

/**
 * Analyze existing jobs that haven't been scored yet for this profile,
 * so previously-ingested jobs also appear in the profile-based search.
 */
async function backfillAnalysis(userId: string, profileId: string): Promise<number> {
  const { prisma } = await import("@/lib/db");
  const { analyzeForUser } = await import("@/lib/job-service");
  const unscored = await prisma.job.findMany({
    where: { matchScore: null },
    take: 25,
  });
  let analyzed = 0;
  for (const job of unscored) {
    try {
      await analyzeForUser(userId, { profileId, jobId: job.id, useAI: false });
      analyzed++;
    } catch (e) {
      console.error("Backfill analysis failed for", job.id, e);
    }
  }
  return analyzed;
}
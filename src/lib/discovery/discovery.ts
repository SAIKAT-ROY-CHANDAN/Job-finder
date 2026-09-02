import { prisma } from "@/lib/db";
import { ingestJob } from "@/lib/job-service";
import type { JobSourceType } from "@prisma/client";

export interface RawJobInput {
  sourceName: string;
  sourceType: JobSourceType;
  title: string;
  company: string;
  description?: string;
  location?: string;
  remote?: boolean;
  sourceUrl?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  tech?: string[];
  category?: string;
  publishedAt?: Date | string;
  sourceLogoUrl?: string;
  sourceHomePageUrl?: string;
  sourceFeedUrl?: string;
}

/**
 * Normalize + dedupe a batch of raw jobs.
 * Deduplicates by exact source URL when available (prevents cross-source
 * duplicates), falling back to (title, company), so batch ingestion stays
 * idempotent and never creates duplicate job records (or, downstream,
 * duplicate applications).
 * Optionally analyzes newly created jobs against the given profile id so the
 * profile-based search immediately reflects them.
 */
export async function ingestJobBatch(
  jobs: RawJobInput[],
  options?: { profileId?: string; userId?: string; useAI?: boolean },
): Promise<{ created: number; skipped: number; analyzed: number }> {
  let created = 0;
  let skipped = 0;
  let analyzed = 0;
  for (const job of jobs) {
    const existing = job.sourceUrl
      ? await prisma.job.findFirst({ where: { sourceUrl: job.sourceUrl } })
      : await prisma.job.findFirst({
          where: {
            title: job.title,
            company: { name: job.company },
          },
        });
    if (existing) {
      skipped++;
      continue;
    }
    const createdJob = await ingestJob(job, { skipAI: !(options?.useAI ?? false) });
    created++;
    if (options?.userId && options.profileId) {
      try {
        const { analyzeForUser } = await import("@/lib/job-service");
        await analyzeForUser(options.userId, {
          profileId: options.profileId,
          jobId: createdJob.id,
          useAI: options.useAI ?? false,
        });
        analyzed++;
      } catch (e) {
        console.error("Job analysis failed for", createdJob.id, e);
      }
    }
  }
  return { created, skipped, analyzed };
}

export { ingestJob };

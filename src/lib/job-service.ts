import { prisma } from "@/lib/db";
import { aiService } from "@/lib/ai/aiService";
import { computeMatchScore, enrichWithSemanticAnalysis } from "@/lib/matching/matchEngine";
import { computeCredibilityScore } from "@/lib/matching/credibilityEngine";
import { getFullProfile } from "@/lib/profile-service";
import { profileToMasterProfile } from "@/lib/server-helpers";
import type { MasterProfile } from "@/types";

export { computeMatchScore } from "@/lib/matching/matchEngine";
export { computeCredibilityScore } from "@/lib/matching/credibilityEngine";

/**
 * Ingest a raw job posting from a source and persist a normalized Job.
 * Optionally runs AI analysis to extract structured requirements.
 */
export async function ingestJob(input: {
  sourceName: string;
  sourceType: "GOOGLE_JOBS" | "RSS_FEED" | "API_SOURCE" | "DIRECT_SCRAPE";
  title: string;
  company: string;
  description?: string | null;
  location?: string | null;
  remote?: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  postedAt?: Date;
  sourceUrl?: string | null;
  tech?: string[];
  category?: string | null;
  sourceLogoUrl?: string | null;
  sourceHomePageUrl?: string | null;
  sourceFeedUrl?: string | null;
}, options?: { skipAI?: boolean }) {
  const source = await prisma.jobSource.upsert({
    where: { name: input.sourceName },
    create: {
      name: input.sourceName,
      type: input.sourceType,
      ...(input.sourceLogoUrl ? { logoUrl: input.sourceLogoUrl } : {}),
      ...(input.sourceHomePageUrl ? { homePageUrl: input.sourceHomePageUrl } : {}),
      ...(input.sourceFeedUrl ? { feedUrl: input.sourceFeedUrl } : {}),
    },
    update: {
      ...(input.sourceLogoUrl ? { logoUrl: input.sourceLogoUrl } : {}),
      ...(input.sourceHomePageUrl ? { homePageUrl: input.sourceHomePageUrl } : {}),
      ...(input.sourceFeedUrl ? { feedUrl: input.sourceFeedUrl } : {}),
    },
  });

  const company = await prisma.company.upsert({
    where: { name: input.company },
    create: { name: input.company },
    update: {},
  });

  // Optional AI enrichment of the description into structured requirements.
  let requirements: {
    requiredTech: string[];
    preferredTech: string[];
    minimumYears?: number;
    location?: string;
    remote: boolean;
    industry?: string;
    educationLevel?: string;
  } | undefined;

  if (input.description && process.env.OPENROUTER_API_KEY && !options?.skipAI) {
    try {
      requirements = await aiService.analyzeJob(input.description);
    } catch (e) {
      console.error("Job analysis failed:", e);
    }
  }

  // Fall back to provider-derived tech tags when AI analysis is unavailable.
  const fallbackTech = (input.tech ?? []).map((t) => t.trim()).filter(Boolean);
  const jobRequirements =
    requirements != null
      ? {
          requiredTech: requirements.requiredTech,
          preferredTech: requirements.preferredTech,
          minimumYears: requirements.minimumYears,
          industry: requirements.industry ?? input.category ?? undefined,
          location: requirements.location,
          remote: requirements.remote,
          educationLevel: requirements.educationLevel,
        }
      : fallbackTech.length > 0
        ? {
            requiredTech: fallbackTech,
            preferredTech: [] as string[],
            remote: input.remote ?? false,
          }
        : undefined;

  const job = await prisma.job.create({
    data: {
      title: input.title,
      companyId: company.id,
      description: input.description,
      location: input.location ?? requirements?.location,
      remote: input.remote ?? requirements?.remote ?? false,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      salaryCurrency: input.salaryCurrency,
      postedAt: input.postedAt ?? new Date(),
      sourceUrl: input.sourceUrl,
      sourceId: source.id,
      status: "SEARCHED",
      requirements: jobRequirements ? { create: jobRequirements } : undefined,
    },
    include: { company: true, source: true, requirements: true },
  });

  return job;
}

export interface AnalyzeForUserOptions {
  profileId: string;
  jobId: string;
  useAI?: boolean;
}

/**
 * Compute and persist the match + credibility scores for a (profile, job) pair.
 */
export async function analyzeForUser(
  userId: string,
  { profileId, jobId, useAI = true }: AnalyzeForUserOptions,
) {
  const profile = await getFullProfile(userId);
  if (!profile) throw new Error("Profile not found");
  const master = profileToMasterProfile(profile);

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { requirements: true, company: true },
  });
  if (!job) throw new Error("Job not found");

  const jobForMatch = {
    title: job.title,
    description: job.description,
    requiredTech: job.requirements?.requiredTech ?? [],
    preferredTech: job.requirements?.preferredTech ?? [],
    minimumYears: job.requirements?.minimumYears,
    location: job.location,
    remote: job.remote,
    industry: job.requirements?.industry,
    educationLevel: job.requirements?.educationLevel,
  };

  let match = computeMatchScore(master, jobForMatch);
  if (useAI) {
    match = await enrichWithSemanticAnalysis(master, jobForMatch, match);
  }

  // Credibility
  const credibility = computeCredibilityScore(
    {
      companyWebsiteExists: !!job.company?.website,
      officialDomain: !!job.company?.domain,
      careerPageExists: !!job.company?.careersUrl,
      companyLinkedInPresence: !!job.company?.linkedinUrl,
      contactInformationPresent: false,
      jobAgeDays: Math.max(0, Math.ceil((Date.now() - job.postedAt.getTime()) / 86400000)),
      salaryTransparent: job.salaryMin != null || job.salaryMax != null,
      hasSuspiciousLanguage: undefined,
      requestsMoney: undefined,
      requestsSensitiveInfo: undefined,
      fakeRecruitmentIndicators: false,
      informationConsistent: true,
    },
    job.description,
  );

  const saved = await prisma.jobMatch.upsert({
    where: { jobId_profileId: { jobId, profileId } },
    create: {
      jobId,
      profileId,
      matchScore: match.matchScore,
      credibilityScore: credibility.score,
      reasons: match.reasons,
      missing: match.requiredMissing,
      missingRequirements: match.requiredMissing,
      seniorityAssessment: match.seniorityAssessment,
    },
    update: {
      matchScore: match.matchScore,
      credibilityScore: credibility.score,
      reasons: match.reasons,
      missing: match.requiredMissing,
      missingRequirements: match.requiredMissing,
      seniorityAssessment: match.seniorityAssessment,
    },
  });

  // Mirror scores onto the Job record
  await prisma.job.update({
    where: { id: jobId },
    data: { matchScore: match.matchScore, credibilityScore: credibility.score },
  });

  return {
    match,
    credibility,
    saved,
  };
}

/**
 * Build a MasterProfile object from persisted profile graph.
 */
export type { MasterProfile };

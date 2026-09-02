import type {
  JobMatchResult,
  MatchComponentScores,
  MasterProfile,
} from "@/types";
import { aiService } from "@/lib/ai/aiService";

interface JobAnalysisForMatch {
  title: string;
  description?: string | null;
  requiredTech?: string[];
  preferredTech?: string[];
  minimumYears?: number | null;
  location?: string | null;
  remote?: boolean;
  industry?: string | null;
  educationLevel?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
}

interface WeightConfig {
  tech: number;
  experience: number;
  title: number;
  location: number;
  education: number;
  industry: number;
}

const DEFAULT_WEIGHTS: WeightConfig = {
  tech: 0.35,
  experience: 0.2,
  title: 0.2,
  location: 0.15,
  education: 0.05,
  industry: 0.05,
};

function normalizeToken(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9+#.]/g, "");
}

function normalizeSet(values: string[]): Set<string> {
  return new Set(values.map(normalizeToken).filter(Boolean));
}

function findNameOverlap(
  requiredTech: string[],
  preferredTech: string[],
  profileTech: string[],
): { matched: string[]; requiredMissing: string[]; preferredMatched: string[]; preferredMissing: string[] } {
  const required = normalizeSet(requiredTech);
  const preferred = normalizeSet(preferredTech);
  const profile = normalizeSet(profileTech);

  const matched: string[] = [];
  const requiredMissing: string[] = [];
  const preferredMatched: string[] = [];
  const preferredMissing: string[] = [];

  for (const skill of requiredTech) {
    if (profile.has(normalizeToken(skill))) {
      matched.push(skill);
    } else {
      requiredMissing.push(skill);
    }
  }
  for (const skill of preferredTech) {
    if (profile.has(normalizeToken(skill))) {
      matched.push(skill);
      preferredMatched.push(skill);
    } else {
      preferredMissing.push(skill);
    }
  }
  return { matched, requiredMissing, preferredMatched, preferredMissing };
}

function titleOverlap(
  desiredTitles: string[],
  currentTitle: string,
  jobTitle: string,
  seniorityHint?: string,
): { score: number; reason: string } {
  const desired = desiredTitles.map(normalizeToken).filter(Boolean);
  const jobToken = normalizeToken(jobTitle);
  const currentToken = normalizeToken(currentTitle || "");
  let score = 0;

  if (desired.length > 0 && desired.includes(jobToken)) {
    score = 1;
  } else if (desired.length === 0 && currentToken && currentToken === jobToken) {
    score = 0.9;
  } else if (currentToken && currentToken === jobToken) {
    score = 0.85;
  } else if (desired.some((d) => jobToken.includes(d) || d.includes(jobToken))) {
    score = 0.7;
  } else if (desired.length > 0) {
    // partial substring match
    const partial = desired.some((d) => {
      const jobParts = jobToken.split(/[\s,-]+/);
      const dParts = d.split(/[\s,-]+/);
      return jobParts.some((jp) => dParts.includes(jp) && jp.length > 3);
    });
    score = partial ? 0.5 : 0.1;
  } else {
    score = 0.3;
  }
  const reason = `Job title "${jobTitle}"${score >= 0.7 ? ` aligns with` : ` partially relates to`} preferred titles.`;
  return { score, reason };
}

function experienceFit(
  profileYears: number | null | undefined,
  requiredYears: number | null | undefined,
): { score: number; reason: string } {
  if (requiredYears == null || requiredYears === 0) {
    return { score: profileYears == null ? 0.5 : 1, reason: "No minimum experience specified." };
  }
  if (profileYears == null) {
    return { score: 0.3, reason: "Candidate years of experience unknown." };
  }
  if (profileYears >= requiredYears) {
    const buffer = Math.min(1, (profileYears - requiredYears) / 5);
    return {
      score: 0.9 + buffer * 0.1,
      reason: `Candidate has ${profileYears} years; ${requiredYears} required.`,
    };
  }
  // within 50% of requirement
  if (profileYears >= requiredYears * 0.5) {
    return { score: 0.55, reason: `Candidate has ${profileYears} years vs ${requiredYears} required.` };
  }
  return { score: 0.15, reason: `Candidate significantly under required experience (${profileYears} vs ${requiredYears}).` };
}

function locationFit(
  jobLocation: string | null | undefined,
  jobRemote: boolean | null | undefined,
  preferredLocations: string[],
  workPreference: string | null | undefined,
): { score: number; reason: string } {
  if (jobRemote) {
    return { score: 1, reason: "Job is remote, matches work preference." };
  }
  if (!jobLocation) {
    return { score: 0.6, reason: "Job location unspecified." };
  }
  if (workPreference && workPreference.toUpperCase() === "REMOTE") {
    return { score: 0.3, reason: "Candidate prefers remote but job is on-site." };
  }
  const normalizedLoc = normalizeToken(jobLocation);
  const pref = preferredLocations.map(normalizeToken).filter(Boolean);
  if (pref.length === 0) {
    return { score: 0.6, reason: "Candidate has no location preference set." };
  }
  if (pref.some((p) => normalizedLoc.includes(p) || p.includes(normalizedLoc))) {
    return { score: 0.9, reason: `Job location "${jobLocation}" matches preference.` };
  }
  return { score: 0.4, reason: `Job location "${jobLocation}" differs from preferences.` };
}

function educationFit(
  profileEducation: { degree: string }[],
  requiredEducation: string | null | undefined,
): { score: number; reason: string } {
  if (!requiredEducation) {
    return { score: 1, reason: "No education requirement." };
  }
  const req = normalizeToken(requiredEducation);
  if (profileEducation.length === 0) {
    return { score: 0.2, reason: `Education requirement (${requiredEducation}) but candidate has no education listed.` };
  }
  const matches = profileEducation.some((e) => {
    const deg = normalizeToken(e.degree);
    return deg.includes(req) || req.includes(deg);
  });
  return matches
    ? { score: 1, reason: `Education requirement "${requiredEducation}" met.` }
    : { score: 0.4, reason: `Education requirement "${requiredEducation}" may not be met.` };
}

function industryFit(
  preferredIndustries: string[],
  jobIndustry: string | null | undefined,
): { score: number; reason: string } {
  if (!jobIndustry) {
    return { score: 0.8, reason: "Job industry unspecified." };
  }
  const pref = normalizeSet(preferredIndustries);
  if (pref.size === 0) {
    return { score: 0.8, reason: "Candidate has no industry preference." };
  }
  const jobNorm = normalizeToken(jobIndustry);
  return pref.has(jobNorm) || [...pref].some((p) => p.includes(jobNorm) || jobNorm.includes(p))
    ? { score: 1, reason: `Job industry "${jobIndustry}" matches preference.` }
    : { score: 0.5, reason: `Job industry "${jobIndustry}" differs from preferences.` };
}

/**
 * Deterministic match scoring with per-factor components.
 */
export function computeMatchScore(
  profile: MasterProfile,
  job: JobAnalysisForMatch,
  weights: WeightConfig = DEFAULT_WEIGHTS,
): JobMatchResult {
  const { matched, requiredMissing, preferredMatched, preferredMissing } = findNameOverlap(
    job.requiredTech ?? [],
    job.preferredTech ?? [],
    profile.skills.map((s) => s.name),
  );

  const techScore =
    (job.requiredTech?.length ?? 0) === 0 && (job.preferredTech?.length ?? 0) === 0
      ? 0.5
      : (() => {
          const reqTotal = job.requiredTech?.length ?? 0;
          const prefTotal = job.preferredTech?.length ?? 0;
          const reqHit = reqTotal - requiredMissing.length;
          const prefHit = preferredMatched.length;
          const denom = reqTotal * 1.0 + prefTotal * 0.5;
          if (denom === 0) return 0.5;
          return reqTotal > 0
            ? (reqHit * 1.0 + prefHit * 0.5) / denom
            : (prefHit * 0.5) / denom;
        })();

  const exp = experienceFit(profile.yearsOfExperience, job.minimumYears);
  const title = titleOverlap(
    profile.preferredTitles,
    profile.currentJobTitle || "",
    job.title,
  );
  const loc = locationFit(job.location, job.remote, profile.preferredLocations, profile.workPreference);
  const edu = educationFit(profile.education, job.educationLevel);
  const ind = industryFit(profile.preferredIndustries, job.industry);

  const components: MatchComponentScores = {
    tech: Math.max(0, Math.min(1, techScore)),
    experience: Math.max(0, Math.min(1, exp.score)),
    title: Math.max(0, Math.min(1, title.score)),
    location: Math.max(0, Math.min(1, loc.score)),
    education: Math.max(0, Math.min(1, edu.score)),
    industry: Math.max(0, Math.min(1, ind.score)),
  };

  const composite =
    components.tech * weights.tech +
    components.experience * weights.experience +
    components.title * weights.title +
    components.location * weights.location +
    components.education * weights.education +
    components.industry * weights.industry;

  const matchScore = Math.round(Math.max(0, Math.min(1, composite)) * 100);

  const reasons = [
    ...(requiredMissing.length
      ? [`Missing: ${requiredMissing.join(", ")}`]
      : job.requiredTech?.length
        ? ["All required technologies matched."]
        : []),
    ...(matched.length ? [`Matched skills: ${matched.slice(0, 8).join(", ")}`] : []),
    exp.reason,
    title.reason,
    loc.reason,
    edu.reason,
    ind.reason,
  ].filter(Boolean);

  return {
    matchScore,
    matchComponents: components,
    matchedSkills: matched,
    requiredMissing,
    preferredMatched,
    preferredMissing,
    reasons,
    seniorityAssessment: title.score >= 0.7 ? "Good seniority match" : "Seniority mismatch risk",
  };
}

/**
 * Optional LLM enhancement: enrich a deterministic match with a semantic summary.
 */
export async function enrichWithSemanticAnalysis(
  profile: MasterProfile,
  job: JobAnalysisForMatch,
  match: JobMatchResult,
): Promise<JobMatchResult> {
  try {
    const profileSummary = [
      "Title: " + (profile.currentJobTitle || "n/a"),
      "Skills: " + profile.skills.map((s) => s.name).join(", ") || "none",
      "Years: " + (profile.yearsOfExperience ?? "n/a"),
      "Experience: " + profile.experiences.map((e) => `${e.title} @ ${e.company}`).join("; "),
      "Projects: " + profile.projects.map((p) => p.name).join("; "),
    ].join("\n");

    const jobSummary = [
      "Title: " + job.title,
      "Required: " + (job.requiredTech ?? []).join(", "),
      "Preferred: " + (job.preferredTech ?? []).join(", "),
      "Years: " + (job.minimumYears ?? "n/a"),
    ].join("\n");

    const semantic = await aiService.matchCandidateToJob(profileSummary, jobSummary);
    return {
      ...match,
      semanticSummary: semantic.semanticSummary,
      matchedSkills: Array.from(new Set([...match.matchedSkills, ...semantic.matchedConcepts])),
      requiredMissing: Array.from(new Set([...match.requiredMissing, ...semantic.missingConcepts])),
    };
  } catch {
    // Non-fatal: fall back to deterministic result
    return match;
  }
}

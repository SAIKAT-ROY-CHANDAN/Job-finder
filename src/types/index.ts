// Shared domain types for JobPilot

import type {
  ApplicationStatus,
  JobStatus,
  SkillCategory,
  WorkPreference,
} from "@prisma/client";

// ------------------------- Profile -------------------------

export interface MasterProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
  website?: string | null;
  currentJobTitle?: string | null;
  yearsOfExperience?: number | null;
  preferredTitles: string[];
  preferredTech: string[];
  preferredIndustries: string[];
  preferredLocations: string[];
  workPreference?: WorkPreference | null;
  expectedSalaryMin?: number | null;
  expectedSalaryMax?: number | null;
  availability?: string | null;
  bio?: string | null;
  languages: string[];
  experiences: {
    company: string;
    title: string;
    location?: string | null;
    employmentType?: string | null;
    startDate: string;
    endDate?: string | null;
    responsibilities?: string[];
    achievements?: string[];
    technologies: string[];
  }[];
  skills: { name: string; category: SkillCategory }[];
  education: { degree: string; institution: string; startDate?: string | null; endDate?: string | null }[];
  certifications: { name: string; issuer: string; date?: string | null }[];
  projects: {
    name: string;
    description?: string | null;
    technologies: string[];
    url?: string | null;
    githubUrl?: string | null;
  }[];
}

// ------------------------- Matching -------------------------

/**
 * Decomposed match factors used by the deterministic engine.
 * The LLM only fills the semantic part; numbers derive from rules.
 */
export interface MatchComponentScores {
  tech: number; // 0..1, weighted by required vs preferred
  experience: number; // 0..1 years-of-experience fit
  title: number; // 0..1 title/seniority overlap
  location: number; // 0..1 location & remote preference
  education: number; // 0..1
  industry: number; // 0..1
}

export interface JobMatchResult {
  matchScore: number; // 0-100
  matchComponents: MatchComponentScores;
  matchedSkills: string[];
  requiredMissing: string[];
  preferredMatched: string[];
  preferredMissing: string[];
  reasons: string[];
  seniorityAssessment: string;
  semanticSummary?: string;
}

// ------------------------- Credibility -------------------------

export type CredibilityLabel =
  | "Highly credible"
  | "Likely credible"
  | "Verify carefully"
  | "Suspicious";

export interface CredibilitySignals {
  companyWebsiteExists: boolean;
  officialDomain: boolean;
  careerPageExists: boolean;
  companyLinkedInPresence: boolean;
  contactInformationPresent: boolean;
  jobAgeDays: number;
  salaryTransparent: boolean;
  hasSuspiciousLanguage: boolean;
  requestsMoney: boolean;
  requestsSensitiveInfo: boolean;
  fakeRecruitmentIndicators: boolean;
  informationConsistent: boolean;
}

export interface CredibilityResult {
  score: number; // 0-100
  label: CredibilityLabel;
  signals: CredibilitySignals;
  flaggedSignals: string[];
  reasons: string[];
  assessment: string;
}

// ------------------------- Resume -------------------------

export interface ResumeJSON {
  personal: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    title?: string;
  };
  summary: string;
  skills: { name: string; category: string }[];
  languages: { name: string; level?: string }[];
  experience: {
    company: string;
    title: string;
    location?: string;
    employmentType?: string;
    startDate: string;
    endDate?: string;
    responsibilities: string[];
    achievements: string[];
    technologies: string[];
  }[];
  education: { degree: string; institution: string; startDate?: string; endDate?: string }[];
  certifications: { name: string; issuer: string; date?: string }[];
  projects: { name: string; description?: string; technologies: string[]; url?: string }[];
}

// ------------------------- Application -------------------------

export interface ApplicationQuestion {
  question: string;
  answer: string;
  isGenerated: boolean;
}

export interface ApplicationFieldState {
  field: string;
  value: string;
  completed: boolean;
}

export interface ApplicationPackage {
  jobId: string;
  resume: ResumeJSON;
  resumeFileName: string;
  coverLetter?: string;
  questions: ApplicationQuestion[];
  fields: ApplicationFieldState[];
  destinationUrl?: string;
}

// ------------------------- API response wrapper -------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type { ApplicationStatus, JobStatus, SkillCategory, WorkPreference };

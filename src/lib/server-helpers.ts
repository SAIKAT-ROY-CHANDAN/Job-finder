import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { MasterProfile } from "@/types";
import { prisma } from "@/lib/db";

/**
 * Get the current authenticated user's session or null.
 */
export async function currentSession() {
  return getServerSession(authOptions);
}

/**
 * Get the current user's id or null.
 */
export async function currentUserId(): Promise<string | null> {
  const session = await currentSession();
  return session?.user?.id ?? null;
}

/**
 * Require authentication; throws if not signed in.
 */
export async function requireUserId(): Promise<string> {
  const id = await currentUserId();
  if (!id) {
    throw new ApiError(401, "Unauthorized");
  }
  return id;
}

/**
 * Load the current user's full Master Profile (with relations).
 */
export async function getMasterProfile(userId: string): Promise<MasterProfile | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      user: {
        include: {
          experiences: true,
          skills: true,
          education: true,
          certifications: true,
          projects: true,
        },
      },
    },
  });
  if (!profile) return null;
  return profileToMasterProfile(profile);
}

export function profileToMasterProfile(profile: {
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  website: string | null;
  currentJobTitle: string | null;
  yearsOfExperience: number | null;
  preferredTitles: string[];
  preferredTech: string[];
  preferredIndustries: string[];
  preferredLocations: string[];
  workPreference: string | null;
  expectedSalaryMin: number | null;
  expectedSalaryMax: number | null;
  availability: string | null;
  bio: string | null;
  languages: string[];
  user: {
    experiences: {
      title: string;
      company: string;
      location?: string | null;
      employmentType?: string | null;
      startDate: string;
      endDate?: string | null;
      responsibilities?: string[];
      achievements?: string[];
      technologies: string[];
    }[];
    skills: { name: string; category: string }[];
    education: { degree: string; institution: string; startDate?: string | null; endDate?: string | null }[];
    certifications: { name: string; issuer: string; date?: string | null }[];
    projects: {
      name: string;
      description?: string | null;
      technologies: string[];
      url?: string | null;
      githubUrl?: string | null;
    }[];
  };
}): MasterProfile {
  return {
    id: "",
    userId: "",
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedin: profile.linkedin,
    github: profile.github,
    portfolio: profile.portfolio,
    website: profile.website,
    currentJobTitle: profile.currentJobTitle,
    yearsOfExperience: profile.yearsOfExperience,
    preferredTitles: profile.preferredTitles,
    preferredTech: profile.preferredTech,
    preferredIndustries: profile.preferredIndustries,
    preferredLocations: profile.preferredLocations,
    workPreference: profile.workPreference as MasterProfile["workPreference"],
    expectedSalaryMin: profile.expectedSalaryMin,
    expectedSalaryMax: profile.expectedSalaryMax,
    availability: profile.availability,
    bio: profile.bio,
    languages: profile.languages ?? [],
    experiences: profile.user.experiences,
    skills: profile.user.skills as MasterProfile["skills"],
    education: profile.user.education,
    certifications: profile.user.certifications,
    projects: profile.user.projects,
  };
}

/**
 * Simple error for API routes.
 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
}

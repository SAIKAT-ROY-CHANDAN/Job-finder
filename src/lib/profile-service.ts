import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/server-helpers";
import { z } from "zod";

// Validation schemas
export const profileSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  github: z.string().optional().nullable(),
  portfolio: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  currentJobTitle: z.string().optional().nullable(),
  yearsOfExperience: z.coerce.number().int().min(0).optional().nullable(),
  preferredTitles: z.array(z.string()).default([]),
  preferredTech: z.array(z.string()).default([]),
  preferredIndustries: z.array(z.string()).default([]),
  preferredLocations: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  workPreference: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional().nullable(),
  expectedSalaryMin: z.coerce.number().int().min(0).optional().nullable(),
  expectedSalaryMax: z.coerce.number().int().min(0).optional().nullable(),
  availability: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
});

export const experienceSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional().nullable(),
  employmentType: z.string().optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  responsibilities: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const skillSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  category: z.enum(["FRONTEND", "BACKEND", "DATABASE", "DEVOPS", "TOOLS", "OTHER"]).default("FRONTEND"),
  level: z.coerce.number().int().min(1).max(5).optional().nullable(),
});

export const educationSchema = z.object({
  id: z.string().optional(),
  degree: z.string().min(1),
  institution: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const certificationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  issuer: z.string().min(1),
  date: z.string().optional().nullable(),
  credentialUrl: z.string().optional().nullable(),
});

export const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  technologies: z.array(z.string()).default([]),
  url: z.string().optional().nullable(),
  githubUrl: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

/**
 * Upsert profile fields for a user (ensures a Profile row exists).
 */
export async function upsertProfile(userId: string, data: z.infer<typeof profileSchema>) {
  return prisma.profile.upsert({
    where: { userId },
    create: { ...data, userId },
    update: data,
  });
}

export async function getProfileOrCreate(userId: string) {
  let profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, "User not found");
    profile = await prisma.profile.create({
      data: {
        userId,
        fullName: user.name || user.email.split("@")[0] || "",
        email: user.email,
      },
    });
  }
  return profile;
}

// Relation CRUD -------------------------------------------------------------

export async function addExperience(userId: string, data: z.infer<typeof experienceSchema>) {
  const { id, ...rest } = data;
  return prisma.experience.create({ data: { ...rest, userId } });
}

export async function updateExperience(userId: string, expId: string, data: z.infer<typeof experienceSchema>) {
  const owner = await prisma.experience.findFirst({ where: { id: expId, userId } });
  if (!owner) throw new ApiError(404, "Experience not found");
  const { id, ...rest } = data;
  return prisma.experience.update({ where: { id: expId }, data: rest });
}

export async function deleteExperience(userId: string, expId: string) {
  const owner = await prisma.experience.findFirst({ where: { id: expId, userId } });
  if (!owner) throw new ApiError(404, "Experience not found");
  return prisma.experience.delete({ where: { id: expId } });
}

export async function addSkill(userId: string, data: z.infer<typeof skillSchema>) {
  const { id, ...rest } = data;
  try {
    return await prisma.skill.create({ data: { ...rest, userId } });
  } catch (e: any) {
    if (e?.code === "P2002") throw new ApiError(409, "Skill already exists");
    throw e;
  }
}

export async function deleteSkill(userId: string, skillId: string) {
  const owner = await prisma.skill.findFirst({ where: { id: skillId, userId } });
  if (!owner) throw new ApiError(404, "Skill not found");
  return prisma.skill.delete({ where: { id: skillId } });
}

export async function addEducation(userId: string, data: z.infer<typeof educationSchema>) {
  const { id, ...rest } = data;
  return prisma.education.create({ data: { ...rest, userId } });
}

export async function deleteEducation(userId: string, eduId: string) {
  const owner = await prisma.education.findFirst({ where: { id: eduId, userId } });
  if (!owner) throw new ApiError(404, "Education not found");
  return prisma.education.delete({ where: { id: eduId } });
}

export async function addCertification(userId: string, data: z.infer<typeof certificationSchema>) {
  const { id, ...rest } = data;
  return prisma.certification.create({ data: { ...rest, userId } });
}

export async function deleteCertification(userId: string, certId: string) {
  const owner = await prisma.certification.findFirst({ where: { id: certId, userId } });
  if (!owner) throw new ApiError(404, "Certification not found");
  return prisma.certification.delete({ where: { id: certId } });
}

export async function addProject(userId: string, data: z.infer<typeof projectSchema>) {
  const { id, ...rest } = data;
  return prisma.project.create({ data: { ...rest, userId } });
}

export async function deleteProject(userId: string, projectId: string) {
  const owner = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!owner) throw new ApiError(404, "Project not found");
  return prisma.project.delete({ where: { id: projectId } });
}

/**
 * Load the full profile graph for a user (used by matching & resume generation).
 */
export async function getFullProfile(userId: string) {
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
  return profile;
}

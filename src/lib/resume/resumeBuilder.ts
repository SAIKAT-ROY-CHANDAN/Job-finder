import type { MasterProfile, ResumeJSON } from "@/types";
import { aiService } from "@/lib/ai/aiService";

/**
 * Build a structured resume from a master profile (without AI) - used for the
 * initial master resume and as a deterministic fallback.
 */
export function buildMasterResume(profile: MasterProfile): ResumeJSON {
  return {
    personal: {
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone ?? undefined,
      location: profile.location ?? undefined,
      linkedin: profile.linkedin ?? undefined,
      github: profile.github ?? undefined,
      portfolio: profile.portfolio ?? undefined,
      title: profile.currentJobTitle ?? undefined,
    },
    summary:
      profile.bio ||
      `${profile.currentJobTitle ?? "Professional"} with ${
        profile.yearsOfExperience ?? "multiple"
      } years of experience.`,
    skills: profile.skills.map((s) => ({ name: s.name, category: s.category })),
    languages: (profile.languages ?? []).map((name) => ({ name, level: undefined })),
    experience: profile.experiences.map((e) => ({
      company: e.company,
      title: e.title,
      location: e.location ?? undefined,
      employmentType: e.employmentType ?? undefined,
      startDate: e.startDate,
      endDate: e.endDate ?? undefined,
      responsibilities: e.responsibilities ?? [],
      achievements: e.achievements ?? [],
      technologies: e.technologies ?? [],
    })),
    education: profile.education.map((e) => ({
      degree: e.degree,
      institution: e.institution,
      startDate: e.startDate ?? undefined,
      endDate: e.endDate ?? undefined,
    })),
    certifications: profile.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      date: c.date ?? undefined,
    })),
    projects: profile.projects.map((p) => ({
      name: p.name,
      description: p.description ?? undefined,
      technologies: p.technologies,
      url: p.url ?? undefined,
    })),
  };
}

/**
 * Generate a job-specific resume via AI. Falls back to the master resume when
 * the AI call fails so the application flow is never blocked.
 */
export async function generateJobResume(
  profile: MasterProfile,
  jobDescription: string,
): Promise<ResumeJSON> {
  try {
    const aiResume = await aiService.generateResume(
      JSON.stringify(profile),
      jobDescription,
    );
    return aiResume;
  } catch (err) {
    console.error("AI resume generation failed, using master resume:", err);
    return buildMasterResume(profile);
  }
}

/**
 * Produce a safe, filesystem-friendly filename following the
 * `FirstName-LastName-Company-Title` convention.
 */
export function buildResumeFileName(
  profile: MasterProfile,
  job: { company?: string | null; title?: string | null },
): string {
  const name = profile.fullName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "");
  const company = (job.company || "").trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
  const title = (job.title || "").trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
  return `${name}-${company}-${title}.pdf`;
}

/**
 * Convert a Resume object to a plain-text approximation for PDF rendering.
 */
export function resumeToText(resume: ResumeJSON): string {
  const lines: string[] = [];
  const { personal } = resume;
  lines.push(personal.fullName.toUpperCase());
  const contact = [personal.email, personal.phone, personal.location, personal.linkedin, personal.github]
    .filter(Boolean)
    .join("  |  ");
  if (contact) lines.push(contact);
  if (resume.summary) {
    lines.push("");
    lines.push("SUMMARY");
    lines.push(resume.summary);
  }
  if (resume.skills.length) {
    lines.push("");
    lines.push("SKILLS");
    lines.push(resume.skills.map((s) => s.name).join(" · "));
  }
  if (resume.experience.length) {
    lines.push("");
    lines.push("EXPERIENCE");
    for (const e of resume.experience) {
      lines.push(`${e.title} — ${e.company}  (${e.startDate}${e.endDate ? ` - ${e.endDate}` : " - Present"})`);
      for (const r of e.responsibilities) lines.push(`  • ${r}`);
      for (const a of e.achievements) lines.push(`  ✓ ${a}`);
    }
  }
  if (resume.projects.length) {
    lines.push("");
    lines.push("PROJECTS");
    for (const p of resume.projects) {
      lines.push(`${p.name}${p.technologies.length ? ` — ${p.technologies.join(", ")}` : ""}`);
      if (p.description) lines.push(`  ${p.description}`);
    }
  }
  if (resume.education.length) {
    lines.push("");
    lines.push("EDUCATION");
    for (const e of resume.education) {
      lines.push(`${e.degree} — ${e.institution}`);
    }
  }
  if (resume.certifications.length) {
    lines.push("");
    lines.push("CERTIFICATIONS");
    for (const c of resume.certifications) {
      lines.push(`${c.name} — ${c.issuer}`);
    }
  }
  return lines.join("\n");
}

export { resumeToText as resumeToString };

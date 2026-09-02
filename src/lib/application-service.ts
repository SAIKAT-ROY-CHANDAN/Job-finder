import { prisma } from "@/lib/db";
import { getFullProfile } from "@/lib/profile-service";
import { profileToMasterProfile, ApiError } from "@/lib/server-helpers";
import { aiService } from "@/lib/ai/aiService";
import {
  generateJobResume,
  buildResumeFileName,
} from "@/lib/resume/resumeBuilder";
import { renderResumePdf } from "@/lib/resume/pdfRenderer";
import type { ApplicationPackage, ApplicationQuestion } from "@/types";

interface PrepareOptions {
  userId: string;
  jobId: string;
}

/**
 * Prepare an application package for a (user, job) pair, persisting the
 * resume + cover letter + answers. Does NOT submit anything.
 */
export async function prepareApplication({
  userId,
  jobId,
}: PrepareOptions): Promise<{ applicationId: string; package: ApplicationPackage }> {
  const profile = await getFullProfile(userId);
  if (!profile) throw new ApiError(400, "Profile not found");
  const master = profileToMasterProfile(profile);

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { company: true, requirements: true },
  });
  if (!job) throw new ApiError(404, "Job not found");

  const profileId = profile.id;
  const jobDesc = job.description || "";

  // 1. Generate job-specific resume
  const resumeJson = await generateJobResume(master, jobDesc);
  const pdfBuffer = await renderResumePdf(resumeJson);
  const fileName = buildResumeFileName(master, {
    company: job.company?.name,
    title: job.title,
  });

  const resume = await prisma.resume.create({
    data: {
      userId,
      name: fileName,
      isJobSpecific: true,
      jobId,
      content: resumeJson as object,
      isMaster: false,
    },
  });

  // 2. Generate cover letter if useful
  const coverLetter = jobDesc
    ? await aiService.generateCoverLetter(master.fullName, JSON.stringify(master), jobDesc)
    : undefined;
  if (coverLetter) {
    await prisma.coverLetter.create({
      data: { userId, jobId, content: coverLetter },
    });
  }

  // 3. Answer application questions (from job requirements / description)
  const requiredKey = ["salary", "experience", "availability", "location", "notice", "visa", "authorization", "linkedin", "github"];
  const questions: ApplicationQuestion[] = [];
  for (const key of requiredKey) {
    let answer = "Information unavailable";
    if (key === "experience" && master.yearsOfExperience != null) {
      answer = `${master.yearsOfExperience} years`;
    } else if (key === "availability") {
      answer = master.availability || "Information unavailable";
    } else if (key === "location") {
      answer = master.location || "Information unavailable";
    } else if (key === "linkedin") {
      answer = master.linkedin || "Information unavailable";
    } else if (key === "github") {
      answer = master.github || "Information unavailable";
    } else if (key === "salary") {
      answer =
        master.expectedSalaryMin != null && master.expectedSalaryMax != null
          ? `${master.expectedSalaryMin}-${master.expectedSalaryMax}`
          : "Information unavailable";
    }
    questions.push({
      question: `What is your ${key.replace(/-/g, " ")}?`,
      answer,
      isGenerated: false,
    });
  }

  // 4. Prepare application fields
  const fields = [
    { field: "name", value: master.fullName, completed: !!master.fullName },
    { field: "email", value: master.email, completed: !!master.email },
    { field: "phone", value: master.phone || "", completed: !!master.phone },
    { field: "location", value: master.location || "", completed: !!master.location },
    { field: "currentTitle", value: master.currentJobTitle || "", completed: !!master.currentJobTitle },
    { field: "yearsOfExperience", value: master.yearsOfExperience?.toString() || "", completed: master.yearsOfExperience != null },
    { field: "resume", value: fileName, completed: true },
    ...(master.linkedin ? [{ field: "linkedin", value: master.linkedin, completed: true }] : []),
    ...(master.github ? [{ field: "github", value: master.github, completed: true }] : []),
    ...(master.portfolio ? [{ field: "portfolio", value: master.portfolio, completed: true }] : []),
  ];

  // Ensure unique fields
  const uniqueFields = [...new Map(fields.map((f) => [f.field, f])).values()];

  const application = await prisma.application.create({
    data: {
      userId,
      jobId,
      profileId,
      resumeId: resume.id,
      status: "READY_TO_APPLY",
      answers: {
        create: questions
          .filter((q) => q.answer !== "Information unavailable")
          .map((q) => ({ question: q.question, answer: q.answer, isGenerated: q.isGenerated })),
      },
      events: { create: [{ eventType: "STEP_STARTED", details: { step: "preparation" } }] },
    },
  });

  return {
    applicationId: application.id,
    package: {
      jobId,
      resume: resumeJson,
      resumeFileName: fileName,
      coverLetter,
      questions,
      fields: uniqueFields,
      destinationUrl: job.sourceUrl || undefined,
    },
  };
}

/**
 * Final confirmation + submission. Idempotent: refuses to create a duplicate
 * application for the same (user, job).
 */
export async function submitApplication({
  userId,
  applicationId,
}: {
  userId: string;
  applicationId: string;
}) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: true },
  });
  if (!application) throw new ApiError(404, "Application not found");
  if (application.userId !== userId) throw new ApiError(403, "Forbidden");

  if (application.status === "APPLIED") {
    // Idempotent - already submitted, avoid duplicate
    return { applicationId, status: application.status, duplicate: true };
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: "APPLIED",
      appliedAt: new Date(),
      events: {
        create: [{ eventType: "SUBMITTED_SUCCESSFULLY", details: { at: new Date().toISOString() } }],
      },
    },
  });

  await prisma.job.update({
    where: { id: application.jobId },
    data: { status: "SUBMITTED" },
  });

  return { applicationId: updated.id, status: updated.status, duplicate: false };
}

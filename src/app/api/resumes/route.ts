import { NextRequest } from "next/server";
import { requireUserId, handleApiError, ApiError } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import { getFullProfile } from "@/lib/profile-service";
import { profileToMasterProfile } from "@/lib/server-helpers";
import { buildMasterResume, generateJobResume } from "@/lib/resume/resumeBuilder";
import { renderResumePdf } from "@/lib/resume/pdfRenderer";
import { z } from "zod";

const generateSchema = z.object({
  jobId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));
    const parsed = generateSchema.safeParse(body);

    const profile = await getFullProfile(userId);
    if (!profile) throw new ApiError(400, "Profile not found");
    const master = profileToMasterProfile(profile);

    let resumeJson;
    let isJobSpecific = false;
    let jobId: string | undefined;

    if (parsed.success && parsed.data.jobId) {
      const job = await prisma.job.findUnique({ where: { id: parsed.data.jobId } });
      if (!job) throw new ApiError(404, "Job not found");
      resumeJson = await generateJobResume(master, job.description || "");
      isJobSpecific = true;
      jobId = job.id;
    } else {
      resumeJson = buildMasterResume(master);
    }

    const pdfBuffer = await renderResumePdf(resumeJson);
    const fileName = `${master.fullName.replace(/\s+/g, "-")}${isJobSpecific ? "-Customized" : ""}-Resume.pdf`;

    const resume = await prisma.resume.create({
      data: {
        userId,
        name: fileName,
        isMaster: !isJobSpecific,
        isJobSpecific,
        jobId,
        content: resumeJson as object,
      },
    });

    return Response.json(
      { success: true, data: { id: resume.id, name: resume.name, resume: resumeJson } },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isMaster: true,
        isJobSpecific: true,
        jobId: true,
        createdAt: true,
      },
    });
    return Response.json({ success: true, data: resumes });
  } catch (error) {
    return handleApiError(error);
  }
}

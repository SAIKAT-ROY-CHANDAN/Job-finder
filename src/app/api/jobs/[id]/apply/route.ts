import { NextRequest } from "next/server";
import { requireUserId, handleApiError, ApiError } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import { prepareApplication } from "@/lib/application-service";

/**
 * POST /api/jobs/[id]/apply
 * Prepares the full application package (resume, cover letter, answers,
 * fields) WITHOUT submitting. The user must then confirm and submit.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();

    const job = await prisma.job.findUnique({ where: { id: params.id } });
    if (!job) throw new ApiError(404, "Job not found");

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new ApiError(400, "Complete your master profile before applying.");

    const existing = await prisma.application.findFirst({
      where: { userId, jobId: params.id },
    });
    if (existing && (existing.status === "APPLIED")) {
      return Response.json(
        { success: true, data: { applicationId: existing.id, alreadySubmitted: true } },
      );
    }

    const result = await prepareApplication({ userId, jobId: params.id });
    return Response.json({
      success: true,
      data: {
        applicationId: result.applicationId,
        alreadySubmitted: false,
        ...result.package,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

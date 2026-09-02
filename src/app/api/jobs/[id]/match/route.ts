import { NextRequest } from "next/server";
import { requireUserId, handleApiError, ApiError } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import { analyzeForUser } from "@/lib/job-service";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const job = await prisma.job.findUnique({ where: { id: params.id } });
    if (!job) throw new ApiError(404, "Job not found");

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new ApiError(400, "Master profile not found. Complete your profile first.");

    const result = await analyzeForUser(userId, {
      profileId: profile.id,
      jobId: params.id,
      useAI: true,
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

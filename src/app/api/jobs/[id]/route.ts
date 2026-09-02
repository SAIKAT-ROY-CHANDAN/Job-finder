import { NextRequest } from "next/server";
import { requireUserId, handleApiError, ApiError } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUserId();
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        requirements: true,
        source: true,
        matches: true,
      },
    });
    if (!job) throw new ApiError(404, "Job not found");
    return Response.json({ success: true, data: job });
  } catch (error) {
    return handleApiError(error);
  }
}

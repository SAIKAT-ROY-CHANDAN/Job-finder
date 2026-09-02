import { NextRequest } from "next/server";
import { requireUserId, handleApiError, ApiError } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        job: { include: { company: true, requirements: true } },
        resume: true,
        answers: true,
        events: { orderBy: { createdAt: "asc" } },
        coverLetter: true,
      },
    });
    if (!application) throw new ApiError(404, "Application not found");
    if (application.userId !== userId) throw new ApiError(403, "Forbidden");
    return Response.json({ success: true, data: application });
  } catch (error) {
    return handleApiError(error);
  }
}

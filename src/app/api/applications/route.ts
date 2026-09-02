import { NextRequest } from "next/server";
import { requireUserId, handleApiError } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const where: Record<string, unknown> = { userId };
    if (status) where["status"] = status;

    const applications = await prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        job: { include: { company: true } },
        resume: { select: { name: true } },
        answers: true,
      },
    });
    return Response.json({ success: true, data: applications });
  } catch (error) {
    return handleApiError(error);
  }
}

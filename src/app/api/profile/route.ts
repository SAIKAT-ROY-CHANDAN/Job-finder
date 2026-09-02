import { NextRequest } from "next/server";
import { requireUserId, handleApiError } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import {
  profileSchema,
  upsertProfile,
  getProfileOrCreate,
} from "@/lib/profile-service";

export async function GET() {
  try {
    const userId = await requireUserId();
    const profile = await getProfileOrCreate(userId);
    const graph = await prisma.profile.findUnique({
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
    return Response.json({ success: true, data: graph });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid input";
      return Response.json({ success: false, error: msg }, { status: 400 });
    }
    await getProfileOrCreate(userId);
    const profile = await upsertProfile(userId, parsed.data);
    return Response.json({ success: true, data: profile });
  } catch (error) {
    return handleApiError(error);
  }
}

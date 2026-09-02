import { NextRequest } from "next/server";
import { requireUserId, handleApiError } from "@/lib/server-helpers";
import {
  experienceSchema,
  addExperience,
  updateExperience,
  deleteExperience,
} from "@/lib/profile-service";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = experienceSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }
    const exp = await addExperience(userId, parsed.data);
    return Response.json({ success: true, data: exp }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = experienceSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return Response.json({ success: false, error: "Experience id required" }, { status: 400 });
    }
    const exp = await updateExperience(userId, parsed.data.id, parsed.data);
    return Response.json({ success: true, data: exp });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return Response.json({ success: false, error: "Experience id required" }, { status: 400 });
    }
    await deleteExperience(userId, id);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

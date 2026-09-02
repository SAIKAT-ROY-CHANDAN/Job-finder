import { NextRequest } from "next/server";
import { requireUserId, handleApiError } from "@/lib/server-helpers";
import { educationSchema, addEducation, deleteEducation } from "@/lib/profile-service";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = educationSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }
    const edu = await addEducation(userId, parsed.data);
    return Response.json({ success: true, data: edu }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return Response.json({ success: false, error: "Education id required" }, { status: 400 });
    }
    await deleteEducation(userId, id);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

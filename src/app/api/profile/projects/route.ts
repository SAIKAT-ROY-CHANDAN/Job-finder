import { NextRequest } from "next/server";
import { requireUserId, handleApiError } from "@/lib/server-helpers";
import { projectSchema, addProject, deleteProject } from "@/lib/profile-service";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = projectSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }
    const project = await addProject(userId, parsed.data);
    return Response.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return Response.json({ success: false, error: "Project id required" }, { status: 400 });
    }
    await deleteProject(userId, id);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

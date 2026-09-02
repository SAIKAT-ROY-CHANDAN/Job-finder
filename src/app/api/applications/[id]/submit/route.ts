import { NextRequest } from "next/server";
import { requireUserId, handleApiError } from "@/lib/server-helpers";
import { submitApplication } from "@/lib/application-service";

/**
 * POST /api/applications/[id]/submit
 * Requires explicit user confirmation. Idempotent (no duplicates).
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const result = await submitApplication({ userId, applicationId: params.id });
    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

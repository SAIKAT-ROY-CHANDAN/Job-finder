import { NextRequest } from "next/server";
import { requireUserId, handleApiError } from "@/lib/server-helpers";
import { discoverJobsForUser } from "@/lib/discovery/jobSearch";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    let body: { limit?: number; filterByProfile?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // empty body ok
    }
    const result = await discoverJobsForUser(userId, {
      limit: body.limit ?? 50,
      filterByProfile: body.filterByProfile ?? true,
    });
    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

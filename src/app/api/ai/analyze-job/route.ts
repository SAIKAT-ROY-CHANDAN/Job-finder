import { NextRequest } from "next/server";
import { requireUserId, handleApiError } from "@/lib/server-helpers";
import { aiService } from "@/lib/ai/aiService";
import { z } from "zod";

const schema = z.object({
  description: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireUserId();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }
    const analysis = await aiService.analyzeJob(parsed.data.description);
    return Response.json({ success: true, data: analysis });
  } catch (error) {
    return handleApiError(error);
  }
}

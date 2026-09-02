import { NextRequest } from "next/server";
import { requireUserId, handleApiError } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import { ingestJob } from "@/lib/job-service";
import { z } from "zod";

const minMatch = (q: URLSearchParams) => (q.get("minMatch") ? Number(q.get("minMatch")) : 0);
const minCred = (q: URLSearchParams) => (q.get("minCredibility") ? Number(q.get("minCredibility")) : 0);

export async function GET(req: NextRequest) {
  try {
    await requireUserId();
    const { searchParams } = new URL(req.url);
    const minMatchVal = minMatch(searchParams);
    const minCredVal = minCred(searchParams);
    const remote = searchParams.get("remote");
    const q = searchParams.get("q")?.toLowerCase();
    const tech = searchParams.get("tech")?.toLowerCase();
    const sortBy = searchParams.get("sort") || "recommended";
    const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);

    const where: Record<string, unknown> = {};
    if (minMatchVal > 0) where["matchScore"] = { gte: minMatchVal };
    if (minCredVal > 0) where["credibilityScore"] = { gte: minCredVal };
    if (remote === "true") where["remote"] = true;
    if (q) where["title"] = { contains: q, mode: "insensitive" };
    if (tech) {
      where["requirements"] = {
        is: {
          OR: [
            { requiredTech: { has: tech } },
            { preferredTech: { has: tech } },
          ],
        },
      };
    }

    let orderBy: unknown = { postedAt: "desc" as const };
    if (sortBy === "match") orderBy = { matchScore: "desc" as const };
    if (sortBy === "credibility") orderBy = { credibilityScore: "desc" as const };

    const jobs = await prisma.job.findMany({
      where,
      orderBy: orderBy as object,
      take: limit,
      include: {
        company: true,
        requirements: true,
        source: true,
      },
    });
    return Response.json({ success: true, data: jobs });
  } catch (error) {
    return handleApiError(error);
  }
}

const ingestSchema = z.object({
  sourceName: z.string(),
  sourceType: z.enum(["GOOGLE_JOBS", "RSS_FEED", "API_SOURCE", "DIRECT_SCRAPE"]),
  title: z.string(),
  company: z.string(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  remote: z.boolean().optional(),
  salaryMin: z.coerce.number().int().optional().nullable(),
  salaryMax: z.coerce.number().int().optional().nullable(),
  salaryCurrency: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    await requireUserId();
    const body = await req.json();
    const parsed = ingestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }
    const job = await ingestJob(parsed.data);
    return Response.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

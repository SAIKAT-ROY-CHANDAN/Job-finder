import { requireUserId, handleApiError, ApiError } from "@/lib/server-helpers";
import { prisma } from "@/lib/db";
import { renderResumePdf } from "@/lib/resume/pdfRenderer";

/**
 * GET /api/resumes/[id]/pdf
 * Streams the resume rendered as a PDF. The stored JSON content is rendered on
 * demand with the shared pdfRenderer so application-specific resumes created by
 * the apply flow are viewable from the Resume page too.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const resume = await prisma.resume.findUnique({ where: { id: params.id } });
    if (!resume) throw new ApiError(404, "Resume not found");
    if (resume.userId !== userId) throw new ApiError(403, "Forbidden");

    const pdf = await renderResumePdf(resume.content as never);
    const safeName = resume.name.replace(/[^\w.-]+/g, "_");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
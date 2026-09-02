import type { Page } from "playwright";
import { findField, fillField } from "@/automation/fieldMapper";
import type {
  ApplicationProvider,
  AppField,
  ReviewResult,
  SubmitResult,
} from "@/automation/provider";

/**
 * Instruments an application page for review before submission.
 * Never bypasses CAPTCHA, MFA, or anti-bot; pauses for human takeover.
 */
export async function runApplication(
  provider: ApplicationProvider,
  page: Page,
  url: string,
  data: {
    personal: Record<string, string>;
    resumePath?: string;
    questions?: { question: string; answer: string }[];
  },
): Promise<{
  fields: AppField[];
  filled: { field: string; filled: boolean }[];
  review: ReviewResult;
  submit: SubmitResult;
}> {
  await provider.openApplication(page, url);

  // 1. Detect fields
  const fields = await provider.detectFields(page);

  // 2. Fill personal information
  const filled: { field: string; filled: boolean }[] = [];
  for (const [key, value] of Object.entries(data.personal)) {
    const ok = await fillField(page, key, value);
    filled.push({ field: key, filled: ok });
  }

  // 3. Upload resume
  if (data.resumePath) {
    await provider.uploadResume(page, data.resumePath);
  }

  // 4. Answer questions
  if (data.questions?.length) {
    await provider.answerQuestions(page, data.questions);
  }

  // 5. Review
  const review = await provider.reviewApplication(page);

  // 6. Submit (may return needs_human/blocked)
  const submit = await provider.submitApplication(page);

  return { fields, filled, review, submit };
}

export function isHumanInterventionRequired(result: SubmitResult): boolean {
  return result.status === "needs_human" || result.status === "blocked";
}

export { findField, fillField };

import type { Page } from "playwright";
import type {
  ApplicationProvider,
  AppField,
  ReviewResult,
  SubmitResult,
} from "@/automation/provider";

/**
 * A defensive, generic provider for unknown company career pages.
 * Best-effort detection and filling. Never submits blindly - always returns
 * needs_human when unsure or when resources are detected.
 */
export const careerPageProvider: ApplicationProvider = {
  name: "career-page",
  canHandle(url: string) {
    return !/greenhouse\.io|boards\.greenhouse|jobs\.lever/i.test(url);
  },
  async openApplication(page, url) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(500);
  },
  async detectFields(page) {
    const fields: AppField[] = [];
    const inputs = page.locator("input, textarea, select").filter({ visible: true });
    const count = await inputs.count();
    for (let i = 0; i < Math.min(count, 100); i++) {
      const el = inputs.nth(i);
      const name = (await el.getAttribute("name")) || (await el.getAttribute("id")) || `field-${i}`;
      const type = (await el.getAttribute("type")) || "text";
      const tag = await el.evaluate((n) => (n as HTMLElement).tagName.toLowerCase());
      fields.push({
        name,
        type: tag === "select" ? "select" : tag === "textarea" ? "textarea" : (type as AppField["type"]),
        required: !!((await el.getAttribute("required")) || (await el.getAttribute("aria-required"))),
        selector: `[name="${name}"],[id="${name}"]`,
      });
    }
    return fields;
  },
  async fillPersonalInformation(page, data) {
    for (const [key, value] of Object.entries(data)) {
      if (!value) continue;
      try {
        const field = page.locator(`[name="${key}"],[id="${key}"]`).first();
        if ((await field.count()) > 0) {
          await field.fill(String(value));
        }
      } catch {
        // ignore - field may be read-only
      }
    }
  },
  async uploadResume(page, filePath) {
    const input = page.locator('input[type="file"]').first();
    if ((await input.count()) > 0) {
      await input.setInputFiles(filePath);
    }
  },
  async answerQuestions(page, answers) {
    // Best-effort: skip - reviewer will handle if needed
  },
  async reviewApplication(page) {
    const missingRequired: AppField[] = [];
    const inputs = page.locator("input, textarea, select").filter({ visible: true });
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const required = !!((await el.getAttribute("required")) || (await el.getAttribute("aria-required")));
      if (required) {
        const val = (await el.inputValue().catch(() => "")) || "";
        if (!val) {
          const name = (await el.getAttribute("name")) || `field-${i}`;
          missingRequired.push({
            name,
            type: "text",
            required: true,
            selector: "",
          });
        }
      }
    }
    return { ok: missingRequired.length === 0, missingRequired };
  },
  async submitApplication(page): Promise<SubmitResult> {
    // Never blind-submit an unknown provider: require human takeover.
    const submitBtn = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Apply")').first();
    if ((await submitBtn.count()) > 0) {
      return { status: "needs_human", reason: "Unknown provider: review before submitting." };
    }
    return { status: "blocked", reason: "No submit button found." };
  },
};

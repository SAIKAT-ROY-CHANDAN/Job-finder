import type { Page } from "playwright";
import type {
  ApplicationProvider,
  AppField,
  ReviewResult,
  SubmitResult,
} from "@/automation/provider";

/**
 * Greenhouse ATS provider. Handles boards.greenhouse.io application forms.
 */
export const greenhouseProvider: ApplicationProvider = {
  name: "greenhouse",
  canHandle(url: string) {
    return /greenhouse\.io|boards\.greenhouse/i.test(url);
  },
  async openApplication(page, url) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("form", { timeout: 30000 });
  },
  async detectFields(page) {
    const fields: AppField[] = [];
    const selectors = [
      "input[data-selector]",
      "select[data-selector]",
      "textarea[data-selector]",
      "input[name]",
      "select[name]",
      "textarea[name]",
    ];
    for (const sel of selectors) {
      const els = page.locator(sel).filter({ visible: true });
      const count = await els.count();
      for (let i = 0; i < count; i++) {
        const el = els.nth(i);
        const name = (await el.getAttribute("name")) || (await el.getAttribute("data-selector")) || `field-${i}`;
        const label = await page
          .locator(`label[for="${name}"]`)
          .textContent()
          .catch(() => null);
        const tag = await el.evaluate((n) => (n as HTMLElement).tagName.toLowerCase());
        fields.push({
          name,
          type: tag === "select" ? "select" : tag === "textarea" ? "textarea" : "text",
          required: !!((await el.getAttribute("required")) || (await el.getAttribute("aria-required"))),
          selector: `[name="${name}"],[data-selector="${name}"]`,
          label: label?.trim() || undefined,
        });
      }
    }
    return fields;
  },
  async fillPersonalInformation(page, data) {
    for (const [key, value] of Object.entries(data)) {
      if (!value) continue;
      const el = page
        .locator(`[name="${key}"],[data-selector="${key}"]`)
        .first();
      try {
        if ((await el.count()) > 0) {
          const tag = await el.evaluate((n) => (n as HTMLElement).tagName.toLowerCase());
          if (tag === "select") {
            await el.selectOption({ label: value });
          } else {
            await el.fill(String(value));
          }
        }
      } catch {
        // try a different locator: field keyed by label-like
        const alt = page.locator(`input[name*="${key.toLowerCase()}"]`).first();
        if ((await alt.count()) > 0) await alt.fill(String(value)).catch(() => {});
      }
    }
  },
  async uploadResume(page, filePath) {
    const input = page.locator("input[type='file']").first();
    if ((await input.count()) > 0) {
      await input.setInputFiles(filePath);
    }
  },
  async answerQuestions(page, answers) {
    // Greenhouse free-text questions. Best-effort match by label.
    for (const a of answers) {
      const label = a.question.toLowerCase();
      const textareas = page.locator("textarea");
      const count = await textareas.count();
      for (let i = 0; i < count; i++) {
        const t = textareas.nth(i);
        const text = (
          (await page.locator(`label[for="${await t.getAttribute('id')}"]`).textContent()) ||
          ""
        ).toLowerCase();
        if (text && text.includes(label.slice(0, 20))) {
          await t.fill(a.answer);
          break;
        }
      }
    }
  },
  async reviewApplication(page): Promise<ReviewResult> {
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
          missingRequired.push({ name, type: "text", required: true, selector: "" });
        }
      }
    }
    return { ok: missingRequired.length === 0, missingRequired };
  },
  async submitApplication(page): Promise<SubmitResult> {
    if (await page.locator("body").getAttribute("data-recaptcha") || (await page.locator("iframe[src*='recaptcha']").count()) > 0) {
      return { status: "needs_human", reason: "CAPTCHA detected - human takeover required." };
    }
    const submit = page.locator('input[type="submit"], button[type="submit"]').first();
    if ((await submit.count()) > 0) {
      await submit.click().catch(() => {});
      return { status: "submitted" };
    }
    return { status: "blocked", reason: "No submit button found in Greenhouse form." };
  },
};

import type { Page } from "playwright";

/**
 * Robust field locating that maps a semantic field name (e.g. "email") to a
 * CSS selector strategy. Order matters: prefer explicit label/name/id matches.
 */
export function fieldSelectors(name: string): string[] {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const selectors: string[] = [
    `[name="${name}"]`,
    `#${name}`,
    `[data-testid="${name}"]`,
    `label:has-text("${name}") input`,
    `input[name*="${base}"]`,
    `textarea[name*="${base}"]`,
    `select[name*="${base}"]`,
  ];
  return selectors;
}

export async function findField(page: Page, name: string): Promise<string | null> {
  for (const selector of fieldSelectors(name)) {
    const el = page.locator(selector).first();
    if ((await el.count()) > 0) {
      return selector;
    }
  }
  return null;
}

export async function fillField(
  page: Page,
  name: string,
  value: string,
): Promise<boolean> {
  const selector = await findField(page, name);
  if (!selector) return false;
  const el = page.locator(selector).first();
  const tag = await el.evaluate((node) => (node as HTMLElement).tagName.toLowerCase());
  try {
    if (tag === "select") {
      await el.selectOption({ label: value });
    } else if (tag === "textarea") {
      await el.fill(value);
    } else {
      await el.fill(value);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Map candidate profile data onto the detected form fields.
 * Returns a list of (fieldName, value, filled) tuples.
 */
export async function mapAndFillProfile(
  page: Page,
  profile: Record<string, string>,
): Promise<{ field: string; filled: boolean }[]> {
  const results: { field: string; filled: boolean }[] = [];
  for (const [name, value] of Object.entries(profile)) {
    if (!value) continue;
    const filled = await fillField(page, name, value);
    results.push({ field: name, filled });
  }
  return results;
}

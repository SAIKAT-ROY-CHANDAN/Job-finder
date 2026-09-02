import type { Browser, Page } from "playwright";

/**
 * Interface for a job application provider (e.g. Greenhouse, Lever, custom).
 * Each provider handles a specific application system's flow.
 */
export interface ApplicationProvider {
  name: string;
  /**
   * Whether this provider can handle the given application URL.
   */
  canHandle(url: string): boolean;
  /**
   * Open the application URL in the current page.
   */
  openApplication(page: Page, url: string): Promise<void>;
  /**
   * Detect and return the form fields present on the page.
   */
  detectFields(page: Page): Promise<AppField[]>;
  /**
   * Fill basic personal information using the provided data.
   */
  fillPersonalInformation(page: Page, data: Record<string, string>): Promise<void>;
  /**
   * Upload a resume file path.
   */
  uploadResume(page: Page, filePath: string): Promise<void>;
  /**
   * Answer application questions.
   */
  answerQuestions(page: Page, answers: { question: string; answer: string }[]): Promise<void>;
  /**
   * Review the application before submission.
   */
  reviewApplication(page: Page): Promise<ReviewResult>;
  /**
   * Submit the application. Returns the blocking reason if human action is required.
   */
  submitApplication(page: Page): Promise<SubmitResult>;
}

export interface AppField {
  name: string;
  type: "text" | "select" | "textarea" | "file" | "checkbox" | "radio";
  required: boolean;
  selector: string;
  label?: string;
}

export interface ReviewResult {
  ok: boolean;
  missingRequired: AppField[];
}

export type SubmitResult =
  | { status: "submitted"; url?: string }
  | { status: "needs_human"; reason: string }
  | { status: "blocked"; reason: string };

/**
 * Launch a browser once and cache it for reuse (keeps login state where possible).
 */
export async function ensureBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true });
}

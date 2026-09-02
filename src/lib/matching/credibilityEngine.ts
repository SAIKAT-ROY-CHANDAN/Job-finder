import type { CredibilityResult, CredibilitySignals } from "@/types";

const SUSPICIOUS_PHRASES = [
  "no experience needed",
  "earn quick cash",
  "make money fast",
  "guaranteed income",
  "work from home setup fee",
  "wire transfer",
  "moneygram",
  "western union",
  "secret shopper",
  "envelope stuffing",
  "bonus just for applying",
];

const SENSITIVE_INFO_KEYWORDS = [
  "bank account",
  "routing number",
  "credit card",
  "ssn",
  "social security",
  "passport number",
  "national id",
  "cvv",
];

const MONEY_REQUEST_PHRASES = [
  "pay a fee",
  "application fee",
  "training fee",
  "startup cost",
  "processing fee",
  "pay for equipment",
  "advance payment",
];

function hasAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase();
  return phrases.some((p) => lower.includes(p));
}

/**
 * Deterministic credibility scoring based on externally observable signals.
 * Returns an assessment, not a guarantee.
 */
export function computeCredibilityScore(
  signals: Partial<CredibilitySignals>,
  description?: string | null,
): CredibilityResult {
  const fullSignals: CredibilitySignals = {
    companyWebsiteExists: signals.companyWebsiteExists ?? false,
    officialDomain: signals.officialDomain ?? false,
    careerPageExists: signals.careerPageExists ?? false,
    companyLinkedInPresence: signals.companyLinkedInPresence ?? false,
    contactInformationPresent: signals.contactInformationPresent ?? false,
    jobAgeDays: signals.jobAgeDays ?? 30,
    salaryTransparent: signals.salaryTransparent ?? false,
    hasSuspiciousLanguage: signals.hasSuspiciousLanguage ?? hasAny(description ?? "", SUSPICIOUS_PHRASES),
    requestsMoney: signals.requestsMoney ?? hasAny(description ?? "", MONEY_REQUEST_PHRASES),
    requestsSensitiveInfo: signals.requestsSensitiveInfo ?? hasAny(description ?? "", SENSITIVE_INFO_KEYWORDS),
    fakeRecruitmentIndicators: signals.fakeRecruitmentIndicators ?? false,
    informationConsistent: signals.informationConsistent ?? true,
  };

  let score = 50;
  const flaggedSignals: string[] = [];

  // Positive signals
  if (fullSignals.companyWebsiteExists) score += 8;
  if (fullSignals.officialDomain) score += 10;
  if (fullSignals.careerPageExists) score += 8;
  if (fullSignals.companyLinkedInPresence) score += 7;
  if (fullSignals.contactInformationPresent) score += 5;
  if (fullSignals.salaryTransparent) score += 6;
  if (fullSignals.informationConsistent) score += 5;

  // Negative / risk signals
  if (fullSignals.jobAgeDays > 60) {
    score -= 5;
    flaggedSignals.push("Job posting is older than 60 days");
  }
  if (fullSignals.jobAgeDays > 180) {
    score -= 5;
    flaggedSignals.push("Job posting is very old (re-screened)");
  }
  if (fullSignals.hasSuspiciousLanguage) {
    score -= 20;
    flaggedSignals.push("Job description contains suspicious language");
  }
  if (fullSignals.requestsMoney) {
    score -= 30;
    flaggedSignals.push("Job requests money or a fee");
  }
  if (fullSignals.requestsSensitiveInfo) {
    score -= 25;
    flaggedSignals.push("Job requests sensitive personal information");
  }
  if (fullSignals.fakeRecruitmentIndicators) {
    score -= 25;
    flaggedSignals.push("Fake recruitment indicators detected");
  }
  if (!fullSignals.companyWebsiteExists && !fullSignals.companyLinkedInPresence) {
    score -= 10;
    flaggedSignals.push("No verifiable company presence found");
  }

  score = Math.max(0, Math.min(100, score));

  const label =
    score >= 90
      ? "Highly credible"
      : score >= 75
        ? "Likely credible"
        : score >= 50
          ? "Verify carefully"
          : "Suspicious";

  const reasons = flaggedSignals.length
    ? flaggedSignals
    : ["No major red flags detected. Verify employer details before applying."];

  return {
    score,
    label,
    signals: fullSignals,
    flaggedSignals,
    reasons,
    assessment: `${label}. This is an automated assessment based on publicly observable signals and is not a guarantee.`,
  };
}

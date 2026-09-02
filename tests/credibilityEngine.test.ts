import { describe, it, expect } from "vitest";
import { computeCredibilityScore } from "@/lib/matching/credibilityEngine";

describe("computeCredibilityScore", () => {
  it("scores highly for a trusted company with all positive signals", () => {
    const result = computeCredibilityScore({
      companyWebsiteExists: true,
      officialDomain: true,
      careerPageExists: true,
      companyLinkedInPresence: true,
      contactInformationPresent: true,
      jobAgeDays: 2,
      salaryTransparent: true,
      informationConsistent: true,
    });
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.label).toBe("Highly credible");
  });

  it("penalizes requests for money heavily", () => {
    const result = computeCredibilityScore({}, "Great job! Send us $50 as an application fee.");
    expect(result.score).toBeLessThan(50);
    expect(result.flaggedSignals.some((s) => /money|fee/i.test(s))).toBe(true);
  });

  it("flags sensitive information requests", () => {
    const result = computeCredibilityScore({}, "We need your bank account number to pay you.");
    expect(result.score).toBeLessThan(50);
    expect(result.flaggedSignals.some((s) => /sensitive/i.test(s))).toBe(true);
  });

  it("returns an assessment label, not a guarantee", () => {
    const result = computeCredibilityScore({});
    expect(result.assessment).toContain("not a guarantee");
    expect(["Highly credible", "Likely credible", "Verify carefully", "Suspicious"]).toContain(
      result.label,
    );
  });

  it("clamps score to 0-100", () => {
    const positive = computeCredibilityScore({
      companyWebsiteExists: true,
      officialDomain: true,
      careerPageExists: true,
      companyLinkedInPresence: true,
      contactInformationPresent: true,
      jobAgeDays: 1,
      salaryTransparent: true,
      informationConsistent: true,
    });
    expect(positive.score).toBeLessThanOrEqual(100);
    const negative = computeCredibilityScore({}, "Pay $100 fee, provide bank account and SSN.");
    expect(negative.score).toBeGreaterThanOrEqual(0);
  });
});
